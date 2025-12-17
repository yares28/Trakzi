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

        if (!subscription?.stripeCustomerId) {
            return NextResponse.json(
                { error: 'No active subscription found. Please subscribe first.' },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const appUrl = getAppUrl();

        // Create Customer Portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripeCustomerId,
            return_url: `${appUrl}/home`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('[Billing Portal] Error creating session:', error);

        if (error.message?.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system not configured. Please contact support.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to create billing portal session' },
            { status: 500 }
        );
    }
}
