import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { verifyRoomMember } from "@/lib/rooms/permissions"
import { validateSplits, type SplitInput } from "@/lib/rooms/split-validation"
import { checkSharedTxLimit } from "@/lib/friends/limits"
import { invalidateRoomCache, invalidateUserCachePrefix } from "@/lib/cache/upstash"
import { SplitInputSchema } from "@/app/api/rooms/[roomId]/transactions/route"

const BulkTxSchema = z.object({
    total_amount: z.number().positive(),
    description: z.string().min(1).max(500),
    category: z.string().max(100).optional(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
    original_tx_id: z.number().optional(),
    splits: z.array(SplitInputSchema).default([]),
})

const BulkCreateSchema = z.object({
    transactions: z.array(BulkTxSchema).min(1).max(100),
    source_type: z.enum(["personal_import", "statement"]),
    metadata: z.record(z.unknown()).optional(),
    paid_by: z.string().optional(), // Override who paid (applies to all transactions)
})

// POST /api/rooms/[roomId]/transactions/bulk — Bulk create shared transactions
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

        const body = await req.json()
        const data = BulkCreateSchema.parse(body)

        // Check plan limit upfront (current + batch size)
        const txLimit = await checkSharedTxLimit(userId)
        if (!txLimit.allowed || txLimit.current + data.transactions.length > txLimit.max) {
            const remaining = Math.max(0, txLimit.max - txLimit.current)
            return NextResponse.json(
                {
                    success: false,
                    error: `Monthly shared transaction limit would be exceeded. You have ${remaining} slot(s) remaining (${txLimit.current}/${txLimit.max}). Upgrade your plan for more.`,
                    remaining,
                },
                { status: 403 }
            )
        }

        // Get room member IDs for split validation
        const members = await neonQuery<{ user_id: string }>(
            `SELECT user_id FROM room_members WHERE room_id = $1`,
            [roomId]
        )
        const memberIds = members.map(m => m.user_id)

        const createdIds: string[] = []

        // Validate paid_by override
        const paidByOverride = data.paid_by && memberIds.includes(data.paid_by) ? data.paid_by : null

        // Verify ownership of all original_tx_ids in one query to prevent forged links
        const requestedOriginalIds = data.transactions
            .map(tx => tx.original_tx_id)
            .filter((id): id is number => id !== undefined)

        const verifiedOriginalIds = new Set<number>()
        if (requestedOriginalIds.length > 0) {
            const owned = await neonQuery<{ id: number }>(
                `SELECT id FROM transactions WHERE id = ANY($1::int[]) AND user_id = $2`,
                [requestedOriginalIds, userId]
            )
            owned.forEach(row => verifiedOriginalIds.add(row.id))
        }

        for (const tx of data.transactions) {
            const resolvedSplits = validateSplits(
                'custom',
                tx.total_amount,
                memberIds,
                tx.splits as SplitInput[]
            )

            const metadata: Record<string, unknown> = {
                source_type: data.source_type,
                ...data.metadata,
            }
            // Only use original_tx_id if ownership was verified above
            const verifiedOriginalTxId = tx.original_tx_id && verifiedOriginalIds.has(tx.original_tx_id)
                ? tx.original_tx_id
                : null
            if (verifiedOriginalTxId) metadata.original_tx_id = verifiedOriginalTxId
            if (paidByOverride && paidByOverride !== userId) metadata.paid_by = paidByOverride

            const txRows = await neonInsert<Record<string, unknown>>("shared_transactions", {
                room_id: roomId,
                uploaded_by: paidByOverride ?? userId,
                total_amount: tx.total_amount,
                currency: tx.currency,
                description: tx.description,
                category: tx.category ?? null,
                transaction_date: tx.transaction_date,
                split_type: resolvedSplits.length > 0 ? 'custom' : 'equal',
                original_tx_id: verifiedOriginalTxId,
                metadata,
            })

            const txId = (txRows[0] as any)?.id
            if (!txId) continue

            createdIds.push(txId)

            const effectivePayer = paidByOverride ?? userId
            for (const split of resolvedSplits) {
                await neonInsert("transaction_splits", {
                    shared_tx_id: txId,
                    user_id: split.user_id,
                    amount: split.amount,
                    status: split.user_id === effectivePayer ? "settled" : "pending",
                    settled_at: split.user_id === effectivePayer ? new Date().toISOString() : null,
                })
            }
        }

        await invalidateRoomCache(roomId)
        await invalidateUserCachePrefix(paidByOverride ?? userId, 'analytics')
        await invalidateUserCachePrefix(paidByOverride ?? userId, 'home')

        return NextResponse.json(
            {
                success: true,
                data: { created: createdIds.length, ids: createdIds },
            },
            { status: 201 }
        )
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
        return NextResponse.json(
            { success: false, error: "Failed to bulk create transactions" },
            { status: 500 }
        )
    }
}
