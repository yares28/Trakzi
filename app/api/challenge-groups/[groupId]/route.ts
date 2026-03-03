// app/api/challenge-groups/[groupId]/route.ts
// DELETE — leave a challenge group

import { NextResponse } from 'next/server'
import { neonQuery } from '@/lib/neonClient'
import { getCurrentUserId } from '@/lib/auth'

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ groupId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { groupId } = await context.params

        await neonQuery(
            `DELETE FROM challenge_group_members WHERE group_id = $1 AND user_id = $2`,
            [groupId, userId]
        )

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[Challenge Group Leave]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
