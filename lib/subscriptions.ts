// lib/subscriptions.ts
// Server-side subscription and entitlement helpers

import { neonQuery, neonInsert } from './neonClient';

export type PlanType = 'free' | 'pro' | 'max';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

// Database row type (snake_case as stored in DB)
interface SubscriptionDbRow {
    id: string;
    user_id: string;
    plan: string;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    current_period_end: Date | string | null;
    cancel_at_period_end: boolean;
    created_at: Date | string;
    updated_at: Date | string;
}

// Application type (camelCase for TypeScript)
export interface Subscription {
    id: string;
    userId: string;
    plan: PlanType;
    status: SubscriptionStatus;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Map database row to TypeScript interface
function mapDbRowToSubscription(row: SubscriptionDbRow): Subscription {
    return {
        id: row.id,
        userId: row.user_id,
        plan: row.plan as PlanType,
        status: row.status as SubscriptionStatus,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripePriceId: row.stripe_price_id,
        currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Get user's subscription from database
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
    const results = await neonQuery<SubscriptionDbRow>(
        `SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1`,
        [userId]
    );

    if (results.length === 0) {
        return null;
    }

    return mapDbRowToSubscription(results[0]);
}

/**
 * Create or update subscription in database
 */
export async function upsertSubscription(data: {
    userId: string;
    plan: PlanType;
    status: SubscriptionStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
}): Promise<Subscription> {
    const now = new Date();

    // Check if subscription exists
    const existing = await getUserSubscription(data.userId);

    if (existing) {
        // Update existing subscription
        const result = await neonQuery<SubscriptionDbRow>(
            `UPDATE subscriptions SET
        plan = $1,
        status = $2,
        stripe_customer_id = COALESCE($3, stripe_customer_id),
        stripe_subscription_id = COALESCE($4, stripe_subscription_id),
        stripe_price_id = COALESCE($5, stripe_price_id),
        current_period_end = COALESCE($6, current_period_end),
        cancel_at_period_end = COALESCE($7, cancel_at_period_end),
        updated_at = $8
      WHERE user_id = $9
      RETURNING *`,
            [
                data.plan,
                data.status,
                data.stripeCustomerId ?? null,
                data.stripeSubscriptionId ?? null,
                data.stripePriceId ?? null,
                data.currentPeriodEnd ?? null,
                data.cancelAtPeriodEnd ?? false,
                now,
                data.userId,
            ]
        );
        return mapDbRowToSubscription(result[0]);
    } else {
        // Insert new subscription
        const result = await neonInsert<SubscriptionDbRow>('subscriptions', {
            id: crypto.randomUUID(),
            user_id: data.userId,
            plan: data.plan,
            status: data.status,
            stripe_customer_id: data.stripeCustomerId ?? null,
            stripe_subscription_id: data.stripeSubscriptionId ?? null,
            stripe_price_id: data.stripePriceId ?? null,
            current_period_end: data.currentPeriodEnd ?? null,
            cancel_at_period_end: data.cancelAtPeriodEnd ?? false,
            created_at: now,
            updated_at: now,
        });
        return mapDbRowToSubscription(result[0]);
    }
}

/**
 * Check if user has an active Pro or Max plan
 */
export async function hasProPlan(userId: string): Promise<boolean> {
    const subscription = await getUserSubscription(userId);

    if (!subscription) return false;

    const activePlans: PlanType[] = ['pro', 'max'];
    const activeStatuses: SubscriptionStatus[] = ['active', 'trialing'];

    return (
        activePlans.includes(subscription.plan) &&
        activeStatuses.includes(subscription.status)
    );
}

/**
 * Get user's current plan
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
    const subscription = await getUserSubscription(userId);

    if (!subscription) return 'free';

    // If subscription is canceled or past_due, treat as free
    if (subscription.status === 'canceled' || subscription.status === 'past_due') {
        // Check if still within period
        if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()) {
            return subscription.plan;
        }
        return 'free';
    }

    return subscription.plan;
}

/**
 * Require Pro plan or throw error
 */
export async function requirePro(userId: string): Promise<void> {
    const hasPro = await hasProPlan(userId);

    if (!hasPro) {
        throw new Error('This feature requires a Pro subscription');
    }
}

/**
 * Get subscription by Stripe customer ID
 */
export async function getSubscriptionByStripeCustomerId(
    stripeCustomerId: string
): Promise<Subscription | null> {
    const results = await neonQuery<SubscriptionDbRow>(
        `SELECT * FROM subscriptions WHERE stripe_customer_id = $1 LIMIT 1`,
        [stripeCustomerId]
    );

    return results.length > 0 ? mapDbRowToSubscription(results[0]) : null;
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeSubscriptionId(
    stripeSubscriptionId: string
): Promise<Subscription | null> {
    const results = await neonQuery<SubscriptionDbRow>(
        `SELECT * FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
        [stripeSubscriptionId]
    );

    return results.length > 0 ? mapDbRowToSubscription(results[0]) : null;
}
