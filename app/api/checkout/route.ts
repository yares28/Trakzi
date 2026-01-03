// app/api/checkout/route.ts
// Create Stripe Checkout Sessions for subscription purchases

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getStripe, getAppUrl, STRIPE_PRICES } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';

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

        // Validate priceId against allowed prices (defense in depth)
        // Stripe will also validate, but this prevents unnecessary API calls
        const allowedPriceIds = [
            STRIPE_PRICES.BASIC_MONTHLY,
            STRIPE_PRICES.BASIC_ANNUAL,
            STRIPE_PRICES.PRO_MONTHLY,
            STRIPE_PRICES.PRO_ANNUAL,
            STRIPE_PRICES.MAX_MONTHLY,
            STRIPE_PRICES.MAX_ANNUAL,
        ].filter(Boolean) as string[];

        if (!allowedPriceIds.includes(priceId)) {
            console.error('[Checkout] Invalid price ID attempted:', {
                priceId,
                userId,
                allowedPriceIds,
            });
            return NextResponse.json(
                { error: 'Invalid pricing option. Please select a valid plan.' },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const appUrl = getAppUrl();

        // Check if user already has an active subscription with a Stripe customer
        const existingSubscription = await getUserSubscription(userId);

        // Prevent duplicate subscriptions
        if (existingSubscription?.status === 'active' && existingSubscription.plan !== 'free') {
            return NextResponse.json(
                { error: 'You already have an active subscription. Please manage it from your dashboard.' },
                { status: 400 }
            );
        }

        // CRITICAL FIX: Always create Stripe customer before checkout (t3dotgg recommendation)
        // This prevents "split brain" issues and race conditions
        let customerId: string | undefined;

        if (existingSubscription?.stripeCustomerId) {
            // Reuse existing customer
            customerId = existingSubscription.stripeCustomerId;
        } else {
            // Create new Stripe customer before checkout
            // Get user email from Clerk
            const client = await clerkClient();
            const clerkUser = await client.users.getUser(userId);
            const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

            if (!userEmail) {
                console.error('[Checkout] User has no email address', { userId });
                return NextResponse.json(
                    { error: 'Email address is required for checkout. Please update your account.' },
                    { status: 400 }
                );
            }

            // Create Stripe customer
            const newCustomer = await stripe.customers.create({
                email: userEmail,
                metadata: {
                    userId: userId,
                },
            });

            customerId = newCustomer.id;

            // Store customer ID in database immediately (before checkout)
            // This ensures we have the binding even if checkout fails
            await upsertSubscription({
                userId,
                stripeCustomerId: customerId,
                plan: 'free', // Will be updated by webhook after checkout
                status: 'active',
            });

            console.log(`[Checkout] Created Stripe customer ${customerId} for user ${userId}`);
        }

        // Create Checkout Session
        // ALWAYS pass customer ID (never let Stripe create it automatically)
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
            customer: customerId, // Always provided - never undefined
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
