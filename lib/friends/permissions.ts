// lib/friends/permissions.ts
// Permission checks for friend system operations.

import { neonQuery } from '@/lib/neonClient'
import { getUserPlan } from '@/lib/subscriptions'
import { PLAN_LIMITS } from '@/lib/plan-limits'

/**
 * Verify that two users have an accepted friendship.
 * Returns the friendship ID if valid, null otherwise.
 */
export async function verifyFriendship(
    userId: string,
    friendUserId: string
): Promise<string | null> {
    const rows = await neonQuery<{ id: string }>(
        `SELECT id FROM friendships
         WHERE status = 'accepted'
           AND (
             (requester_id = $1 AND addressee_id = $2)
             OR (requester_id = $2 AND addressee_id = $1)
           )
         LIMIT 1`,
        [userId, friendUserId]
    )
    return rows[0]?.id ?? null
}

/**
 * Check if the user has reached their friend limit.
 * Returns { allowed: boolean, current: number, max: number }.
 */
export async function checkFriendLimit(userId: string): Promise<{
    allowed: boolean
    current: number
    max: number
}> {
    const plan = await getUserPlan(userId)
    const max = PLAN_LIMITS[plan].maxFriends

    const rows = await neonQuery<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM friendships
         WHERE status = 'accepted'
           AND (requester_id = $1 OR addressee_id = $1)`,
        [userId]
    )
    const current = parseInt(rows[0]?.count ?? '0', 10)

    return { allowed: current < max, current, max }
}

/**
 * Check if the user has reached their room limit.
 */
export async function checkRoomLimit(userId: string): Promise<{
    allowed: boolean
    current: number
    max: number
}> {
    const plan = await getUserPlan(userId)
    const max = PLAN_LIMITS[plan].maxRooms

    const rows = await neonQuery<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM room_members
         WHERE user_id = $1`,
        [userId]
    )
    const current = parseInt(rows[0]?.count ?? '0', 10)

    return { allowed: current < max, current, max }
}

/**
 * Check if userA has blocked userB (or vice versa).
 * A blocked relationship prevents all interactions.
 */
export async function isBlocked(
    userA: string,
    userB: string
): Promise<boolean> {
    const rows = await neonQuery<{ id: string }>(
        `SELECT id FROM friendships
         WHERE status = 'blocked'
           AND (
             (requester_id = $1 AND addressee_id = $2)
             OR (requester_id = $2 AND addressee_id = $1)
           )
         LIMIT 1`,
        [userA, userB]
    )
    return rows.length > 0
}

/**
 * Check if a pending or accepted friendship already exists between two users.
 * Used to prevent duplicate friend requests.
 */
export async function existingFriendship(
    userA: string,
    userB: string
): Promise<{ id: string; status: string } | null> {
    const rows = await neonQuery<{ id: string; status: string }>(
        `SELECT id, status FROM friendships
         WHERE (requester_id = $1 AND addressee_id = $2)
            OR (requester_id = $2 AND addressee_id = $1)
         LIMIT 1`,
        [userA, userB]
    )
    return rows[0] ?? null
}
