// app/api/billing/preview-upgrade/route.ts
// Preview upgrade cost using Stripe's proration API

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription } from '@/lib/subscriptions';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { targetPriceId } = body;

        if (!targetPriceId) {
            return NextResponse.json(
                { error: 'Missing targetPriceId' },
                { status: 400 }
            );
        }

        const subscription = await getUserSubscription(userId);

        if (!subscription?.stripeSubscriptionId) {
            // No existing subscription - they'll pay full price via checkout
            return NextResponse.json({
                type: 'new_subscription',
                message: 'Full payment required for new subscription',
            });
        }

        const stripe = getStripe();

        // Get current subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionId
        );

        const subscriptionItemId = stripeSubscription.items.data[0]?.id;

        if (!subscriptionItemId) {
            return NextResponse.json(
                { error: 'Could not find subscription item' },
                { status: 500 }
            );
        }

        // Use Stripe's upcoming invoice API to preview the proration
        const upcomingInvoice = await stripe.invoices.createPreview({
            customer: subscription.stripeCustomerId!,
            subscription: subscription.stripeSubscriptionId,
            subscription_details: {
                items: [
                    {
                        id: subscriptionItemId,
                        price: targetPriceId,
                    },
                ],
                proration_behavior: 'create_prorations',
            },
        });

        // The amount_due on the preview invoice represents what will be charged immediately
        // This includes the proration (credit for unused time on old plan + charge for remaining time on new plan)
        const prorationAmount = upcomingInvoice.amount_due;

        // Get the current period end
        const currentPeriodEnd = new Date(
            (stripeSubscription as any).current_period_end * 1000
        );

        // Days remaining in current period
        const now = new Date();
        const daysRemaining = Math.ceil(
            (currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return NextResponse.json({
            type: 'upgrade',
            prorationAmount: prorationAmount, // in cents
            prorationAmountFormatted: (prorationAmount / 100).toFixed(2),
            currency: upcomingInvoice.currency,
            daysRemaining,
            currentPeriodEnd: currentPeriodEnd.toISOString(),
            nextBillingAmount: upcomingInvoice.total, // Total for next period
            nextBillingAmountFormatted: (upcomingInvoice.total / 100).toFixed(2),
        });
    } catch (error: any) {
        console.error('[Preview Upgrade] Error:', error);

        if (error.message?.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system not available' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to preview upgrade' },
            { status: 500 }
        );
    }
}
