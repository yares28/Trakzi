// app/api/webhook/stripe/route.ts
// Handle Stripe webhooks for subscription lifecycle events

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { getStripe, getPlanFromPriceId, isTransactionPackPriceId } from '@/lib/stripe';
import { upsertSubscription, getSubscriptionByStripeCustomerId, mapStripeStatus } from '@/lib/subscriptions';
import { getTransactionPackByPriceId } from '@/lib/plan-limits';
import { syncWalletForPlan, addPurchasedCapacity } from '@/lib/limits/transaction-wallet';
import {
    isEventProcessed,
    markEventAsProcessing,
    markEventAsCompleted,
    markEventAsFailed,
} from '@/lib/webhook-events';
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter';

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs';

// Stripe subscription object shape (for type safety without relying on SDK types)
interface StripeSubscriptionData {
    id: string;
    status: string;
    customer: string | { id: string };
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
    // IP-based rate limiting before signature verification (DoS protection)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitResult = await checkRateLimit(`webhook:stripe:${ip}`, 'webhook');
    if (rateLimitResult.limited) {
        return createRateLimitResponse(rateLimitResult.resetIn);
    }

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('[Webhook] STRIPE_WEBHOOK_SECRET is not set');
        // Return generic error without exposing internal details
        return NextResponse.json(
            { received: false },
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

    // CRITICAL: Check idempotency using event ID (Stripe best practice)
    const eventId = event.id;
    const alreadyProcessed = await isEventProcessed(eventId);

    if (alreadyProcessed) {
        console.log(`[Webhook] Event ${eventId} already processed, skipping (idempotency)`);
        return NextResponse.json({ received: true });
    }

    // Mark as processing to prevent concurrent processing
    const customerId = (event.data.object as any).customer;
    const subscriptionId = (event.data.object as any).id;

    await markEventAsProcessing(eventId, event.type, {
        customerId: typeof customerId === 'string' ? customerId : customerId?.id,
        subscriptionId: event.type.includes('subscription') ? subscriptionId : undefined,
    });

    console.log(`[Webhook] Processing event: ${event.type} (ID: ${eventId})`);

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

        // Mark event as successfully completed
        await markEventAsCompleted(eventId, {
            customerId: typeof customerId === 'string' ? customerId : customerId?.id,
            subscriptionId: event.type.includes('subscription') ? subscriptionId : undefined,
        });

        return NextResponse.json({ received: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Webhook] Error processing ${event.type} (${eventId}):`, error);

        // Mark event as failed (allows Stripe to retry)
        const errorForLogging = error instanceof Error ? error : String(error);
        await markEventAsFailed(eventId, errorForLogging, {
            customerId: typeof customerId === 'string' ? customerId : customerId?.id,
            subscriptionId: event.type.includes('subscription') ? subscriptionId : undefined,
        });

        // Return 500 so Stripe retries automatically (Stripe handles retries for 3 days)
        return NextResponse.json(
            { error: 'Webhook processing failed' },
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
    const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    if (!userId) {
        console.error('[Webhook] No userId in checkout session metadata', {
            sessionId: session.id,
            customerId,
        });
        return;
    }

    if (!customerId) {
        console.error('[Webhook] Invalid customer ID in checkout session', {
            sessionId: session.id,
            userId,
        });
        return;
    }

    // ── Transaction Pack Purchase (one-time payment) ──────────────────────────
    if (session.metadata?.purchase_type === 'transaction_pack') {
        const packId = session.metadata.pack_id;
        const packTransactions = parseInt(session.metadata.pack_transactions || '0', 10);

        if (!packId || packTransactions <= 0) {
            console.error('[Webhook] Invalid transaction pack metadata', {
                sessionId: session.id,
                userId,
                packId,
                packTransactions,
            });
            return;
        }

        await addPurchasedCapacity(userId, packTransactions);
        console.log(`[Webhook] Added ${packTransactions} purchased transactions for user ${userId} (pack: ${packId})`);
        return;
    }

    // ── Subscription Purchase ─────────────────────────────────────────────────
    const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
        console.error('[Webhook] No subscription ID in checkout session', {
            sessionId: session.id,
            userId,
            customerId,
        });
        return;
    }

    console.log(`[Webhook] Checkout completed for user ${userId}`);

    const stripe = getStripe();
    const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
    const subscription = subscriptionResponse as unknown as StripeSubscriptionData;

    if (!subscription.items?.data || subscription.items.data.length === 0) {
        console.error('[Webhook] Subscription has no items', { subscriptionId, customerId, userId });
        return;
    }

    const priceId = subscription.items.data[0]?.price.id;

    if (!priceId) {
        console.error('[Webhook] Subscription item has no price ID', { subscriptionId, customerId, userId });
        return;
    }

    const plan = getPlanFromPriceId(priceId);

    if (plan === 'free' && priceId) {
        console.error('[Webhook] Price ID maps to free plan unexpectedly', {
            priceId, subscriptionId, customerId, userId,
        });
        return;
    }

    const periodEnd = safeTimestampToDate(subscription.current_period_end);
    const periodStart = periodEnd ? new Date(periodEnd.getTime() - 31 * 24 * 60 * 60 * 1000) : new Date();

    await upsertSubscription({
        userId,
        plan,
        status: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        currentPeriodEnd: periodEnd ?? undefined,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    // Sync wallet — sets base_capacity, resets monthly period
    await syncWalletForPlan(userId, plan, periodStart);

    await syncSubscriptionToClerk(userId, plan, 'active', customerId, periodEnd);
    console.log(`[Webhook] Subscription created for user ${userId}, plan: ${plan}`);
}

/**
 * Handle subscription updates (plan changes, renewals, etc.)
 */
async function handleSubscriptionUpdate(subscription: StripeSubscriptionData) {
    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (!customerId) {
        console.error('[Webhook] Invalid customer ID in subscription update', {
            subscriptionId: subscription.id,
        });
        return;
    }

    // Validate subscription has items
    if (!subscription.items?.data || subscription.items.data.length === 0) {
        console.error('[Webhook] Subscription has no items', {
            subscriptionId: subscription.id,
            customerId,
        });
        return;
    }

    const priceId = subscription.items.data[0]?.price.id;

    if (!priceId) {
        console.error('[Webhook] Subscription item has no price ID', {
            subscriptionId: subscription.id,
            customerId,
        });
        return;
    }

    const newPlan = getPlanFromPriceId(priceId);

    // Validate plan mapping
    if (newPlan === 'free' && priceId) {
        console.error('[Webhook] Price ID maps to free plan unexpectedly', {
            priceId,
            subscriptionId: subscription.id,
            customerId,
        });
        // Don't process - this indicates a configuration error
        return;
    }

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

        // Create new subscription record
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
        console.log(`[Webhook] Subscription created for user ${userId}, plan: ${newPlan}`);
    } else {
        // SECURITY: Verify customer ID matches (defense in depth)
        // This ensures the subscription belongs to the user in our database
        if (existingSub.stripeCustomerId && existingSub.stripeCustomerId !== customerId) {
            console.error('[Webhook] Customer ID mismatch in subscription update:', {
                userId: existingSub.userId,
                dbCustomerId: existingSub.stripeCustomerId,
                webhookCustomerId: customerId,
                subscriptionId: subscription.id,
            });
            return; // Don't process - potential security issue
        }
        userId = existingSub.userId;

        // userId already set above with customer ID verification
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
            // Upgrade or renewal at period end: Apply new plan immediately, clear pending
            // If this is a downgrade being applied at period end, enforce cap
            const isPendingDowngradeApplied = existingSub.pendingPlan &&
                PLAN_HIERARCHY[existingSub.pendingPlan as keyof typeof PLAN_HIERARCHY] < PLAN_HIERARCHY[currentPlan];

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

                // Sync wallet for plan change or renewal (sets new base, resets monthly period)
            const periodStart = periodEnd ? new Date(periodEnd.getTime() - 31 * 24 * 60 * 60 * 1000) : new Date();
            await syncWalletForPlan(userId, newPlan, periodStart);

            if (isPendingDowngradeApplied || isDowngrade) {
                console.log(`[Webhook] Downgrade applied to ${newPlan} for user ${userId} — wallet synced, writes blocked when over capacity`);
            }

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
    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (!customerId) {
        console.error('[Webhook] Invalid customer ID in subscription deleted', {
            subscriptionId: subscription.id,
        });
        return;
    }

    const periodEnd = safeTimestampToDate(subscription.current_period_end);

    const existingSub = await getSubscriptionByStripeCustomerId(customerId);

    if (existingSub) {
        const userId = existingSub.userId;
        const currentPlan = existingSub.plan;

        // Only enforce cap if user is downgrading from a paid plan to free
        // If already on free plan, skip enforcement (prevents double deletion)
        const isDowngradingToFree = currentPlan !== 'free';

        await upsertSubscription({
            userId,
            plan: 'free',
            status: 'canceled',
            currentPeriodEnd: periodEnd ?? undefined,
        });

        // Sync wallet to free plan — blocks new writes if over capacity, no auto-delete
        if (isDowngradingToFree) {
            await syncWalletForPlan(userId, 'free', new Date());
            console.log(`[Webhook] Subscription canceled — wallet synced to free plan for user ${userId} (was: ${currentPlan})`);
        }

        // Sync to Clerk - mark as canceled/free
        await syncSubscriptionToClerk(
            userId,
            'free',
            'canceled',
            customerId,
            periodEnd
        );

        console.log(`[Webhook] Subscription canceled for user ${userId}`);
    }
}

/**
 * Handle failed payment - mark subscription as past_due and sync to Clerk
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) {
        console.error('[Webhook] Invalid customer ID in payment failed invoice', {
            invoiceId: invoice.id,
        });
        return;
    }

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
    const customerId = typeof charge.customer === 'string'
        ? charge.customer
        : charge.customer?.id;

    if (!customerId) {
        console.error('[Webhook] Invalid customer ID in refunded charge', {
            chargeId: charge.id,
        });
        return;
    }

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

    const userId = existingSub.userId;
    const currentPlan = existingSub.plan;

    // Only enforce cap if user is downgrading from a paid plan to free
    // If already on free plan, skip enforcement (prevents double deletion)
    const isDowngradingToFree = currentPlan !== 'free';

    // Update our database - downgrade to free and mark as canceled
    await upsertSubscription({
        userId,
        plan: 'free',
        status: 'canceled',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date(), // Access ends immediately on refund
    });

    // Sync wallet to free plan — blocks new writes if over capacity, no auto-delete
    if (isDowngradingToFree) {
        await syncWalletForPlan(userId, 'free', new Date());
        console.log(`[Webhook] Refund: wallet synced to free plan for user ${userId} (was: ${currentPlan})`);
    }

    // Sync to Clerk - mark as canceled/free with refund flag
    try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(userId, {
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

    console.log(`[Webhook] Subscription cancelled due to refund for user ${userId}`);
}

// Note: mapStripeStatus is now imported from lib/subscriptions.ts
