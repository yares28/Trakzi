import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { invalidateRoomCache, invalidateUserCachePrefix } from "@/lib/cache/upstash"

const SettleBodySchema = z.object({
    // omit = legacy path: mark split settled only, no personal transaction created
    payment_method: z.enum(["cash", "bank"]).optional(),
})

type InsertedTx = Record<string, unknown> & { id?: number }

// PATCH /api/splits/[splitId]/settle — Mark a split as settled
// Body (optional): { payment_method: 'cash' | 'bank' }
//   cash → create personal settlement tx immediately (pending_import_match=false)
//   bank → create personal settlement tx with pending_import_match=true (for CSV linking)
//   omitted → legacy: mark split settled only
//
// Write order: personal tx first → split update second.
// If the personal insert fails the split stays pending (user can retry).
// If the split update fails the personal tx exists but split stays pending — recoverable.
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ splitId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { splitId } = await params

        const body = await req.json().catch(() => ({}))
        const { payment_method } = SettleBodySchema.parse(body)

        // Fetch split + shared tx context
        const rows = await neonQuery<{
            id: string
            user_id: string
            amount: number
            status: string
            uploaded_by: string
            room_id: string | null
            friendship_id: string | null
            shared_tx_description: string
            shared_tx_currency: string
            room_name: string | null
        }>(
            `SELECT ts.id, ts.user_id, ts.amount, ts.status, st.uploaded_by,
                    st.room_id, st.friendship_id, st.description AS shared_tx_description,
                    st.currency AS shared_tx_currency, r.name AS room_name
             FROM transaction_splits ts
             JOIN shared_transactions st ON st.id = ts.shared_tx_id
             LEFT JOIN rooms r ON r.id = st.room_id
             WHERE ts.id = $1
               AND (
                   (st.room_id IS NOT NULL AND EXISTS (
                       SELECT 1 FROM room_members rm
                       WHERE rm.room_id = st.room_id AND rm.user_id = $2
                   ))
                   OR
                   (st.friendship_id IS NOT NULL AND EXISTS (
                       SELECT 1 FROM friendships f
                       WHERE f.id = st.friendship_id
                         AND (f.requester_id = $2 OR f.addressee_id = $2)
                   ))
               )`,
            [splitId, userId]
        )

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Split not found" },
                { status: 404 }
            )
        }

        const split = rows[0]

        // Only the payer (uploader) or the debtor can settle
        if (split.uploaded_by !== userId && split.user_id !== userId) {
            return NextResponse.json(
                { success: false, error: "You are not authorized to settle this split" },
                { status: 403 }
            )
        }

        if (split.status === "settled") {
            return NextResponse.json(
                { success: false, error: "This split is already settled" },
                { status: 409 }
            )
        }

        const today = new Date().toISOString().split('T')[0]
        const context = split.room_name
            ? `${split.room_name} — ${split.shared_tx_description}`
            : split.shared_tx_description

        // Step 1 (optional): Create personal settlement tx BEFORE marking split settled.
        // If this insert fails, the split stays pending — user can retry. Safe ordering.
        let personalTxId: number | null = null
        let pendingImportMatch = false

        if (payment_method) {
            pendingImportMatch = payment_method === "bank"

            const isDebtor = split.user_id === userId
            // Edge case: uploader assigned a split to themselves — skip personal tx creation
            // as that would double-count (they already own the full transaction).
            if (isDebtor && split.uploaded_by !== userId) {
                // Non-payer settling their debt: money going out
                const ptRows = await neonInsert<InsertedTx>("transactions", {
                    user_id: userId,
                    tx_date: today,
                    description: `Settlement: ${context}`,
                    amount: -Number(split.amount),
                    currency: split.shared_tx_currency,
                    tx_type: "settlement_sent",
                    settlement_for_split_id: splitId,
                    pending_import_match: pendingImportMatch,
                })
                personalTxId = ptRows[0]?.id ?? null
            } else if (!isDebtor && split.uploaded_by === userId) {
                // Payer confirming receipt of payment: money coming in
                const ptRows = await neonInsert<InsertedTx>("transactions", {
                    user_id: userId,
                    tx_date: today,
                    description: `Received: ${context}`,
                    amount: Number(split.amount),
                    currency: split.shared_tx_currency,
                    tx_type: "settlement_received",
                    settlement_for_split_id: splitId,
                    pending_import_match: pendingImportMatch,
                })
                personalTxId = ptRows[0]?.id ?? null
            }
        }

        // Step 2: Mark the split as settled
        await neonQuery(
            `UPDATE transaction_splits SET status = 'settled', settled_at = NOW() WHERE id = $1`,
            [splitId]
        )

        // Invalidate caches
        if (split.room_id) {
            await invalidateRoomCache(split.room_id)
        }
        await invalidateUserCachePrefix(userId, 'analytics')
        await invalidateUserCachePrefix(userId, 'home')
        if (personalTxId) {
            await invalidateUserCachePrefix(userId, 'data-library')
        }

        return NextResponse.json({
            success: true,
            data: {
                split_id: splitId,
                status: "settled",
                personal_tx_id: personalTxId,
                pending_import_match: pendingImportMatch,
            },
        })
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: error.errors?.[0]?.message ?? "Invalid request" },
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
            { success: false, error: "Failed to settle split" },
            { status: 500 }
        )
    }
}
