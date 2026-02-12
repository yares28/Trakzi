import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import {
    POCKET_TAB_CATEGORIES,
    resolveCategoryKey,
} from '@/lib/types/pockets'
import type {
    PocketLinkedTransaction,
    PocketUnlinkedResponse,
    PocketType,
} from '@/lib/types/pockets'

/**
 * GET /api/pockets/item-unlinked?pocket_id=123&tab=fuel&search=shell
 * Returns transactions matching the tab's category filter
 * that are NOT already linked to this pocket.
 *
 * For "other" pockets (tab="general"), no category filter is applied — all
 * transaction categories are shown.
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const pocketIdParam = searchParams.get('pocket_id')
        const tab = searchParams.get('tab')
        const search = searchParams.get('search')

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

        // Verify pocket belongs to user and get its type
        const verifyPocket = await neonQuery<{ id: number; type: PocketType }>(
            `SELECT id, type FROM pockets WHERE id = $1 AND user_id = $2`,
            [pocketId, userId]
        )

        if (verifyPocket.length === 0) {
            return NextResponse.json(
                { error: 'Pocket not found or access denied' },
                { status: 404 }
            )
        }

        const pocketType = verifyPocket[0].type

        // Resolve the category key (handles ambiguous names like "maintenance")
        const categoryKey = resolveCategoryKey(pocketType, tab)
        const categoryNames = POCKET_TAB_CATEGORIES[categoryKey] || []

        // Build query dynamically based on whether we have category filters
        const conditions: string[] = [
            `t.user_id = $1`,
            // Exclude transactions already linked to this pocket
            `t.id NOT IN (
                SELECT transaction_id FROM pocket_transactions
                WHERE pocket_id = $2
            )`,
        ]
        const params: any[] = [userId, pocketId]
        let paramIdx = 3

        // Add category filter if categories are specified (non-empty array)
        if (categoryNames.length > 0) {
            conditions.push(`c.name = ANY($${paramIdx}::text[])`)
            params.push(categoryNames)
            paramIdx++
        }

        // Add search filter if provided
        if (search && search.trim().length > 0) {
            conditions.push(`t.description ILIKE '%' || $${paramIdx} || '%'`)
            params.push(search.trim())
            paramIdx++
        }

        const whereClause = conditions.join(' AND ')

        const transactions = await neonQuery<PocketLinkedTransaction>(
            `SELECT t.id, t.tx_date::text as tx_date, t.description, t.amount,
                    c.name as category_name
             FROM transactions t
             LEFT JOIN categories c ON c.id = t.category_id
             WHERE ${whereClause}
             ORDER BY t.tx_date DESC
             LIMIT 200`,
            params
        )

        const total = transactions.reduce(
            (sum, tx) => sum + Math.abs(tx.amount),
            0
        )

        const response: PocketUnlinkedResponse = {
            transactions,
            total,
        }

        return NextResponse.json(response)

    } catch (error: unknown) {
        console.error('[Pockets Item-Unlinked GET] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch unlinked transactions'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
