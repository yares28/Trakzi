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

        // Validate priceId is one of our known prices
        const validPrices = Object.values(STRIPE_PRICES).filter(Boolean);
        if (validPrices.length > 0 && !validPrices.includes(priceId)) {
            return NextResponse.json(
                { error: 'Invalid price ID' },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const appUrl = getAppUrl();

        // Check if user already has an active subscription with a Stripe customer
        const existingSubscription = await getUserSubscription(userId);
        let customerId: string | undefined;

        if (existingSubscription?.stripeCustomerId) {
            customerId = existingSubscription.stripeCustomerId;
        }

        // Create Checkout Session
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
            customer: customerId,
            customer_creation: customerId ? undefined : 'always',
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

        if (error.message?.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system not configured. Please contact support.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
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
