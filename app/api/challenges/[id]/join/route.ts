import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery, neonInsert } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/challenges/[id]/join — join a challenge
export async function POST(_req: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params

        // Verify challenge exists and hasn't ended
        const challenges = await neonQuery<{ id: string; ends_at: string }>(
            `SELECT id, ends_at FROM challenges WHERE id = $1 AND ends_at >= CURRENT_DATE`,
            [id]
        )

        if (challenges.length === 0) {
            return NextResponse.json({ error: 'Challenge not found or has ended' }, { status: 404 })
        }

        // Check if already a participant
        const existing = await neonQuery<{ user_id: string }>(
            `SELECT user_id FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (existing.length > 0) {
            return NextResponse.json({ error: 'Already a participant' }, { status: 409 })
        }

        await neonInsert(
            `INSERT INTO challenge_participants (challenge_id, user_id, current_spend)
             VALUES ($1, $2, 0)`,
            [id, userId]
        )

        await invalidateUserCachePrefix(userId, 'friends')

        return NextResponse.json({ success: true }, { status: 201 })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to join challenge' }, { status: 500 })
    }
}
