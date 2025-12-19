// app/api/billing/portal/route.ts
// Create Stripe Customer Portal sessions for subscription management

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, getAppUrl } from '@/lib/stripe';
import { getUserSubscription } from '@/lib/subscriptions';

export async function POST() {
    try {
        // Get authenticated user
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        // Get user's subscription to find Stripe customer ID
        const subscription = await getUserSubscription(userId);

        console.log('[Billing Portal] User subscription:', {
            userId,
            plan: subscription?.plan,
            stripeCustomerId: subscription?.stripeCustomerId,
            stripeSubscriptionId: subscription?.stripeSubscriptionId,
        });

        if (!subscription?.stripeCustomerId) {
            // Check if this is a lifetime subscription
            if (subscription?.isLifetime) {
                return NextResponse.json(
                    { error: 'Lifetime subscriptions cannot be managed through the billing portal. Your subscription never expires!' },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { error: 'No active subscription found. Please subscribe first.' },
                { status: 400 }
            );
        }

        // Additional check for lifetime subscriptions with customer ID
        if (subscription.isLifetime) {
            return NextResponse.json(
                { error: 'Lifetime subscriptions cannot be managed through the billing portal. Your subscription never expires!' },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const appUrl = getAppUrl();

        // Create Customer Portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${appUrl}/dashboard`,
        });

        console.log('[Billing Portal] Session created:', session.url);

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('[Billing Portal] Error creating session:', error);

        if (error.message?.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system not configured. Please contact support.' },
                { status: 503 }
            );
        }

        if (error.type === 'StripeInvalidRequestError') {
            return NextResponse.json(
                { error: 'Invalid subscription. Please contact support.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to create billing portal session' },
            { status: 500 }
        );
    }
}

// GET request to check if user can access billing portal
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ canAccess: false, reason: 'Not authenticated' });
        }

        const subscription = await getUserSubscription(userId);

        if (!subscription?.stripeCustomerId) {
            return NextResponse.json({
                canAccess: false,
                reason: 'No subscription',
                plan: subscription?.plan || 'free'
            });
        }

        return NextResponse.json({
            canAccess: true,
            plan: subscription.plan,
            stripeCustomerId: subscription.stripeCustomerId,
        });
    } catch (error) {
        console.error('[Billing Portal] Error checking access:', error);
        return NextResponse.json({ canAccess: false, reason: 'Error' });
    }
}
