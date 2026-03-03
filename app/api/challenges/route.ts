import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery, neonInsert } from '@/lib/neonClient'
import { verifyFriendship } from '@/lib/friends/permissions'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

const CreateChallengeSchema = z.object({
    title: z.string().min(1).max(100).trim(),
    category: z.string().min(1).max(100).trim(),
    goal_type: z.enum(['individual_cap', 'group_total']),
    target_amount: z.number({ coerce: true }).positive().finite(),
    starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    invite_friend_ids: z.array(z.string()).max(20).optional(),
})

// GET /api/challenges — list active challenges for current user
export async function GET() {
    try {
        const userId = await getCurrentUserId()

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
            participant_count: string
        }>(
            `SELECT c.*,
                (SELECT COUNT(*)::text FROM challenge_participants WHERE challenge_id = c.id) AS participant_count
             FROM challenges c
             JOIN challenge_participants cp ON cp.challenge_id = c.id
             WHERE cp.user_id = $1 AND c.ends_at >= CURRENT_DATE
             ORDER BY c.ends_at ASC`,
            [userId]
        )

        return NextResponse.json(challenges.map(c => ({
            ...c,
            target_amount: parseFloat(c.target_amount),
            participant_count: parseInt(c.participant_count, 10),
        })))
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
    }
}

// POST /api/challenges — create a new challenge and invite friends
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json().catch(() => ({}))

        const parsed = CreateChallengeSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Invalid input' },
                { status: 400 }
            )
        }

        const { title, category, goal_type, target_amount, starts_at, ends_at, invite_friend_ids } = parsed.data

        // Validate date range
        if (new Date(ends_at) <= new Date(starts_at)) {
            return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
        }

        // Create the challenge
        const rows = await neonQuery<{ id: string }>(
            `INSERT INTO challenges (created_by, title, category, goal_type, target_amount, starts_at, ends_at)
             VALUES ($1, $2, $3, $4, $5, $6::date, $7::date)
             RETURNING id`,
            [userId, title, category, goal_type, target_amount, starts_at, ends_at]
        )

        const challengeId = rows[0].id

        // Creator auto-joins
        await neonInsert(
            `INSERT INTO challenge_participants (challenge_id, user_id, current_spend)
             VALUES ($1, $2, 0)`,
            [challengeId, userId]
        )

        // Invite friends (only accepted friendships)
        if (invite_friend_ids && invite_friend_ids.length > 0) {
            for (const friendId of invite_friend_ids) {
                const friendship = await verifyFriendship(userId, friendId)
                if (friendship) {
                    await neonInsert(
                        `INSERT INTO challenge_participants (challenge_id, user_id, current_spend)
                         VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
                        [challengeId, friendId]
                    )
                }
            }
        }

        await invalidateUserCachePrefix(userId, 'friends')

        return NextResponse.json({ id: challengeId }, { status: 201 })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
    }
}
