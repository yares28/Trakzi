// app/api/billing/change-plan/route.ts
// Handle plan upgrades and downgrades via Stripe subscription updates

import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getStripe, STRIPE_PRICES, getPlanFromPriceId } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter';
import {
    safeTimestampToDate,
    PLAN_HIERARCHY,
    buildClerkSubscriptionMetadata,
    invalidateSubscriptionCaches,
    getSubscriptionBlockReason,
} from '@/lib/billing-utils';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { targetPlan, priceId } = body;

        if (!targetPlan || !priceId) {
            return NextResponse.json(
                { error: 'Missing required fields: targetPlan and priceId' },
                { status: 400 }
            );
        }

        if (!['pro', 'max'].includes(targetPlan)) {
            return NextResponse.json(
                { error: 'Invalid target plan. Use pro or max.' },
                { status: 400 }
            );
        }

        // Validate priceId against known allowed prices
        const allowedPriceIds = [
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

        const subscription = await getUserSubscription(userId);

        // Block disputed accounts from any billing action
        const blockReason = getSubscriptionBlockReason(subscription?.status);
        if (blockReason) {
            return NextResponse.json({ error: blockReason }, { status: 403 });
        }

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

        // Case 1: Free user — redirect to checkout
        if (!subscription || subscription.plan === 'free' || !subscription.stripeSubscriptionId) {
            console.log('[Change Plan] Creating new checkout session for free user');

            const stripe = getStripe();
            const { getAppUrl } = await import('@/lib/env');
            const appUrl = getAppUrl();

            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                payment_method_options: {
                    card: {
                        // Same 3DS setting as /api/checkout for liability shift on fraud disputes
                        request_three_d_secure: 'automatic',
                    },
                },
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: `${appUrl}/home?checkout=success&plan=${targetPlan}`,
                cancel_url: `${appUrl}/?checkout=canceled`,
                ...(subscription?.stripeCustomerId && { customer: subscription.stripeCustomerId }),
                metadata: { userId },
                subscription_data: { metadata: { userId } },
                allow_promotion_codes: true,
            });

            return NextResponse.json({ action: 'checkout', url: session.url });
        }

        // Case 2: Active subscriber — update the existing Stripe subscription
        const stripe = getStripe();

        const currentPlanLower = subscription.plan as keyof typeof PLAN_HIERARCHY;
        const targetPlanLower = targetPlan.toLowerCase() as keyof typeof PLAN_HIERARCHY;

        if (!(currentPlanLower in PLAN_HIERARCHY) || !(targetPlanLower in PLAN_HIERARCHY)) {
            return NextResponse.json(
                { error: `Unrecognised plan tier. Please contact support.` },
                { status: 400 }
            );
        }

        if (PLAN_HIERARCHY[targetPlanLower] === PLAN_HIERARCHY[currentPlanLower]) {
            return NextResponse.json(
                { error: `You are already on the ${targetPlan.toUpperCase()} plan.` },
                { status: 400 }
            );
        }

        const isUpgrade = PLAN_HIERARCHY[targetPlanLower] > PLAN_HIERARCHY[currentPlanLower];

        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

        if (!stripeSubscription.items?.data?.length) {
            return NextResponse.json(
                { error: 'Invalid subscription. Please contact support.' },
                { status: 500 }
            );
        }

        const subscriptionItemId = stripeSubscription.items.data[0]?.id;
        if (!subscriptionItemId) {
            return NextResponse.json(
                { error: 'Could not find subscription item. Please contact support.' },
                { status: 500 }
            );
        }

        if (isUpgrade) {
            const updatedSubscription = await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    items: [{ id: subscriptionItemId, price: priceId }],
                    proration_behavior: 'always_invoice',
                    billing_cycle_anchor: 'unchanged',
                    cancel_at_period_end: false,
                    payment_behavior: 'error_if_incomplete',
                }
            );

            const periodEnd = safeTimestampToDate((updatedSubscription as any).current_period_end);

            await upsertSubscription({
                userId,
                plan: targetPlanLower,
                status: 'active',
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                stripeCustomerId: subscription.stripeCustomerId ?? undefined,
                cancelAtPeriodEnd: false,
                currentPeriodEnd: periodEnd ?? undefined,
                pendingPlan: null,
            });

            const client = await clerkClient();
            await client.users.updateUserMetadata(
                userId,
                buildClerkSubscriptionMetadata({
                    plan: targetPlanLower,
                    status: 'active',
                    stripeCustomerId: subscription.stripeCustomerId,
                    currentPeriodEnd: periodEnd,
                })
            );

            await invalidateSubscriptionCaches(userId);

            const periodEndStr = periodEnd ? periodEnd.toLocaleDateString() : 'your next billing date';
            return NextResponse.json({
                action: 'upgraded',
                success: true,
                message: `Successfully upgraded to ${targetPlan.toUpperCase()}! You'll be charged the new rate starting ${periodEndStr}.`,
                plan: targetPlanLower,
                effectiveDate: periodEnd?.toISOString(),
            });
        } else {
            // Downgrade — schedule for period end
            const updatedSubscription = await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    items: [{ id: subscriptionItemId, price: priceId }],
                    proration_behavior: 'none',
                    billing_cycle_anchor: 'unchanged',
                }
            );

            const periodEnd = safeTimestampToDate((updatedSubscription as any).current_period_end);

            await upsertSubscription({
                userId,
                plan: currentPlanLower,
                status: 'active',
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                stripeCustomerId: subscription.stripeCustomerId ?? undefined,
                cancelAtPeriodEnd: false,
                currentPeriodEnd: periodEnd ?? undefined,
                pendingPlan: targetPlanLower,
            });

            // No Clerk update for downgrades — user keeps current plan until period end
            await invalidateSubscriptionCaches(userId);

            const periodEndStr = periodEnd ? periodEnd.toLocaleDateString() : 'the end of your billing period';
            return NextResponse.json({
                action: 'downgraded',
                success: true,
                message: `Your plan will change to ${targetPlan.toUpperCase()} on ${periodEndStr}. You keep your current benefits until then.`,
                plan: currentPlanLower,
                pendingPlan: targetPlanLower,
                effectiveDate: periodEnd?.toISOString(),
            });
        }
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
        if (error.type === 'StripeCardError') {
            return NextResponse.json(
                { error: 'Payment failed. Please check your payment method and try again.' },
                { status: 402 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to change plan. Please try again or contact support.' },
            { status: 500 }
        );
    }
}
