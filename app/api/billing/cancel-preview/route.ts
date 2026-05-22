// app/api/billing/cancel-preview/route.ts
// Preview capacity impact if subscription is canceled (downgrade to free)
// NOTE: We never auto-delete transactions. This endpoint shows how many slots
// the user would be over capacity, so the UI can warn them about write-blocking.

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getWalletCapacity } from '@/lib/limits/transaction-wallet';
import { PLAN_LIMITS } from '@/lib/plan-limits';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        const currentCapacity = await getWalletCapacity(userId);

        // Free plan base capacity (after cancellation, user keeps purchased packs + earned bonus)
        // The new "base_capacity" will be set to free plan's base on next wallet sync
        const freeBase = PLAN_LIMITS.free.maxTotalTransactions;
        const freePlanCap = freeBase + currentCapacity.purchasedCapacity + currentCapacity.monthlyBonusEarned;

        const currentTotal = currentCapacity.used;
        const excessTransactions = Math.max(0, currentTotal - freePlanCap);

        return NextResponse.json({
            currentTotal,
            freePlanCap,
            transactionsToDelete: excessTransactions,  // kept for UI compatibility — means "over by this amount"
            willExceed: excessTransactions > 0,
        });
    } catch (error: any) {
        console.error('[Cancel Preview] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to calculate cancellation impact' },
            { status: 500 }
        );
    }
}
