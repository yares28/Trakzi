// app/api/stripe/sync-subscription/route.ts
// Sync subscription from Stripe to database.
// Called after returning from Stripe Checkout or Portal (eager sync pattern).

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, getPlanFromPriceId } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription, mapStripeStatus } from '@/lib/subscriptions';
import { clerkClient } from '@clerk/nextjs/server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter';
import { safeTimestampToDate } from '@/lib/billing-utils';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const rateLimitResult = await checkRateLimit(userId, 'standard');
        if (rateLimitResult.limited) {
            return createRateLimitResponse(rateLimitResult.resetIn);
        }

        // Get current subscription from our database
        const dbSubscription = await getUserSubscription(userId);

        if (!dbSubscription?.stripeSubscriptionId) {
            return NextResponse.json({
                success: true,
                message: 'No Stripe subscription to sync',
                subscription: dbSubscription ? {
                    plan: dbSubscription.plan,
                    status: dbSubscription.status,
                } : null,
            });
        }

        // Fetch latest from Stripe
        const stripe = getStripe();
        const stripeSubscription = await stripe.subscriptions.retrieve(
            dbSubscription.stripeSubscriptionId
        );

        // CRITICAL SECURITY: Verify subscription ownership
        const stripeCustomerId = typeof stripeSubscription.customer === 'string'
            ? stripeSubscription.customer
            : stripeSubscription.customer?.id;

        if (!stripeCustomerId || !dbSubscription.stripeCustomerId) {
            console.error('[Sync Subscription] Missing customer ID:', {
                userId,
                dbCustomerId: dbSubscription.stripeCustomerId,
                stripeCustomerId,
                subscriptionId: dbSubscription.stripeSubscriptionId,
            });
            return NextResponse.json(
                { error: 'Subscription ownership verification failed: missing customer ID' },
                { status: 403 }
            );
        }

        if (stripeCustomerId !== dbSubscription.stripeCustomerId) {
            console.error('[Sync Subscription] Subscription ownership mismatch:', {
                userId,
                dbCustomerId: dbSubscription.stripeCustomerId,
                stripeCustomerId,
                subscriptionId: dbSubscription.stripeSubscriptionId,
            });
            return NextResponse.json(
                { error: 'Subscription ownership verification failed' },
                { status: 403 }
            );
        }

        const priceId = stripeSubscription.items.data[0]?.price.id;
        const newPlan = getPlanFromPriceId(priceId || '');
        const status = mapStripeStatus(stripeSubscription.status);
        const periodEnd = safeTimestampToDate(
            (stripeSubscription as any).current_period_end
        );

        await upsertSubscription({
            userId,
            plan: newPlan,
            status,
            stripeCustomerId: dbSubscription.stripeCustomerId ?? undefined,
            stripeSubscriptionId: dbSubscription.stripeSubscriptionId,
            stripePriceId: priceId,
            currentPeriodEnd: periodEnd ?? undefined,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            pendingPlan: stripeSubscription.cancel_at_period_end ? dbSubscription.pendingPlan : null,
        });

        try {
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    subscription: {
                        plan: newPlan,
                        status,
                        stripeCustomerId,
                        currentPeriodEnd: periodEnd?.toISOString() ?? undefined,
                        updatedAt: new Date().toISOString(),
                    },
                },
            });
        } catch (clerkError) {
            console.error('[Sync Subscription] Failed to sync to Clerk:', clerkError);
        }

        console.log(`[Sync Subscription] Synced for user ${userId}: ${newPlan} (${status})`);

        return NextResponse.json({
            success: true,
            subscription: {
                plan: newPlan,
                status,
                currentPeriodEnd: periodEnd?.toISOString() ?? null,
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            },
        });
    } catch (error: any) {
        console.error('[Sync Subscription] Error:', error);

        if (error.message?.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system not available' },
                { status: 503 }
            );
        }

        if (error.code === 'resource_missing') {
            return NextResponse.json({
                success: true,
                message: 'Subscription no longer exists on Stripe',
                subscription: { plan: 'free', status: 'canceled' },
            });
        }

        return NextResponse.json(
            { error: error.message || 'Failed to sync subscription' },
            { status: 500 }
        );
    }
}
