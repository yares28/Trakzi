import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

// DELETE /api/friends/[friendshipId] — Remove a friend
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ friendshipId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { friendshipId } = await params

        // Verify ownership: user must be part of this friendship
        const rows = await neonQuery<{ id: string }>(
            `SELECT id FROM friendships
             WHERE id = $1
               AND (requester_id = $2 OR addressee_id = $2)
               AND status = 'accepted'`,
            [friendshipId, userId]
        )

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Friendship not found" },
                { status: 404 }
            )
        }

        // Delete the friendship (CASCADE will handle related data)
        await neonQuery(
            `DELETE FROM friendships WHERE id = $1`,
            [friendshipId]
        )

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to remove friend" },
            { status: 500 }
        )
    }
}
