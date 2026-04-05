// app/api/transfers/[id]/route.ts
// Confirm or reject a detected transfer.
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { z } from 'zod'
import { invalidateUserCache } from '@/lib/cache/upstash'

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

        // Verify ownership
        const [transfer] = await neonQuery<{
            id: string
            from_tx_id: number
            to_tx_id: number
            status: string
        }>(
            `SELECT id, from_tx_id, to_tx_id, status
             FROM account_transfers
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (!transfer) {
            return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 })
        }

        if (transfer.status !== 'pending') {
            return NextResponse.json(
                { success: false, error: 'Transfer is no longer pending' },
                { status: 409 }
            )
        }

        const { action } = parsed.data

        if (action === 'confirm') {
            // Mark transfer confirmed, update transactions to tx_type='transfer'
            await neonQuery(
                `UPDATE account_transfers SET status = 'confirmed' WHERE id = $1`,
                [id]
            )
            await neonQuery(
                `UPDATE transactions
                 SET tx_type = 'transfer', updated_at = NOW()
                 WHERE id IN ($1, $2) AND user_id = $3`,
                [transfer.from_tx_id, transfer.to_tx_id, userId]
            )
        } else {
            // Reject: mark rejected, restore transactions to 'expense'/'income' based on sign
            await neonQuery(
                `UPDATE account_transfers SET status = 'rejected' WHERE id = $1`,
                [id]
            )
            // Restore: outflow → expense, inflow → income
            await neonQuery(
                `UPDATE transactions
                 SET tx_type = CASE WHEN amount < 0 THEN 'expense' ELSE 'income' END,
                     updated_at = NOW()
                 WHERE id IN ($1, $2) AND user_id = $3`,
                [transfer.from_tx_id, transfer.to_tx_id, userId]
            )
        }

        await invalidateUserCache(userId)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
