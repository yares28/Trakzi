import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { normalizeFriendCode, isValidFriendCode } from "@/lib/friends/codes"
import {
    checkFriendLimit,
    isBlocked,
    existingFriendship,
} from "@/lib/friends/permissions"
import { invalidateUserCachePrefix, invalidateExactKeys, buildCacheKey } from "@/lib/cache/upstash"

const AddByCodeSchema = z.object({
    code: z.string().min(1, "Friend code is required"),
})

// POST /api/friends/add-by-code — Add friend via friend code (QR scan)
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        const body = await req.json()
        const { code: rawCode } = AddByCodeSchema.parse(body)

        // Normalize and validate format
        const code = normalizeFriendCode(rawCode)

        // Try with hyphen format first, then without
        const codeWithHyphen = code.includes("-") ? code : `${code.slice(0, 4)}-${code.slice(4)}`

        if (!isValidFriendCode(codeWithHyphen)) {
            return NextResponse.json(
                { success: false, error: "Invalid friend code format" },
                { status: 400 }
            )
        }

        // Look up the code owner
        const codeRows = await neonQuery<{ user_id: string }>(
            `SELECT user_id FROM friend_codes WHERE code = $1`,
            [codeWithHyphen]
        )

        if (codeRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Friend code not found" },
                { status: 404 }
            )
        }

        const targetUserId = codeRows[0].user_id

        // Can't add yourself
        if (userId === targetUserId) {
            return NextResponse.json(
                { success: false, error: "This is your own friend code" },
                { status: 400 }
            )
        }

        // Check block status
        const blocked = await isBlocked(userId, targetUserId)
        if (blocked) {
            return NextResponse.json(
                { success: false, error: "Unable to add this user" },
                { status: 403 }
            )
        }

        // Check existing relationship
        const existing = await existingFriendship(userId, targetUserId)
        if (existing) {
            if (existing.status === "accepted") {
                await Promise.all([
                    invalidateExactKeys(
                        buildCacheKey('friends', userId, null, 'bundle'),
                        buildCacheKey('friends', targetUserId, null, 'bundle'),
                    ),
                    invalidateUserCachePrefix(userId, 'friends'),
                    invalidateUserCachePrefix(targetUserId, 'friends'),
                ])
                return NextResponse.json(
                    { success: false, error: "You are already friends" },
                    { status: 409 }
                )
            }
            if (existing.status === "pending") {
                return NextResponse.json(
                    { success: false, error: "A friend request already exists" },
                    { status: 409 }
                )
            }
            if (existing.status === "declined") {
                // Re-open as pending
                await neonQuery(
                    `UPDATE friendships
                     SET status = 'pending', requester_id = $1, addressee_id = $2, updated_at = NOW()
                     WHERE id = $3`,
                    [userId, targetUserId, existing.id]
                )
                await Promise.all([
                    invalidateExactKeys(
                        buildCacheKey('friends', userId, null, 'bundle'),
                        buildCacheKey('friends', targetUserId, null, 'bundle'),
                    ),
                    invalidateUserCachePrefix(userId, 'friends'),
                    invalidateUserCachePrefix(targetUserId, 'friends'),
                ])
                return NextResponse.json({
                    success: true,
                    data: { friendship_id: existing.id, status: "pending" },
                })
            }
        }

        // Check friend limits for both users
        const senderLimit = await checkFriendLimit(userId)
        if (!senderLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: `You've reached your friend limit (${senderLimit.current}/${senderLimit.max})`,
                },
                { status: 403 }
            )
        }

        // Create friend request
        const rows = await neonInsert<Record<string, unknown>>("friendships", {
            requester_id: userId,
            addressee_id: targetUserId,
            status: "pending",
        })

        await Promise.all([
            invalidateExactKeys(
                buildCacheKey('friends', userId, null, 'bundle'),
                buildCacheKey('friends', targetUserId, null, 'bundle'),
            ),
            invalidateUserCachePrefix(userId, 'friends'),
            invalidateUserCachePrefix(targetUserId, 'friends'),
        ])

        return NextResponse.json(
            {
                success: true,
                data: { friendship_id: (rows[0] as any)?.id ?? null, status: "pending" },
            },
            { status: 201 }
        )
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: "Invalid request data" },
                { status: 400 }
            )
        }
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        if (error.message?.includes("idx_friendships_pair")) {
            return NextResponse.json(
                { success: false, error: "A friendship already exists" },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to add friend by code" },
            { status: 500 }
        )
    }
}
