import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/challenges/[id]/leave — leave a challenge
export async function POST(_req: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params

        // Verify the user is a participant (and not the creator)
        const challenge = await neonQuery<{ created_by: string }>(
            `SELECT created_by FROM challenges WHERE id = $1`,
            [id]
        )

        if (challenge.length === 0) {
            return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
        }

        if (challenge[0].created_by === userId) {
            return NextResponse.json(
                { error: 'Creator cannot leave. Delete the challenge instead.' },
                { status: 400 }
            )
        }

        const result = await neonQuery(
            `DELETE FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2`,
            [id, userId]
        )

        await invalidateUserCachePrefix(userId, 'friends')

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to leave challenge' }, { status: 500 })
    }
}
