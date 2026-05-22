// app/api/users/[userId]/profile-stats/route.ts
// Returns all-time savings%, spending%, frugality% for a user's profile modal.
// Respects privacy: only accessible if the requester is the user or has sharing permission.

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { canViewMetrics } from '@/lib/friends/sharing'

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v))
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const viewerId = await getCurrentUserId()
        const { userId } = await params

        // Self always allowed; friends need sharing permission
        const allowed = viewerId === userId || await canViewMetrics(viewerId, userId)
        if (!allowed) {
            return NextResponse.json({ error: 'Private profile' }, { status: 403 })
        }

        const rows = await neonQuery<{
            total_income: string
            total_expense: string
            wants: string
        }>(
            `SELECT
                COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0)::text AS total_income,
                COALESCE(ABS(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END)), 0)::text AS total_expense,
                COALESCE(ABS(SUM(CASE WHEN t.amount < 0 AND c.broad_type = 'Wants' THEN t.amount ELSE 0 END)), 0)::text AS wants
             FROM transactions t
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE t.user_id = $1`,
            [userId]
        )

        const r = rows[0]
        const totalIncome = parseFloat(r?.total_income ?? '0')
        const totalExpense = parseFloat(r?.total_expense ?? '0')
        const wants = parseFloat(r?.wants ?? '0')

        // If no spending data, return zeros — none can claim 100%
        const hasData = totalExpense > 0

        const savingsRate = hasData && totalIncome > 0
            ? clamp(Math.round(((totalIncome - totalExpense) / totalIncome) * 100), 0, 99)
            : 0
        const spendingRate = hasData && totalIncome > 0
            ? clamp(Math.round((totalExpense / totalIncome) * 100), 0, 99)
            : 0
        const frugality = hasData
            ? clamp(Math.round(((totalExpense - wants) / totalExpense) * 100), 0, 100)
            : 0

        return NextResponse.json({ savingsRate, spendingRate, frugality, hasData })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
