// app/api/stripe/sync-subscription/route.ts
// Sync subscription from Stripe to database
// Called after returning from Stripe Checkout or Portal

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, getPlanFromPriceId } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription, mapStripeStatus } from '@/lib/subscriptions';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Safely convert Unix timestamp to Date
 */
function safeTimestampToDate(timestamp: number | undefined | null): Date | null {
    if (timestamp === undefined || timestamp === null || isNaN(timestamp)) {
        return null;
    }
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
}

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get current subscription from our database
        const dbSubscription = await getUserSubscription(userId);

        if (!dbSubscription?.stripeSubscriptionId) {
            // No Stripe subscription to sync
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
        // Ensure the subscription's customer ID matches the user's customer ID
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

        // Extract subscription data
        const priceId = stripeSubscription.items.data[0]?.price.id;
        const newPlan = getPlanFromPriceId(priceId || '');
        const status = mapStripeStatus(stripeSubscription.status);
        const periodEnd = safeTimestampToDate(
            (stripeSubscription as any).current_period_end
        );

        // Update our database
        await upsertSubscription({
            userId,
            plan: newPlan,
            status,
            stripeCustomerId: dbSubscription.stripeCustomerId ?? undefined,
            stripeSubscriptionId: dbSubscription.stripeSubscriptionId,
            stripePriceId: priceId,
            currentPeriodEnd: periodEnd ?? undefined,
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            // Clear pending plan if the subscription was updated
            pendingPlan: stripeSubscription.cancel_at_period_end ? dbSubscription.pendingPlan : null,
        });

        // Sync to Clerk
        try {
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    subscription: {
                        plan: newPlan,
                        status,
                        currentPeriodEnd: periodEnd?.toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                },
            });
        } catch (clerkError) {
            console.error('[Sync Subscription] Failed to sync to Clerk:', clerkError);
            // Don't fail if Clerk sync fails
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
            // Subscription was deleted on Stripe
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
