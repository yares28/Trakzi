// lib/plan-limits.ts
// ============================================================================
// CUSTOMIZE YOUR PLAN LIMITS HERE
// ============================================================================
// 
// Edit the values below to define what each plan gets access to.
// Use `Infinity` for unlimited, `true`/`false` for feature toggles.
//
// Plans: 'free', 'pro', 'max'
// ============================================================================

import { PlanType } from './subscriptions';

export interface PlanLimits {
    // -------------------------------------------------------------------------
    // TOTAL TRANSACTIONS (LIFETIME CAP)
    // Combines: bank statement transactions + fridge/receipt items
    // This is a TOTAL cap on stored transactions, not per-month.
    // Used when: User imports CSV, adds manual transaction, or scans receipt items
    // -------------------------------------------------------------------------
    maxTotalTransactions: number;

    // -------------------------------------------------------------------------
    // RECEIPT SCANS
    // Number of receipt images user can upload/scan per month
    // Each scan can contain multiple items (which count toward total transactions)
    // Used when: User uploads a receipt image for OCR processing
    // Recommendation: Free 15-25, Pro 100-200, Max unlimited
    // -------------------------------------------------------------------------
    maxReceiptScansPerMonth: number;

    // -------------------------------------------------------------------------
    // RECEIPT OCR
    // Whether AI can extract items from receipt images
    // If false, user can only manually enter receipt items
    // Recommendation: Enable for all plans (it's a core feature)
    // -------------------------------------------------------------------------
    receiptOcrEnabled: boolean;

    // -------------------------------------------------------------------------
    // AI CHAT
    // Access to the AI financial assistant chat feature
    // Used when: User opens /chat page and asks questions
    // Recommendation: Free disabled or 3-5/day, Pro 30-50/day, Max unlimited
    // -------------------------------------------------------------------------
    aiChatEnabled: boolean;
    aiChatMessagesPerDay: number;

    // -------------------------------------------------------------------------
    // AI INSIGHTS
    // AI-generated insights on dashboard and analytics (chart explanations, tips)
    // Used when: Viewing charts, weekly summaries, financial health scores
    // Recommendation: Free disabled, Pro/Max enabled (good upsell feature)
    // -------------------------------------------------------------------------
    aiInsightsEnabled: boolean;

    // -------------------------------------------------------------------------
    // AI CATEGORIZATION
    // AI auto-categorizes transactions when importing CSV
    // If disabled, user must manually categorize each transaction
    // Recommendation: Enable for all plans (reduces friction)
    // -------------------------------------------------------------------------
    aiCategorizationEnabled: boolean;

    // -------------------------------------------------------------------------
    // ADVANCED CHARTS
    // Access to detailed analytics charts beyond basic ones
    // Used when: Viewing /analytics page advanced visualizations
    // Recommendation: Free enabled (shows value), or disable for upsell
    // -------------------------------------------------------------------------
    advancedChartsEnabled: boolean;

    // -------------------------------------------------------------------------
    // DATA EXPORT
    // Ability to export data as CSV/PDF
    // Used when: User clicks export buttons
    // Recommendation: Free disabled, Pro/Max enabled (good upsell feature)
    // -------------------------------------------------------------------------
    exportEnabled: boolean;

    // -------------------------------------------------------------------------
    // CUSTOM TRANSACTION CATEGORIES
    // Extra categories user can create beyond the 21 default ones
    // For bank transactions (Groceries, Shopping, etc.)
    // Recommendation: Free 5-10, Pro 30-50, Max unlimited
    // -------------------------------------------------------------------------
    customTransactionCategoriesLimit: number;

    // -------------------------------------------------------------------------
    // CUSTOM FRIDGE CATEGORIES  
    // Extra food categories user can create beyond the 28 default ones
    // For receipt/fridge items (Meat, Dairy, Snacks, etc.)
    // Recommendation: Free 5-10, Pro 30-50, Max unlimited
    // -------------------------------------------------------------------------
    customFridgeCategoriesLimit: number;

    // -------------------------------------------------------------------------
    // DATA RETENTION
    // How many months of historical data to keep
    // Older data is archived/deleted after this period
    // Recommendation: Free 6-12, Pro 24-36, Max unlimited
    // Note: Currently not enforced - for future use
    // -------------------------------------------------------------------------
    dataRetentionMonths: number;
}

// ============================================================================
// PLAN CONFIGURATION - EDIT THESE VALUES!
// ============================================================================

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {

    // =========================================================================
    // FREE PLAN
    // =========================================================================
    free: {
        maxTotalTransactions: 400,       // Total transactions ever stored
        maxReceiptScansPerMonth: Infinity,
        receiptOcrEnabled: true,
        aiChatEnabled: true,
        aiChatMessagesPerDay: 5,
        aiInsightsEnabled: false,
        aiCategorizationEnabled: true,
        advancedChartsEnabled: true,
        exportEnabled: false,
        customTransactionCategoriesLimit: 5,   // Free: 5 transaction categories
        customFridgeCategoriesLimit: 5,        // Free: 5 receipt categories
        dataRetentionMonths: Infinity,
    },

    // =========================================================================
    // PRO PLAN
    // =========================================================================
    pro: {
        maxTotalTransactions: 3000,      // Total transactions ever stored
        maxReceiptScansPerMonth: Infinity,
        receiptOcrEnabled: true,
        aiChatEnabled: true,
        aiChatMessagesPerDay: Infinity,
        aiInsightsEnabled: true,
        aiCategorizationEnabled: true,
        advancedChartsEnabled: true,
        exportEnabled: true,
        customTransactionCategoriesLimit: 20,  // Pro: 20 transaction categories
        customFridgeCategoriesLimit: 20,       // Pro: 20 receipt categories
        dataRetentionMonths: Infinity,
    },

    // =========================================================================
    // MAX PLAN
    // =========================================================================
    max: {
        maxTotalTransactions: 15000,     // High limit for Max plan
        maxReceiptScansPerMonth: Infinity,
        receiptOcrEnabled: true,
        aiChatEnabled: true,
        aiChatMessagesPerDay: Infinity,
        aiInsightsEnabled: true,
        aiCategorizationEnabled: true,
        advancedChartsEnabled: true,
        exportEnabled: true,
        customTransactionCategoriesLimit: 100, // Max: 100 transaction categories
        customFridgeCategoriesLimit: 100,      // Max: 100 receipt categories
        dataRetentionMonths: Infinity,
    },
};

// ============================================================================
// HELPER FUNCTIONS (Don't edit below this line)
// ============================================================================

export function getPlanLimits(plan: PlanType): PlanLimits {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function isFeatureEnabled(plan: PlanType, feature: keyof PlanLimits): boolean {
    const limits = getPlanLimits(plan);
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    return false;
}

export function getPlanDisplayName(plan: PlanType): string {
    switch (plan) {
        case 'free': return 'Free';
        case 'pro': return 'Pro';
        case 'max': return 'Max';
        default: return 'Free';
    }
}

export function needsUpgrade(currentPlan: PlanType, requiredPlan: PlanType): boolean {
    const planOrder: PlanType[] = ['free', 'pro', 'max'];
    return planOrder.indexOf(currentPlan) < planOrder.indexOf(requiredPlan);
}

/**
 * Get the next plan that would increase transaction capacity
 */
export function getUpgradePlans(currentPlan: PlanType): PlanType[] {
    const currentCap = PLAN_LIMITS[currentPlan].maxTotalTransactions;
    const upgrades: PlanType[] = [];

    if (currentPlan === 'free') {
        upgrades.push('pro', 'max');
    } else if (currentPlan === 'pro') {
        // Only suggest max if it has higher cap
        if (PLAN_LIMITS.max.maxTotalTransactions > currentCap) {
            upgrades.push('max');
        }
    }

    return upgrades;
}
