// app/api/billing/apply-retention-coupon/route.ts
// Apply a 30% discount coupon to subscription for 1 month retention offer

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getUserSubscription } from '@/lib/subscriptions';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter';
import { getSubscriptionBlockReason } from '@/lib/billing-utils';

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

        const blockReason = getSubscriptionBlockReason(subscription?.status);
        if (blockReason) {
            return NextResponse.json({ error: blockReason }, { status: 403 });
        }

        if (!subscription || !subscription.stripeSubscriptionId) {
            return NextResponse.json(
                { error: 'No active subscription found.' },
                { status: 400 }
            );
        }

        if (subscription.plan === 'free') {
            return NextResponse.json(
                { error: 'You are already on the free plan.' },
                { status: 400 }
            );
        }

        const stripe = getStripe();

        let couponId = 'retention_30_off';

        try {
            await stripe.coupons.retrieve(couponId);
        } catch (error: unknown) {
            const e = error as { code?: string };
            if (e.code === 'resource_missing') {
                try {
                    await stripe.coupons.create({
                        id: couponId,
                        percent_off: 30,
                        duration: 'once',
                        name: '30% Off - Stay One More Month',
                    });
                    console.log(`[Retention Coupon] Created coupon ${couponId}`);
                } catch (createError: unknown) {
                    console.error('[Retention Coupon] Failed to create coupon:', createError);
                    return NextResponse.json(
                        { error: 'Failed to create discount coupon. Please contact support.' },
                        { status: 500 }
                    );
                }
            } else {
                console.error('[Retention Coupon] Error retrieving coupon:', error);
                return NextResponse.json(
                    { error: 'Failed to apply discount. Please contact support.' },
                    { status: 500 }
                );
            }
        }

        try {
            const updatedSubscription = await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    discounts: [{
                        coupon: couponId,
                    }],
                }
            );

            if (updatedSubscription.cancel_at_period_end) {
                await stripe.subscriptions.update(
                    subscription.stripeSubscriptionId,
                    {
                        cancel_at_period_end: false,
                    }
                );
            }

            console.log(`[Retention Coupon] Applied coupon ${couponId} to subscription ${subscription.stripeSubscriptionId}`);

            return NextResponse.json({
                success: true,
                message: '30% discount applied! Your next invoice will be discounted. Your subscription will continue.',
                couponId,
            });
        } catch (stripeError: unknown) {
            console.error('[Retention Coupon] Failed to apply coupon:', stripeError);
            return NextResponse.json(
                { error: 'Failed to apply discount. Please contact support.' },
                { status: 400 }
            );
        }
    } catch (error: unknown) {
        console.error('[Retention Coupon] Error:', error);
        const msg = error instanceof Error ? error.message : '';

        if (msg.includes('Stripe is not initialized')) {
            return NextResponse.json(
                { error: 'Payment system not configured. Please contact support.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to apply retention discount. Please try again or contact support.' },
            { status: 500 }
        );
    }
}
