import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { isValidCountryName } from '@/lib/data/country-codes'
import type { CountryTransaction, CountryTransactionsResponse } from '@/lib/types/world-map'

/**
 * GET /api/world-map/transactions?country=France
 * Get all transactions linked to a specific country
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const country = searchParams.get('country')

        // Validate country parameter
        if (!country) {
            return NextResponse.json(
                { error: 'country query parameter is required' },
                { status: 400 }
            )
        }

        if (!isValidCountryName(country)) {
            return NextResponse.json(
                { error: `Invalid country name: "${country}"` },
                { status: 400 }
            )
        }

        // Fetch transactions for this country
        const rows = await neonQuery<{
            id: number
            tx_date: string
            description: string
            amount: string
            category_id: number | null
            category_name: string | null
        }>(
            `SELECT
                t.id,
                t.tx_date::text as tx_date,
                t.description,
                t.amount::text as amount,
                t.category_id,
                c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1 AND t.country_name = $2
            ORDER BY t.tx_date DESC, t.id DESC
            LIMIT 500`,
            [userId, country]
        )

        const transactions: CountryTransaction[] = rows.map(row => ({
            id: row.id,
            tx_date: row.tx_date,
            description: row.description,
            amount: parseFloat(row.amount) || 0,
            category_id: row.category_id,
            category_name: row.category_name
        }))

        // Calculate total
        const total = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        const response: CountryTransactionsResponse = {
            country,
            transactions,
            total
        }

        return NextResponse.json(response)

    } catch (error: unknown) {
        console.error('[World Map Transactions] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch country transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
