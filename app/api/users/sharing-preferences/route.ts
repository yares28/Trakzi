import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { getSharingPreferences, updateSharingPreferences } from '@/lib/friends/sharing'

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
        return NextResponse.json(updated)
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return NextResponse.json({ error: 'Failed to update sharing preferences' }, { status: 500 })
    }
}
