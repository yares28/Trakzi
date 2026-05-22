// lib/billing-utils.ts
// Shared utilities for billing API routes.
// Centralises helpers that were previously copy-pasted across billing route files.

import type { SubscriptionStatus, PlanType } from './subscriptions';

// ─── Timestamp ───────────────────────────────────────────────────────────────

/**
 * Safely convert a Unix timestamp (seconds) to a Date.
 * Returns null for missing, NaN, or otherwise invalid values.
 */
export function safeTimestampToDate(timestamp: number | undefined | null): Date | null {
    if (timestamp === undefined || timestamp === null || isNaN(timestamp)) return null;
    const date = new Date(timestamp * 1000);
    return isNaN(date.getTime()) ? null : date;
}

// ─── Plan hierarchy ──────────────────────────────────────────────────────────

export const PLAN_HIERARCHY: Record<PlanType, number> = {
    free: 0,
    pro: 1,
    max: 2,
} as const;

// ─── Clerk metadata ──────────────────────────────────────────────────────────

/** Optional fields nested under `publicMetadata.subscription` (payment/dispute UI). */
export type ClerkSubscriptionBillingExtras = Partial<{
    paymentFailed: boolean;
    failedAt: string;
    attemptCount: number;
    refunded: boolean;
    refundedAt: string;
    disputedAt: string | null;
    disputeReason: string | null;
}>;

/**
 * Canonical Clerk publicMetadata shape for subscription state.
 *
 * ALL billing routes and the webhook MUST use this helper so the key layout
 * is always identical. Previously billing routes wrote flat keys
 * (`subscriptionPlan`, `subscriptionStatus`) while the webhook wrote a nested
 * `subscription` object — causing inconsistent reads on the frontend.
 *
 * `billing` merges extra keys (e.g. paymentFailure/dispute) into `subscription`.
 */
export function buildClerkSubscriptionMetadata(params: {
    plan: PlanType;
    status: SubscriptionStatus;
    stripeCustomerId?: string | null;
    currentPeriodEnd?: Date | null;
    billing?: ClerkSubscriptionBillingExtras;
}) {
    const subscription: Record<string, unknown> = {
        plan: params.plan,
        status: params.status,
        stripeCustomerId: params.stripeCustomerId ?? undefined,
        currentPeriodEnd: params.currentPeriodEnd?.toISOString() ?? undefined,
        updatedAt: new Date().toISOString(),
    };

    if (params.billing) {
        for (const [key, value] of Object.entries(params.billing)) {
            if (value !== undefined) subscription[key] = value;
        }
    }

    return {
        publicMetadata: {
            subscription,
        },
    };
}

// ─── Cache invalidation ──────────────────────────────────────────────────────

/**
 * Invalidate all dashboard-relevant caches after any subscription change.
 * Non-fatal: logs errors but never throws.
 */
export async function invalidateSubscriptionCaches(userId: string): Promise<void> {
    try {
        const { invalidateUserCachePrefix } = await import('@/lib/cache/upstash');
        await Promise.all([
            invalidateUserCachePrefix(userId, 'home'),
            invalidateUserCachePrefix(userId, 'analytics'),
            invalidateUserCachePrefix(userId, 'financial-health'),
        ]);
    } catch (err) {
        console.error('[BillingUtils] Cache invalidation failed (non-fatal):', err);
    }
}

// ─── Guards ──────────────────────────────────────────────────────────────────

/**
 * Returns an error response body if the subscription status blocks billing
 * actions, or null if the request should proceed.
 */
export function getSubscriptionBlockReason(status: SubscriptionStatus | undefined): string | null {
    if (status === 'disputed') {
        return 'Your account has an open payment dispute. Billing changes are locked until it is resolved. Please contact support.';
    }
    return null;
}
