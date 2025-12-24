// lib/subscriptions.ts
// Subscription management functions

import { neonQuery } from './neonClient';

export type PlanType = 'free' | 'pro' | 'max';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused';

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
    pendingPlan: PlanType | null;
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
    pending_plan: string | null;
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
        pendingPlan: row.pending_plan ? (row.pending_plan as PlanType) : null,
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

    // Check if subscription is active
    if (subscription.status === 'active') {
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
    pendingPlan?: PlanType | null;
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
        pendingPlan,
    } = params;

    // Use ON CONFLICT DO UPDATE to handle both insert and update
    const rows = await neonQuery<SubscriptionRow>(
        `
        INSERT INTO subscriptions (
            id,
            user_id,
            plan,
            status,
            stripe_customer_id,
            stripe_subscription_id,
            stripe_price_id,
            current_period_end,
            cancel_at_period_end,
            pending_plan,
            updated_at
        ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET
            plan = COALESCE($2, subscriptions.plan),
            status = COALESCE($3, subscriptions.status),
            stripe_customer_id = COALESCE($4, subscriptions.stripe_customer_id),
            stripe_subscription_id = COALESCE($5, subscriptions.stripe_subscription_id),
            stripe_price_id = COALESCE($6, subscriptions.stripe_price_id),
            current_period_end = COALESCE($7, subscriptions.current_period_end),
            cancel_at_period_end = COALESCE($8, subscriptions.cancel_at_period_end),
            pending_plan = $9,
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
            pendingPlan ?? null,
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
        
        console.log(`[Subscriptions] Successfully synced subscription to Clerk for user ${userId}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[Subscriptions] Failed to sync to Clerk:', {
            userId,
            plan,
            status,
            error: errorMessage,
            // Log full error for debugging but don't expose to user
        });
        
        // Don't throw - Clerk sync is best-effort
        // Database is source of truth, Clerk metadata is for convenience
        // However, this should be monitored for patterns indicating systemic issues
    }
}

/**
 * Map Stripe subscription status to our status
 */
export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
        case 'active':
        case 'trialing': // Treat trialing as active (no trial policy)
            return 'active';
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
