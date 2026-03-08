// lib/friends/sharing.ts
// Privacy utilities for the friends ranking system.
// Controls who can view a user's financial metrics.

import { neonQuery } from '@/lib/neonClient'

export interface SharingPreferences {
    share_with_friends: boolean
    share_publicly: boolean
}

/**
 * Get a user's sharing preferences.
 * Returns false/false if columns don't exist yet (migration not run).
 */
export async function getSharingPreferences(userId: string): Promise<SharingPreferences> {
    try {
        const rows = await neonQuery<SharingPreferences>(
            `SELECT
                COALESCE(share_with_friends, false) AS share_with_friends,
                COALESCE(share_publicly, false) AS share_publicly
             FROM users WHERE id = $1`,
            [userId]
        )
        return rows[0] ?? { share_with_friends: false, share_publicly: false }
    } catch {
        // Columns may not exist yet (migration pending) — treat as private
        return { share_with_friends: false, share_publicly: false }
    }
}

/**
 * Update a user's sharing preferences.
 * Only updates the fields that are provided.
 */
export async function updateSharingPreferences(
    userId: string,
    prefs: Partial<SharingPreferences>
): Promise<SharingPreferences> {
    const sets: string[] = []
    const params: (string | boolean)[] = [userId]

    if (prefs.share_with_friends !== undefined) {
        params.push(prefs.share_with_friends)
        sets.push(`share_with_friends = $${params.length}`)
    }
    if (prefs.share_publicly !== undefined) {
        params.push(prefs.share_publicly)
        sets.push(`share_publicly = $${params.length}`)
    }

    if (sets.length === 0) {
        return getSharingPreferences(userId)
    }

    const rows = await neonQuery<SharingPreferences>(
        `UPDATE users SET ${sets.join(', ')}
         WHERE id = $1
         RETURNING
            COALESCE(share_with_friends, false) AS share_with_friends,
            COALESCE(share_publicly, false) AS share_publicly`,
        params
    )

    return rows[0] ?? { share_with_friends: false, share_publicly: false }
}

/**
 * Check whether viewerId is allowed to see targetId's ranking metrics.
 *
 * Rules:
 * 1. A user can always view their own metrics.
 * 2. If target has `share_publicly = true`, anyone can view.
 * 3. If target has `share_with_friends = true`, only accepted friends can view.
 * 4. Otherwise, metrics are private.
 */
export async function canViewMetrics(viewerId: string, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true

    try {
        const rows = await neonQuery<{
            share_with_friends: boolean
            share_publicly: boolean
            is_friend: boolean
        }>(
            `SELECT
                COALESCE(u.share_with_friends, false) AS share_with_friends,
                COALESCE(u.share_publicly, false) AS share_publicly,
                EXISTS(
                    SELECT 1 FROM friendships f
                    WHERE f.status = 'accepted'
                      AND ((f.requester_id = $1 AND f.addressee_id = $2)
                        OR (f.requester_id = $2 AND f.addressee_id = $1))
                ) AS is_friend
             FROM users u WHERE u.id = $2`,
            [viewerId, targetId]
        )

        if (rows.length === 0) return false

        const { share_publicly, share_with_friends, is_friend } = rows[0]

        if (share_publicly) return true
        if (share_with_friends && is_friend) return true

        return false
    } catch {
        // Columns may not exist yet (migration pending) — treat as private
        return false
    }
}
