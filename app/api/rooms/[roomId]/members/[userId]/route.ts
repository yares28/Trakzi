import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import {
    getRoomMembership,
    verifyRoomAdmin,
    verifyRoomOwner,
} from "@/lib/rooms/permissions"

const RoleSchema = z.object({
    role: z.enum(["admin", "member"]),
})

// DELETE /api/rooms/[roomId]/members/[userId] — Remove a member
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ roomId: string; userId: string }> }
) {
    try {
        const currentUserId = await getCurrentUserId()
        const { roomId, userId: targetUserId } = await params

        // Self-leave: any member can leave
        if (currentUserId === targetUserId) {
            const { isMember, role } = await getRoomMembership(roomId, currentUserId)
            if (!isMember) {
                return NextResponse.json(
                    { success: false, error: "You are not a member of this room" },
                    { status: 404 }
                )
            }
            if (role === "owner") {
                return NextResponse.json(
                    { success: false, error: "Room owners cannot leave. Transfer ownership or delete the room." },
                    { status: 403 }
                )
            }

            await neonQuery(
                `DELETE FROM room_members WHERE room_id = $1 AND user_id = $2`,
                [roomId, currentUserId]
            )
            return NextResponse.json({ success: true })
        }

        // Removing another user: must be admin/owner
        const isAdmin = await verifyRoomAdmin(roomId, currentUserId)
        if (!isAdmin) {
            return NextResponse.json(
                { success: false, error: "Only admins and owners can remove members" },
                { status: 403 }
            )
        }

        // Can't remove the owner
        const targetMembership = await getRoomMembership(roomId, targetUserId)
        if (!targetMembership.isMember) {
            return NextResponse.json(
                { success: false, error: "User is not a member of this room" },
                { status: 404 }
            )
        }
        if (targetMembership.role === "owner") {
            return NextResponse.json(
                { success: false, error: "Cannot remove the room owner" },
                { status: 403 }
            )
        }
        // Admins can't remove other admins (only owners can)
        if (targetMembership.role === "admin") {
            const isOwner = await verifyRoomOwner(roomId, currentUserId)
            if (!isOwner) {
                return NextResponse.json(
                    { success: false, error: "Only the room owner can remove admins" },
                    { status: 403 }
                )
            }
        }

        await neonQuery(
            `DELETE FROM room_members WHERE room_id = $1 AND user_id = $2`,
            [roomId, targetUserId]
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
            { success: false, error: "Failed to remove member" },
            { status: 500 }
        )
    }
}

// PATCH /api/rooms/[roomId]/members/[userId] — Change member role
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string; userId: string }> }
) {
    try {
        const currentUserId = await getCurrentUserId()
        const { roomId, userId: targetUserId } = await params

        // Only owner can change roles
        const isOwner = await verifyRoomOwner(roomId, currentUserId)
        if (!isOwner) {
            return NextResponse.json(
                { success: false, error: "Only the room owner can change member roles" },
                { status: 403 }
            )
        }

        // Can't change own role
        if (currentUserId === targetUserId) {
            return NextResponse.json(
                { success: false, error: "You cannot change your own role" },
                { status: 400 }
            )
        }

        const body = await req.json()
        const { role } = RoleSchema.parse(body)

        const targetMembership = await getRoomMembership(roomId, targetUserId)
        if (!targetMembership.isMember) {
            return NextResponse.json(
                { success: false, error: "User is not a member of this room" },
                { status: 404 }
            )
        }

        await neonQuery(
            `UPDATE room_members SET role = $1 WHERE room_id = $2 AND user_id = $3`,
            [role, roomId, targetUserId]
        )

        return NextResponse.json({
            success: true,
            data: { user_id: targetUserId, role },
        })
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: "Invalid role. Use 'admin' or 'member'." },
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
            { success: false, error: "Failed to change role" },
            { status: 500 }
        )
    }
}
