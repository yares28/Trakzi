// app/api/webhook/stripe/route.ts
// Handle Stripe webhooks for subscription lifecycle events

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { getStripe, getPlanFromPriceId } from '@/lib/stripe';
import { upsertSubscription, getSubscriptionByStripeCustomerId } from '@/lib/subscriptions';

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs';

// Stripe subscription object shape (for type safety without relying on SDK types)
interface StripeSubscriptionData {
    id: string;
    status: string;
    customer: string;
    items: { data: Array<{ price: { id: string } }> };
    current_period_end: number;
    cancel_at_period_end: boolean;
    metadata?: Record<string, string>;
}

const relevantEvents = new Set([
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'charge.refunded',
]);

/**
 * Safely convert Unix timestamp to Date, returns null if invalid
 */
function safeTimestampToDate(timestamp: number | undefined | null): Date | null {
    if (timestamp === undefined || timestamp === null || isNaN(timestamp)) {
        return null;
    }
    const date = new Date(timestamp * 1000);
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
}

/**
 * Safely convert Date to ISO string, returns undefined if invalid
 */
function safeDateToISO(date: Date | null | undefined): string | undefined {
    if (!date || isNaN(date.getTime())) {
        return undefined;
    }
    return date.toISOString();
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('[Webhook] STRIPE_WEBHOOK_SECRET is not set');
        return NextResponse.json(
            { error: 'Webhook secret not configured' },
            { status: 500 }
        );
    }

    if (!signature) {
        console.error('[Webhook] Missing stripe-signature header');
        return NextResponse.json(
            { error: 'Missing signature' },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Webhook] Signature verification failed:', message);
        return NextResponse.json(
            { error: `Webhook signature verification failed: ${message}` },
            { status: 400 }
        );
    }

    // Check if this is an event we care about
    if (!relevantEvents.has(event.type)) {
        console.log(`[Webhook] Ignoring event type: ${event.type}`);
        return NextResponse.json({ received: true });
    }

    console.log(`[Webhook] Processing event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as unknown as StripeSubscriptionData;
                await handleSubscriptionUpdate(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as unknown as StripeSubscriptionData;
                await handleSubscriptionDeleted(subscription);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice);
                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge;
                await handleChargeRefunded(charge);
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Webhook] Error processing ${event.type}:`, error);
        return NextResponse.json(
            { error: `Webhook handler failed: ${message}` },
            { status: 500 }
        );
    }
}

/**
 * Sync subscription info to Clerk user metadata
 */
async function syncSubscriptionToClerk(userId: string, plan: string, status: string, stripeCustomerId: string, currentPeriodEnd: Date | null) {
    try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                subscription: {
                    plan,
                    status,
                    stripeCustomerId,
                    currentPeriodEnd: safeDateToISO(currentPeriodEnd),
                    updatedAt: new Date().toISOString(),
                },
            },
        });
        console.log(`[Webhook] Synced subscription to Clerk for user ${userId}`);
    } catch (clerkError) {
        console.error(`[Webhook] Failed to sync to Clerk:`, clerkError);
        // Don't fail if Clerk sync fails
    }
}

/**
 * Handle checkout.session.completed
 * Creates initial subscription record
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId) {
        console.error('[Webhook] No userId in checkout session metadata');
        return;
    }

    console.log(`[Webhook] Checkout completed for user ${userId}`);

    // Get subscription details from Stripe
    const stripe = getStripe();
    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
    // Use our interface type for proper typing
    const subscription = subscriptionResponse as unknown as StripeSubscriptionData;
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanFromPriceId(priceId || '');

    const periodEnd = safeTimestampToDate(subscription.current_period_end);

    await upsertSubscription({
        userId,
        plan,
        status: subscription.status === 'active' ? 'active' : 'trialing',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        currentPeriodEnd: periodEnd ?? undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    // Sync to Clerk
    const status = subscription.status === 'active' ? 'active' : 'trialing';
    await syncSubscriptionToClerk(userId, plan, status, customerId, periodEnd);

    console.log(`[Webhook] Subscription created for user ${userId}, plan: ${plan}`);
}

/**
 * Handle subscription updates (plan changes, renewals, etc.)
 */
async function handleSubscriptionUpdate(subscription: StripeSubscriptionData) {
    const customerId = subscription.customer;
    const priceId = subscription.items.data[0]?.price.id;
    const newPlan = getPlanFromPriceId(priceId || '');
    const status = mapStripeStatus(subscription.status);
    const periodEnd = safeTimestampToDate(subscription.current_period_end);

    // Find user by Stripe customer ID
    const existingSub = await getSubscriptionByStripeCustomerId(customerId);

    let userId: string;

    // Plan hierarchy for comparison
    const PLAN_HIERARCHY: Record<string, number> = { free: 0, pro: 1, max: 2 };

    if (!existingSub) {
        // Check metadata for userId (from subscription creation)
        const metaUserId = subscription.metadata?.userId;
        if (!metaUserId) {
            console.error('[Webhook] Cannot find user for subscription update');
            return;
        }
        userId = metaUserId;

        await upsertSubscription({
            userId,
            plan: newPlan,
            status,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            currentPeriodEnd: periodEnd ?? undefined,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        // Sync to Clerk
        await syncSubscriptionToClerk(userId, newPlan, status, customerId, periodEnd);
    } else {
        userId = existingSub.userId;
        const currentPlan = existingSub.plan;

        // Check if this is a downgrade
        const currentTier = PLAN_HIERARCHY[currentPlan] ?? 0;
        const newTier = PLAN_HIERARCHY[newPlan] ?? 0;
        const isDowngrade = newTier < currentTier;

        // Check if we're at the period end (renewal time) - time to apply pending changes
        const now = new Date();
        const isAtPeriodEnd = periodEnd && Math.abs(now.getTime() - periodEnd.getTime()) < 60000; // Within 1 minute

        if (isDowngrade && !isAtPeriodEnd) {
            // Downgrade: Keep current plan, set pending plan
            console.log(`[Webhook] Downgrade detected from ${currentPlan} to ${newPlan}, setting as pending`);
            await upsertSubscription({
                userId,
                plan: currentPlan, // Keep current plan
                status,
                stripeSubscriptionId: subscription.id,
                stripePriceId: priceId,
                currentPeriodEnd: periodEnd ?? undefined,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                pendingPlan: newPlan, // Set as pending
            });

            // Don't update Clerk - user still has their current plan
            console.log(`[Webhook] Subscription downgrade scheduled for customer ${customerId}`);
        } else {
            // Upgrade or renewal: Apply new plan immediately, clear pending
            await upsertSubscription({
                userId,
                plan: newPlan,
                status,
                stripeSubscriptionId: subscription.id,
                stripePriceId: priceId,
                currentPeriodEnd: periodEnd ?? undefined,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                pendingPlan: null, // Clear any pending plan
            });

            // Sync to Clerk
            await syncSubscriptionToClerk(userId, newPlan, status, customerId, periodEnd);
            console.log(`[Webhook] Subscription updated for customer ${customerId}`);
        }
    }
}

/**
 * Handle subscription cancellation/deletion
 */
async function handleSubscriptionDeleted(subscription: StripeSubscriptionData) {
    const customerId = subscription.customer;
    const periodEnd = safeTimestampToDate(subscription.current_period_end);

    const existingSub = await getSubscriptionByStripeCustomerId(customerId);

    if (existingSub) {
        await upsertSubscription({
            userId: existingSub.userId,
            plan: 'free',
            status: 'canceled',
            currentPeriodEnd: periodEnd ?? undefined,
        });

        // Sync to Clerk - mark as canceled/free
        await syncSubscriptionToClerk(
            existingSub.userId,
            'free',
            'canceled',
            customerId,
            periodEnd
        );

        console.log(`[Webhook] Subscription canceled for user ${existingSub.userId}`);
    }
}

/**
 * Handle failed payment - mark subscription as past_due and sync to Clerk
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;
    const attemptCount = invoice.attempt_count || 1;

    console.log(`[Webhook] Payment failed for customer ${customerId}, attempt ${attemptCount}`);

    const existingSub = await getSubscriptionByStripeCustomerId(customerId);

    if (existingSub) {
        await upsertSubscription({
            userId: existingSub.userId,
            plan: existingSub.plan,
            status: 'past_due',
        });

        // Sync payment failure to Clerk so UI can show warning
        try {
            const client = await clerkClient();
            await client.users.updateUserMetadata(existingSub.userId, {
                publicMetadata: {
                    subscription: {
                        plan: existingSub.plan,
                        status: 'past_due',
                        paymentFailed: true,
                        failedAt: new Date().toISOString(),
                        attemptCount,
                    },
                },
            });
        } catch (clerkError) {
            console.error('[Webhook] Failed to sync payment failure to Clerk:', clerkError);
        }

        console.log(`[Webhook] Payment failed for user ${existingSub.userId}, attempt ${attemptCount}`);
    }
}

/**
 * Handle charge.refunded - cancel subscription and revoke access
 * This is triggered when you issue a refund from the Stripe dashboard
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
    const customerId = charge.customer as string;
    const amountRefunded = charge.amount_refunded;
    const refundedFull = charge.refunded; // true if fully refunded

    console.log(`[Webhook] Charge refunded for customer ${customerId}, amount: ${amountRefunded}, full refund: ${refundedFull}`);

    // Only cancel on full refund (you can adjust this logic if needed)
    if (!refundedFull) {
        console.log(`[Webhook] Partial refund - not cancelling subscription`);
        return;
    }

    const existingSub = await getSubscriptionByStripeCustomerId(customerId);

    if (!existingSub) {
        console.log(`[Webhook] No subscription found for customer ${customerId}`);
        return;
    }

    // Cancel the subscription in Stripe if it exists
    if (existingSub.stripeSubscriptionId) {
        try {
            const stripe = getStripe();
            await stripe.subscriptions.cancel(existingSub.stripeSubscriptionId);
            console.log(`[Webhook] Cancelled Stripe subscription ${existingSub.stripeSubscriptionId}`);
        } catch (stripeError) {
            console.error(`[Webhook] Failed to cancel Stripe subscription:`, stripeError);
            // Continue to update our database even if Stripe cancel fails
        }
    }

    // Update our database - downgrade to free and mark as canceled
    await upsertSubscription({
        userId: existingSub.userId,
        plan: 'free',
        status: 'canceled',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(), // Access ends immediately on refund
    });

    // Sync to Clerk - mark as canceled/free with refund flag
    try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(existingSub.userId, {
            publicMetadata: {
                subscription: {
                    plan: 'free',
                    status: 'canceled',
                    refunded: true,
                    refundedAt: new Date().toISOString(),
                },
            },
        });
    } catch (clerkError) {
        console.error('[Webhook] Failed to sync refund to Clerk:', clerkError);
    }

    console.log(`[Webhook] Subscription cancelled due to refund for user ${existingSub.userId}`);
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(stripeStatus: string): 'active' | 'canceled' | 'past_due' | 'trialing' {
    switch (stripeStatus) {
        case 'active':
            return 'active';
        case 'trialing':
            return 'trialing';
        case 'past_due':
        case 'unpaid':
            return 'past_due';
        case 'canceled':
        case 'incomplete_expired':
            return 'canceled';
        default:
            return 'active';
    }
}
