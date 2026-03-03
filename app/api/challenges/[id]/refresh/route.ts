import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/challenges/[id]/refresh — batch-refresh current_spend for all participants
export async function POST(_req: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params

        // Verify user is participant
        const membership = await neonQuery<{ user_id: string }>(
            `SELECT user_id FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (membership.length === 0) {
            return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
        }

        // Get challenge details for date range + category
        const challenges = await neonQuery<{
            category: string
            starts_at: string
            ends_at: string
        }>(
            `SELECT category, starts_at, ends_at FROM challenges WHERE id = $1`,
            [id]
        )

        if (challenges.length === 0) {
            return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
        }

        const { category, starts_at, ends_at } = challenges[0]

        // Batch compute all participants' spending in one query
        await neonQuery(
            `UPDATE challenge_participants cp SET current_spend = sub.spend
             FROM (
                 SELECT cp2.user_id, ABS(COALESCE(SUM(t.amount), 0)) AS spend
                 FROM challenge_participants cp2
                 LEFT JOIN transactions t ON t.user_id = cp2.user_id
                     AND t.amount < 0
                     AND t.tx_date BETWEEN $2::date AND $3::date
                 LEFT JOIN categories c ON t.category_id = c.id
                     AND LOWER(COALESCE(c.name, '')) = LOWER($4)
                 WHERE cp2.challenge_id = $1
                 GROUP BY cp2.user_id
             ) sub WHERE cp.challenge_id = $1 AND cp.user_id = sub.user_id`,
            [id, starts_at, ends_at, category]
        )

        await invalidateUserCachePrefix(userId, 'friends')

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to refresh challenge' }, { status: 500 })
    }
}
