import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import type { FriendRequest } from "@/lib/types/friends"

// GET /api/friends/requests — Get pending friend requests (sent + received)
export async function GET() {
    try {
        const userId = await getCurrentUserId()

        // Incoming requests (where I'm the addressee)
        const incoming = await neonQuery<FriendRequest>(
            `SELECT
                f.id AS friendship_id,
                'incoming' AS direction,
                u.id AS user_id,
                u.name AS display_name,
                NULL AS avatar_url,
                f.created_at
             FROM friendships f
             JOIN users u ON u.id = f.requester_id
             WHERE f.addressee_id = $1 AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [userId]
        )

        // Outgoing requests (where I'm the requester)
        const outgoing = await neonQuery<FriendRequest>(
            `SELECT
                f.id AS friendship_id,
                'outgoing' AS direction,
                u.id AS user_id,
                u.name AS display_name,
                NULL AS avatar_url,
                f.created_at
             FROM friendships f
             JOIN users u ON u.id = f.addressee_id
             WHERE f.requester_id = $1 AND f.status = 'pending'
             ORDER BY f.created_at DESC`,
            [userId]
        )

        return NextResponse.json({
            success: true,
            data: { incoming, outgoing },
        })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch friend requests" },
            { status: 500 }
        )
    }
}
