import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import {
    checkFriendLimit,
    isBlocked,
    existingFriendship,
} from "@/lib/friends/permissions"
import { invalidateUserCachePrefix, invalidateExactKeys, buildCacheKey } from '@/lib/cache/upstash'

const RequestSchema = z.object({
    targetUserId: z.string().min(1, "Target user ID is required"),
})

// POST /api/friends/request — Send a friend request
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        const body = await req.json()
        const { targetUserId } = RequestSchema.parse(body)

        // Can't friend yourself
        if (userId === targetUserId) {
            return NextResponse.json(
                { success: false, error: "You cannot send a friend request to yourself" },
                { status: 400 }
            )
        }

        // Verify target user exists
        const targetRows = await neonQuery<{ id: string }>(
            `SELECT id FROM users WHERE id = $1`,
            [targetUserId]
        )
        if (targetRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            )
        }

        // Check block status
        const blocked = await isBlocked(userId, targetUserId)
        if (blocked) {
            return NextResponse.json(
                { success: false, error: "Unable to send friend request" },
                { status: 403 }
            )
        }

        // Check for existing friendship/request
        const existing = await existingFriendship(userId, targetUserId)
        if (existing) {
            if (existing.status === "accepted") {
                // Invalidate cache so client sees the existing friendship
                // Use both direct DEL (reliable) and SCAN-based (catches extra keys)
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
                // Enforce 24-hour cooldown before re-sending
                const cooldownRows = await neonQuery<{ updated_at: string }>(
                    `SELECT updated_at FROM friendships WHERE id = $1`,
                    [existing.id]
                )
                const lastUpdated = new Date(cooldownRows[0]?.updated_at ?? 0)
                const hoursSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60)
                if (hoursSince < 24) {
                    return NextResponse.json(
                        { success: false, error: "Please wait before sending another request to this user" },
                        { status: 429 }
                    )
                }

                // Re-send: update status back to pending
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

        // Check friend limit for sender
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

        // Create the friendship request
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
        // Handle unique constraint violation (race condition)
        if (error.message?.includes("idx_friendships_pair")) {
            return NextResponse.json(
                { success: false, error: "A friendship already exists between these users" },
                { status: 409 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to send friend request" },
            { status: 500 }
        )
    }
}
