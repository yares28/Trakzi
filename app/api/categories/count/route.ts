import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getCategoryCounts, getRemainingCategoryCapacity } from '@/lib/limits/category-cap';

export async function GET() {
    try {
        const userId = await getCurrentUserId();
        const capacity = await getRemainingCategoryCapacity(userId);

        return NextResponse.json(
            {
                transactions: capacity.transactionUsed,
                receipts: capacity.receiptUsed,
                total: capacity.transactionUsed + capacity.receiptUsed,
                capacity: {
                    transactionCap: capacity.transactionCap,
                    receiptCap: capacity.receiptCap,
                    transactionRemaining: capacity.transactionRemaining,
                    receiptRemaining: capacity.receiptRemaining,
                },
                plan: capacity.plan,
            },
            { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' } }
        );
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to get category counts' },
            { status: 500 }
        );
    }
}
