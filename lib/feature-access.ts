// lib/feature-access.ts
// Helper functions to check feature access based on user's subscription

import { getUserPlan, getUserSubscription, PlanType } from './subscriptions';
import { getPlanLimits, isFeatureEnabled, PlanLimits } from './plan-limits';
import { neonQuery } from './neonClient';
import {
    getRemainingCapacity,
    assertCapacityOrExplain,
    TransactionCapacity,
    LimitExceededResponse
} from './limits/transactions-cap';

export interface FeatureAccessResult {
    allowed: boolean;
    reason?: string;
    currentUsage?: number;
    limit?: number;
    plan: PlanType;
    upgradeRequired?: boolean;
}

/**
 * Check if user can access a specific feature
 */
export async function checkFeatureAccess(
    userId: string,
    feature: keyof PlanLimits
): Promise<FeatureAccessResult> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);
    const enabled = isFeatureEnabled(plan, feature);

    if (!enabled) {
        return {
            allowed: false,
            reason: `This feature requires a Pro or Max subscription`,
            plan,
            upgradeRequired: true,
        };
    }

    return {
        allowed: true,
        plan,
    };
}

/**
 * Check TOTAL transactions limit (bank transactions + receipt items combined)
 * This checks against the TOTAL cap (not per-month).
 * 
 * @deprecated Use assertCapacityOrExplain() from lib/limits/transactions-cap.ts for new code
 */
export async function checkTotalTransactionLimit(userId: string): Promise<FeatureAccessResult> {
    const capacity = await getRemainingCapacity(userId);

    if (capacity.cap === Infinity || capacity.remaining > 0) {
        return {
            allowed: true,
            currentUsage: capacity.used,
            limit: capacity.cap === Infinity ? undefined : capacity.cap,
            plan: capacity.plan,
        };
    }

    return {
        allowed: false,
        reason: `You've reached your limit of ${capacity.cap} total transactions`,
        currentUsage: capacity.used,
        limit: capacity.cap,
        plan: capacity.plan,
        upgradeRequired: true,
    };
}

/**
 * Get current total transaction usage
 */
export async function getTotalTransactionUsage(userId: string): Promise<{
    bankTransactions: number;
    fridgeItems: number;
    total: number;
    limit: number;
    remaining: number;
    plan: PlanType;
}> {
    const capacity = await getRemainingCapacity(userId);

    return {
        bankTransactions: capacity.bankTransactions,
        fridgeItems: capacity.receiptTrips,
        total: capacity.used,
        limit: capacity.cap,
        remaining: capacity.remaining,
        plan: capacity.plan,
    };
}

/**
 * Check if user can scan more receipts this month
 */
export async function checkReceiptScanLimit(userId: string): Promise<FeatureAccessResult> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);

    if (limits.maxReceiptScansPerMonth === Infinity) {
        return { allowed: true, plan };
    }

    const result = await neonQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM receipts 
         WHERE user_id = $1 
         AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
        [userId]
    );

    const currentCount = parseInt(result[0]?.count || '0');

    if (currentCount >= limits.maxReceiptScansPerMonth) {
        return {
            allowed: false,
            reason: `You've reached your monthly limit of ${limits.maxReceiptScansPerMonth} receipt scans`,
            currentUsage: currentCount,
            limit: limits.maxReceiptScansPerMonth,
            plan,
            upgradeRequired: true,
        };
    }

    return {
        allowed: true,
        currentUsage: currentCount,
        limit: limits.maxReceiptScansPerMonth,
        plan,
    };
}

/**
 * Check if user can send AI chat messages today
 */
export async function checkAiChatLimit(userId: string): Promise<FeatureAccessResult> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);

    if (!limits.aiChatEnabled) {
        return {
            allowed: false,
            reason: 'AI Chat requires a Pro or Max subscription',
            plan,
            upgradeRequired: true,
        };
    }

    if (limits.aiChatMessagesPerDay === Infinity) {
        return { allowed: true, plan };
    }

    // Count today's messages
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const result = await neonQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM ai_chat_usage 
         WHERE user_id = $1 AND DATE(created_at) = $2`,
        [userId, today]
    );

    const currentCount = parseInt(result[0]?.count || '0');

    if (currentCount >= limits.aiChatMessagesPerDay) {
        return {
            allowed: false,
            reason: `You've reached your daily limit of ${limits.aiChatMessagesPerDay} AI chat messages. Resets at midnight.`,
            currentUsage: currentCount,
            limit: limits.aiChatMessagesPerDay,
            plan,
            upgradeRequired: true,
        };
    }

    return {
        allowed: true,
        currentUsage: currentCount,
        limit: limits.aiChatMessagesPerDay,
        plan,
    };
}

/**
 * Record that a user sent an AI chat message (call after successful response)
 */
export async function recordAiChatMessage(userId: string): Promise<void> {
    await neonQuery(
        `INSERT INTO ai_chat_usage (user_id, created_at) VALUES ($1, NOW())`,
        [userId]
    );
}

/**
 * Check if user can add more custom TRANSACTION categories
 * (Beyond the 21 default ones like Groceries, Shopping, etc.)
 */
export async function checkCustomTransactionCategoryLimit(userId: string): Promise<FeatureAccessResult> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);

    if (limits.customTransactionCategoriesLimit === Infinity) {
        return { allowed: true, plan };
    }

    const result = await neonQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM categories 
         WHERE user_id = $1 AND is_default = false`,
        [userId]
    );

    const currentCount = parseInt(result[0]?.count || '0');

    if (currentCount >= limits.customTransactionCategoriesLimit) {
        return {
            allowed: false,
            reason: `You've reached your limit of ${limits.customTransactionCategoriesLimit} custom transaction categories`,
            currentUsage: currentCount,
            limit: limits.customTransactionCategoriesLimit,
            plan,
            upgradeRequired: true,
        };
    }

    return {
        allowed: true,
        currentUsage: currentCount,
        limit: limits.customTransactionCategoriesLimit,
        plan,
    };
}

/**
 * Check if user can add more custom FRIDGE/RECEIPT categories
 * (Beyond the 28 default ones like Meat, Dairy, Snacks, etc.)
 */
export async function checkCustomFridgeCategoryLimit(userId: string): Promise<FeatureAccessResult> {
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);

    if (limits.customFridgeCategoriesLimit === Infinity) {
        return { allowed: true, plan };
    }

    const result = await neonQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM receipt_categories 
         WHERE user_id = $1 AND is_default = false`,
        [userId]
    );

    const currentCount = parseInt(result[0]?.count || '0');

    if (currentCount >= limits.customFridgeCategoriesLimit) {
        return {
            allowed: false,
            reason: `You've reached your limit of ${limits.customFridgeCategoriesLimit} custom fridge categories`,
            currentUsage: currentCount,
            limit: limits.customFridgeCategoriesLimit,
            plan,
            upgradeRequired: true,
        };
    }

    return {
        allowed: true,
        currentUsage: currentCount,
        limit: limits.customFridgeCategoriesLimit,
        plan,
    };
}

/**
 * Get user's plan and limits summary
 */
export async function getUserPlanSummary(userId: string) {
    const subscription = await getUserSubscription(userId);
    const plan = (subscription?.plan || 'free') as PlanType;
    const limits = getPlanLimits(plan);
    const usage = await getTotalTransactionUsage(userId);

    return {
        plan,
        status: subscription?.status || 'active',
        limits,
        usage: {
            transactions: usage.total,
            bankTransactions: usage.bankTransactions,
            fridgeItems: usage.fridgeItems,
            transactionLimit: usage.limit,
            remaining: usage.remaining,
        },
        subscription: subscription ? {
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            pendingPlan: subscription.pendingPlan,
        } : null,
    };
}

// Re-export cap types for convenience
export type { TransactionCapacity, LimitExceededResponse };
