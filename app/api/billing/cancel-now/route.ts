// app/api/billing/cancel-now/route.ts
// Immediately cancel a subscription (not at period end)

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { getTransactionCap } from '@/lib/limits/transactions-cap';
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
            // No Stripe subscription — clean up DB directly.
            // We deliberately do NOT call enforceTransactionCap here. Per the wallet design
            // (lib/limits/transaction-wallet.ts: "we never reduce capacity per plan doc"),
            // a downgrade preserves the user's existing data — new writes are blocked at
            // /api/transactions via assertCapacityOrExplain once they exceed the free cap,
            // but historical transactions remain intact and readable.
            // This matters most for trial users (e.g. Product Hunt redeemers) who tried PRO,
            // uploaded a year of history, and didn't renew. Silently deleting their data on
            // downgrade would be a launch-day catastrophe.
            await upsertSubscription({ userId, plan: 'free', status: 'canceled' });

            const freePlanCap = getTransactionCap('free');

            const client = await clerkClient();
            await client.users.updateUserMetadata(
                userId,
                buildClerkSubscriptionMetadata({ plan: 'free', status: 'canceled' })
            );

            await invalidateSubscriptionCaches(userId);

            return NextResponse.json({
                success: true,
                message: `Your subscription has been canceled. Your existing transactions are preserved — you can keep viewing them. New uploads will be limited to the free plan cap of ${freePlanCap} transactions.`,
            });
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
