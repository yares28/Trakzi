// app/api/billing/change-plan/route.ts
// Handle plan upgrades and downgrades via Stripe subscription updates

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, STRIPE_PRICES, getPlanFromPriceId } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { clerkClient } from '@clerk/nextjs/server';

// Plan hierarchy for determining upgrade vs downgrade
const PLAN_HIERARCHY = { free: 0, basic: 1, pro: 2, max: 3 } as const;

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

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { targetPlan, priceId } = body;

        if (!targetPlan || !priceId) {
            return NextResponse.json(
                { error: 'Missing required fields: targetPlan and priceId' },
                { status: 400 }
            );
        }

        // Validate target plan
        if (!['basic', 'pro', 'max'].includes(targetPlan)) {
            return NextResponse.json(
                { error: 'Invalid target plan. Use basic, pro or max.' },
                { status: 400 }
            );
        }

        const subscription = await getUserSubscription(userId);

        // Validate priceId against allowed prices
        const allowedPriceIds = [
            STRIPE_PRICES.BASIC_MONTHLY,
            STRIPE_PRICES.BASIC_ANNUAL,
            STRIPE_PRICES.PRO_MONTHLY,
            STRIPE_PRICES.PRO_ANNUAL,
            STRIPE_PRICES.MAX_MONTHLY,
            STRIPE_PRICES.MAX_ANNUAL,
        ].filter(Boolean) as string[];

        if (!allowedPriceIds.includes(priceId)) {
            console.error('[Change Plan] Invalid price ID:', { priceId, userId });
            return NextResponse.json(
                { error: 'Invalid pricing option. Please select a valid plan.' },
                { status: 400 }
            );
        }

        // Check if subscription is in valid state for plan changes
        if (subscription?.status === 'past_due') {
            return NextResponse.json(
                { error: 'Please update your payment method before changing plans.' },
                { status: 400 }
            );
        }

        console.log('[Change Plan] Request:', {
            userId,
            currentPlan: subscription?.plan,
            targetPlan,
            priceId,
        });

        // Case 1: User is on free plan or has no subscription - create new checkout session
        if (!subscription || subscription.plan === 'free' || !subscription.stripeSubscriptionId) {
            console.log('[Change Plan] Creating new checkout session for free user');

            const stripe = getStripe();
            const { getAppUrl } = await import('@/lib/env');
            const appUrl = getAppUrl();

            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: `${appUrl}/home?checkout=success&plan=${targetPlan}`,
                cancel_url: `${appUrl}/dashboard?checkout=canceled`,
                ...(subscription?.stripeCustomerId && { customer: subscription.stripeCustomerId }),
                metadata: { userId },
                subscription_data: { metadata: { userId } },
                allow_promotion_codes: true,
            });

            return NextResponse.json({
                action: 'checkout',
                url: session.url
            });
        }

        // Case 2: User has an active subscription - update it
        const stripe = getStripe();

        // Normalize plan names to lowercase for comparison
        const currentPlanLower = subscription.plan.toLowerCase() as keyof typeof PLAN_HIERARCHY;
        const targetPlanLower = targetPlan.toLowerCase() as keyof typeof PLAN_HIERARCHY;

        // Check if plans are valid
        if (!(currentPlanLower in PLAN_HIERARCHY)) {
            console.error(`[Change Plan] Invalid current plan: ${subscription.plan}`);
            return NextResponse.json(
                { error: `Invalid current plan: ${subscription.plan}` },
                { status: 400 }
            );
        }
        if (!(targetPlanLower in PLAN_HIERARCHY)) {
            console.error(`[Change Plan] Invalid target plan: ${targetPlan}`);
            return NextResponse.json(
                { error: `Invalid target plan: ${targetPlan}` },
                { status: 400 }
            );
        }

        const isUpgrade = PLAN_HIERARCHY[targetPlanLower] > PLAN_HIERARCHY[currentPlanLower];
        const isDowngrade = PLAN_HIERARCHY[targetPlanLower] < PLAN_HIERARCHY[currentPlanLower];
        const isSamePlan = PLAN_HIERARCHY[targetPlanLower] === PLAN_HIERARCHY[currentPlanLower];

        console.log('[Change Plan] Updating subscription:', {
            subscriptionId: subscription.stripeSubscriptionId,
            currentPlan: currentPlanLower,
            targetPlan: targetPlanLower,
            isUpgrade,
            isDowngrade,
            isSamePlan,
        });

        if (isSamePlan) {
            return NextResponse.json(
                { error: `You are already on the ${targetPlan.toUpperCase()} plan.` },
                { status: 400 }
            );
        }

        // Get current subscription to find the subscription item ID
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

        // Validate subscription has items
        if (!stripeSubscription.items?.data || stripeSubscription.items.data.length === 0) {
            console.error('[Change Plan] Subscription has no items', {
                subscriptionId: subscription.stripeSubscriptionId,
                userId,
            });
            return NextResponse.json(
                { error: 'Invalid subscription. Please contact support.' },
                { status: 500 }
            );
        }

        const subscriptionItemId = stripeSubscription.items.data[0]?.id;

        if (!subscriptionItemId) {
            console.error('[Change Plan] Subscription item has no ID', {
                subscriptionId: subscription.stripeSubscriptionId,
                userId,
            });
            return NextResponse.json(
                { error: 'Could not find subscription item' },
                { status: 500 }
            );
        }

        if (isUpgrade) {
            // Upgrade: Charge immediately with proration
            // User pays the prorated difference NOW and gets immediate access
            const updatedSubscription = await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    items: [{ id: subscriptionItemId, price: priceId }],
                    proration_behavior: 'always_invoice', // Charge prorated difference immediately
                    billing_cycle_anchor: 'unchanged',
                    // If subscription was scheduled to cancel, reactivate it
                    cancel_at_period_end: false,
                    // Handle payment failures gracefully
                    payment_behavior: 'error_if_incomplete',
                }
            );

            const periodEnd = safeTimestampToDate((updatedSubscription as any).current_period_end);

            // For upgrades, we DO update the plan immediately since they get higher features right away
            await upsertSubscription({
                userId,
                plan: targetPlanLower,
                status: 'active',
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                stripeCustomerId: subscription.stripeCustomerId ?? undefined,
                cancelAtPeriodEnd: false,
                currentPeriodEnd: periodEnd ?? undefined,
                pendingPlan: null, // Clear any pending plan
            });

            // Update Clerk metadata
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    subscriptionPlan: targetPlanLower,
                    subscriptionStatus: 'active',
                },
            });

            const periodEndStr = periodEnd ? periodEnd.toLocaleDateString() : 'your next billing date';

            return NextResponse.json({
                action: 'upgraded',
                success: true,
                message: `Successfully upgraded to ${targetPlan.toUpperCase()}! You'll be charged the new rate starting ${periodEndStr}.`,
                plan: targetPlanLower,
                effectiveDate: periodEnd?.toISOString(),
            });
        } else if (isDowngrade) {
            // Downgrade: Schedule for end of billing period
            // Keep current plan until the end, set pendingPlan for what they'll switch to
            const updatedSubscription = await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    items: [{ id: subscriptionItemId, price: priceId }],
                    proration_behavior: 'none', // No refund/charge, just update
                    billing_cycle_anchor: 'unchanged',
                }
            );

            // Get the period end date safely
            const periodEnd = safeTimestampToDate((updatedSubscription as any).current_period_end);

            // KEEP the current plan, but set the pending plan
            await upsertSubscription({
                userId,
                plan: currentPlanLower, // Keep the current plan!
                status: 'active',
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                stripeCustomerId: subscription.stripeCustomerId ?? undefined,
                cancelAtPeriodEnd: false,
                currentPeriodEnd: periodEnd ?? undefined,
                pendingPlan: targetPlanLower, // This is what they'll switch to
            });

            // Don't update Clerk metadata - they still have their current plan

            const periodEndStr = periodEnd ? periodEnd.toLocaleDateString() : 'the end of your billing period';

            return NextResponse.json({
                action: 'downgraded',
                success: true,
                message: `Your plan will change to ${targetPlan.toUpperCase()} on ${periodEndStr}. You keep your current benefits until then.`,
                plan: currentPlanLower, // Keep showing current plan
                pendingPlan: targetPlanLower,
                effectiveDate: periodEnd?.toISOString(),
            });
        }

        return NextResponse.json(
            { error: 'No plan change detected' },
            { status: 400 }
        );

    } catch (error: any) {
        console.error('[Change Plan] Error:', error);

        if (error.message?.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system not configured. Please contact support.' },
                { status: 503 }
            );
        }

        if (error.type === 'StripeInvalidRequestError') {
            return NextResponse.json(
                { error: 'Invalid subscription or price. Please contact support.' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to change plan' },
            { status: 500 }
        );
    }
}
