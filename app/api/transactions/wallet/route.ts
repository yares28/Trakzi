// app/api/transactions/wallet/route.ts
// GET current user's transaction wallet capacity breakdown

import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getWalletCapacity } from '@/lib/limits/transaction-wallet';

export async function GET() {
    try {
        const userId = await getCurrentUserId();
        const capacity = await getWalletCapacity(userId);

        return NextResponse.json({
            // Permanent components
            baseCapacity: capacity.baseCapacity,
            monthlyBonusEarned: capacity.monthlyBonusEarned,
            purchasedCapacity: capacity.purchasedCapacity,
            // Current period
            monthlyAllotment: capacity.monthlyAllotment,
            monthlyUsed: capacity.monthlyUsed,
            monthlyAvailable: capacity.monthlyAvailable,
            // Totals
            totalCapacity: capacity.totalCapacity,
            used: capacity.used,
            remaining: capacity.remaining,
            plan: capacity.plan,
        });
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
        }
        console.error('[Wallet] Error fetching wallet capacity:', error);
        return NextResponse.json(
            { error: 'Failed to fetch wallet capacity.' },
            { status: 500 }
        );
    }
}
