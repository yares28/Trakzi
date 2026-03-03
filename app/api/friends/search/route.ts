import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { isBlocked } from "@/lib/friends/permissions"
import type { FriendSearchResult } from "@/lib/types/friends"

const SearchSchema = z.object({
    email: z.string().email("Invalid email address").max(255),
})

// POST /api/friends/search — Search by exact email
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        const body = await req.json()
        const { email } = SearchSchema.parse(body)

        // Don't let users search for themselves
        const selfRows = await neonQuery<{ email: string }>(
            `SELECT email FROM users WHERE id = $1`,
            [userId]
        )
        if (selfRows[0]?.email?.toLowerCase() === email.toLowerCase()) {
            return NextResponse.json(
                { success: false, error: "You cannot add yourself as a friend" },
                { status: 400 }
            )
        }

        // Exact email match only (case-insensitive) — prevents enumeration
        const rows = await neonQuery<FriendSearchResult>(
            `SELECT id AS user_id, name AS display_name, NULL AS avatar_url
             FROM users
             WHERE LOWER(email) = LOWER($1)
             LIMIT 1`,
            [email]
        )

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "No user found with that email" },
                { status: 404 }
            )
        }

        const target = rows[0]

        // Check if blocked
        const blocked = await isBlocked(userId, target.user_id)
        if (blocked) {
            return NextResponse.json(
                { success: false, error: "No user found with that email" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true, data: target })
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: "Invalid email format" },
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
            { success: false, error: "Failed to search for user" },
            { status: 500 }
        )
    }
}
