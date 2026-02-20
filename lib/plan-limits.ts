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
    // TRANSACTION ECONOMY
    // Base capacity = initial gift when signing up (monthly billing).
    // Annual variant = higher gift for annual subscribers.
    // Monthly transactions = renewable bonus slots per billing cycle.
    // -------------------------------------------------------------------------
    maxTotalTransactions: number;
    maxTotalTransactionsAnnual: number;
    monthlyTransactions: number;

    // -------------------------------------------------------------------------
    // RECEIPT SCANS
    // Number of receipt images user can upload/scan per month
    // Each scan can contain multiple items (which count toward total transactions)
    // -------------------------------------------------------------------------
    maxReceiptScansPerMonth: number;

    // -------------------------------------------------------------------------
    // RECEIPT OCR
    // Whether AI can extract items from receipt images
    // If false, user can only manually enter receipt items
    // -------------------------------------------------------------------------
    receiptOcrEnabled: boolean;

    // -------------------------------------------------------------------------
    // AI CHAT (period-based rate limiting)
    // aiChatMessages = max messages per period
    // aiChatPeriod = 'week' for all plans
    // -------------------------------------------------------------------------
    aiChatEnabled: boolean;
    aiChatMessages: number;
    aiChatPeriod: 'day' | 'week' | 'month';

    // -------------------------------------------------------------------------
    // AI INSIGHTS
    // aiInsightsEnabled = full access to AI insights
    // aiInsightsFreePreviewCount = how many insights Free users can see (rest blurred)
    //   0 = none visible, 3 = show 3 then blur rest
    // -------------------------------------------------------------------------
    aiInsightsEnabled: boolean;
    aiInsightsFreePreviewCount: number;

    // -------------------------------------------------------------------------
    // AI CATEGORIZATION
    // AI auto-categorizes transactions when importing CSV
    // -------------------------------------------------------------------------
    aiCategorizationEnabled: boolean;

    // -------------------------------------------------------------------------
    // ADVANCED CHARTS
    // Access to detailed analytics charts beyond standard ones
    // Free users see a blurred "Advanced" button
    // -------------------------------------------------------------------------
    advancedChartsEnabled: boolean;

    // -------------------------------------------------------------------------
    // CUSTOM CATEGORIES
    // Extra categories user can create beyond the defaults
    // -------------------------------------------------------------------------
    customTransactionCategoriesLimit: number;
    customFridgeCategoriesLimit: number;
}

// ============================================================================
// PLAN CONFIGURATION
// ============================================================================

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {

    // =========================================================================
    // FREE PLAN
    // =========================================================================
    free: {
        maxTotalTransactions: 300,
        maxTotalTransactionsAnnual: 300,        // Free has no annual variant
        monthlyTransactions: 50,
        maxReceiptScansPerMonth: 10,
        receiptOcrEnabled: true,
        aiChatEnabled: true,
        aiChatMessages: 10,
        aiChatPeriod: 'week',
        aiInsightsEnabled: false,
        aiInsightsFreePreviewCount: 3,          // Show 3 insights, blur the rest
        aiCategorizationEnabled: true,
        advancedChartsEnabled: false,            // Blurred for free users
        customTransactionCategoriesLimit: 1,
        customFridgeCategoriesLimit: 1,
    },

    // =========================================================================
    // PRO PLAN
    // =========================================================================
    pro: {
        maxTotalTransactions: 1500,
        maxTotalTransactionsAnnual: 2000,        // +500 for annual subscribers
        monthlyTransactions: 250,
        maxReceiptScansPerMonth: 50,
        receiptOcrEnabled: true,
        aiChatEnabled: true,
        aiChatMessages: 50,
        aiChatPeriod: 'week',
        aiInsightsEnabled: true,
        aiInsightsFreePreviewCount: 0,           // Full access
        aiCategorizationEnabled: true,
        advancedChartsEnabled: true,
        customTransactionCategoriesLimit: 10,
        customFridgeCategoriesLimit: 10,
    },

    // =========================================================================
    // MAX PLAN
    // =========================================================================
    max: {
        maxTotalTransactions: 5000,
        maxTotalTransactionsAnnual: 6000,        // +1000 for annual subscribers
        monthlyTransactions: 750,
        maxReceiptScansPerMonth: 150,
        receiptOcrEnabled: true,
        aiChatEnabled: true,
        aiChatMessages: 100,
        aiChatPeriod: 'week',
        aiInsightsEnabled: true,
        aiInsightsFreePreviewCount: 0,           // Full access
        aiCategorizationEnabled: true,
        advancedChartsEnabled: true,
        customTransactionCategoriesLimit: 25,
        customFridgeCategoriesLimit: 25,
    },
};

// ============================================================================
// TRANSACTION PACK DEFINITIONS
// ============================================================================

export interface TransactionPack {
    id: string;
    name: string;
    transactions: number;
    priceCents: number;
    currency: string;
    stripePriceEnvKey: string;
}

export const TRANSACTION_PACKS: TransactionPack[] = [
    {
        id: 'pack_500',
        name: 'Bundle 1',
        transactions: 500,
        priceCents: 1000,       // €10
        currency: 'eur',
        stripePriceEnvKey: 'STRIPE_PRICE_ID_TRANSACTION_PACK_500',
    },
    {
        id: 'pack_1500',
        name: 'Bundle 2',
        transactions: 1500,
        priceCents: 2000,       // €20
        currency: 'eur',
        stripePriceEnvKey: 'STRIPE_PRICE_ID_TRANSACTION_PACK_1500',
    },
    {
        id: 'pack_5000',
        name: 'Bundle 3',
        transactions: 5000,
        priceCents: 5000,       // €50
        currency: 'eur',
        stripePriceEnvKey: 'STRIPE_PRICE_ID_TRANSACTION_PACK_5000',
    },
];

export function getTransactionPack(packId: string): TransactionPack | undefined {
    return TRANSACTION_PACKS.find(p => p.id === packId);
}

export function getTransactionPackByPriceId(priceId: string): TransactionPack | undefined {
    return TRANSACTION_PACKS.find(p => {
        const envValue = process.env[p.stripePriceEnvKey];
        return envValue === priceId;
    });
}

// ============================================================================
// HELPER FUNCTIONS
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
 * Get the plans that would be an upgrade from the current plan
 */
export function getUpgradePlans(currentPlan: PlanType): PlanType[] {
    const upgrades: PlanType[] = [];

    if (currentPlan === 'free') {
        upgrades.push('pro', 'max');
    } else if (currentPlan === 'pro') {
        upgrades.push('max');
    }

    return upgrades;
}

/**
 * Get the base capacity for a plan considering billing interval
 */
export function getBaseCapacity(plan: PlanType, billingInterval: 'monthly' | 'annual' = 'monthly'): number {
    const limits = getPlanLimits(plan);
    return billingInterval === 'annual'
        ? limits.maxTotalTransactionsAnnual
        : limits.maxTotalTransactions;
}
