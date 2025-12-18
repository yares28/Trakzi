// app/api/checkout/route.ts
// Create Stripe Checkout Sessions for subscription purchases

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, getAppUrl, STRIPE_PRICES } from '@/lib/stripe';
import { getUserSubscription } from '@/lib/subscriptions';

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { priceId, successUrl, cancelUrl } = body;

        if (!priceId) {
            return NextResponse.json(
                { error: 'Missing required field: priceId' },
                { status: 400 }
            );
        }

        // Note: We don't validate priceId against server-side env vars here
        // because the frontend uses NEXT_PUBLIC_* vars and server uses STRIPE_PRICE_ID_* vars
        // Stripe will validate the price ID when creating the checkout session
        // and return a clear error if the price doesn't exist

        const stripe = getStripe();
        const appUrl = getAppUrl();

        // Check if user already has an active subscription with a Stripe customer
        const existingSubscription = await getUserSubscription(userId);
        let customerId: string | undefined;

        if (existingSubscription?.stripeCustomerId) {
            customerId = existingSubscription.stripeCustomerId;
        }

        // Create Checkout Session
        // Note: In subscription mode, Stripe automatically creates a customer
        // so we don't need customer_creation (it's only for payment mode)
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl || `${appUrl}/home?checkout=success`,
            cancel_url: cancelUrl || `${appUrl}/?checkout=canceled`,
            // If user already has a Stripe customer ID, use it
            // Otherwise Stripe will create a new customer automatically
            ...(customerId && { customer: customerId }),
            metadata: {
                userId: userId,
            },
            subscription_data: {
                metadata: {
                    userId: userId,
                },
            },
            allow_promotion_codes: true,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('[Checkout] Error creating session:', error);

        // Map technical errors to user-friendly messages
        const errorMessage = error.message || '';

        if (errorMessage.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system is temporarily unavailable. Please try again later.' },
                { status: 503 }
            );
        }

        if (errorMessage.includes('No such price')) {
            return NextResponse.json(
                { error: 'This pricing option is currently unavailable. Please try a different plan or contact support.' },
                { status: 400 }
            );
        }

        if (errorMessage.includes('Invalid API Key') || errorMessage.includes('api_key')) {
            return NextResponse.json(
                { error: 'Payment configuration error. Please contact support.' },
                { status: 503 }
            );
        }

        if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment and try again.' },
                { status: 429 }
            );
        }

        // Generic fallback - don't expose internal error details
        return NextResponse.json(
            { error: 'Unable to start checkout. Please try again or contact support if the problem persists.' },
            { status: 500 }
        );
    }
}

// GET route to check subscription status
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const subscription = await getUserSubscription(userId);

        return NextResponse.json({
            subscription: subscription ? {
                plan: subscription.plan,
                status: subscription.status,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            } : null,
        });
    } catch (error: any) {
        console.error('[Checkout] Error fetching subscription:', error);
        return NextResponse.json(
            { error: 'Failed to fetch subscription status' },
            { status: 500 }
        );
    }
}
