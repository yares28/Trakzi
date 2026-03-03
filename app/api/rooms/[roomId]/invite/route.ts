import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { verifyFriendship, checkRoomLimit } from "@/lib/friends/permissions"
import { verifyRoomMember, verifyRoomAdmin } from "@/lib/rooms/permissions"

const InviteSchema = z.object({
    user_ids: z.array(z.string().min(1)).min(1, "At least one user required").max(20),
})

// POST /api/rooms/[roomId]/invite — Invite friends to a room (instant add)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        // Only admins/owners can invite (MEDIUM-4 fix)
        const isAdmin = await verifyRoomAdmin(roomId, userId)
        if (!isAdmin) {
            const isMember = await verifyRoomMember(roomId, userId)
            if (!isMember) {
                return NextResponse.json(
                    { success: false, error: "Room not found" },
                    { status: 404 }
                )
            }
            return NextResponse.json(
                { success: false, error: "Only admins can invite members" },
                { status: 403 }
            )
        }

        const body = await req.json()
        const { user_ids } = InviteSchema.parse(body)

        const results: { user_id: string; status: string }[] = []

        for (const targetId of user_ids) {
            // Verify friendship exists
            const friendshipId = await verifyFriendship(userId, targetId)
            if (!friendshipId) {
                results.push({ user_id: targetId, status: "not_friend" })
                continue
            }

            // Check if already a member
            const alreadyMember = await verifyRoomMember(roomId, targetId)
            if (alreadyMember) {
                results.push({ user_id: targetId, status: "already_member" })
                continue
            }

            // Check target's room limit
            const limit = await checkRoomLimit(targetId)
            if (!limit.allowed) {
                results.push({ user_id: targetId, status: "room_limit_reached" })
                continue
            }

            // Add to room (ON CONFLICT prevents TOCTOU race)
            await neonQuery(
                `INSERT INTO room_members (room_id, user_id, role)
                 VALUES ($1, $2, 'member')
                 ON CONFLICT (room_id, user_id) DO NOTHING`,
                [roomId, targetId]
            )
            results.push({ user_id: targetId, status: "added" })
        }

        return NextResponse.json({ success: true, data: results })
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: "Invalid invite data" },
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
            { success: false, error: "Failed to invite users" },
            { status: 500 }
        )
    }
}
