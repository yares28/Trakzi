// app/api/challenge-groups/join/route.ts
// POST — join a challenge group by invite code

import { NextResponse } from 'next/server'
import { neonQuery } from '@/lib/neonClient'
import { getCurrentUserId } from '@/lib/auth'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body = await request.json()
        const { invite_code, group_id } = body as { invite_code?: string; group_id?: string }

        if (!invite_code && !group_id) {
            return NextResponse.json({ error: 'invite_code or group_id is required' }, { status: 400 })
        }

        // Find the group by invite code or group_id (public only for direct join)
        let group: { id: string; is_public: boolean } | undefined

        if (group_id) {
            const [row] = await neonQuery<{ id: string; is_public: boolean }>(
                `SELECT id, is_public FROM challenge_groups WHERE id = $1 AND is_public = true`,
                [group_id]
            )
            group = row
        } else {
            const [row] = await neonQuery<{ id: string; is_public: boolean }>(
                `SELECT id, is_public FROM challenge_groups WHERE invite_code = $1`,
                [invite_code!.toUpperCase()]
            )
            group = row
        }

        if (!group) {
            return NextResponse.json({ error: group_id ? 'Group not found or is private' : 'Invalid invite code' }, { status: 404 })
        }

        // Check if already a member
        const existing = await neonQuery(
            `SELECT 1 FROM challenge_group_members WHERE group_id = $1 AND user_id = $2`,
            [group.id, userId]
        )

        if (existing.length > 0) {
            return NextResponse.json({ error: 'Already a member of this group' }, { status: 409 })
        }

        await neonQuery(
            `INSERT INTO challenge_group_members (group_id, user_id) VALUES ($1, $2)`,
            [group.id, userId]
        )

        await invalidateUserCachePrefix(userId, 'friends')

        return NextResponse.json({ success: true, group_id: group.id })
    } catch (error: any) {
        console.error('[Challenge Groups Join]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
