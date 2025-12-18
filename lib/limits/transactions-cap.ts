// lib/limits/transactions-cap.ts
// ============================================================================
// AUTHORITATIVE SERVER-SIDE TRANSACTION CAP SERVICE
// ============================================================================
//
// This module provides the single source of truth for transaction capacity.
// All transaction write paths MUST use this service to enforce caps.
//
// Key principles:
// - Cap is TOTAL transactions stored, not per-month
// - Transactions include: bank transactions + receipt items
// - Never trust client values - always query from DB
// - Return structured responses for UI (not generic errors)
// ============================================================================

import { PlanType, getUserPlan } from '../subscriptions';
import { getPlanLimits, getUpgradePlans } from '../plan-limits';
import { neonQuery } from '../neonClient';

// ============================================================================
// TYPES
// ============================================================================

export interface TransactionCapacity {
    plan: PlanType;
    cap: number;           // Total allowed (may be Infinity)
    used: number;          // Currently stored transactions
    remaining: number;     // How many more can be added (may be Infinity)
    bankTransactions: number;
    receiptItems: number;
}

export interface LimitExceededResponse {
    code: 'LIMIT_EXCEEDED';
    plan: PlanType;
    cap: number;
    used: number;
    remaining: number;
    incomingCount: number;
    dateMin?: string;
    dateMax?: string;
    suggestedActions: SuggestedAction[];
    upgradePlans: PlanType[];
}

export type SuggestedAction =
    | 'IMPORT_PARTIAL'
    | 'FILTER_BY_DATE'
    | 'UPGRADE'
    | 'DELETE_EXISTING';

export type CapCheckResult =
    | { ok: true; capacity: TransactionCapacity }
    | { ok: false; limitExceeded: LimitExceededResponse };

export interface PartialImportResult {
    insertedCount: number;
    skippedCount: number;
    duplicatesSkippedCount: number;
    reachedCap: boolean;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get total transaction count for a user (bank + receipt items)
 * This counts ALL transactions, not filtered by date.
 */
export async function getTransactionCount(userId: string): Promise<{
    total: number;
    bankTransactions: number;
    receiptItems: number;
}> {
    // Count bank transactions (total, not filtered by date)
    const bankTxResult = await neonQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM transactions WHERE user_id = $1`,
        [userId]
    );

    // Count receipt transactions/fridge items (total, not filtered by date)
    const receiptTxResult = await neonQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM receipt_transactions WHERE user_id = $1`,
        [userId]
    );

    const bankTransactions = parseInt(bankTxResult[0]?.count || '0');
    const receiptItems = parseInt(receiptTxResult[0]?.count || '0');

    return {
        total: bankTransactions + receiptItems,
        bankTransactions,
        receiptItems,
    };
}

/**
 * Get the transaction cap for a plan
 * Returns Infinity for unlimited plans
 */
export function getTransactionCap(plan: PlanType): number {
    const limits = getPlanLimits(plan);
    return limits.maxTotalTransactions;
}

/**
 * Get remaining capacity for a user
 * This is the main function to check before any transaction write.
 */
export async function getRemainingCapacity(userId: string): Promise<TransactionCapacity> {
    const plan = await getUserPlan(userId);
    const cap = getTransactionCap(plan);
    const counts = await getTransactionCount(userId);

    const remaining = cap === Infinity
        ? Infinity
        : Math.max(0, cap - counts.total);

    return {
        plan,
        cap,
        used: counts.total,
        remaining,
        bankTransactions: counts.bankTransactions,
        receiptItems: counts.receiptItems,
    };
}

/**
 * Check if user can add N transactions
 * Returns OK or structured LIMIT_EXCEEDED response
 */
export async function assertCapacityOrExplain(params: {
    userId: string;
    incomingCount: number;
    dateMin?: string;
    dateMax?: string;
}): Promise<CapCheckResult> {
    const { userId, incomingCount, dateMin, dateMax } = params;
    const capacity = await getRemainingCapacity(userId);

    // If cap is Infinity, always allow (Max plan with high limit still enforced)
    if (capacity.cap === Infinity) {
        return { ok: true, capacity };
    }

    // If incoming fits within remaining, allow
    if (incomingCount <= capacity.remaining) {
        return { ok: true, capacity };
    }

    // Build suggested actions based on context
    const suggestedActions: SuggestedAction[] = [];

    // If we can import some but not all, offer partial import
    if (capacity.remaining > 0) {
        suggestedActions.push('IMPORT_PARTIAL');
    }

    // If dates are available, offer date filtering
    if (dateMin && dateMax) {
        suggestedActions.push('FILTER_BY_DATE');
    }

    // Always offer upgrade option
    const upgradePlans = getUpgradePlans(capacity.plan);
    if (upgradePlans.length > 0) {
        suggestedActions.push('UPGRADE');
    }

    // Offer delete option if over cap
    suggestedActions.push('DELETE_EXISTING');

    return {
        ok: false,
        limitExceeded: {
            code: 'LIMIT_EXCEEDED',
            plan: capacity.plan,
            cap: capacity.cap,
            used: capacity.used,
            remaining: capacity.remaining,
            incomingCount,
            dateMin,
            dateMax,
            suggestedActions,
            upgradePlans,
        },
    };
}

/**
 * Quick check if user has any remaining capacity
 * Use for fail-fast checks before expensive operations
 */
export async function hasAnyRemainingCapacity(userId: string): Promise<{
    hasCapacity: boolean;
    remaining: number;
    plan: PlanType;
}> {
    const capacity = await getRemainingCapacity(userId);
    return {
        hasCapacity: capacity.remaining > 0 || capacity.cap === Infinity,
        remaining: capacity.remaining,
        plan: capacity.plan,
    };
}

/**
 * Calculate how many transactions can be imported from a batch
 * Returns the slice of transactions that fit within the cap
 */
export function calculatePartialImportSize(
    incomingCount: number,
    remaining: number
): { allowedCount: number; skippedCount: number } {
    if (remaining === Infinity) {
        return { allowedCount: incomingCount, skippedCount: 0 };
    }

    const allowedCount = Math.min(incomingCount, remaining);
    const skippedCount = Math.max(0, incomingCount - remaining);

    return { allowedCount, skippedCount };
}

// ============================================================================
// HELPERS FOR API RESPONSES
// ============================================================================

/**
 * Create a standardized 403 response for limit exceeded
 */
export function createLimitExceededResponse(
    limitExceeded: LimitExceededResponse
): { body: LimitExceededResponse; status: 403 } {
    return {
        body: limitExceeded,
        status: 403,
    };
}

/**
 * Check if an error response is a limit exceeded response
 */
export function isLimitExceededResponse(response: unknown): response is LimitExceededResponse {
    return (
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        (response as LimitExceededResponse).code === 'LIMIT_EXCEEDED'
    );
}
