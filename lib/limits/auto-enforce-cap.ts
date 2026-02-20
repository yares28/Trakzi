// lib/limits/auto-enforce-cap.ts
// ============================================================================
// TRANSACTION CAP STATUS CHECK
// ============================================================================
//
// Checks whether a user is over their transaction wallet capacity.
//
// IMPORTANT: We NEVER auto-delete transactions. If a user is over their
// wallet capacity (e.g. after a downgrade), we block NEW writes and show
// a helpful error with options to delete oldest entries themselves or upgrade.
// ============================================================================

import { getWalletCapacity } from './transaction-wallet';

export interface CapEnforcementResult {
    wasOverLimit: boolean;
    deletedCount: number;  // always 0 — we never auto-delete
    currentCount: number;
    cap: number;
    plan: string;
}

/**
 * Check if user is over their wallet capacity.
 * Does NOT delete anything — blocks writes instead.
 *
 * @param userId - The user ID to check
 * @param _silent - Unused (kept for API compatibility)
 */
export async function autoEnforceTransactionCap(
    userId: string,
    _silent: boolean = false
): Promise<CapEnforcementResult> {
    try {
        const capacity = await getWalletCapacity(userId);

        return {
            wasOverLimit: capacity.remaining <= 0,
            deletedCount: 0,
            currentCount: capacity.used,
            cap: capacity.totalCapacity,
            plan: capacity.plan,
        };
    } catch (error) {
        // Don't throw — avoid breaking page loads on wallet errors
        console.error('[Cap Enforcement] Error checking wallet capacity:', error);
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
 * Check if user would exceed their wallet capacity after adding new transactions.
 * Dry-run — does not modify any data.
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
    const capacity = await getWalletCapacity(userId);
    const afterAddition = capacity.used + incomingCount;
    const excessCount = Math.max(0, afterAddition - capacity.totalCapacity);

    return {
        wouldExceed: afterAddition > capacity.totalCapacity,
        currentCount: capacity.used,
        cap: capacity.totalCapacity,
        afterAddition,
        excessCount,
        plan: capacity.plan,
    };
}
