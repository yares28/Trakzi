// lib/analytics/stripe-events.ts
// Server-side PostHog events for Stripe lifecycle.
// Called from the Stripe webhook so revenue tracking survives users closing the tab.
//
// Design notes:
// - distinctId is always the Clerk userId (matches posthog-user-identifier.tsx)
// - All capture calls are non-throwing: captureServerEvent already swallows errors.
// - Event names are server-only and not listed in types/posthog-events.ts to avoid
//   implying they can be fired from the client.

import type Stripe from 'stripe';
import { captureServerEvent } from '@/lib/posthog-server';
import { getBillingIntervalFromPriceId, getPlanFromPriceId } from '@/lib/stripe';
import type { PlanType } from '@/lib/subscriptions';

type StripeMode = 'test' | 'live';

interface BaseProps {
    stripe_mode: StripeMode;
    stripe_customer_id: string;
    stripe_subscription_id?: string;
    stripe_invoice_id?: string;
    stripe_charge_id?: string;
    plan?: PlanType;
    previous_plan?: PlanType;
    price_id?: string;
    billing_period?: 'monthly' | 'annual';
    amount_minor?: number; // cents
    currency?: string;
    is_trial?: boolean;
}

function mode(livemode: boolean | undefined): StripeMode {
    return livemode ? 'live' : 'test';
}

function asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function personSet(plan: PlanType | undefined, stripeCustomerId: string): Record<string, unknown> {
    return {
        $set: {
            plan,
            stripe_customer_id: stripeCustomerId,
        },
    };
}

/**
 * Fire-and-forget PostHog capture. Always resolves; never throws.
 */
async function track(
    eventName: string,
    distinctId: string | undefined,
    properties: Record<string, unknown>,
): Promise<void> {
    if (!distinctId) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[analytics/stripe] ${eventName} skipped — missing distinctId`);
        }
        return;
    }
    try {
        await captureServerEvent(eventName, properties, distinctId);
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[analytics/stripe] ${eventName} failed`, err);
        }
    }
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function trackSubscriptionStarted(args: {
    userId: string;
    session: Stripe.Checkout.Session;
    subscription: { id: string; items?: { data?: Array<{ price: { id: string } }> } };
    livemode?: boolean;
}): Promise<void> {
    const { userId, session, subscription } = args;
    const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (!customerId) return;

    const priceId = subscription.items?.data?.[0]?.price.id;
    const plan = priceId ? getPlanFromPriceId(priceId) : undefined;
    const billingPeriod = priceId ? getBillingIntervalFromPriceId(priceId) : undefined;

    const props: BaseProps & Record<string, unknown> = {
        stripe_mode: mode(args.livemode ?? session.livemode),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        price_id: priceId,
        plan,
        billing_period: billingPeriod,
        amount_minor: asNumber(session.amount_total),
        currency: session.currency ?? undefined,
        ...personSet(plan, customerId),
    };

    await track('subscription_started', userId, props);
}

export async function trackSubscriptionPlanChanged(args: {
    userId: string;
    customerId: string;
    subscriptionId: string;
    previousPlan: PlanType;
    newPlan: PlanType;
    priceId: string;
    direction: 'upgrade' | 'downgrade' | 'same_tier';
    pending: boolean;
    livemode?: boolean;
}): Promise<void> {
    const billingPeriod = args.priceId ? getBillingIntervalFromPriceId(args.priceId) : undefined;
    await track('subscription_plan_changed', args.userId, {
        stripe_mode: mode(args.livemode),
        stripe_customer_id: args.customerId,
        stripe_subscription_id: args.subscriptionId,
        price_id: args.priceId,
        plan: args.newPlan,
        previous_plan: args.previousPlan,
        billing_period: billingPeriod,
        direction: args.direction,
        pending: args.pending,
        ...personSet(args.pending ? args.previousPlan : args.newPlan, args.customerId),
    });
}

export async function trackSubscriptionRenewed(args: {
    userId: string;
    invoice: Stripe.Invoice;
    livemode?: boolean;
}): Promise<void> {
    const { userId, invoice } = args;
    const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId =
        typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;

    const priceRef = invoice.lines?.data?.[0]?.pricing?.price_details?.price;
    const priceId = typeof priceRef === 'string' ? priceRef : priceRef?.id;
    const plan = priceId ? getPlanFromPriceId(priceId) : undefined;
    const billingPeriod = priceId ? getBillingIntervalFromPriceId(priceId) : undefined;

    await track('subscription_renewed', userId, {
        stripe_mode: mode(args.livemode ?? invoice.livemode),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_invoice_id: invoice.id,
        price_id: priceId,
        plan,
        billing_period: billingPeriod,
        amount_minor: asNumber(invoice.amount_paid),
        currency: invoice.currency ?? undefined,
        billing_reason: invoice.billing_reason ?? undefined,
        ...personSet(plan, customerId),
    });
}

export async function trackSubscriptionCanceled(args: {
    userId: string;
    customerId: string;
    subscriptionId: string;
    previousPlan: PlanType;
    livemode?: boolean;
}): Promise<void> {
    await track('subscription_canceled', args.userId, {
        stripe_mode: mode(args.livemode),
        stripe_customer_id: args.customerId,
        stripe_subscription_id: args.subscriptionId,
        previous_plan: args.previousPlan,
        plan: 'free',
        ...personSet('free', args.customerId),
    });
}

export async function trackSubscriptionPaymentFailed(args: {
    userId: string;
    invoice: Stripe.Invoice;
    livemode?: boolean;
}): Promise<void> {
    const { userId, invoice } = args;
    const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId =
        typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef?.id;

    await track('subscription_payment_failed', userId, {
        stripe_mode: mode(args.livemode ?? invoice.livemode),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_invoice_id: invoice.id,
        amount_minor: asNumber(invoice.amount_due),
        currency: invoice.currency ?? undefined,
        attempt_count: asNumber(invoice.attempt_count) ?? 1,
        next_payment_attempt: invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000).toISOString()
            : undefined,
    });
}

export async function trackSubscriptionRefunded(args: {
    userId: string;
    charge: Stripe.Charge;
    previousPlan: PlanType;
    livemode?: boolean;
}): Promise<void> {
    const { userId, charge } = args;
    const customerId =
        typeof charge.customer === 'string' ? charge.customer : charge.customer?.id;
    if (!customerId) return;

    await track('subscription_refunded', userId, {
        stripe_mode: mode(args.livemode ?? charge.livemode),
        stripe_customer_id: customerId,
        stripe_charge_id: charge.id,
        amount_minor: asNumber(charge.amount_refunded),
        currency: charge.currency ?? undefined,
        full_refund: Boolean(charge.refunded),
        previous_plan: args.previousPlan,
        plan: 'free',
        ...personSet('free', customerId),
    });
}

export async function trackTransactionPackPurchased(args: {
    userId: string;
    session: Stripe.Checkout.Session;
    packId: string;
    packTransactions: number;
    livemode?: boolean;
}): Promise<void> {
    const { userId, session } = args;
    const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (!customerId) return;

    await track('transaction_pack_purchased', userId, {
        stripe_mode: mode(args.livemode ?? session.livemode),
        stripe_customer_id: customerId,
        pack_id: args.packId,
        pack_transactions: args.packTransactions,
        amount_minor: asNumber(session.amount_total),
        currency: session.currency ?? undefined,
    });
}

export async function trackDisputeCreated(args: {
    userId: string;
    dispute: Stripe.Dispute;
    customerId: string;
    previousPlan: string;
    livemode?: boolean;
}): Promise<void> {
    const { userId, dispute, customerId } = args;
    await track('dispute_created', userId, {
        stripe_mode: mode(args.livemode ?? dispute.livemode),
        stripe_customer_id: customerId,
        stripe_charge_id: typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id,
        dispute_id: dispute.id,
        dispute_reason: dispute.reason,
        dispute_status: dispute.status,
        amount_minor: asNumber(dispute.amount),
        currency: dispute.currency ?? undefined,
        previous_plan: args.previousPlan,
        ...personSet(undefined, customerId),
    });
}

export async function trackDisputeUpdated(args: {
    userId: string;
    dispute: Stripe.Dispute;
    customerId: string;
    livemode?: boolean;
}): Promise<void> {
    const { userId, dispute, customerId } = args;
    await track('dispute_updated', userId, {
        stripe_mode: mode(args.livemode ?? dispute.livemode),
        stripe_customer_id: customerId,
        dispute_id: dispute.id,
        dispute_reason: dispute.reason,
        dispute_status: dispute.status,
        amount_minor: asNumber(dispute.amount),
        currency: dispute.currency ?? undefined,
    });
}

export async function trackDisputeClosed(args: {
    userId: string;
    dispute: Stripe.Dispute;
    customerId: string;
    outcome: 'won' | 'lost' | 'accepted';
    livemode?: boolean;
}): Promise<void> {
    const { userId, dispute, customerId } = args;
    await track('dispute_closed', userId, {
        stripe_mode: mode(args.livemode ?? dispute.livemode),
        stripe_customer_id: customerId,
        dispute_id: dispute.id,
        dispute_reason: dispute.reason,
        dispute_status: dispute.status,
        outcome: args.outcome,
        amount_minor: asNumber(dispute.amount),
        currency: dispute.currency ?? undefined,
        ...personSet(undefined, customerId),
    });
}
