// app/api/billing/cancel-now/route.ts
// Immediately cancel a subscription (not at period end)

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription, upsertSubscription } from '@/lib/subscriptions';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        const subscription = await getUserSubscription(userId);

        console.log('[Cancel Now] Request:', {
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

        if (!subscription.stripeSubscriptionId) {
            // No Stripe subscription - just update the database
            await upsertSubscription({
                userId,
                plan: 'free',
                status: 'canceled',
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
                message: 'Your subscription has been canceled.',
            });
        }

        // Cancel immediately on Stripe (not at period end)
        const stripe = getStripe();

        const canceledSubscription = await stripe.subscriptions.cancel(
            subscription.stripeSubscriptionId
        );

        console.log('[Cancel Now] Stripe subscription canceled:', {
            id: canceledSubscription.id,
            status: canceledSubscription.status,
        });

        // Update our database
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
            { error: error.message || 'Failed to cancel subscription' },
            { status: 500 }
        );
    }
}
