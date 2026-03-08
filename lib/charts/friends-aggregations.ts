// lib/charts/friends-aggregations.ts
// Aggregation functions for the friends-bundle API.
// Combines rankings, friend list, rooms, requests, balances, activity, and challenges
// into a single payload for the Friends page.

import { neonQuery } from '@/lib/neonClient'
import { getAggregateBalances } from '@/lib/rooms/balances'
import { computeFriendRankings, computeUserMetrics } from '@/lib/friends/ranking-metrics'
import type { FriendWithBalance, FriendRequest, ActivityItem } from '@/lib/types/friends'
import type { ChallengeWithParticipants, ChallengeParticipantWithProfile } from '@/lib/types/challenges'

/** Rankings data with real privacy-safe metrics */
export type FriendScore = {
    id: string           // friendship_id
    friendUserId: string // the friend's user_id (for metrics lookup)
    name: string
    avatar_url: string | null
    savingsRate: number
    financialHealth: number
    consistencyScore: number
    fridgeScore: number
    wantsPercent: number
    overallScore: number
    isPrivate: boolean
    isRanked: boolean
    lastActive: string
}

/** Room member for display */
export type RoomMemberBasic = {
    id: string
    name: string
    avatar_url: string | null
}

/** Room card data (used by GroupsTab) */
export type RoomData = {
    id: string
    name: string
    description: string
    memberCount: number
    members: RoomMemberBasic[]
    totalShared: number
    yourBalance: number
    currency: string
    theme: 'blue' | 'emerald' | 'violet' | 'rose' | 'amber'
    lastActivity: string
}

/** Complete friends bundle payload */
export interface FriendsBundleSummary {
    friends: FriendScore[]
    rooms: RoomData[]
    friendsList: FriendWithBalance[]
    pendingRequests: { incoming: FriendRequest[]; outgoing: FriendRequest[] }
    activityFeed: ActivityItem[]
    challenges: ChallengeWithParticipants[]
    netBalance: { totalOwedToYou: number; totalYouOwe: number }
}

/**
 * Build the complete friends bundle for a user.
 * Called by the bundle API route, cached by Upstash.
 */
export async function getFriendsBundle(userId: string): Promise<FriendsBundleSummary> {
    // Run independent queries in parallel
    const [
        friendsList,
        incomingRequests,
        outgoingRequests,
        rooms,
        activityFeed,
        challenges,
        netBalance,
    ] = await Promise.all([
        getFriendsList(userId),
        getIncomingRequests(userId),
        getOutgoingRequests(userId),
        getUserRooms(userId),
        getActivityFeed(userId),
        getActiveChallenges(userId),
        getAggregateBalances(userId),
    ])

    // Collect all user IDs for batch Clerk image lookup
    const allUserIds = [
        userId,
        ...friendsList.map(f => f.user_id),
        ...incomingRequests.map(r => r.user_id),
        ...outgoingRequests.map(r => r.user_id),
        ...rooms.flatMap(r => r.members.map(m => m.id)),
    ]
    const uniqueUserIds = [...new Set(allUserIds)]

    // Compute real ranking metrics for all friends (respects privacy)
    const friendUserIds = friendsList.map(f => f.user_id)
    const [metricsMap, myMetrics, imageMap] = await Promise.all([
        computeFriendRankings(userId, friendUserIds),
        computeUserMetrics(userId),
        getClerkImageMap(uniqueUserIds),
    ])

    // Enrich friendsList with avatar URLs
    const enrichedFriendsList = friendsList.map(f => ({
        ...f,
        avatar_url: imageMap.get(f.user_id) ?? null,
    }))

    // Enrich pending requests with avatar URLs
    const enrichedIncoming = incomingRequests.map(r => ({
        ...r,
        avatar_url: imageMap.get(r.user_id) ?? null,
    }))
    const enrichedOutgoing = outgoingRequests.map(r => ({
        ...r,
        avatar_url: imageMap.get(r.user_id) ?? null,
    }))

    // Enrich room members with avatar URLs
    const enrichedRooms = rooms.map(r => ({
        ...r,
        members: r.members.map(m => ({
            ...m,
            avatar_url: imageMap.get(m.id) ?? null,
        })),
    }))

    // Build ranked friend list with real metrics
    const friends: FriendScore[] = enrichedFriendsList.map(f => {
        const m = metricsMap.get(f.user_id)
        return {
            id: f.friendship_id,
            friendUserId: f.user_id,
            name: f.display_name ?? 'Unknown',
            avatar_url: f.avatar_url,
            savingsRate: m?.savingsRate ?? 0,
            financialHealth: m?.financialHealth ?? 0,
            consistencyScore: m?.consistencyScore ?? 0,
            fridgeScore: m?.fridgeScore ?? 0,
            wantsPercent: m?.wantsPercent ?? 0,
            overallScore: m?.overallScore ?? 0,
            isPrivate: m?.isPrivate ?? true,
            isRanked: m?.isRanked ?? false,
            lastActive: f.last_active_at ?? 'Never',
        }
    })

    // Add "You" entry with real metrics
    friends.push({
        id: 'self',
        friendUserId: userId,
        name: 'You',
        avatar_url: imageMap.get(userId) ?? null,
        savingsRate: myMetrics.savingsRate,
        financialHealth: myMetrics.financialHealth,
        consistencyScore: myMetrics.consistencyScore,
        fridgeScore: myMetrics.fridgeScore,
        wantsPercent: myMetrics.wantsPercent,
        overallScore: myMetrics.overallScore,
        isPrivate: false,
        isRanked: myMetrics.isRanked,
        lastActive: 'Just now',
    })

    return {
        friends,
        rooms: enrichedRooms,
        friendsList: enrichedFriendsList,
        pendingRequests: { incoming: enrichedIncoming, outgoing: enrichedOutgoing },
        activityFeed,
        challenges,
        netBalance,
    }
}

// ─── Clerk image helper ──────────────────────────────────────────────────────

/**
 * Batch-fetch Clerk profile image URLs for a list of user IDs.
 * Best-effort — returns an empty map on failure so the rest of the bundle still works.
 */
async function getClerkImageMap(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()
    try {
        const { clerkClient } = await import('@clerk/nextjs/server')
        const client = await clerkClient()
        const result = await client.users.getUserList({ userId: userIds, limit: 200 })
        return new Map(result.data.map(u => [u.id, u.imageUrl]))
    } catch {
        return new Map()
    }
}

// ─── Internal query functions ────────────────────────────────────────────────

async function getFriendsList(userId: string): Promise<FriendWithBalance[]> {
    return neonQuery<FriendWithBalance>(
        `SELECT
            f.id AS friendship_id,
            CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS user_id,
            u.name AS display_name,
            NULL AS avatar_url,
            COALESCE(bal.net, 0) AS net_balance,
            'EUR' AS currency,
            f.updated_at AS last_active_at
         FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
         LEFT JOIN LATERAL (
             SELECT COALESCE(SUM(
                 CASE WHEN ts.user_id = $1 THEN -ts.amount ELSE ts.amount END
             ), 0) AS net
             FROM transaction_splits ts
             JOIN shared_transactions st ON st.id = ts.shared_tx_id
             WHERE st.friendship_id = f.id AND ts.status = 'pending'
         ) bal ON true
         WHERE f.status = 'accepted'
           AND (f.requester_id = $1 OR f.addressee_id = $1)
         ORDER BY u.name ASC`,
        [userId]
    )
}

async function getIncomingRequests(userId: string): Promise<FriendRequest[]> {
    return neonQuery<FriendRequest>(
        `SELECT f.id AS friendship_id, 'incoming' AS direction,
                u.id AS user_id, u.name AS display_name, NULL AS avatar_url, f.created_at
         FROM friendships f
         JOIN users u ON u.id = f.requester_id
         WHERE f.addressee_id = $1 AND f.status = 'pending'
         ORDER BY f.created_at DESC`,
        [userId]
    )
}

async function getOutgoingRequests(userId: string): Promise<FriendRequest[]> {
    return neonQuery<FriendRequest>(
        `SELECT f.id AS friendship_id, 'outgoing' AS direction,
                u.id AS user_id, u.name AS display_name, NULL AS avatar_url, f.created_at
         FROM friendships f
         JOIN users u ON u.id = f.addressee_id
         WHERE f.requester_id = $1 AND f.status = 'pending'
         ORDER BY f.created_at DESC`,
        [userId]
    )
}

async function getUserRooms(userId: string): Promise<RoomData[]> {
    const rows = await neonQuery<{
        id: string
        name: string
        description: string | null
        member_count: string
        total_spent: string
        your_balance: string
        currency: string
        created_at: string
    }>(
        `SELECT
            r.id,
            r.name,
            r.description,
            (SELECT COUNT(*)::text FROM room_members WHERE room_id = r.id) AS member_count,
            COALESCE((
                SELECT SUM(st.total_amount)::text
                FROM shared_transactions st WHERE st.room_id = r.id
            ), '0') AS total_spent,
            COALESCE((
                SELECT SUM(CASE WHEN ts.user_id = $1 THEN -ts.amount ELSE ts.amount END)::text
                FROM transaction_splits ts
                JOIN shared_transactions st ON st.id = ts.shared_tx_id
                WHERE st.room_id = r.id AND ts.status = 'pending'
            ), '0') AS your_balance,
            r.currency,
            r.created_at
         FROM rooms r
         JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = $1
         WHERE r.is_archived = false
         ORDER BY r.created_at DESC`,
        [userId]
    )

    // Fetch members for all rooms in one query
    const roomIds = rows.map(r => r.id)
    let membersMap = new Map<string, RoomMemberBasic[]>()

    if (roomIds.length > 0) {
        const memberRows = await neonQuery<{
            room_id: string
            user_id: string
            display_name: string
        }>(
            `SELECT rm.room_id, rm.user_id, u.name AS display_name
             FROM room_members rm
             JOIN users u ON u.id = rm.user_id
             WHERE rm.room_id = ANY($1::uuid[])
             ORDER BY rm.joined_at ASC`,
            [roomIds]
        )

        for (const m of memberRows) {
            const list = membersMap.get(m.room_id) ?? []
            list.push({ id: m.user_id, name: m.display_name, avatar_url: null })
            membersMap.set(m.room_id, list)
        }
    }

    const themes: Array<'blue' | 'emerald' | 'violet' | 'rose' | 'amber'> = ['blue', 'emerald', 'violet', 'rose', 'amber']
    return rows.map((r, i) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? '',
        memberCount: parseInt(r.member_count, 10),
        members: membersMap.get(r.id) ?? [],
        totalShared: parseFloat(r.total_spent),
        yourBalance: parseFloat(r.your_balance),
        currency: r.currency,
        theme: themes[i % themes.length],
        lastActivity: r.created_at,
    }))
}

async function getActivityFeed(userId: string): Promise<ActivityItem[]> {
    return neonQuery<ActivityItem>(
        `SELECT
            st.id,
            'split_created' AS type,
            u.name AS actor_name,
            st.description,
            st.total_amount AS amount,
            st.currency,
            r.name AS room_name,
            st.created_at
         FROM shared_transactions st
         JOIN users u ON u.id = st.uploaded_by
         LEFT JOIN rooms r ON r.id = st.room_id
         WHERE st.room_id IN (SELECT room_id FROM room_members WHERE user_id = $1)
            OR st.friendship_id IN (
                SELECT id FROM friendships
                WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted'
            )
         ORDER BY st.created_at DESC
         LIMIT 10`,
        [userId]
    )
}

/**
 * Get active challenges with participants — N+1 fix.
 * Uses a single JOIN query instead of one per challenge.
 */
async function getActiveChallenges(userId: string): Promise<ChallengeWithParticipants[]> {
    // Single query: challenges + all their participants via JOIN
    const rows = await neonQuery<{
        challenge_id: string
        created_by: string
        title: string
        category: string
        goal_type: string
        target_amount: string
        starts_at: string
        ends_at: string
        challenge_created_at: string
        // participant fields
        p_user_id: string
        p_display_name: string
        p_avatar_url: string | null
        p_current_spend: string
        p_joined_at: string
    }>(
        `SELECT
            c.id AS challenge_id,
            c.created_by,
            c.title,
            c.category,
            c.goal_type,
            c.target_amount::text,
            c.starts_at::text,
            c.ends_at::text,
            c.created_at AS challenge_created_at,
            cp2.user_id AS p_user_id,
            u2.name AS p_display_name,
            NULL AS p_avatar_url,
            cp2.current_spend::text AS p_current_spend,
            cp2.joined_at AS p_joined_at
         FROM challenges c
         JOIN challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = $1
         JOIN challenge_participants cp2 ON cp2.challenge_id = c.id
         JOIN users u2 ON u2.id = cp2.user_id
         WHERE c.ends_at >= CURRENT_DATE
         ORDER BY c.ends_at ASC, cp2.current_spend ASC`,
        [userId]
    )

    // Group by challenge_id
    const challengeMap = new Map<string, ChallengeWithParticipants>()

    for (const row of rows) {
        if (!challengeMap.has(row.challenge_id)) {
            const daysRemaining = Math.max(
                0,
                Math.ceil((new Date(row.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            )
            challengeMap.set(row.challenge_id, {
                id: row.challenge_id,
                created_by: row.created_by,
                title: row.title,
                category: row.category,
                goal_type: row.goal_type as 'individual_cap' | 'group_total',
                target_amount: parseFloat(row.target_amount),
                starts_at: row.starts_at,
                ends_at: row.ends_at,
                created_at: row.challenge_created_at,
                participants: [],
                days_remaining: daysRemaining,
                is_member: true,
            })
        }

        challengeMap.get(row.challenge_id)!.participants.push({
            challenge_id: row.challenge_id,
            user_id: row.p_user_id,
            joined_at: row.p_joined_at,
            current_spend: parseFloat(row.p_current_spend),
            display_name: row.p_display_name,
            avatar_url: row.p_avatar_url,
        })
    }

    return Array.from(challengeMap.values())
}
