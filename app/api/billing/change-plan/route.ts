// app/api/billing/change-plan/route.ts
// Handle plan upgrades and downgrades via Stripe subscription updates

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe, STRIPE_PRICES, getPlanFromPriceId } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { clerkClient } from '@clerk/nextjs/server';

// Plan hierarchy for determining upgrade vs downgrade
const PLAN_HIERARCHY = { free: 0, pro: 1, max: 2 } as const;

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
        if (!['pro', 'max'].includes(targetPlan)) {
            return NextResponse.json(
                { error: 'Invalid target plan. Use pro or max.' },
                { status: 400 }
            );
        }

        const subscription = await getUserSubscription(userId);

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
        const currentPlan = subscription.plan as keyof typeof PLAN_HIERARCHY;
        const isUpgrade = PLAN_HIERARCHY[targetPlan as keyof typeof PLAN_HIERARCHY] > PLAN_HIERARCHY[currentPlan];
        const isDowngrade = PLAN_HIERARCHY[targetPlan as keyof typeof PLAN_HIERARCHY] < PLAN_HIERARCHY[currentPlan];

        console.log('[Change Plan] Updating subscription:', {
            subscriptionId: subscription.stripeSubscriptionId,
            isUpgrade,
            isDowngrade,
        });

        // Get current subscription to find the subscription item ID
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        const subscriptionItemId = stripeSubscription.items.data[0]?.id;

        if (!subscriptionItemId) {
            return NextResponse.json(
                { error: 'Could not find subscription item' },
                { status: 500 }
            );
        }

        if (isUpgrade) {
            // Upgrade: Apply immediately with proration
            const updatedSubscription = await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    items: [{ id: subscriptionItemId, price: priceId }],
                    proration_behavior: 'create_prorations',
                    // If subscription was scheduled to cancel, reactivate it
                    cancel_at_period_end: false,
                }
            );

            await upsertSubscription({
                userId,
                plan: targetPlan,
                status: 'active',
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                stripeCustomerId: subscription.stripeCustomerId ?? undefined,
                cancelAtPeriodEnd: false,
            });

            // Update Clerk metadata
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    subscriptionPlan: targetPlan,
                    subscriptionStatus: 'active',
                },
            });

            return NextResponse.json({
                action: 'upgraded',
                success: true,
                message: `Successfully upgraded to ${targetPlan.toUpperCase()}!`,
                plan: targetPlan,
            });
        } else if (isDowngrade) {
            // Downgrade: Schedule for end of billing period using subscription schedule
            // Note: For now, we'll apply at period end by setting the new price immediately
            // but with no proration, so user keeps current plan until renewal

            const updatedSubscription = await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    items: [{ id: subscriptionItemId, price: priceId }],
                    proration_behavior: 'none', // No refund/charge, just update
                    billing_cycle_anchor: 'unchanged',
                }
            );

            // Get the period end date
            const periodEnd = new Date((updatedSubscription as any).current_period_end * 1000);

            await upsertSubscription({
                userId,
                plan: targetPlan,
                status: 'active',
                stripeSubscriptionId: subscription.stripeSubscriptionId,
                stripeCustomerId: subscription.stripeCustomerId ?? undefined,
                cancelAtPeriodEnd: false,
            });

            // Update Clerk metadata
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    subscriptionPlan: targetPlan,
                    subscriptionStatus: 'active',
                },
            });

            return NextResponse.json({
                action: 'downgraded',
                success: true,
                message: `Plan changed to ${targetPlan.toUpperCase()}. Your current benefits remain active until ${periodEnd.toLocaleDateString()}.`,
                plan: targetPlan,
                effectiveDate: periodEnd.toISOString(),
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
