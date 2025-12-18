// app/api/subscription/status/route.ts
// Get current user's subscription status and usage

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getUserPlanSummary, getTotalTransactionUsage } from '@/lib/feature-access';

export async function GET() {
    try {
        const userId = await getCurrentUserId();

        // Get plan summary with usage
        const summary = await getUserPlanSummary(userId);
        const usage = await getTotalTransactionUsage(userId);

        return NextResponse.json({
            plan: summary.plan,
            status: summary.status,
            limits: summary.limits,
            usage: {
                bankTransactions: usage.bankTransactions,
                fridgeItems: usage.fridgeItems,
                totalTransactions: usage.total,
                transactionLimit: usage.limit,
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
