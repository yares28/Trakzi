// app/api/challenge-groups/route.ts
// GET  — list all groups the current user belongs to (with live month scores)
// POST — create a new challenge group

import { NextResponse } from 'next/server'
import { neonQuery } from '@/lib/neonClient'
import { getCurrentUserId } from '@/lib/auth'
import { computeUserMetrics } from '@/lib/friends/ranking-metrics'
import type { ChallengeMetric, ChallengeGroupWithMembers } from '@/lib/types/challenges'

function generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export async function GET() {
    try {
        const userId = await getCurrentUserId()

        // Get all groups the user is a member of
        const groupRows = await neonQuery<{
            id: string
            name: string
            description: string | null
            created_by: string
            is_public: boolean
            invite_code: string
            metrics: string[]
            created_at: string
        }>(
            `SELECT cg.id, cg.name, cg.description, cg.created_by, cg.is_public, cg.invite_code, cg.metrics, cg.created_at
             FROM challenge_groups cg
             JOIN challenge_group_members cgm ON cgm.group_id = cg.id AND cgm.user_id = $1
             ORDER BY cg.created_at DESC`,
            [userId]
        )

        if (groupRows.length === 0) {
            return NextResponse.json([])
        }

        const groupIds = groupRows.map(g => g.id)

        // Get all members for all groups in one query
        const memberRows = await neonQuery<{
            group_id: string
            user_id: string
            display_name: string
            total_points: string
            joined_at: string
        }>(
            `SELECT cgm.group_id, cgm.user_id, u.name AS display_name,
                    cgm.total_points::text, cgm.joined_at
             FROM challenge_group_members cgm
             JOIN users u ON u.id = cgm.user_id
             WHERE cgm.group_id = ANY($1::text[])
             ORDER BY cgm.total_points DESC`,
            [groupIds]
        )

        // Compute live scores for all unique member user_ids
        // IMPORTANT: use the group's competition month (derived from created_at),
        // not necessarily the current month, so scores are scoped correctly.
        const uniqueUserIds = [...new Set(memberRows.map(m => m.user_id))]
        const metricsMap = new Map<string, Awaited<ReturnType<typeof computeUserMetrics>>>()

        // Group-level month is determined per group; compute per-group monthStart first
        const groupMonthMap = new Map<string, string>() // groupId -> 'YYYY-MM-01'
        for (const g of groupRows) {
            const d = new Date(g.created_at)
            const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
            groupMonthMap.set(g.id, monthStart)
        }

        // Compute metrics for each user × group-month combination
        // (same user in different groups = different month scope = different cached entry)
        const allGroupMonths = [...new Set(Array.from(groupMonthMap.values()))]
        await Promise.all(
            uniqueUserIds.flatMap(uid =>
                allGroupMonths.map(async (monthStart) => {
                    const key = `${uid}_${monthStart}`
                    if (!metricsMap.has(key)) {
                        const m = await computeUserMetrics(uid, monthStart)
                        metricsMap.set(key, m)
                    }
                })
            )
        )


        // Build group payloads
        const groups: ChallengeGroupWithMembers[] = groupRows.map(g => {
            const metrics = g.metrics as ChallengeMetric[]
            const monthStart = groupMonthMap.get(g.id)!

            // Days left this month for this specific group
            const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
            const now = new Date()
            const daysLeftInMonth = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

            const metricsKey = (uid: string) => `${uid}_${monthStart}`

            const members = memberRows
                .filter(m => m.group_id === g.id)
                .map(m => {
                    const liveMetrics = metricsMap.get(metricsKey(m.user_id))
                    const currentScores: Partial<Record<ChallengeMetric, number | null>> = {}
                    for (const metric of metrics) {
                        currentScores[metric] = liveMetrics?.isRanked
                            ? (liveMetrics[metric as keyof typeof liveMetrics] as number ?? null)
                            : null
                    }
                    return {
                        user_id: m.user_id,
                        display_name: m.display_name,
                        avatar_url: null,
                        total_points: parseInt(m.total_points, 10),
                        joined_at: m.joined_at,
                        currentScores,
                        isRanked: liveMetrics?.isRanked ?? false,
                    }
                })

            // Compute user's rank per metric based on live scores
            const yourRanks: Partial<Record<ChallengeMetric, number>> = {}
            for (const metric of metrics) {
                const isHigherBetter = metric !== 'wantsPercent'
                const sorted = [...members]
                    .filter(m => m.currentScores[metric] !== null && m.isRanked)
                    .sort((a, b) => {
                        const aScore = a.currentScores[metric] ?? 0
                        const bScore = b.currentScores[metric] ?? 0
                        return isHigherBetter ? bScore - aScore : aScore - bScore
                    })
                const myRank = sorted.findIndex(m => m.user_id === userId) + 1
                if (myRank > 0) yourRanks[metric] = myRank
            }

            return {
                id: g.id,
                name: g.name,
                description: g.description,
                created_by: g.created_by,
                is_public: g.is_public,
                invite_code: g.invite_code,
                metrics,
                created_at: g.created_at,
                memberCount: members.length,
                members,
                daysLeftInMonth,
                yourRanks,
            }
        })

        return NextResponse.json(groups)
    } catch (error: any) {
        console.error('[Challenge Groups GET]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body = await request.json()
        const { name, metrics, is_public } = body as {
            name: string
            metrics: ChallengeMetric[]
            is_public: boolean
        }

        if (!name || !metrics || metrics.length === 0) {
            return NextResponse.json({ error: 'name and at least one metric are required' }, { status: 400 })
        }

        const validMetrics: ChallengeMetric[] = ['savingsRate', 'financialHealth', 'fridgeScore', 'wantsPercent']
        if (!metrics.every(m => validMetrics.includes(m))) {
            return NextResponse.json({ error: 'Invalid metric' }, { status: 400 })
        }

        const inviteCode = generateInviteCode()

        const [groupRow] = await neonQuery<{ id: string }>(
            `INSERT INTO challenge_groups (name, created_by, is_public, invite_code, metrics)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [name, userId, is_public ?? false, inviteCode, metrics]
        )

        // Automatically add creator as member
        await neonQuery(
            `INSERT INTO challenge_group_members (group_id, user_id) VALUES ($1, $2)`,
            [groupRow.id, userId]
        )

        return NextResponse.json({ id: groupRow.id, invite_code: inviteCode }, { status: 201 })
    } catch (error: any) {
        console.error('[Challenge Groups POST]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
