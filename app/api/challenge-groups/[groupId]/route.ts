// app/api/challenge-groups/[groupId]/route.ts
// GET    — fetch a single challenge group with live scores
// PATCH  — update group details (admin-only)
// DELETE — leave a challenge group

import { NextResponse } from 'next/server'
import { neonQuery } from '@/lib/neonClient'
import { getCurrentUserId } from '@/lib/auth'
import { computeUserMetrics } from '@/lib/friends/ranking-metrics'
import type { ChallengeMetric, ChallengeGroupWithMembers, MonthlyScore } from '@/lib/types/challenges'

export async function GET(
    _request: Request,
    context: { params: Promise<{ groupId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { groupId } = await context.params

        // Fetch the group
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
             WHERE cg.id = $1`,
            [groupId]
        )

        if (groupRows.length === 0) {
            return NextResponse.json({ error: 'Challenge group not found' }, { status: 404 })
        }

        const group = groupRows[0]

        // Verify membership (allow public groups to be viewed by anyone)
        const membershipCheck = await neonQuery<{ user_id: string }>(
            `SELECT user_id FROM challenge_group_members WHERE group_id = $1 AND user_id = $2`,
            [groupId, userId]
        )

        if (membershipCheck.length === 0 && !group.is_public) {
            return NextResponse.json({ error: 'You do not have access to this group' }, { status: 403 })
        }

        // Get all members
        const memberRows = await neonQuery<{
            user_id: string
            display_name: string
            total_points: string
            joined_at: string
        }>(
            `SELECT cgm.user_id, u.name AS display_name,
                    cgm.total_points::text, cgm.joined_at
             FROM challenge_group_members cgm
             JOIN users u ON u.id = cgm.user_id
             WHERE cgm.group_id = $1
             ORDER BY cgm.total_points DESC`,
            [groupId]
        )

        // Compute live scores for all members
        const d = new Date(group.created_at)
        const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`

        const metricsMap = new Map<string, Awaited<ReturnType<typeof computeUserMetrics>>>()
        await Promise.all(
            memberRows.map(async (m) => {
                const metrics = await computeUserMetrics(m.user_id, monthStart)
                metricsMap.set(m.user_id, metrics)
            })
        )

        const metrics = group.metrics as ChallengeMetric[]

        // Days left this month
        const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
        const now = new Date()
        const daysLeftInMonth = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

        // Fetch historical monthly results (last 6 months) for sparkline trends
        const historyRows = await neonQuery<{
            user_id: string
            month: string
            metric: string
            score: string
            rank: number
            points: number
        }>(
            `SELECT user_id, month, metric, score::text, rank, points
             FROM challenge_monthly_results
             WHERE group_id = $1
             ORDER BY month ASC`,
            [groupId]
        )

        // Build a map: userId -> metric -> MonthlyScore[]
        const historyMap = new Map<string, Partial<Record<ChallengeMetric, MonthlyScore[]>>>()
        for (const row of historyRows) {
            if (!historyMap.has(row.user_id)) historyMap.set(row.user_id, {})
            const userHistory = historyMap.get(row.user_id)!
            const metric = row.metric as ChallengeMetric
            if (!userHistory[metric]) userHistory[metric] = []
            userHistory[metric]!.push({
                month: row.month,
                score: parseFloat(row.score),
                rank: row.rank,
                points: row.points,
            })
        }

        // Batch-fetch Clerk avatar URLs for all members
        let clerkImageMap = new Map<string, string>()
        try {
            const { clerkClient } = await import('@clerk/nextjs/server')
            const client = await clerkClient()
            const result = await client.users.getUserList({
                userId: memberRows.map(m => m.user_id),
                limit: 200,
            })
            clerkImageMap = new Map(result.data.map(u => [u.id, u.imageUrl]))
        } catch {
            // Best-effort — fall back to null avatars
        }

        const members = memberRows.map(m => {
            const liveMetrics = metricsMap.get(m.user_id)
            const currentScores: Partial<Record<ChallengeMetric, number | null>> = {}
            for (const metric of metrics) {
                currentScores[metric] = liveMetrics?.isRanked
                    ? (liveMetrics[metric as keyof typeof liveMetrics] as number ?? null)
                    : null
            }
            return {
                user_id: m.user_id,
                display_name: m.display_name,
                avatar_url: clerkImageMap.get(m.user_id) ?? null,
                total_points: parseInt(m.total_points, 10),
                joined_at: m.joined_at,
                currentScores,
                isRanked: liveMetrics?.isRanked ?? false,
                scoreHistory: historyMap.get(m.user_id) ?? {},
            }
        })

        // Compute user's rank per metric
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

        const result: ChallengeGroupWithMembers = {
            id: group.id,
            name: group.name,
            description: group.description,
            created_by: group.created_by,
            is_public: group.is_public,
            invite_code: group.invite_code,
            metrics,
            created_at: group.created_at,
            memberCount: members.length,
            members,
            daysLeftInMonth,
            yourRanks,
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[Challenge Group GET]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ groupId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { groupId } = await context.params
        const body = await request.json()

        // Verify the user is an admin (creator) of this group
        const groupRows = await neonQuery<{ created_by: string }>(
            `SELECT created_by FROM challenge_groups WHERE id = $1`,
            [groupId]
        )

        if (groupRows.length === 0) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 })
        }

        if (groupRows[0].created_by !== userId) {
            return NextResponse.json({ error: 'Only admins can update this group' }, { status: 403 })
        }

        // Only allow updating description for now
        const { description } = body
        if (typeof description !== 'string' && description !== null) {
            return NextResponse.json({ error: 'Invalid description' }, { status: 400 })
        }

        await neonQuery(
            `UPDATE challenge_groups SET description = $1 WHERE id = $2`,
            [description, groupId]
        )

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[Challenge Group PATCH]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

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
