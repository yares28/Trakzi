// lib/subscriptions.ts
// Subscription management functions

import { neonQuery } from './neonClient';

export type PlanType = 'free' | 'basic' | 'pro' | 'max';
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

    // ============================================================================
    // VALIDATION: Ensure data consistency and prevent invalid states
    // ============================================================================

    // Validation 1: Free plan should not have Stripe subscription ID
    // (Free users don't have Stripe subscriptions)
    // Auto-correct: Remove subscription ID for free plan
    let correctedStripeSubscriptionId = stripeSubscriptionId;
    if (plan === 'free' && stripeSubscriptionId) {
        console.warn('[Subscriptions] Invalid: free plan with Stripe subscription ID - auto-correcting', {
            userId,
            plan,
            stripeSubscriptionId,
        });
        correctedStripeSubscriptionId = undefined; // Remove subscription ID for free plan
    }

    // Validation 2: Active subscriptions should have a period end date
    if (status === 'active' && plan !== 'free' && !currentPeriodEnd) {
        console.warn('[Subscriptions] Invalid: active paid subscription without period end', {
            userId,
            plan,
            status,
        });
        // Note: We allow this but log it - webhooks should always provide period end
    }

    // Validation 3: Period end should be in the future for active subscriptions
    // Auto-correct: Change status to 'canceled' if period has passed
    let correctedStatus = status;
    if (status === 'active' && currentPeriodEnd && new Date(currentPeriodEnd) < new Date()) {
        if (plan !== 'free') {
            console.warn('[Subscriptions] Invalid: active subscription with past period end - auto-correcting to canceled', {
                userId,
                plan,
                status,
                currentPeriodEnd,
            });
            correctedStatus = 'canceled'; // Auto-correct expired subscriptions
        }
    }

    // Validation 4: Paid plans should have Stripe subscription ID
    // (This is a warning, not an error - free users upgrading might not have it yet)
    if (plan !== 'free' && !stripeSubscriptionId) {
        console.warn('[Subscriptions] Warning: paid plan without Stripe subscription ID', {
            userId,
            plan,
            status,
        });
        // This is OK during checkout flow, but should be set by webhook
    }

    // Validation 5: Validate plan/price ID consistency (if price ID provided)
    if (stripePriceId && plan !== 'free') {
        const { getPlanFromPriceId } = await import('./stripe');
        const pricePlan = getPlanFromPriceId(stripePriceId);

        // If price ID maps to a different plan, log warning
        // Note: This could happen during plan transitions, so it's a warning not an error
        if (pricePlan !== plan && pricePlan !== 'free') {
            console.warn('[Subscriptions] Plan/price ID mismatch', {
                userId,
                plan,
                pricePlan,
                stripePriceId,
            });
            // Don't block - webhooks handle plan transitions
        }
    }

    // Validation 6: Pending plan should be different from current plan
    // Auto-correct: Clear pending plan if same as current
    let correctedPendingPlan = pendingPlan;
    if (pendingPlan && pendingPlan === plan) {
        console.warn('[Subscriptions] Invalid: pending plan same as current plan - auto-correcting', {
            userId,
            plan,
            pendingPlan,
        });
        correctedPendingPlan = null; // Clear pending plan
    }

    // Validation 7: Canceled subscriptions should not have cancel_at_period_end = true
    // Auto-correct: Set cancelAtPeriodEnd to false
    let correctedCancelAtPeriodEnd = cancelAtPeriodEnd;
    if (correctedStatus === 'canceled' && cancelAtPeriodEnd) {
        console.warn('[Subscriptions] Invalid: canceled subscription with cancel_at_period_end = true - auto-correcting', {
            userId,
            plan,
            status: correctedStatus,
        });
        correctedCancelAtPeriodEnd = false; // If it's canceled, it's already canceled
    }

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
            correctedStatus, // Use corrected status
            stripeCustomerId ?? null,
            correctedStripeSubscriptionId ?? null, // Use corrected subscription ID
            stripePriceId ?? null,
            currentPeriodEnd ?? null,
            correctedCancelAtPeriodEnd, // Use corrected cancel flag
            correctedPendingPlan ?? null, // Use corrected pending plan
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
