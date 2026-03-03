import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { checkFriendLimit } from "@/lib/friends/permissions"

const PatchSchema = z.object({
    action: z.enum(["accept", "decline"]),
})

// PATCH /api/friends/requests/[id] — Accept or decline a friend request
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { id: friendshipId } = await params

        const body = await req.json()
        const { action } = PatchSchema.parse(body)

        // Verify this request exists and is addressed to the current user
        const rows = await neonQuery<{ id: string; requester_id: string; status: string }>(
            `SELECT id, requester_id, status FROM friendships
             WHERE id = $1 AND addressee_id = $2`,
            [friendshipId, userId]
        )

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Friend request not found" },
                { status: 404 }
            )
        }

        if (rows[0].status !== "pending") {
            return NextResponse.json(
                { success: false, error: "This request has already been handled" },
                { status: 409 }
            )
        }

        if (action === "accept") {
            // Check friend limit for acceptor
            const limit = await checkFriendLimit(userId)
            if (!limit.allowed) {
                return NextResponse.json(
                    {
                        success: false,
                        error: `Friend limit reached (${limit.current}/${limit.max}). Upgrade your plan for more.`,
                    },
                    { status: 403 }
                )
            }

            // Also check limit for the requester
            const requesterLimit = await checkFriendLimit(rows[0].requester_id)
            if (!requesterLimit.allowed) {
                return NextResponse.json(
                    { success: false, error: "The other user has reached their friend limit" },
                    { status: 403 }
                )
            }
        }

        // Atomic update: only change if still pending (prevents race condition)
        const newStatus = action === "accept" ? "accepted" : "declined"
        const updated = await neonQuery<{ id: string }>(
            `UPDATE friendships SET status = $1, updated_at = NOW()
             WHERE id = $2 AND status = 'pending'
             RETURNING id`,
            [newStatus, friendshipId]
        )

        if (updated.length === 0) {
            return NextResponse.json(
                { success: false, error: "This request has already been handled" },
                { status: 409 }
            )
        }

        return NextResponse.json({
            success: true,
            data: { friendship_id: friendshipId, status: newStatus },
        })
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: "Invalid action. Use 'accept' or 'decline'." },
                { status: 400 }
            )
        }
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to update friend request" },
            { status: 500 }
        )
    }
}
