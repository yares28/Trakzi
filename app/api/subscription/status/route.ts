// app/api/subscription/status/route.ts
// Get current user's subscription status and usage

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getUserPlanSummary, getTotalTransactionUsage } from '@/lib/feature-access';

export async function GET() {
    try {
        const userId = await getCurrentUserId();

        // SAFETY NET: Auto-enforce transaction capacity BEFORE fetching usage
        // This ensures the count is correct after any auto-deletions
        const { checkAndEnforceCapacity } = await import('@/lib/startup/check-capacity');
        await checkAndEnforceCapacity(userId).catch((error) => {
            console.error('[Subscription Status] Capacity check failed:', error);
            // Continue anyway - don't block status fetch if capacity check fails
        });

        // Get plan summary with usage (will now reflect any deletions)
        const summary = await getUserPlanSummary(userId);
        const usage = await getTotalTransactionUsage(userId);

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
