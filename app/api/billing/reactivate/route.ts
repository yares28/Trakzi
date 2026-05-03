// app/api/billing/reactivate/route.ts
// Reactivate a subscription that was set to cancel at period end

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter';
import {
    safeTimestampToDate,
    buildClerkSubscriptionMetadata,
    invalidateSubscriptionCaches,
    getSubscriptionBlockReason,
} from '@/lib/billing-utils';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        const rateLimitResult = await checkRateLimit(userId, 'mutation');
        if (rateLimitResult.limited) {
            return createRateLimitResponse(rateLimitResult.resetIn);
        }

        const subscription = await getUserSubscription(userId);

        // Block disputed accounts
        const blockReason = getSubscriptionBlockReason(subscription?.status);
        if (blockReason) {
            return NextResponse.json({ error: blockReason }, { status: 403 });
        }

        if (!subscription) {
            return NextResponse.json({ error: 'No subscription found.' }, { status: 400 });
        }

        if (!subscription.cancelAtPeriodEnd) {
            return NextResponse.json(
                { error: 'Your subscription is not set to cancel.' },
                { status: 400 }
            );
        }

        if (!subscription.stripeSubscriptionId) {
            return NextResponse.json(
                { error: 'No Stripe subscription found. Please contact support.' },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const reactivated = await stripe.subscriptions.update(
            subscription.stripeSubscriptionId,
            {
                cancel_at_period_end: false,
                proration_behavior: 'none',
            }
        );

        const periodEnd = safeTimestampToDate(
            (reactivated as unknown as { current_period_end: number }).current_period_end
        );

        await upsertSubscription({
            userId,
            plan: subscription.plan,
            status: 'active',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: periodEnd ?? undefined,
        });

        const client = await clerkClient();
        await client.users.updateUserMetadata(
            userId,
            buildClerkSubscriptionMetadata({
                plan: subscription.plan,
                status: 'active',
                stripeCustomerId: subscription.stripeCustomerId,
                currentPeriodEnd: periodEnd,
            })
        );

        await invalidateSubscriptionCaches(userId);

        return NextResponse.json({
            success: true,
            message: 'Your subscription has been reactivated.',
        });
    } catch (error: any) {
        console.error('[Reactivate] Error:', error);

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
            { error: 'Failed to reactivate subscription. Please try again or contact support.' },
            { status: 500 }
        );
    }
}
