import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { isValidRoomInviteCode } from "@/lib/friends/codes"
import { checkRoomLimit } from "@/lib/friends/permissions"
import { verifyRoomMember } from "@/lib/rooms/permissions"

const JoinSchema = z.object({
    invite_code: z.string().min(1, "Invite code is required"),
})

// POST /api/rooms/join — Join a room via invite code
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        const body = await req.json()
        const { invite_code } = JoinSchema.parse(body)

        const code = invite_code.trim().toUpperCase()
        if (!isValidRoomInviteCode(code)) {
            return NextResponse.json(
                { success: false, error: "Invalid invite code format" },
                { status: 400 }
            )
        }

        // Find room by invite code
        const roomRows = await neonQuery<{ id: string; name: string; is_archived: boolean }>(
            `SELECT id, name, is_archived FROM rooms WHERE invite_code = $1`,
            [code]
        )

        if (roomRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Room not found. Check your invite code." },
                { status: 404 }
            )
        }

        const room = roomRows[0]

        if (room.is_archived) {
            return NextResponse.json(
                { success: false, error: "This room has been archived" },
                { status: 410 }
            )
        }

        // Check if already a member
        const alreadyMember = await verifyRoomMember(room.id, userId)
        if (alreadyMember) {
            return NextResponse.json(
                { success: false, error: "You are already a member of this room" },
                { status: 409 }
            )
        }

        // Check room limit
        const limit = await checkRoomLimit(userId)
        if (!limit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Room limit reached (${limit.current}/${limit.max}). Upgrade your plan for more.`,
                },
                { status: 403 }
            )
        }

        // Add as member (ON CONFLICT prevents TOCTOU race)
        await neonQuery(
            `INSERT INTO room_members (room_id, user_id, role)
             VALUES ($1, $2, 'member')
             ON CONFLICT (room_id, user_id) DO NOTHING`,
            [room.id, userId]
        )

        return NextResponse.json(
            {
                success: true,
                data: { room_id: room.id, room_name: room.name, role: "member" },
            },
            { status: 201 }
        )
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: "Invalid invite code" },
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
            { success: false, error: "Failed to join room" },
            { status: 500 }
        )
    }
}
