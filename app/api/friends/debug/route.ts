/**
 * TEMPORARY DEBUG ENDPOINT — DELETE AFTER ISSUE IS RESOLVED
 * GET /api/friends/debug — Shows raw friendship data for diagnosing empty friends list
 */
import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

export async function GET() {
    try {
        const userId = await getCurrentUserId()

        // 1. Raw friendships (no JOIN — shows what's actually in the table)
        const rawFriendships = await neonQuery<{
            id: string
            requester_id: string
            addressee_id: string
            status: string
            created_at: string
            updated_at: string
        }>(
            `SELECT id, requester_id, addressee_id, status, created_at, updated_at
             FROM friendships
             WHERE requester_id = $1 OR addressee_id = $1
             ORDER BY created_at DESC`,
            [userId]
        )

        // 2. For each accepted friendship, check if the OTHER user's ID exists in users table
        const acceptedFriendships = rawFriendships.filter(f => f.status === 'accepted')
        const friendUserIds = acceptedFriendships.map(f =>
            f.requester_id === userId ? f.addressee_id : f.requester_id
        )

        let usersFound: { id: string; name: string | null; email: string }[] = []
        if (friendUserIds.length > 0) {
            usersFound = await neonQuery<{ id: string; name: string | null; email: string }>(
                `SELECT id, name, email FROM users WHERE id = ANY($1::text[])`,
                [friendUserIds]
            )
        }

        // 3. Run the actual getFriendsList query
        const friendsList = await neonQuery(
            `SELECT
                f.id AS friendship_id,
                CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS user_id,
                u.name AS display_name,
                f.updated_at AS last_active_at
             FROM friendships f
             JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
             WHERE f.status = 'accepted'
               AND (f.requester_id = $1 OR f.addressee_id = $1)
             ORDER BY u.name ASC`,
            [userId]
        )

        // 4. Check if current user exists in users table
        const selfInUsers = await neonQuery<{ id: string; name: string | null; email: string }>(
            `SELECT id, name, email FROM users WHERE id = $1`,
            [userId]
        )

        return NextResponse.json({
            currentUserId: userId,
            selfInUsersTable: selfInUsers[0] ?? null,
            rawFriendships,
            acceptedCount: acceptedFriendships.length,
            friendUserIds,
            friendUserIdsFoundInUsersTable: usersFound,
            friendsListQueryResult: friendsList,
            diagnosis: {
                hasAcceptedFriendships: acceptedFriendships.length > 0,
                allFriendIdsInUsersTable: friendUserIds.every(id =>
                    usersFound.some(u => u.id === id)
                ),
                friendsListReturnsData: friendsList.length > 0,
            }
        })
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 5),
        }, { status: 500 })
    }
}
