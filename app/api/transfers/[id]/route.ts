// app/api/transfers/[id]/route.ts
// Confirm or reject a detected transfer pair.
//
// Both actions are atomic: status flip + tx_type cascade happen in a single
// data-modifying CTE so two concurrent tabs cannot both succeed (the status
// guard is the gate, RETURNING reports whether we won the race).

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateAccountAffectedCaches } from '@/lib/accounts/cache'
import { z } from 'zod'

const patchSchema = z.object({
    action: z.enum(['confirm', 'reject']),
})

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { id } = await params

        const body = await request.json()
        const parsed = patchSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' },
                { status: 400 }
            )
        }

        const { action } = parsed.data
        const result = action === 'confirm'
            ? await confirmTransfer(id, userId)
            : await rejectTransfer(id, userId)

        if (!result.transferId) {
            return NextResponse.json(
                { success: false, error: 'Transfer not found or already resolved' },
                { status: 409 }
            )
        }

        await invalidateAccountAffectedCaches(userId)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

/**
 * Confirm: status → 'confirmed', both legs → tx_type 'transfer'.
 * Works for both 'pending' (already quarantined) and 'suggested' (not yet quarantined) sources.
 */
async function confirmTransfer(id: string, userId: string): Promise<{ transferId: string | null }> {
    const rows = await neonQuery<{ transfer_id: string | null }>(
        `WITH t AS (
            UPDATE account_transfers
            SET status = 'confirmed'
            WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'suggested')
            RETURNING id, from_tx_id, to_tx_id
         ),
         tx_flip AS (
            UPDATE transactions
            SET tx_type = 'transfer', updated_at = NOW()
            FROM t
            WHERE transactions.user_id = $2
              AND transactions.id IN (t.from_tx_id, t.to_tx_id)
            RETURNING transactions.id
         )
         SELECT (SELECT id FROM t LIMIT 1) AS transfer_id`,
        [id, userId]
    )
    return { transferId: rows[0]?.transfer_id ?? null }
}

/**
 * Reject: delete the transfer row, revert any quarantined legs back to expense/income.
 * Uses DELETE rather than status='rejected' so the UNIQUE(from_tx_id) slot frees up,
 * letting a future import re-detect a different counterpart for the same outflow.
 * The tx_type guard ensures we only touch legs that were quarantined ('pending'),
 * leaving 'suggested' legs (still expense/income) untouched — a no-op for them.
 */
async function rejectTransfer(id: string, userId: string): Promise<{ transferId: string | null }> {
    const rows = await neonQuery<{ transfer_id: string | null }>(
        `WITH t AS (
            DELETE FROM account_transfers
            WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'suggested')
            RETURNING id, from_tx_id, to_tx_id
         ),
         tx_revert AS (
            UPDATE transactions
            SET tx_type = CASE WHEN transactions.amount < 0 THEN 'expense' ELSE 'income' END,
                updated_at = NOW()
            FROM t
            WHERE transactions.user_id = $2
              AND transactions.id IN (t.from_tx_id, t.to_tx_id)
              AND transactions.tx_type = 'pending_transfer'
            RETURNING transactions.id
         )
         SELECT (SELECT id FROM t LIMIT 1) AS transfer_id`,
        [id, userId]
    )
    return { transferId: rows[0]?.transfer_id ?? null }
}
