// app/api/subscription/me/route.ts
// Get current user's subscription with cap and usage data
// This is the primary endpoint for subscription status with transaction limits

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserSubscription } from '@/lib/subscriptions';
import { getTransactionCount, getTransactionCap } from '@/lib/limits/transactions-cap';
import { PLAN_LIMITS } from '@/lib/plan-limits';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            );
        }

        // Get subscription details
        const subscription = await getUserSubscription(userId);

        // Determine the active plan
        const plan = subscription?.plan ?? 'free';
        const status = subscription?.status ?? 'active';
        const isLifetime = subscription?.isLifetime ?? false;

        // Get cap for this plan
        const cap = getTransactionCap(plan);

        // Get current usage
        const usage = await getTransactionCount(userId);
        const usedTotal = usage.total;
        const remaining = cap === Infinity ? Infinity : Math.max(0, cap - usedTotal);

        // Get limits for display
        const limits = PLAN_LIMITS[plan];

        // Handle Infinity for JSON serialization
        const safeNumber = (n: number) => (n === Infinity ? -1 : n);

        return NextResponse.json({
            // Core subscription info
            plan,
            status,
            is_lifetime: isLifetime,

            // Dates and pending changes
            current_period_end: subscription?.currentPeriodEnd?.toISOString() ?? null,
            cancel_at_period_end: subscription?.cancelAtPeriodEnd ?? false,
            pending_plan: subscription?.pendingPlan ?? null,

            // Transaction cap info (the main reason for this endpoint)
            cap: safeNumber(cap),
            used_total: usedTotal,
            remaining: safeNumber(remaining),

            // Detailed breakdown
            usage: {
                bank_transactions: usage.bankTransactions,
                receipt_trips: usage.receiptTrips,
                total: usedTotal,
            },

            // Plan limits for UI display
            limits: {
                max_total_transactions: safeNumber(limits.maxTotalTransactions),
                ai_chat_enabled: limits.aiChatEnabled,
                ai_chat_messages: safeNumber(limits.aiChatMessages),
                ai_chat_period: limits.aiChatPeriod,
                ai_insights_enabled: limits.aiInsightsEnabled,
                ai_insights_free_preview_count: limits.aiInsightsFreePreviewCount,
                advanced_charts_enabled: limits.advancedChartsEnabled,
            },
        });
    } catch (error: any) {
        console.error('[Subscription/Me] Error:', error);

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Please sign in to view subscription' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to get subscription status' },
            { status: 500 }
        );
    }
}
