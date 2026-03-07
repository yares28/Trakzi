import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { generateRoomInviteCode } from "@/lib/friends/codes"
import { checkRoomLimit } from "@/lib/friends/permissions"
import type { Room } from "@/lib/types/rooms"

const CreateRoomSchema = z.object({
    name: z.string().min(1, "Room name is required").max(100).trim(),
    description: z.string().max(500).optional(),
    currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
})

// POST /api/rooms — Create a new room
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

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

        const body = await req.json()
        const { name, description, currency } = CreateRoomSchema.parse(body)

        // Generate unique invite code (retry on collision)
        let inviteCode: string = ""
        let attempts = 0
        const maxAttempts = 5

        while (attempts < maxAttempts) {
            inviteCode = generateRoomInviteCode()
            const existing = await neonQuery(
                `SELECT 1 FROM rooms WHERE invite_code = $1`,
                [inviteCode]
            )
            if (existing.length === 0) break
            attempts++
        }

        if (attempts >= maxAttempts) {
            return NextResponse.json(
                { success: false, error: "Failed to generate invite code. Please try again." },
                { status: 500 }
            )
        }

        // Create room
        const roomRows = await neonInsert<Record<string, unknown>>("rooms", {
            name,
            created_by: userId,
            invite_code: inviteCode,
            description: description ?? null,
            currency,
        })

        const roomId = (roomRows[0] as any)?.id
        if (!roomId) {
            return NextResponse.json(
                { success: false, error: "Failed to create room" },
                { status: 500 }
            )
        }

        // Add creator as owner
        await neonInsert("room_members", {
            room_id: roomId,
            user_id: userId,
            role: "owner",
        })

        return NextResponse.json(
            {
                success: true,
                data: { id: roomId, name, invite_code: inviteCode, currency },
            },
            { status: 201 }
        )
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: "Invalid room data" },
                { status: 400 }
            )
        }
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        console.error('[Rooms POST]', error)
        return NextResponse.json(
            { success: false, error: "Failed to create room" },
            { status: 500 }
        )
    }
}

// GET /api/rooms — List user's rooms
export async function GET() {
    try {
        const userId = await getCurrentUserId()

        const rooms = await neonQuery<Room & { role: string; member_count: string }>(
            `SELECT
                r.*,
                rm.role,
                (SELECT COUNT(*)::text FROM room_members WHERE room_id = r.id) AS member_count
             FROM rooms r
             JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = $1
             WHERE r.is_archived = false
             ORDER BY r.created_at DESC`,
            [userId]
        )

        return NextResponse.json({ success: true, data: rooms })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch rooms" },
            { status: 500 }
        )
    }
}
