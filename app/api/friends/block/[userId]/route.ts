import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { existingFriendship } from "@/lib/friends/permissions"

// POST /api/friends/block/[userId] — Block a user
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const currentUserId = await getCurrentUserId()
        const { userId: targetUserId } = await params

        if (currentUserId === targetUserId) {
            return NextResponse.json(
                { success: false, error: "You cannot block yourself" },
                { status: 400 }
            )
        }

        // Verify target user exists to prevent phantom blocks
        const targetExists = await neonQuery<{ id: string }>(
            `SELECT id FROM users WHERE id = $1`,
            [targetUserId]
        )
        if (targetExists.length === 0) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }

        // Check if a friendship row already exists
        const existing = await existingFriendship(currentUserId, targetUserId)

        if (existing) {
            if (existing.status === "blocked") {
                return NextResponse.json(
                    { success: false, error: "User is already blocked" },
                    { status: 409 }
                )
            }

            // Update existing row to blocked (sets blocker as requester)
            await neonQuery(
                `UPDATE friendships
                 SET status = 'blocked', requester_id = $1, addressee_id = $2, updated_at = NOW()
                 WHERE id = $3`,
                [currentUserId, targetUserId, existing.id]
            )
        } else {
            // Create new blocked relationship
            await neonQuery(
                `INSERT INTO friendships (requester_id, addressee_id, status)
                 VALUES ($1, $2, 'blocked')`,
                [currentUserId, targetUserId]
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to block user" },
            { status: 500 }
        )
    }
}
