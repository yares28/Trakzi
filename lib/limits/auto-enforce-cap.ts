// lib/limits/auto-enforce-cap.ts
// ============================================================================
// AUTOMATIC TRANSACTION CAP ENFORCEMENT
// ============================================================================
//
// This module provides automatic enforcement of transaction caps when users
// exceed their limits (e.g., from subscription downgrades or data corruption).
// 
// It is called on page loads to ensure users are always within their limits.
// ============================================================================

import { getUserPlan } from '../subscriptions';
import { getTransactionCap, getTransactionCount, enforceTransactionCap } from './transactions-cap';

export interface CapEnforcementResult {
    wasOverLimit: boolean;
    deletedCount: number;
    currentCount: number;
    cap: number;
    plan: string;
}

/**
 * Check if user is over their transaction cap and automatically delete
 * oldest transactions to bring them back within limits.
 * 
 * This should be called during page loads or bundle fetches as a safety measure.
 * 
 * @param userId - The user ID to check
 * @param silent - If true, don't log to console (for background checks)
 * @returns Result indicating if enforcement was needed and what was done
 */
export async function autoEnforceTransactionCap(
    userId: string,
    silent: boolean = false
): Promise<CapEnforcementResult> {
    try {
        // Get user's current plan and cap
        const plan = await getUserPlan(userId);
        const cap = getTransactionCap(plan);

        // If unlimited, no need to check
        if (cap === Infinity) {
            return {
                wasOverLimit: false,
                deletedCount: 0,
                currentCount: 0,
                cap: Infinity,
                plan,
            };
        }

        // Get current transaction count
        const counts = await getTransactionCount(userId);
        const currentTotal = counts.total;

        // If within limits, no action needed
        if (currentTotal <= cap) {
            return {
                wasOverLimit: false,
                deletedCount: 0,
                currentCount: currentTotal,
                cap,
                plan,
            };
        }

        // User is over limit - enforce cap by deleting oldest transactions
        if (!silent) {
            console.warn(`[Auto Cap Enforcement] User ${userId} is over limit (${currentTotal}/${cap}) - deleting oldest transactions`);
        }

        const result = await enforceTransactionCap(userId, cap);

        if (!silent) {
            console.log(`[Auto Cap Enforcement] User ${userId} - deleted ${result.deleted} transactions (now ${currentTotal - result.deleted}/${cap})`);
        }

        return {
            wasOverLimit: true,
            deletedCount: result.deleted,
            currentCount: currentTotal - result.deleted,
            cap,
            plan,
        };

    } catch (error) {
        // Log error but don't throw - we don't want to break page loads
        console.error('[Auto Cap Enforcement] Error:', error);
        return {
            wasOverLimit: false,
            deletedCount: 0,
            currentCount: 0,
            cap: 0,
            plan: 'free',
        };
    }
}

/**
 * Check if user would be over limit after adding new transactions.
 * This is a dry-run that doesn't delete anything.
 * 
 * @param userId - The user ID to check
 * @param incomingCount - Number of transactions user wants to add
 * @returns Object indicating if they would exceed and by how much
 */
export async function wouldExceedCap(
    userId: string,
    incomingCount: number
): Promise<{
    wouldExceed: boolean;
    currentCount: number;
    cap: number;
    afterAddition: number;
    excessCount: number;
    plan: string;
}> {
    const plan = await getUserPlan(userId);
    const cap = getTransactionCap(plan);

    if (cap === Infinity) {
        return {
            wouldExceed: false,
            currentCount: 0,
            cap: Infinity,
            afterAddition: 0,
            excessCount: 0,
            plan,
        };
    }

    const counts = await getTransactionCount(userId);
    const currentTotal = counts.total;
    const afterAddition = currentTotal + incomingCount;
    const excessCount = Math.max(0, afterAddition - cap);

    return {
        wouldExceed: afterAddition > cap,
        currentCount: currentTotal,
        cap,
        afterAddition,
        excessCount,
        plan,
    };
}
