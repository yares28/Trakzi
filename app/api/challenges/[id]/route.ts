import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/challenges/[id] — challenge detail with participants
export async function GET(_req: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params

        // Get challenge + verify user is participant
        const challenges = await neonQuery<{
            id: string
            created_by: string
            title: string
            category: string
            goal_type: string
            target_amount: string
            starts_at: string
            ends_at: string
            created_at: string
        }>(
            `SELECT c.* FROM challenges c
             JOIN challenge_participants cp ON cp.challenge_id = c.id
             WHERE c.id = $1 AND cp.user_id = $2`,
            [id, userId]
        )

        if (challenges.length === 0) {
            return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
        }

        // Get all participants
        const participants = await neonQuery<{
            user_id: string
            display_name: string
            current_spend: string
            joined_at: string
        }>(
            `SELECT cp.user_id, u.name AS display_name, cp.current_spend::text, cp.joined_at
             FROM challenge_participants cp
             JOIN users u ON u.id = cp.user_id
             WHERE cp.challenge_id = $1
             ORDER BY cp.current_spend ASC`,
            [id]
        )

        const challenge = challenges[0]
        const daysRemaining = Math.max(
            0,
            Math.ceil((new Date(challenge.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        )

        return NextResponse.json({
            ...challenge,
            target_amount: parseFloat(challenge.target_amount),
            participants: participants.map(p => ({
                ...p,
                current_spend: parseFloat(p.current_spend),
            })),
            days_remaining: daysRemaining,
            is_member: true,
        })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch challenge' }, { status: 500 })
    }
}

// DELETE /api/challenges/[id] — delete challenge (creator only)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params

        // Verify creator
        const rows = await neonQuery<{ created_by: string }>(
            `SELECT created_by FROM challenges WHERE id = $1`,
            [id]
        )

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
        }

        if (rows[0].created_by !== userId) {
            return NextResponse.json({ error: 'Only the creator can delete a challenge' }, { status: 403 })
        }

        await neonQuery(`DELETE FROM challenges WHERE id = $1`, [id])
        await invalidateUserCachePrefix(userId, 'friends')

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 })
    }
}
