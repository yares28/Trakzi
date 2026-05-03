// app/api/billing/cancel-now/route.ts
// Immediately cancel a subscription (not at period end)

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { enforceTransactionCap, getTransactionCap } from '@/lib/limits/transactions-cap';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter';
import {
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

        if (!subscription.stripeSubscriptionId) {
            // No Stripe subscription — clean up DB directly
            await upsertSubscription({ userId, plan: 'free', status: 'canceled' });

            const freePlanCap = getTransactionCap('free');
            const capResult = await enforceTransactionCap(userId, freePlanCap);

            const client = await clerkClient();
            await client.users.updateUserMetadata(
                userId,
                buildClerkSubscriptionMetadata({ plan: 'free', status: 'canceled' })
            );

            await invalidateSubscriptionCaches(userId);

            const message = capResult.deleted > 0
                ? `Your subscription has been canceled. ${capResult.deleted} oldest transaction(s) were automatically deleted to fit the free plan limit of ${freePlanCap} transactions.`
                : 'Your subscription has been canceled.';

            return NextResponse.json({ success: true, message, deletedTransactions: capResult.deleted });
        }

        const stripe = getStripe();
        const canceledSubscription = await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

        console.log('[Cancel Now] Stripe subscription canceled:', {
            id: canceledSubscription.id,
            status: canceledSubscription.status,
        });

        await upsertSubscription({ userId, plan: 'free', status: 'canceled', cancelAtPeriodEnd: false });

        // NOTE: Transaction cap enforcement is handled by the customer.subscription.deleted
        // webhook handler to avoid double-deletion (cancel-now + webhook both deleting).

        const client = await clerkClient();
        await client.users.updateUserMetadata(
            userId,
            buildClerkSubscriptionMetadata({
                plan: 'free',
                status: 'canceled',
                stripeCustomerId: subscription.stripeCustomerId,
            })
        );

        await invalidateSubscriptionCaches(userId);

        return NextResponse.json({
            success: true,
            message: 'Your subscription has been canceled immediately. You are now on the free plan.',
        });
    } catch (error: any) {
        console.error('[Cancel Now] Error:', error);

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
