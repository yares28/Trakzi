export type SubscriptionStatus = {
    plan: "free" | "pro" | "max";
    status: string;
    limits: {
        maxTotalTransactions: number;
        aiChatEnabled: boolean;
        aiChatMessagesPerDay: number;
        aiInsightsEnabled: boolean;
        exportEnabled: boolean;
        customTransactionCategoriesLimit: number;
        customFridgeCategoriesLimit: number;
    };
    usage: {
        bankTransactions: number;
        fridgeItems: number;
        totalTransactions: number;
        transactionLimit: number;
        percentUsed: number;
    };
    subscription: {
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
    } | null;
};

export type PlanType = "free" | "pro" | "max";
