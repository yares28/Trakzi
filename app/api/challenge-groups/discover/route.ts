// app/api/challenge-groups/discover/route.ts
// GET — list public challenge groups the user is NOT already a member of

import { NextResponse } from 'next/server'
import { neonQuery } from '@/lib/neonClient'
import { getCurrentUserId } from '@/lib/auth'

export async function GET() {
    try {
        const userId = await getCurrentUserId()

        const groups = await neonQuery<{
            id: string
            name: string
            description: string | null
            created_by: string
            invite_code: string
            metrics: string[]
            created_at: string
            member_count: string
        }>(
            `SELECT cg.id, cg.name, cg.description, cg.created_by, cg.invite_code, cg.metrics, cg.created_at,
                    (SELECT COUNT(*)::text FROM challenge_group_members cgm2 WHERE cgm2.group_id = cg.id) AS member_count
             FROM challenge_groups cg
             WHERE cg.is_public = true
               AND cg.id NOT IN (
                   SELECT cgm.group_id FROM challenge_group_members cgm WHERE cgm.user_id = $1
               )
             ORDER BY cg.created_at DESC
             LIMIT 50`,
            [userId]
        )

        return NextResponse.json(groups.map(g => ({
            id: g.id,
            name: g.name,
            description: g.description,
            metrics: g.metrics,
            memberCount: parseInt(g.member_count, 10),
            created_at: g.created_at,
        })))
    } catch (error: any) {
        console.error('[Challenge Groups Discover]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
