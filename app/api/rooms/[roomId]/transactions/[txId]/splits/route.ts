import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { verifyRoomMember, verifyRoomAdmin } from "@/lib/rooms/permissions"
import { validateSplits, type SplitInput } from "@/lib/rooms/split-validation"
import { invalidateRoomCache, invalidateUserCachePrefix } from "@/lib/cache/upstash"
import type { SplitType, SharedTransaction } from "@/lib/types/rooms"

const UpdateSplitsSchema = z.object({
    split_type: z.enum(["equal", "percentage", "custom", "item_level"]).default("custom"),
    splits: z.array(z.object({
        user_id: z.string().min(1),
        amount: z.number().optional(),
        percentage: z.number().min(0).max(100).optional(),
        item_id: z.string().optional(),
    })).default([]), // Empty = set to unattributed
})

// PUT /api/rooms/[roomId]/transactions/[txId]/splits — Replace all splits for a transaction
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string; txId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId, txId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json(
                { success: false, error: "Room not found" },
                { status: 404 }
            )
        }

        // Verify the transaction belongs to this room
        const txRows = await neonQuery<SharedTransaction>(
            `SELECT * FROM shared_transactions WHERE id = $1 AND room_id = $2`,
            [txId, roomId]
        )
        if (txRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Transaction not found" },
                { status: 404 }
            )
        }
        const tx = txRows[0]

        // Only the uploader or an admin/owner can modify splits
        const isUploader = tx.uploaded_by === userId
        const isAdmin = await verifyRoomAdmin(roomId, userId)
        if (!isUploader && !isAdmin) {
            return NextResponse.json(
                { success: false, error: "Only the uploader or an admin can modify splits" },
                { status: 403 }
            )
        }

        const body = await req.json()
        const data = UpdateSplitsSchema.parse(body)

        // Get room member IDs for validation
        const members = await neonQuery<{ user_id: string }>(
            `SELECT user_id FROM room_members WHERE room_id = $1`,
            [roomId]
        )
        const memberIds = members.map(m => m.user_id)

        // Delete all existing splits for this transaction
        await neonQuery(
            `DELETE FROM transaction_splits WHERE shared_tx_id = $1`,
            [txId]
        )

        let splitCount = 0
        let resolvedSplits: { user_id: string; amount: number }[] = []
        if (data.splits.length > 0) {
            // Validate and insert new splits
            resolvedSplits = validateSplits(
                data.split_type as SplitType,
                tx.total_amount,
                memberIds,
                data.splits as SplitInput[]
            )

            for (const split of resolvedSplits) {
                await neonInsert("transaction_splits", {
                    shared_tx_id: txId,
                    user_id: split.user_id,
                    amount: split.amount,
                    status: split.user_id === userId ? "settled" : "pending",
                    settled_at: split.user_id === userId ? new Date().toISOString() : null,
                })
                splitCount++
            }
        }
        // If splits is empty, the transaction is now unattributed (no rows)

        await invalidateRoomCache(roomId)
        // Invalidate analytics for parties whose sharedExpenseSummary is affected:
        // the uploader (fronted/pending_owed_to_you) and the caller (may differ)
        await invalidateUserCachePrefix(tx.uploaded_by, 'analytics')
        if (userId !== tx.uploaded_by) {
            await invalidateUserCachePrefix(userId, 'analytics')
        }
        // Also invalidate analytics for anyone newly in the splits (their you_owe changes)
        for (const split of resolvedSplits) {
            if (split.user_id !== tx.uploaded_by && split.user_id !== userId) {
                await invalidateUserCachePrefix(split.user_id, 'analytics')
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                tx_id: txId,
                split_count: splitCount,
                is_attributed: splitCount > 0,
            },
        })
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: error.errors?.[0]?.message ?? "Invalid data" },
                { status: 400 }
            )
        }
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        if (error.message?.includes("must sum") || error.message?.includes("not a member") || error.message?.includes("Duplicate")) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to update splits" },
            { status: 500 }
        )
    }
}
