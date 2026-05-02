// app/api/transfers/count/route.ts
// Lightweight count endpoint for the sidebar badge + Analytics stale-banner.
//
// Two numbers in one round trip so the sidebar can render both signals from a
// single fetch (per OQ-5: badge always; banner when staleOpen > 3).
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'

const STALE_AGE_DAYS = 7

export async function GET() {
    try {
        const userId = await getCurrentUserId()

        const [row] = await neonQuery<{ open_count: string; stale_count: string }>(
            `SELECT
                COUNT(*) FILTER (WHERE status IN ('pending','suggested')) AS open_count,
                COUNT(*) FILTER (
                    WHERE status IN ('pending','suggested')
                      AND created_at < NOW() - ($2 || ' days')::interval
                ) AS stale_count
             FROM account_transfers
             WHERE user_id = $1`,
            [userId, String(STALE_AGE_DAYS)]
        )

        return NextResponse.json({
            success: true,
            openCount: parseInt(row?.open_count ?? '0', 10),
            staleCount: parseInt(row?.stale_count ?? '0', 10),
            staleAgeDays: STALE_AGE_DAYS,
        })
    } catch (error: any) {
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
            return NextResponse.json({ success: true, openCount: 0, staleCount: 0, staleAgeDays: STALE_AGE_DAYS })
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
