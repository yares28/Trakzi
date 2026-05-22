import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { verifyFriendship } from "@/lib/friends/permissions"
import { checkSharedTxLimit } from "@/lib/friends/limits"
import { verifyRoomMember } from "@/lib/rooms/permissions"
import { validateSplits, type SplitInput } from "@/lib/rooms/split-validation"
import { invalidateRoomCache, invalidateUserCachePrefix } from "@/lib/cache/upstash"
import type { SplitType } from "@/lib/types/rooms"

const SplitInputSchema = z.object({
    user_id: z.string().min(1),
    amount: z.number().optional(),
    percentage: z.number().min(0).max(100).optional(),
})

const ShareSchema = z.object({
    // Must provide either room_id or friend_user_id
    room_id: z.string().optional(),
    friend_user_id: z.string().optional(),
    split_type: z.enum(["equal", "percentage", "custom"]).default("equal"),
    splits: z.array(SplitInputSchema).min(1),
}).refine(
    data => data.room_id || data.friend_user_id,
    { message: "Either room_id or friend_user_id is required" }
)

// POST /api/transactions/[id]/share — Link a personal transaction to a split
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { id: txId } = await params

        const txIdInt = parseInt(txId, 10)
        if (isNaN(txIdInt)) {
            return NextResponse.json(
                { success: false, error: "Transaction not found" },
                { status: 404 }
            )
        }

        // Verify the personal transaction exists and belongs to the user
        const txRows = await neonQuery<{
            id: number
            amount: number
            description: string
            tx_date: string
        }>(
            `SELECT id, amount, description, tx_date
             FROM transactions
             WHERE id = $1 AND user_id = $2`,
            [txIdInt, userId]
        )

        if (txRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Transaction not found" },
                { status: 404 }
            )
        }

        // Check if already shared — include the room name so the error is actionable
        const alreadyShared = await neonQuery<{ room_name: string | null; friendship_id: string | null }>(
            `SELECT r.name AS room_name, st.friendship_id
             FROM shared_transactions st
             LEFT JOIN rooms r ON r.id = st.room_id
             WHERE st.original_tx_id = $1
             LIMIT 1`,
            [txRows[0].id]
        )
        if (alreadyShared.length > 0) {
            const where = alreadyShared[0].room_name
                ? `"${alreadyShared[0].room_name}"`
                : "a friend split"
            return NextResponse.json(
                { success: false, error: `Already shared in ${where}. Remove it there first to share elsewhere.` },
                { status: 409 }
            )
        }

        // Check monthly shared transaction limit
        const txLimit = await checkSharedTxLimit(userId)
        if (!txLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Monthly shared transaction limit reached (${txLimit.current}/${txLimit.max}). Upgrade your plan for more.`,
                },
                { status: 403 }
            )
        }

        const body = await req.json()
        const data = ShareSchema.parse(body)

        const totalAmount = Math.abs(txRows[0].amount)
        let roomId: string | null = null
        let friendshipId: string | null = null
        let memberIds: string[] = []
        let currency = "EUR"

        if (data.room_id) {
            // Sharing to a room — fetch members and room currency together
            const isMember = await verifyRoomMember(data.room_id, userId)
            if (!isMember) {
                return NextResponse.json(
                    { success: false, error: "Room not found" },
                    { status: 404 }
                )
            }
            roomId = data.room_id

            const [members, roomRows] = await Promise.all([
                neonQuery<{ user_id: string }>(
                    `SELECT user_id FROM room_members WHERE room_id = $1`,
                    [data.room_id]
                ),
                neonQuery<{ currency: string }>(
                    `SELECT currency FROM rooms WHERE id = $1`,
                    [data.room_id]
                ),
            ])
            memberIds = members.map(m => m.user_id)
            currency = roomRows[0]?.currency ?? "EUR"
        } else if (data.friend_user_id) {
            // Sharing with a friend (quick split)
            const fId = await verifyFriendship(userId, data.friend_user_id)
            if (!fId) {
                return NextResponse.json(
                    { success: false, error: "You are not friends with this user" },
                    { status: 403 }
                )
            }
            friendshipId = fId
            memberIds = [userId, data.friend_user_id]
        }

        // Validate splits
        const resolvedSplits = validateSplits(
            data.split_type as SplitType,
            totalAmount,
            memberIds,
            data.splits as SplitInput[]
        )

        // Create shared transaction linked to original
        const stRows = await neonInsert<Record<string, unknown>>("shared_transactions", {
            room_id: roomId,
            friendship_id: friendshipId,
            uploaded_by: userId,
            original_tx_id: txRows[0].id,
            total_amount: totalAmount,
            currency,
            description: txRows[0].description,
            transaction_date: txRows[0].tx_date,
            split_type: data.split_type,
        })

        const sharedTxId = (stRows[0] as any)?.id

        // Create split rows
        for (const split of resolvedSplits) {
            await neonInsert("transaction_splits", {
                shared_tx_id: sharedTxId,
                user_id: split.user_id,
                amount: split.amount,
                status: split.user_id === userId ? "settled" : "pending",
                settled_at: split.user_id === userId ? new Date().toISOString() : null,
            })
        }

        // Invalidate caches for the sharer's analytics and the room
        await invalidateUserCachePrefix(userId, 'analytics')
        await invalidateUserCachePrefix(userId, 'home')
        if (roomId) await invalidateRoomCache(roomId)

        return NextResponse.json(
            {
                success: true,
                data: { shared_tx_id: sharedTxId, original_tx_id: txRows[0].id },
            },
            { status: 201 }
        )
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: error.errors?.[0]?.message ?? "Invalid share data" },
                { status: 400 }
            )
        }
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        if (error.message?.includes("must sum") || error.message?.includes("not a member")) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to share transaction" },
            { status: 500 }
        )
    }
}
