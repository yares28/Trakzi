// app/api/billing/cancel-preview/route.ts
// Preview how many transactions will be deleted if subscription is canceled

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTransactionCount, getTransactionCap, calculateDeletionsForCap } from '@/lib/limits/transactions-cap';

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in to continue' },
                { status: 401 }
            );
        }

        // Get current transaction count
        const counts = await getTransactionCount(userId);
        const freePlanCap = getTransactionCap('free');

        // Calculate how many would be deleted
        const deletionInfo = await calculateDeletionsForCap(userId, freePlanCap);

        return NextResponse.json({
            currentTotal: deletionInfo.currentTotal,
            freePlanCap,
            transactionsToDelete: deletionInfo.toDelete,
            willExceed: deletionInfo.wouldExceed,
            bankTransactions: counts.bankTransactions,
            receiptTrips: counts.receiptTrips,
        });
    } catch (error: any) {
        console.error('[Cancel Preview] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to calculate cancellation impact' },
            { status: 500 }
        );
    }
}

