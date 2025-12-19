// lib/subscriptions.ts
// Subscription management functions

import { neonQuery } from './neonClient';

export type PlanType = 'free' | 'pro' | 'max';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';

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
    isLifetime: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface SubscriptionRow {
    id: string;
    user_id: string;
    plan: string;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    current_period_end: string | Date | null;
    cancel_at_period_end: boolean;
    is_lifetime: boolean;
    created_at: string | Date;
    updated_at: string | Date;
}

function rowToSubscription(row: SubscriptionRow): Subscription {
    return {
        id: row.id,
        userId: row.user_id,
        plan: (row.plan || 'free') as PlanType,
        status: (row.status || 'active') as SubscriptionStatus,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripePriceId: row.stripe_price_id,
        currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
        cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
        isLifetime: row.is_lifetime ?? false,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Get a user's subscription by user ID
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
    const rows = await neonQuery<SubscriptionRow>(
        `SELECT * FROM subscriptions WHERE user_id = $1 LIMIT 1`,
        [userId]
    );

    if (rows.length === 0) {
        return null;
    }

    return rowToSubscription(rows[0]);
}

/**
 * Get a subscription by Stripe customer ID
 */
export async function getSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
    const rows = await neonQuery<SubscriptionRow>(
        `SELECT * FROM subscriptions WHERE stripe_customer_id = $1 LIMIT 1`,
        [stripeCustomerId]
    );

    if (rows.length === 0) {
        return null;
    }

    return rowToSubscription(rows[0]);
}

/**
 * Get a user's current plan (returns 'free' if no subscription)
 */
export async function getUserPlan(userId: string): Promise<PlanType> {
    const subscription = await getUserSubscription(userId);

    if (!subscription) {
        return 'free';
    }

    // Check if subscription is active or trialing
    if (['active', 'trialing'].includes(subscription.status)) {
        return subscription.plan;
    }

    // Check if within grace period (canceled but not expired)
    if (
        subscription.status === 'canceled' &&
        subscription.currentPeriodEnd &&
        new Date() < subscription.currentPeriodEnd
    ) {
        return subscription.plan;
    }

    return 'free';
}

/**
 * Create or update a subscription
 */
export async function upsertSubscription(params: {
    userId: string;
    plan?: PlanType;
    status?: SubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
}): Promise<Subscription> {
    const {
        userId,
        plan = 'free',
        status = 'active',
        stripeCustomerId,
        stripeSubscriptionId,
        stripePriceId,
        currentPeriodEnd,
        cancelAtPeriodEnd = false,
    } = params;

    // Use ON CONFLICT DO UPDATE to handle both insert and update
    const rows = await neonQuery<SubscriptionRow>(
        `
        INSERT INTO subscriptions (
            user_id,
            plan,
            status,
            stripe_customer_id,
            stripe_subscription_id,
            stripe_price_id,
            current_period_end,
            cancel_at_period_end,
            updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET
            plan = COALESCE($2, subscriptions.plan),
            status = COALESCE($3, subscriptions.status),
            stripe_customer_id = COALESCE($4, subscriptions.stripe_customer_id),
            stripe_subscription_id = COALESCE($5, subscriptions.stripe_subscription_id),
            stripe_price_id = COALESCE($6, subscriptions.stripe_price_id),
            current_period_end = COALESCE($7, subscriptions.current_period_end),
            cancel_at_period_end = COALESCE($8, subscriptions.cancel_at_period_end),
            updated_at = NOW()
        RETURNING *
        `,
        [
            userId,
            plan,
            status,
            stripeCustomerId ?? null,
            stripeSubscriptionId ?? null,
            stripePriceId ?? null,
            currentPeriodEnd ?? null,
            cancelAtPeriodEnd,
        ]
    );

    if (rows.length === 0) {
        throw new Error('Failed to upsert subscription');
    }

    return rowToSubscription(rows[0]);
}

/**
 * Sync subscription status to Clerk user metadata
 */
export async function syncSubscriptionToClerk(
    userId: string,
    plan: PlanType,
    status: SubscriptionStatus,
    stripeCustomerId?: string,
    currentPeriodEnd?: Date
): Promise<void> {
    try {
        const { clerkClient } = await import('@clerk/nextjs/server');
        const client = await clerkClient();

        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                subscriptionPlan: plan,
                subscriptionStatus: status,
            },
            privateMetadata: {
                stripeCustomerId,
                currentPeriodEnd: currentPeriodEnd?.toISOString(),
            },
        });
    } catch (error) {
        console.error('[Subscriptions] Failed to sync to Clerk:', error);
        // Don't throw - Clerk sync is best-effort
    }
}

/**
 * Map Stripe subscription status to our status
 */
export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
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
        case 'paused':
            return 'paused';
        default:
            return 'active';
    }
}
