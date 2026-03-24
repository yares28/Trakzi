import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { invalidateRoomCache, invalidateUserCachePrefix } from "@/lib/cache/upstash"
import { wouldExceedCap } from "@/lib/limits/auto-enforce-cap"
import { recordMonthlyUsage } from "@/lib/limits/transaction-wallet"

const SettleBodySchema = z.object({
    // omit = legacy path: mark split settled only, no personal transaction created
    payment_method: z.enum(["cash", "bank"]).optional(),
    // Category for the personal expense tx written on settle (for debtor's share)
    category: z.string().optional(),
})

type InsertedTx = Record<string, unknown> & { id?: number }

// PATCH /api/splits/[splitId]/settle — Mark a split as settled
// Body (optional): { payment_method: 'cash' | 'bank', category?: string }
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
        const { payment_method, category } = SettleBodySchema.parse(body)

        // Fetch split + shared tx context (including item details if item-level split)
        const rows = await neonQuery<{
            id: string
            user_id: string
            amount: number
            status: string
            uploaded_by: string
            room_id: string | null
            friendship_id: string | null
            shared_tx_id: string
            shared_tx_description: string
            shared_tx_currency: string
            shared_tx_category: string | null
            room_name: string | null
            item_id: string | null
            item_name: string | null
            item_category: string | null
        }>(
            `SELECT ts.id, ts.user_id, ts.amount, ts.status, st.uploaded_by,
                    st.room_id, st.friendship_id, st.id AS shared_tx_id,
                    st.description AS shared_tx_description,
                    st.currency AS shared_tx_currency,
                    st.category AS shared_tx_category,
                    r.name AS room_name,
                    ts.item_id,
                    ri.name AS item_name,
                    COALESCE(ri.category, st.category) AS item_category
             FROM transaction_splits ts
             JOIN shared_transactions st ON st.id = ts.shared_tx_id
             LEFT JOIN rooms r ON r.id = st.room_id
             LEFT JOIN receipt_items ri ON ri.id = ts.item_id
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

        const isDebtor = split.user_id === userId

        // For debtors: check wallet capacity before writing any personal transactions.
        // Wallet full = block settlement entirely (user must free space or upgrade).
        if (isDebtor && split.uploaded_by !== userId && payment_method) {
            const cap = await wouldExceedCap(userId, 1)
            if (cap.wouldExceed) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "You've reached your transaction limit. Delete transactions from the Data Library or upgrade your plan to continue.",
                        code: "WALLET_FULL",
                        plan: cap.plan,
                    },
                    { status: 402 }
                )
            }
        }

        // Step 1 (optional): Create personal settlement tx BEFORE marking split settled.
        // If this insert fails, the split stays pending — user can retry. Safe ordering.
        let personalTxId: number | null = null
        let pendingImportMatch = false

        if (payment_method) {
            pendingImportMatch = payment_method === "bank"

            if (isDebtor && split.uploaded_by !== userId) {
                // Debtor settling their debt: record the payment going out
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

                // Also write the actual EXPENSE transaction for the debtor's share.
                // This is the record that appears in their personal analytics/categories.
                const expenseDescription = split.item_id
                    ? (split.item_name ?? split.shared_tx_description)
                    : split.shared_tx_description
                const expenseCategory = category
                    ?? split.item_category
                    ?? split.shared_tx_category
                    ?? 'Other'

                await neonInsert<InsertedTx>("transactions", {
                    user_id: userId,
                    tx_date: today,
                    description: expenseDescription,
                    amount: Number(split.amount),
                    category: expenseCategory,
                    currency: split.shared_tx_currency,
                    tx_type: 'expense',
                    source_type: 'room_share',
                    room_transaction_id: split.shared_tx_id,
                    room_id: split.room_id,
                    room_item_id: split.item_id,
                })

                await recordMonthlyUsage(userId, 1)

            } else if (!isDebtor && split.uploaded_by === userId) {
                // Uploader confirming receipt of payment from a debtor: money coming in
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
        await invalidateUserCachePrefix(userId, 'trends')
        await invalidateUserCachePrefix(userId, 'savings')
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
