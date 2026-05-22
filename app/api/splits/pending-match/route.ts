import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { invalidateUserCachePrefix } from "@/lib/cache/upstash"

const LinkBodySchema = z.object({
    imported_tx_id: z.number().int().positive(),
    pending_settlement_tx_id: z.number().int().positive(),
})

// GET /api/splits/pending-match?amount=50.00
// Returns pending settlement transactions that match the given amount (±0.01).
// Used by the CSV import review UI to suggest linking an imported transfer
// to an existing settlement record.
export async function GET(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        const { searchParams } = new URL(req.url)
        const rawAmount = searchParams.get("amount")
        if (!rawAmount) {
            return NextResponse.json(
                { success: false, error: "amount query param required" },
                { status: 400 }
            )
        }
        const amount = Number(rawAmount)
        if (!isFinite(amount)) {
            return NextResponse.json(
                { success: false, error: "amount must be a finite number" },
                { status: 400 }
            )
        }

        // Find personal settlement transactions awaiting a bank import match
        // that are within ±0.01 of the queried amount (absolute).
        // Double-ABS: stored amount is negative for settlement_sent, so ABS(t.amount) normalises it.
        const matches = await neonQuery<{
            id: number
            description: string
            amount: number
            tx_date: string
            tx_type: string
            settlement_for_split_id: string | null
            room_name: string | null
            shared_tx_description: string | null
        }>(
            `SELECT
                t.id,
                t.description,
                t.amount,
                to_char(t.tx_date, 'YYYY-MM-DD') AS tx_date,
                t.tx_type,
                t.settlement_for_split_id,
                r.name AS room_name,
                st.description AS shared_tx_description
             FROM transactions t
             LEFT JOIN transaction_splits ts ON ts.id = t.settlement_for_split_id
             LEFT JOIN shared_transactions st ON st.id = ts.shared_tx_id
             LEFT JOIN rooms r ON r.id = st.room_id
             WHERE t.user_id = $1
               AND t.pending_import_match = true
               AND t.tx_type IN ('settlement_sent', 'settlement_received')
               AND ABS(ABS(t.amount) - $2) < 0.01
             ORDER BY t.tx_date DESC
             LIMIT 5`,
            [userId, Math.abs(amount)]
        )

        return NextResponse.json({ success: true, data: matches })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to find pending matches" },
            { status: 500 }
        )
    }
}

// POST /api/splits/pending-match — Link an imported transaction to a pending settlement
// Body: { imported_tx_id: number, pending_settlement_tx_id: number }
//
// CONCURRENCY SAFETY: Uses DELETE...RETURNING to atomically claim the placeholder.
// If two concurrent requests race for the same placeholder, the second DELETE
// returns zero rows and we return 409 — no double-promotion.
export async function POST(req: NextRequest) {
    try {
        const userId = await getCurrentUserId()

        const body = await req.json()
        const { imported_tx_id, pending_settlement_tx_id } = LinkBodySchema.parse(body)

        // Verify the imported transaction belongs to this user
        const importedRows = await neonQuery<{ id: number }>(
            `SELECT id FROM transactions WHERE id = $1 AND user_id = $2`,
            [imported_tx_id, userId]
        )
        if (importedRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Imported transaction not found" },
                { status: 404 }
            )
        }

        // Atomically claim + delete the pending placeholder.
        // The WHERE conditions (user_id + pending_import_match) prevent races:
        // only one caller can DELETE this row; others get 0 rows back.
        const deleted = await neonQuery<{
            id: number
            tx_type: string
            settlement_for_split_id: string | null
        }>(
            `DELETE FROM transactions
             WHERE id = $1
               AND user_id = $2
               AND pending_import_match = true
               AND tx_type IN ('settlement_sent', 'settlement_received')
             RETURNING id, tx_type, settlement_for_split_id`,
            [pending_settlement_tx_id, userId]
        )

        if (deleted.length === 0) {
            // Row was already claimed by a concurrent request or doesn't match criteria
            return NextResponse.json(
                { success: false, error: "Pending settlement not found or already linked" },
                { status: 409 }
            )
        }

        const placeholder = deleted[0]

        // Promote the imported transaction: copy tx_type + split link from the deleted placeholder
        await neonQuery(
            `UPDATE transactions
             SET tx_type = $1,
                 settlement_for_split_id = $2,
                 pending_import_match = false
             WHERE id = $3 AND user_id = $4`,
            [placeholder.tx_type, placeholder.settlement_for_split_id, imported_tx_id, userId]
        )

        await invalidateUserCachePrefix(userId, 'data-library')
        await invalidateUserCachePrefix(userId, 'analytics')

        return NextResponse.json({
            success: true,
            data: { linked: imported_tx_id, removed: pending_settlement_tx_id },
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
            { success: false, error: "Failed to link settlement" },
            { status: 500 }
        )
    }
}
