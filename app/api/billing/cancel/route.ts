// app/api/billing/cancel/route.ts
// Cancel subscription at period end (user keeps access until end of billing period)

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { clerkClient } from '@clerk/nextjs/server';
import type Stripe from 'stripe';

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
        // Get authenticated user
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        // Get user's subscription
        const subscription = await getUserSubscription(userId);

        console.log('[Cancel Subscription] User subscription:', {
            userId,
            plan: subscription?.plan,
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
                { error: 'You are already on the free plan.' },
                { status: 400 }
            );
        }

        // Check for lifetime subscriptions
        if (subscription.isLifetime) {
            return NextResponse.json(
                { error: 'Lifetime subscriptions cannot be cancelled. Your subscription never expires!' },
                { status: 400 }
            );
        }

        if (!subscription.stripeSubscriptionId) {
            // No Stripe subscription ID - just update our database
            console.log('[Cancel Subscription] No Stripe subscription ID, updating database only');

            await upsertSubscription({
                userId,
                plan: 'free',
                status: 'canceled',
                cancelAtPeriodEnd: false,
            });

            // Update Clerk metadata
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    subscriptionPlan: 'free',
                    subscriptionStatus: 'canceled',
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Subscription cancelled.',
                immediate: true,
            });
        }

        // Cancel on Stripe at period end
        const stripe = getStripe();

        const stripeSubResult = await stripe.subscriptions.update(
            subscription.stripeSubscriptionId,
            { cancel_at_period_end: true }
        );

        // Extract values from Stripe response safely
        const currentPeriodEndTimestamp = (stripeSubResult as unknown as { current_period_end: number }).current_period_end;
        const periodEndDate = safeTimestampToDate(currentPeriodEndTimestamp);

        console.log('[Cancel Subscription] Stripe subscription updated:', {
            id: stripeSubResult.id,
            cancelAtPeriodEnd: stripeSubResult.cancel_at_period_end,
            currentPeriodEnd: periodEndDate,
        });

        // Update our database
        await upsertSubscription({
            userId,
            plan: subscription.plan,
            status: 'active', // Still active until period end
            cancelAtPeriodEnd: true,
            currentPeriodEnd: periodEndDate ?? undefined,
        });

        // Update Clerk metadata
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                subscriptionPlan: subscription.plan,
                subscriptionStatus: 'canceling',
            },
        });

        const periodEndStr = periodEndDate ? periodEndDate.toLocaleDateString() : 'the end of your billing period';

        return NextResponse.json({
            success: true,
            message: `Your subscription will be cancelled at the end of your billing period on ${periodEndStr}.`,
            cancelDate: periodEndDate?.toISOString(),
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
            { error: error.message || 'Failed to cancel subscription' },
            { status: 500 }
        );
    }
}
