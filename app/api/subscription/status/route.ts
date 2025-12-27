// app/api/subscription/status/route.ts
// Get current user's subscription status and usage

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getUserPlanSummary, getTotalTransactionUsage } from '@/lib/feature-access';
import { neonQuery } from '@/lib/neonClient';

export async function GET() {
    try {
        const userId = await getCurrentUserId();

        //Get plan summary with usage
        const summary = await getUserPlanSummary(userId);
        const usage = await getTotalTransactionUsage(userId);

        // Get category counts
        const [transactionCats, receiptCats] = await Promise.all([
            neonQuery<{ count: string | number }>('SELECT COUNT(*) as count FROM categories WHERE user_id = $1', [userId]),
            neonQuery<{ count: string | number }>('SELECT COUNT(*) as count FROM receipt_categories WHERE user_id = $1', [userId])
        ]);

        const transactionCategoryCount = Number(transactionCats[0]?.count || 0);
        const receiptCategoryCount = Number(receiptCats[0]?.count || 0);

        // Handle Infinity values - JSON doesn't support Infinity
        // Use -1 to indicate unlimited
        const sanitizeInfinity = (val: number) => val === Infinity ? -1 : val;

        return NextResponse.json({
            plan: summary.plan,
            status: summary.status,
            limits: {
                ...summary.limits,
                maxTotalTransactions: sanitizeInfinity(summary.limits.maxTotalTransactions),
                maxReceiptScansPerMonth: sanitizeInfinity(summary.limits.maxReceiptScansPerMonth),
                aiChatMessagesPerDay: sanitizeInfinity(summary.limits.aiChatMessagesPerDay),
                customTransactionCategoriesLimit: sanitizeInfinity(summary.limits.customTransactionCategoriesLimit),
                customFridgeCategoriesLimit: sanitizeInfinity(summary.limits.customFridgeCategoriesLimit),
                dataRetentionMonths: sanitizeInfinity(summary.limits.dataRetentionMonths),
            },
            usage: {
                bankTransactions: usage.bankTransactions,
                fridgeItems: usage.fridgeItems,
                totalTransactions: usage.total,
                // -1 means unlimited
                transactionLimit: usage.limit === Infinity ? -1 : usage.limit,
                percentUsed: usage.limit === Infinity ? 0 : Math.round((usage.total / usage.limit) * 100),
            },
            categoryUsage: {
                transactionCategories: transactionCategoryCount,
                receiptCategories: receiptCategoryCount
            },
            subscription: summary.subscription,
        });
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Please sign in to view subscription status' },
                { status: 401 }
            );
        }

        console.error('[Subscription Status] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get subscription status' },
            { status: 500 }
        );
    }
}
