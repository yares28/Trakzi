import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import type { PocketLinkedTransaction } from '@/lib/types/pockets'

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
 * GET /api/pockets/property-transactions?pocket_id=123
 * Get all transactions linked to a property, filtered to property-relevant categories.
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

        // Verify the pocket belongs to the user and is a property
        const verifyPocket = await neonQuery<{ id: number; name: string; metadata: Record<string, unknown> }>(
            `SELECT id, name, metadata FROM pockets
            WHERE id = $1 AND user_id = $2 AND type = 'property'`,
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

        // Fetch transactions linked to this property, filtered to property categories
        const transactions = await neonQuery<PocketLinkedTransaction>(
            `SELECT t.id, t.tx_date::text as tx_date, t.description, t.amount,
                    c.name as category_name
            FROM pocket_transactions pt
            JOIN transactions t ON t.id = pt.transaction_id
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE pt.pocket_id = $1 AND pt.user_id = $2
                AND c.name = ANY($3::text[])
            ORDER BY t.tx_date DESC, t.id DESC
            LIMIT 500`,
            [pocketId, userId, propertyCategories]
        )

        // Calculate total
        const total = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        return NextResponse.json({
            pocket_id: pocketId,
            property_name: property.name,
            property_type: isOwned ? 'owned' : 'rented',
            transactions,
            total
        })

    } catch (error: unknown) {
        console.error('[Property Transactions] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong loading property transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
