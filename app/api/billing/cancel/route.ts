// app/api/billing/cancel/route.ts
// Cancel subscription at period end (user keeps access until end of billing period)

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

        if (subscription.plan === 'free') {
            return NextResponse.json(
                { error: 'You are already on the free plan.' },
                { status: 400 }
            );
        }

        if (subscription.isLifetime) {
            return NextResponse.json(
                { error: 'Lifetime subscriptions cannot be cancelled. Your subscription never expires!' },
                { status: 400 }
            );
        }

        if (!subscription.stripeSubscriptionId) {
            // No Stripe subscription ID — clean up DB directly
            await upsertSubscription({ userId, plan: 'free', status: 'canceled', cancelAtPeriodEnd: false });

            const client = await clerkClient();
            await client.users.updateUserMetadata(
                userId,
                buildClerkSubscriptionMetadata({ plan: 'free', status: 'canceled' })
            );

            await invalidateSubscriptionCaches(userId);
            return NextResponse.json({ success: true, message: 'Subscription cancelled.', immediate: true });
        }

        const stripe = getStripe();
        const stripeSubResult = await stripe.subscriptions.update(
            subscription.stripeSubscriptionId,
            { cancel_at_period_end: true }
        );

        const periodEnd = safeTimestampToDate(
            (stripeSubResult as unknown as { current_period_end: number }).current_period_end
        );

        await upsertSubscription({
            userId,
            plan: subscription.plan,
            status: 'active', // Still active until period end
            cancelAtPeriodEnd: true,
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

        const periodEndStr = periodEnd
            ? periodEnd.toLocaleDateString()
            : 'the end of your billing period';

        return NextResponse.json({
            success: true,
            message: `Your subscription will be cancelled at the end of your billing period on ${periodEndStr}.`,
            cancelDate: periodEnd?.toISOString(),
            immediate: false,
        });
    } catch (error: any) {
        console.error('[Cancel Subscription] Error:', error);

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
            { error: 'Failed to cancel subscription. Please try again or contact support.' },
            { status: 500 }
        );
    }
}
