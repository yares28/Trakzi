import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { generateFriendCode } from "@/lib/friends/codes"
import type { FriendCode } from "@/lib/types/friends"

// GET /api/friends/my-code — Get or generate personal friend code
export async function GET() {
    try {
        const userId = await getCurrentUserId()

        // Check if user already has a code
        const existing = await neonQuery<FriendCode>(
            `SELECT user_id, code, created_at FROM friend_codes WHERE user_id = $1`,
            [userId]
        )

        if (existing.length > 0) {
            return NextResponse.json({ success: true, data: existing[0] })
        }

        // Generate a new unique code (retry on collision)
        let code: string
        let attempts = 0
        const maxAttempts = 5

        while (attempts < maxAttempts) {
            code = generateFriendCode()
            try {
                await neonQuery(
                    `INSERT INTO friend_codes (user_id, code) VALUES ($1, $2)`,
                    [userId, code]
                )
                return NextResponse.json({
                    success: true,
                    data: { user_id: userId, code, created_at: new Date().toISOString() },
                })
            } catch (err: any) {
                // Unique constraint violation = code collision, retry
                if (err.message?.includes("friend_codes_code_key") || err.message?.includes("idx_friend_codes_code")) {
                    attempts++
                    continue
                }
                throw err
            }
        }

        return NextResponse.json(
            { success: false, error: "Failed to generate a unique code. Please try again." },
            { status: 500 }
        )
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to get friend code" },
            { status: 500 }
        )
    }
}
