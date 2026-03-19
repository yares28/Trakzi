import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { verifyRoomMember } from "@/lib/rooms/permissions"
import { validateSplits, type SplitInput } from "@/lib/rooms/split-validation"
import { checkSharedTxLimit } from "@/lib/friends/limits"
import { invalidateRoomCache, invalidateUserCachePrefix } from "@/lib/cache/upstash"
import type { SplitType, SharedTransaction } from "@/lib/types/rooms"

export const SplitInputSchema = z.object({
    user_id: z.string().min(1),
    amount: z.number().optional(),
    percentage: z.number().min(0).max(100).optional(),
    item_id: z.string().optional(),
})

const ReceiptItemInputSchema = z.object({
    name: z.string().min(1).max(300),
    amount: z.coerce.number().nonnegative(),
    quantity: z.coerce.number().int().positive().default(1),
    category: z.string().max(100).optional().nullable().transform(v => v ?? undefined),
    splits: z.array(SplitInputSchema).default([]),
})

const CreateSharedTxSchema = z.object({
    total_amount: z.number().positive("Amount must be positive"),
    description: z.string().min(1, "Description is required").max(500),
    category: z.string().max(100).optional(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    split_type: z.enum(["equal", "percentage", "custom", "item_level"]).default("equal"),
    currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
    splits: z.array(SplitInputSchema).default([]), // Empty = unattributed
    source_type: z.enum(["manual", "personal_import", "receipt", "statement"]).default("manual"),
    original_tx_id: z.number().optional(),
    receipt_items: z.array(ReceiptItemInputSchema).optional(),
    paid_by: z.string().optional(), // Override who paid (must be a room member)
    also_track_personal: z.boolean().default(false), // Create personal tx linked via original_tx_id (payer only)
})

// POST /api/rooms/[roomId]/transactions — Create a shared transaction with splits
export async function POST(
    req: NextRequest,
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

        // Check monthly shared tx limit
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
        const data = CreateSharedTxSchema.parse(body)

        // Get room member IDs for validation
        const members = await neonQuery<{ user_id: string }>(
            `SELECT user_id FROM room_members WHERE room_id = $1`,
            [roomId]
        )
        const memberIds = members.map(m => m.user_id)

        // Validate top-level splits (empty = unattributed, allowed)
        const resolvedSplits = validateSplits(
            data.split_type as SplitType,
            data.total_amount,
            memberIds,
            data.splits as SplitInput[]
        )

        // Validate paid_by is a room member if provided
        const paidByUserId = data.paid_by && memberIds.includes(data.paid_by) ? data.paid_by : userId

        // Phase 3: pre-flight capacity check BEFORE any writes (personal tx only for the caller)
        const willTrackPersonal = data.also_track_personal && paidByUserId === userId
        if (willTrackPersonal) {
            const { assertCapacityOrExplain } = await import("@/lib/limits/transactions-cap")
            const capacityCheck = await assertCapacityOrExplain({ userId, incomingCount: 1 })
            if (!capacityCheck.ok) {
                return NextResponse.json(capacityCheck.limitExceeded, { status: 403 })
            }
        }

        const metadata: Record<string, unknown> = { source_type: data.source_type }
        // Existing original_tx_id from client (e.g. personal import); Phase 3 sets it after shared insert
        const passedOriginalTxId = data.original_tx_id ?? null
        if (passedOriginalTxId) metadata.original_tx_id = String(passedOriginalTxId)
        if (data.paid_by && data.paid_by !== userId) metadata.paid_by = data.paid_by

        // Create shared transaction (original_tx_id initially null when also_track_personal; set below)
        const txRows = await neonInsert<Record<string, unknown>>("shared_transactions", {
            room_id: roomId,
            uploaded_by: paidByUserId,
            total_amount: data.total_amount,
            currency: data.currency,
            description: data.description,
            category: data.category ?? null,
            transaction_date: data.transaction_date,
            split_type: data.split_type,
            original_tx_id: willTrackPersonal ? null : (passedOriginalTxId ? String(passedOriginalTxId) : null),
            metadata,
        })

        const txId = (txRows[0] as any)?.id
        if (!txId) {
            return NextResponse.json(
                { success: false, error: "Failed to create transaction" },
                { status: 500 }
            )
        }

        // Create top-level split rows (if any)
        for (const split of resolvedSplits) {
            await neonInsert("transaction_splits", {
                shared_tx_id: txId,
                user_id: split.user_id,
                amount: split.amount,
                status: split.user_id === paidByUserId ? "settled" : "pending",
                settled_at: split.user_id === paidByUserId ? new Date().toISOString() : null,
            })
        }

        // Handle receipt items with per-item attribution
        let itemCount = 0
        if (data.receipt_items && data.receipt_items.length > 0) {
            for (const item of data.receipt_items) {
                const itemRows = await neonInsert<Record<string, unknown>>("receipt_items", {
                    shared_tx_id: txId,
                    name: item.name,
                    amount: item.amount,
                    quantity: item.quantity,
                    category: item.category ?? null,
                })
                const itemId = (itemRows[0] as any)?.id
                itemCount++

                if (itemId && item.splits.length > 0) {
                    const resolvedItemSplits = validateSplits(
                        'custom',
                        item.amount,
                        memberIds,
                        item.splits as SplitInput[]
                    )
                    for (const split of resolvedItemSplits) {
                        await neonInsert("transaction_splits", {
                            shared_tx_id: txId,
                            item_id: itemId,
                            user_id: split.user_id,
                            amount: split.amount,
                            status: split.user_id === paidByUserId ? "settled" : "pending",
                            settled_at: split.user_id === paidByUserId ? new Date().toISOString() : null,
                        })
                    }
                }
            }
        }

        // Phase 3: Create personal transaction AFTER shared tx + splits are committed
        // If this fails, the room expense still exists — graceful degradation, no orphan
        let linkedPersonalTxId: number | null = null
        if (willTrackPersonal) {
            let categoryId: number | null = null
            if (data.category) {
                const catRows = await neonQuery<{ id: number }>(
                    `SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) ORDER BY name ASC LIMIT 1`,
                    [userId, data.category]
                )
                categoryId = catRows[0]?.id ?? null
            }

            const ptRows = await neonInsert<Record<string, unknown>>("transactions", {
                user_id: userId,
                tx_date: data.transaction_date,
                description: data.description,
                amount: -data.total_amount, // negative = expense convention
                category_id: categoryId,
                currency: data.currency,
            })
            linkedPersonalTxId = (ptRows[0] as any)?.id ?? null

            if (linkedPersonalTxId) {
                // Link the personal tx back to the shared transaction via original_tx_id
                await neonQuery(
                    `UPDATE shared_transactions SET original_tx_id = $1 WHERE id = $2`,
                    [String(linkedPersonalTxId), txId]
                )
            }
        }

        // Invalidate room bundle cache and personal analytics for all directly affected users
        await invalidateRoomCache(roomId)
        await invalidateUserCachePrefix(paidByUserId, 'analytics')
        await invalidateUserCachePrefix(paidByUserId, 'home')
        // Also invalidate the API caller's cache when they differ from the payer
        // (caller gets a pending split so their analytics are affected too)
        if (userId !== paidByUserId) {
            await invalidateUserCachePrefix(userId, 'analytics')
            await invalidateUserCachePrefix(userId, 'home')
        }
        // If a personal transaction was created, also invalidate personal-data caches
        if (linkedPersonalTxId) {
            await invalidateUserCachePrefix(userId, 'data-library')
            await invalidateUserCachePrefix(userId, 'fridge')
            await invalidateUserCachePrefix(userId, 'savings')
            await invalidateUserCachePrefix(userId, 'trends')
        }

        return NextResponse.json(
            {
                success: true,
                data: { id: txId, split_count: resolvedSplits.length, item_count: itemCount },
            },
            { status: 201 }
        )
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: error.errors?.[0]?.message ?? "Invalid transaction data" },
                { status: 400 }
            )
        }
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        // Split validation errors
        if (error.message?.includes("must sum") || error.message?.includes("not a member") || error.message?.includes("Duplicate")) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to create shared transaction" },
            { status: 500 }
        )
    }
}

// GET /api/rooms/[roomId]/transactions — List shared transactions (paginated)
export async function GET(
    req: NextRequest,
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

        const { searchParams } = new URL(req.url)
        const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10)
        const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10)
        const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 50 : rawLimit, 100))
        const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

        const [transactions, countRows] = await Promise.all([
            neonQuery<SharedTransaction & { uploader_name: string }>(
                `SELECT
                    st.*,
                    u.name AS uploader_name
                 FROM shared_transactions st
                 JOIN users u ON u.id = st.uploaded_by
                 WHERE st.room_id = $1
                 ORDER BY st.transaction_date DESC, st.created_at DESC
                 LIMIT $2 OFFSET $3`,
                [roomId, limit, offset]
            ),
            neonQuery<{ count: string }>(
                `SELECT COUNT(*)::text AS count FROM shared_transactions WHERE room_id = $1`,
                [roomId]
            ),
        ])

        // Batch-fetch splits and items for all returned transactions
        const txIds = transactions.map(t => t.id)
        const [splits, items] = txIds.length > 0 ? await Promise.all([
            neonQuery<{ shared_tx_id: string; id: string; user_id: string; amount: number; item_id: string | null; status: string; display_name: string }>(
                `SELECT ts.shared_tx_id, ts.id, ts.user_id, ts.amount, ts.item_id, ts.status,
                        u.name AS display_name
                 FROM transaction_splits ts
                 JOIN users u ON u.id = ts.user_id
                 WHERE ts.shared_tx_id = ANY($1::text[])`,
                [txIds]
            ),
            neonQuery<{ id: string; shared_tx_id: string; name: string; amount: number; quantity: number; category: string | null }>(
                `SELECT id, shared_tx_id, name, amount, quantity, category
                 FROM receipt_items
                 WHERE shared_tx_id = ANY($1::text[])`,
                [txIds]
            ),
        ]) : [[], []]

        // Group splits and items by shared_tx_id
        const splitsByTxId = splits.reduce<Record<string, typeof splits>>((acc, s) => {
            ;(acc[s.shared_tx_id] ??= []).push(s)
            return acc
        }, {})
        const itemsByTxId = items.reduce<Record<string, typeof items>>((acc, i) => {
            ;(acc[i.shared_tx_id] ??= []).push(i)
            return acc
        }, {})

        const enrichedTransactions = transactions.map(tx => {
            const txSplits = splitsByTxId[tx.id] ?? []
            const txItems = itemsByTxId[tx.id] ?? []
            const source_type = (tx.metadata as any)?.source_type ?? 'manual'
            return {
                ...tx,
                splits: txSplits,
                items: txItems,
                is_attributed: txSplits.length > 0,
                source_type,
            }
        })

        return NextResponse.json({
            success: true,
            data: enrichedTransactions,
            meta: {
                total: parseInt(countRows[0]?.count ?? "0", 10),
                limit,
                offset,
            },
        })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch transactions" },
            { status: 500 }
        )
    }
}
