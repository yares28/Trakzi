import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import {
    verifyRoomMember,
    verifyRoomAdmin,
    verifyRoomOwner,
} from "@/lib/rooms/permissions"
import type { Room, RoomMemberWithProfile } from "@/lib/types/rooms"

const UpdateRoomSchema = z.object({
    name: z.string().min(1).max(100).trim().optional(),
    description: z.string().max(500).optional(),
    currency: z.enum(["EUR", "USD", "GBP"]).optional(),
    is_archived: z.boolean().optional(),
})

// GET /api/rooms/[roomId] — Room details with members
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json(
                { success: false, error: "Room not found" },
                { status: 404 }
            )
        }

        const roomRows = await neonQuery<Room>(
            `SELECT * FROM rooms WHERE id = $1`,
            [roomId]
        )
        if (roomRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Room not found" },
                { status: 404 }
            )
        }

        const members = await neonQuery<RoomMemberWithProfile>(
            `SELECT
                rm.room_id,
                rm.user_id,
                rm.role,
                rm.joined_at,
                u.name AS display_name,
                NULL AS avatar_url
             FROM room_members rm
             JOIN users u ON u.id = rm.user_id
             WHERE rm.room_id = $1
             ORDER BY rm.joined_at ASC`,
            [roomId]
        )

        return NextResponse.json({
            success: true,
            data: { ...roomRows[0], members },
        })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch room" },
            { status: 500 }
        )
    }
}

// PATCH /api/rooms/[roomId] — Update room (owner/admin only)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        const isAdmin = await verifyRoomAdmin(roomId, userId)
        if (!isAdmin) {
            return NextResponse.json(
                { success: false, error: "Only admins and owners can update this room" },
                { status: 403 }
            )
        }

        const body = await req.json()
        const updates = UpdateRoomSchema.parse(body)

        // Build dynamic SET clause
        const setClauses: string[] = []
        const values: unknown[] = []
        let paramIndex = 1

        if (updates.name !== undefined) {
            setClauses.push(`name = $${paramIndex++}`)
            values.push(updates.name)
        }
        if (updates.description !== undefined) {
            setClauses.push(`description = $${paramIndex++}`)
            values.push(updates.description)
        }
        if (updates.currency !== undefined) {
            setClauses.push(`currency = $${paramIndex++}`)
            values.push(updates.currency)
        }
        if (updates.is_archived !== undefined) {
            setClauses.push(`is_archived = $${paramIndex++}`)
            values.push(updates.is_archived)
        }

        if (setClauses.length === 0) {
            return NextResponse.json(
                { success: false, error: "No fields to update" },
                { status: 400 }
            )
        }

        setClauses.push(`updated_at = NOW()`)
        values.push(roomId)

        await neonQuery(
            `UPDATE rooms SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
            values
        )

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: "Invalid update data" },
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
            { success: false, error: "Failed to update room" },
            { status: 500 }
        )
    }
}

// DELETE /api/rooms/[roomId] — Delete room (owner only)
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        const isOwner = await verifyRoomOwner(roomId, userId)
        if (!isOwner) {
            return NextResponse.json(
                { success: false, error: "Only the room owner can delete this room" },
                { status: 403 }
            )
        }

        await neonQuery(`DELETE FROM rooms WHERE id = $1`, [roomId])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to delete room" },
            { status: 500 }
        )
    }
}
