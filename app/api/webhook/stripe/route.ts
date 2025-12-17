// app/api/webhook/stripe/route.ts
// Handle Stripe webhooks for subscription lifecycle events

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
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
]);

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

    await upsertSubscription({
        userId,
        plan,
        status: subscription.status === 'active' ? 'active' : 'trialing',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    console.log(`[Webhook] Subscription created for user ${userId}, plan: ${plan}`);
}

/**
 * Handle subscription updates (plan changes, renewals, etc.)
 */
async function handleSubscriptionUpdate(subscription: StripeSubscriptionData) {
    const customerId = subscription.customer;
    const priceId = subscription.items.data[0]?.price.id;
    const plan = getPlanFromPriceId(priceId || '');

    // Find user by Stripe customer ID
    const existingSub = await getSubscriptionByStripeCustomerId(customerId);

    if (!existingSub) {
        // Check metadata for userId (from subscription creation)
        const userId = subscription.metadata?.userId;
        if (!userId) {
            console.error('[Webhook] Cannot find user for subscription update');
            return;
        }

        await upsertSubscription({
            userId,
            plan,
            status: mapStripeStatus(subscription.status),
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
    } else {
        await upsertSubscription({
            userId: existingSub.userId,
            plan,
            status: mapStripeStatus(subscription.status),
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
    }

    console.log(`[Webhook] Subscription updated for customer ${customerId}`);
}

/**
 * Handle subscription cancellation/deletion
 */
async function handleSubscriptionDeleted(subscription: StripeSubscriptionData) {
    const customerId = subscription.customer;

    const existingSub = await getSubscriptionByStripeCustomerId(customerId);

    if (existingSub) {
        await upsertSubscription({
            userId: existingSub.userId,
            plan: 'free',
            status: 'canceled',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        });

        console.log(`[Webhook] Subscription canceled for user ${existingSub.userId}`);
    }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const existingSub = await getSubscriptionByStripeCustomerId(customerId);

    if (existingSub) {
        await upsertSubscription({
            userId: existingSub.userId,
            plan: existingSub.plan,
            status: 'past_due',
        });

        console.log(`[Webhook] Payment failed for user ${existingSub.userId}`);
    }
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
