import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { verifyRoomMember, verifyRoomAdmin } from "@/lib/rooms/permissions"
import { validateSplits, type SplitInput } from "@/lib/rooms/split-validation"
import { invalidateRoomCache, invalidateUserCachePrefix } from "@/lib/cache/upstash"
import { wouldExceedCap, } from "@/lib/limits/auto-enforce-cap"
import { recordMonthlyUsage } from "@/lib/limits/transaction-wallet"
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

        // Also delete any existing personal room_share transactions for this shared tx
        // (they'll be re-written below for the uploader's new splits)
        await neonQuery(
            `DELETE FROM transactions
             WHERE room_transaction_id = $1 AND user_id = $2 AND source_type = 'room_share'`,
            [txId, tx.uploaded_by]
        )

        let splitCount = 0
        let resolvedSplits: { user_id: string; amount: number; item_id?: string }[] = []
        if (data.splits.length > 0) {
            // Validate and insert new splits
            resolvedSplits = validateSplits(
                data.split_type as SplitType,
                tx.total_amount,
                memberIds,
                data.splits as SplitInput[]
            )

            for (const split of resolvedSplits) {
                const isUploaderSplit = split.user_id === tx.uploaded_by
                await neonInsert("transaction_splits", {
                    shared_tx_id: txId,
                    user_id: split.user_id,
                    amount: split.amount,
                    item_id: split.item_id ?? null,
                    status: isUploaderSplit ? "settled" : "pending",
                    settled_at: isUploaderSplit ? new Date().toISOString() : null,
                })
                splitCount++
            }

            // Write personal expense transactions for the uploader's own auto-settled splits.
            // Debtors get their personal tx when they explicitly settle via the settle dialog.
            const uploaderSplits = resolvedSplits.filter(s => s.user_id === tx.uploaded_by)
            if (uploaderSplits.length > 0) {
                // Check wallet capacity before writing personal txs
                const cap = await wouldExceedCap(tx.uploaded_by, uploaderSplits.length)
                if (!cap.wouldExceed) {
                    // Fetch item details for any item-level splits
                    const itemIds = uploaderSplits.map(s => s.item_id).filter(Boolean) as string[]
                    const itemRows = itemIds.length > 0
                        ? await neonQuery<{ id: string; name: string; category: string | null }>(
                            `SELECT id, name, category FROM receipt_items WHERE id = ANY($1::text[])`,
                            [itemIds]
                          )
                        : []
                    const itemMap = new Map(itemRows.map(r => [r.id, r]))

                    const today = new Date().toISOString().split('T')[0]
                    for (const split of uploaderSplits) {
                        const item = split.item_id ? itemMap.get(split.item_id) : null
                        const description = item?.name ?? tx.description
                        const category = item?.category ?? tx.category ?? 'Other'

                        await neonInsert("transactions", {
                            user_id: tx.uploaded_by,
                            tx_date: today,
                            description,
                            amount: split.amount,
                            category,
                            currency: tx.currency,
                            tx_type: 'expense',
                            source_type: 'room_share',
                            room_transaction_id: txId,
                            room_id: roomId,
                            room_item_id: split.item_id ?? null,
                        })
                    }
                    await recordMonthlyUsage(tx.uploaded_by, uploaderSplits.length)
                    await invalidateUserCachePrefix(tx.uploaded_by, 'home')
                    await invalidateUserCachePrefix(tx.uploaded_by, 'savings')
                    await invalidateUserCachePrefix(tx.uploaded_by, 'trends')
                    await invalidateUserCachePrefix(tx.uploaded_by, 'data-library')
                }
                // If wallet is full, skip writing personal tx — settle-time check will
                // catch it for debtors; uploader's tx is best-effort at assignment time.
            }
        }
        // If splits is empty, the transaction is now unattributed (no rows)

        await invalidateRoomCache(roomId)
        await invalidateUserCachePrefix(tx.uploaded_by, 'analytics')
        if (userId !== tx.uploaded_by) {
            await invalidateUserCachePrefix(userId, 'analytics')
        }
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
