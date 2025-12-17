// lib/subscriptions.ts
// Server-side subscription and entitlement helpers

import { neonQuery, neonInsert } from './neonClient';

export type PlanType = 'free' | 'pro' | 'max';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

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

/**
 * Get user's subscription from database
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
    const results = await neonQuery<Subscription>(
        `SELECT * FROM subscriptions WHERE "userId" = $1 LIMIT 1`,
        [userId]
    );

    if (results.length === 0) {
        return null;
    }

    return results[0];
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
        const result = await neonQuery<Subscription>(
            `UPDATE subscriptions SET
        plan = $1,
        status = $2,
        "stripeCustomerId" = COALESCE($3, "stripeCustomerId"),
        "stripeSubscriptionId" = COALESCE($4, "stripeSubscriptionId"),
        "stripePriceId" = COALESCE($5, "stripePriceId"),
        "currentPeriodEnd" = COALESCE($6, "currentPeriodEnd"),
        "cancelAtPeriodEnd" = COALESCE($7, "cancelAtPeriodEnd"),
        "updatedAt" = $8
      WHERE "userId" = $9
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
        return result[0];
    } else {
        // Insert new subscription
        const result = await neonInsert<Subscription>('subscriptions', {
            id: crypto.randomUUID(),
            userId: data.userId,
            plan: data.plan,
            status: data.status,
            stripeCustomerId: data.stripeCustomerId ?? null,
            stripeSubscriptionId: data.stripeSubscriptionId ?? null,
            stripePriceId: data.stripePriceId ?? null,
            currentPeriodEnd: data.currentPeriodEnd ?? null,
            cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
            createdAt: now,
            updatedAt: now,
        });
        return result[0];
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
    const results = await neonQuery<Subscription>(
        `SELECT * FROM subscriptions WHERE "stripeCustomerId" = $1 LIMIT 1`,
        [stripeCustomerId]
    );

    return results.length > 0 ? results[0] : null;
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeSubscriptionId(
    stripeSubscriptionId: string
): Promise<Subscription | null> {
    const results = await neonQuery<Subscription>(
        `SELECT * FROM subscriptions WHERE "stripeSubscriptionId" = $1 LIMIT 1`,
        [stripeSubscriptionId]
    );

    return results.length > 0 ? results[0] : null;
}
