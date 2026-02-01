// lib/limits/category-cap.ts
// ============================================================================
// CATEGORY CAP ENFORCEMENT
// ============================================================================
//
// This module enforces category limits based on user subscription plans.
// - Free: 5 transaction categories, 5 receipt categories
// - Pro: 20 transaction categories, 20 receipt categories
// - Max: 100 transaction categories, 100 receipt categories
//
// Default/system categories (is_default = true or canonical default name) do NOT count toward limits.
// ============================================================================

import { DEFAULT_CATEGORIES } from '../categories';
import { neonQuery } from '../neonClient';
import { DEFAULT_RECEIPT_CATEGORIES } from '../receipt-categories';
import { getUserPlan, PlanType } from '../subscriptions';

export interface CategoryCounts {
    transactionCategories: number;
    receiptCategories: number;
    total: number;
}

export interface CategoryCapacity {
    plan: PlanType;
    transactionCap: number;
    receiptCap: number;
    transactionUsed: number;
    receiptUsed: number;
    transactionRemaining: number;
    receiptRemaining: number;
}

/**
 * Get category caps per plan
 */
export function getCategoryCap(plan: PlanType): { transactions: number; receipts: number } {
    switch (plan) {
        case 'free':
            return { transactions: 5, receipts: 5 };
        case 'pro':
            return { transactions: 20, receipts: 20 };
        case 'max':
            return { transactions: 100, receipts: 100 };
        default:
            return { transactions: 5, receipts: 5 };
    }
}

/**
 * Get current category counts for a user
 * Excludes default/system categories (is_default = true or canonical default name)
 */
export async function getCategoryCounts(userId: string): Promise<CategoryCounts> {
    const defaultTransactionNames = DEFAULT_CATEGORIES;
    const defaultReceiptNames = DEFAULT_RECEIPT_CATEGORIES.map((c) => c.name);

    // Transaction categories (exclude is_default = true and exclude canonical default names)
    const txQuery = `
        SELECT COUNT(DISTINCT id) as count
        FROM categories
        WHERE user_id = $1
          AND (is_default IS NULL OR is_default = false)
          AND NOT (name = ANY($2::text[]))
    `;
    const txResult = await neonQuery<{ count: string }>(txQuery, [userId, defaultTransactionNames]);
    const transactionCategories = parseInt(txResult[0]?.count || '0', 10);

    // Receipt categories (exclude is_default = true and exclude canonical default names)
    const receiptQuery = `
        SELECT COUNT(DISTINCT id) as count
        FROM receipt_categories
        WHERE user_id = $1
          AND (is_default IS NULL OR is_default = false)
          AND NOT (name = ANY($2::text[]))
    `;
    const receiptResult = await neonQuery<{ count: string }>(receiptQuery, [userId, defaultReceiptNames]);
    const receiptCategories = parseInt(receiptResult[0]?.count || '0', 10);

    return {
        transactionCategories,
        receiptCategories,
        total: transactionCategories + receiptCategories,
    };
}

/**
 * Get remaining category capacity
 */
export async function getRemainingCategoryCapacity(userId: string): Promise<CategoryCapacity> {
    const plan = await getUserPlan(userId);
    const cap = getCategoryCap(plan);
    const counts = await getCategoryCounts(userId);

    return {
        plan,
        transactionCap: cap.transactions,
        receiptCap: cap.receipts,
        transactionUsed: counts.transactionCategories,
        receiptUsed: counts.receiptCategories,
        transactionRemaining: Math.max(0, cap.transactions - counts.transactionCategories),
        receiptRemaining: Math.max(0, cap.receipts - counts.receiptCategories),
    };
}

/**
 * Check if user can create a category
 * Returns structured response (mirrors assertCapacityOrExplain for transactions)
 */
export async function canCreateCategory(
    userId: string,
    type: 'transaction' | 'receipt'
): Promise<{
    allowed: boolean;
    capacity: CategoryCapacity;
    message?: string;
}> {
    const capacity = await getRemainingCategoryCapacity(userId);

    const remaining = type === 'transaction'
        ? capacity.transactionRemaining
        : capacity.receiptRemaining;

    if (remaining > 0) {
        return { allowed: true, capacity };
    }

    const limit = type === 'transaction' ? capacity.transactionCap : capacity.receiptCap;
    return {
        allowed: false,
        capacity,
        message: `You've reached your ${type} category limit (${limit}). Upgrade to add more categories.`,
    };
}
