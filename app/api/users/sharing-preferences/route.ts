import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { getSharingPreferences, updateSharingPreferences } from '@/lib/friends/sharing'
import { invalidateUserCachePrefix, buildCacheKey, invalidateExactKeys } from '@/lib/cache/upstash'

const PatchSchema = z.object({
    share_with_friends: z.boolean().optional(),
    share_publicly: z.boolean().optional(),
}).refine(
    data => data.share_with_friends !== undefined || data.share_publicly !== undefined,
    { message: 'At least one preference must be provided' }
)

export async function GET() {
    try {
        const userId = await getCurrentUserId()
        const prefs = await getSharingPreferences(userId)
        return NextResponse.json(prefs)
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to fetch sharing preferences' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()
        const body = await req.json().catch(() => ({}))

        const parsed = PatchSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Invalid input' },
                { status: 400 }
            )
        }

        // If trying to go fully private, check for challenge group membership
        const willBeFullyPrivate =
            (parsed.data.share_with_friends === false || (parsed.data.share_with_friends === undefined)) &&
            (parsed.data.share_publicly === false || (parsed.data.share_publicly === undefined))

        if (willBeFullyPrivate) {
            // Get current prefs to check the final state
            const current = await getSharingPreferences(userId)
            const finalShareFriends = parsed.data.share_with_friends ?? current.share_with_friends
            const finalSharePublic = parsed.data.share_publicly ?? current.share_publicly

            if (!finalShareFriends && !finalSharePublic) {
                const groups = await neonQuery<{ group_id: string }>(
                    `SELECT group_id FROM challenge_group_members WHERE user_id = $1 LIMIT 1`,
                    [userId]
                )
                if (groups.length > 0) {
                    return NextResponse.json(
                        { error: 'You must leave all challenge groups before making your profile fully private.' },
                        { status: 409 }
                    )
                }
            }
        }

        const updated = await updateSharingPreferences(userId, parsed.data)

        // Invalidate friends-bundle caches so the privacy change is visible immediately.
        // We need to bust:
        //   1. The user's own bundle (their view of the leaderboard)
        //   2. Every friend's bundle (each friend caches this user's privacy-filtered metrics)
        const friendRows = await neonQuery<{ friend_id: string }>(
            `SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END AS friend_id
             FROM friendships
             WHERE status = 'accepted' AND (requester_id = $1 OR addressee_id = $1)`,
            [userId]
        ).catch(() => [])

        const friendIds = friendRows.map(r => r.friend_id)

        // Fire-and-forget — don't let cache errors block the response
        void Promise.all([
            invalidateExactKeys(buildCacheKey('friends', userId, null, 'bundle')),
            invalidateUserCachePrefix(userId, 'friends'),
            ...friendIds.map(fid => invalidateExactKeys(buildCacheKey('friends', fid, null, 'bundle'))),
            ...friendIds.map(fid => invalidateUserCachePrefix(fid, 'friends')),
        ]).catch(() => {})

        return NextResponse.json(updated)
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to update sharing preferences' }, { status: 500 })
    }
}
