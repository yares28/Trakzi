// app/api/billing/reactivate/route.ts
// Reactivate a subscription that was scheduled to cancel

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        const subscription = await getUserSubscription(userId);

        console.log('[Reactivate Subscription] Request:', {
            userId,
            plan: subscription?.plan,
            cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd,
            stripeSubscriptionId: subscription?.stripeSubscriptionId,
        });

        if (!subscription) {
            return NextResponse.json(
                { error: 'No subscription found.' },
                { status: 400 }
            );
        }

        if (subscription.plan === 'free') {
            return NextResponse.json(
                { error: 'You are on the free plan. Use upgrade instead.' },
                { status: 400 }
            );
        }

        if (!subscription.cancelAtPeriodEnd) {
            return NextResponse.json(
                { error: 'Your subscription is not scheduled to cancel.' },
                { status: 400 }
            );
        }

        if (!subscription.stripeSubscriptionId) {
            return NextResponse.json(
                { error: 'No Stripe subscription found. Please contact support.' },
                { status: 400 }
            );
        }

        // Reactivate on Stripe
        const stripe = getStripe();

        const stripeSubResult = await stripe.subscriptions.update(
            subscription.stripeSubscriptionId,
            { cancel_at_period_end: false }
        );

        console.log('[Reactivate Subscription] Stripe updated:', {
            id: stripeSubResult.id,
            cancelAtPeriodEnd: stripeSubResult.cancel_at_period_end,
        });

        // Update our database
        await upsertSubscription({
            userId,
            plan: subscription.plan,
            status: 'active',
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripeCustomerId: subscription.stripeCustomerId ?? undefined,
        });

        // Update Clerk metadata
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                subscriptionPlan: subscription.plan,
                subscriptionStatus: 'active',
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Your subscription has been reactivated!',
            plan: subscription.plan,
        });
    } catch (error: any) {
        console.error('[Reactivate Subscription] Error:', error);

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
            { error: error.message || 'Failed to reactivate subscription' },
            { status: 500 }
        );
    }
}
