import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import type {
    PocketLinkedTransaction,
    PocketTransactionsResponse,
} from '@/lib/types/pockets'

/**
 * GET /api/pockets/item-transactions?pocket_id=123&tab=fuel
 * Returns transactions linked to a specific pocket tab.
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const pocketIdParam = searchParams.get('pocket_id')
        const tab = searchParams.get('tab')

        // Validate pocket_id
        if (!pocketIdParam) {
            return NextResponse.json(
                { error: 'pocket_id query parameter is required' },
                { status: 400 }
            )
        }

        const pocketId = parseInt(pocketIdParam, 10)
        if (isNaN(pocketId)) {
            return NextResponse.json(
                { error: 'pocket_id must be a valid integer' },
                { status: 400 }
            )
        }

        // Validate tab
        if (!tab || typeof tab !== 'string') {
            return NextResponse.json(
                { error: 'tab query parameter is required' },
                { status: 400 }
            )
        }

        // Verify pocket belongs to user
        const verifyPocket = await neonQuery<{ id: number }>(
            `SELECT id FROM pockets WHERE id = $1 AND user_id = $2`,
            [pocketId, userId]
        )

        if (verifyPocket.length === 0) {
            return NextResponse.json(
                { error: 'Pocket not found or access denied' },
                { status: 404 }
            )
        }

        // Get linked transactions for this pocket+tab
        const transactions = await neonQuery<PocketLinkedTransaction>(
            `SELECT t.id, t.tx_date::text as tx_date, t.description, t.amount,
                    c.name as category_name
             FROM pocket_transactions pt
             JOIN transactions t ON t.id = pt.transaction_id
             LEFT JOIN categories c ON c.id = t.category_id
             WHERE pt.pocket_id = $1 AND pt.user_id = $2 AND pt.tab = $3
             ORDER BY t.tx_date DESC
             LIMIT 500`,
            [pocketId, userId, tab]
        )

        // Calculate total
        const total = transactions.reduce(
            (sum, tx) => sum + Math.abs(tx.amount),
            0
        )

        const response: PocketTransactionsResponse = {
            pocket_id: pocketId,
            tab,
            transactions,
            total,
        }

        return NextResponse.json(response)

    } catch (error: unknown) {
        console.error('[Pockets Item-Transactions GET] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch pocket transactions'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
