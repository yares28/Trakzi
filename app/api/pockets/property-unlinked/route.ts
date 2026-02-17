import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import type { PocketLinkedTransaction, PocketUnlinkedResponse } from '@/lib/types/pockets'

// Categories for owned properties
const OWNED_CATEGORIES = [
    'Mortgage',
    'Home Maintenance',
    'Insurance',
    'Taxes & Fees',
]

// Categories for rented properties
const RENTED_CATEGORIES = [
    'Rent',
    'Utilities',
    'Deposit',
    'Taxes & Fees',
]

/**
 * GET /api/pockets/property-unlinked?pocket_id=123
 * Get transactions that match property categories but are NOT linked to this property.
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const pocketIdParam = searchParams.get('pocket_id')

        if (!pocketIdParam) {
            return NextResponse.json(
                { error: 'Could not find which property to load transactions for' },
                { status: 400 }
            )
        }

        const pocketId = parseInt(pocketIdParam, 10)
        if (isNaN(pocketId)) {
            return NextResponse.json(
                { error: 'Could not find which property to load transactions for' },
                { status: 400 }
            )
        }

        // Verify pocket belongs to user and is a property
        const verifyPocket = await neonQuery<{ id: number; metadata: Record<string, unknown> }>(
            `SELECT id, metadata FROM pockets WHERE id = $1 AND user_id = $2 AND type = 'property'`,
            [pocketId, userId]
        )

        if (verifyPocket.length === 0) {
            return NextResponse.json(
                { error: 'This property was not found. It may have been deleted.' },
                { status: 404 }
            )
        }

        const property = verifyPocket[0]
        const isOwned = property.metadata &&
            typeof property.metadata === 'object' &&
            'propertyType' in property.metadata &&
            property.metadata.propertyType === 'owned'

        const propertyCategories = isOwned ? OWNED_CATEGORIES : RENTED_CATEGORIES

        // Get transactions matching property categories that are NOT linked to this property
        const transactions = await neonQuery<PocketLinkedTransaction>(
            `SELECT t.id, t.tx_date::text as tx_date, t.description, t.amount,
                    c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1
                AND c.name = ANY($2::text[])
                AND t.id NOT IN (
                    SELECT transaction_id FROM pocket_transactions
                    WHERE pocket_id = $3
                )
            ORDER BY t.tx_date DESC, t.id DESC
            LIMIT 500`,
            [userId, propertyCategories, pocketId]
        )

        const response: PocketUnlinkedResponse = {
            transactions,
            total: transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        }

        return NextResponse.json(response)

    } catch (error: unknown) {
        console.error('[Property Unlinked Transactions] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong loading available transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
