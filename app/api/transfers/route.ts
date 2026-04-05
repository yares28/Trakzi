// app/api/transfers/route.ts
// List pending transfers and run on-demand detection.
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import type { AccountTransferWithDetails } from '@/lib/types/accounts'

/**
 * GET /api/transfers
 * Returns all pending transfers with transaction details.
 */
export async function GET() {
    try {
        const userId = await getCurrentUserId()

        const rows = await neonQuery<{
            id: string
            user_id: string
            from_tx_id: number
            to_tx_id: number
            amount: string
            status: string
            created_at: string
            // from tx
            from_description: string
            from_amount: string
            from_date: string
            from_account_id: string | null
            from_account_name: string | null
            // to tx
            to_description: string
            to_amount: string
            to_date: string
            to_account_id: string | null
            to_account_name: string | null
        }>(
            `SELECT
                at.id, at.user_id, at.from_tx_id, at.to_tx_id,
                at.amount::text, at.status, at.created_at,
                ft.description AS from_description,
                ft.amount::text AS from_amount,
                ft.tx_date AS from_date,
                ft.account_id AS from_account_id,
                fa.name AS from_account_name,
                tt.description AS to_description,
                tt.amount::text AS to_amount,
                tt.tx_date AS to_date,
                tt.account_id AS to_account_id,
                ta.name AS to_account_name
             FROM account_transfers at
             JOIN transactions ft ON ft.id = at.from_tx_id
             JOIN transactions tt ON tt.id = at.to_tx_id
             LEFT JOIN bank_accounts fa ON fa.id = ft.account_id AND fa.user_id = $1
             LEFT JOIN bank_accounts ta ON ta.id = tt.account_id AND ta.user_id = $1
             WHERE at.user_id = $1
               AND at.status = 'pending'
             ORDER BY at.created_at DESC`,
            [userId]
        )

        const transfers: AccountTransferWithDetails[] = rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            fromTxId: r.from_tx_id,
            toTxId: r.to_tx_id,
            amount: parseFloat(r.amount),
            status: r.status as 'pending' | 'confirmed' | 'rejected',
            createdAt: r.created_at,
            fromTx: {
                id: r.from_tx_id,
                description: r.from_description,
                amount: parseFloat(r.from_amount),
                txDate: r.from_date,
                accountId: r.from_account_id,
                accountName: r.from_account_name,
            },
            toTx: {
                id: r.to_tx_id,
                description: r.to_description,
                amount: parseFloat(r.to_amount),
                txDate: r.to_date,
                accountId: r.to_account_id,
                accountName: r.to_account_name,
            },
        }))

        return NextResponse.json({ success: true, transfers })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
