// lib/startup/check-capacity.ts
// ============================================================================
// AUTO-DELETE SAFETY NET
// ============================================================================
// This utility checks if a user has exceeded their transaction capacity
// and automatically deletes the oldest transactions to fit within their plan limit.
//
// Use cases:
// - On app initialization/reload
// - After subscription downgrades (already handled by webhooks)
// - As a safety net for any capacity enforcement gaps
// ============================================================================

import { getUserPlan } from '../subscriptions';
import {
    getTransactionCap,
    getTransactionCount,
    enforceTransactionCap
} from '../limits/transactions-cap';

export interface CapacityCheckResult {
    wasOverCapacity: boolean;
    deleted: number;
    currentTotal: number;
    cap: number;
    plan: string;
}

/**
 * Check if user is over capacity and enforce cap by deleting oldest transactions.
 * This is a safety net to ensure users never exceed their plan limits.
 * 
 * @param userId - The user ID to check
 * @returns Result indicating if user was over capacity and how many transactions were deleted
 */
export async function checkAndEnforceCapacity(userId: string): Promise<CapacityCheckResult> {
    try {
        // Get user's current plan and transaction cap
        const plan = await getUserPlan(userId);
        const cap = getTransactionCap(plan);

        // If plan has unlimited transactions, no need to enforce
        if (cap === Infinity) {
            const counts = await getTransactionCount(userId);
            return {
                wasOverCapacity: false,
                deleted: 0,
                currentTotal: counts.total,
                cap: Infinity,
                plan,
            };
        }

        // Get current transaction count
        const counts = await getTransactionCount(userId);

        // Check if user is over capacity
        if (counts.total > cap) {
            console.warn(
                `[Capacity Check] User ${userId} is over capacity: ${counts.total}/${cap} (plan: ${plan})`
            );

            // Enforce cap by deleting oldest transactions
            const result = await enforceTransactionCap(userId, cap);

            console.log(
                `[Capacity Check] Auto-deleted ${result.deleted} transactions for user ${userId} ` +
                `(${result.tables.transactions} bank, ${result.tables.receipt_transactions} receipt items)`
            );

            return {
                wasOverCapacity: true,
                deleted: result.deleted,
                currentTotal: cap, // Should now be at cap
                cap,
                plan,
            };
        }

        // User is within capacity
        return {
            wasOverCapacity: false,
            deleted: 0,
            currentTotal: counts.total,
            cap,
            plan,
        };
    } catch (error) {
        // Log error but don't throw - capacity check should not break the app
        console.error('[Capacity Check] Error checking/enforcing capacity:', error);

        // Return safe default - assume no action needed
        return {
            wasOverCapacity: false,
            deleted: 0,
            currentTotal: 0,
            cap: 0,
            plan: 'free',
        };
    }
}

/**
 * Check if user is over capacity without enforcing (read-only check).
 * Useful for reporting/analytics.
 * 
 * @param userId - The user ID to check
 * @returns Whether user is over capacity and by how much
 */
export async function isOverCapacity(userId: string): Promise<{
    isOver: boolean;
    excess: number;
    currentTotal: number;
    cap: number;
    plan: string;
}> {
    const plan = await getUserPlan(userId);
    const cap = getTransactionCap(plan);
    const counts = await getTransactionCount(userId);

    const excess = cap === Infinity ? 0 : Math.max(0, counts.total - cap);

    return {
        isOver: excess > 0,
        excess,
        currentTotal: counts.total,
        cap,
        plan,
    };
}
