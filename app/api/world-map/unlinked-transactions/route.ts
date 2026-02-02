import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import type { CountryTransaction, UnlinkedTransactionsResponse } from '@/lib/types/world-map'

/**
 * GET /api/world-map/unlinked-transactions?search=coffee&limit=50
 * Get transactions that are not linked to any country
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)

        const search = searchParams.get('search')?.trim() || ''
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

        // Build query with optional search filter
        let query = `
            SELECT
                t.id,
                t.tx_date::text as tx_date,
                t.description,
                t.amount::text as amount,
                t.category_id,
                c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1 AND t.country_name IS NULL`

        const params: (string | number)[] = [userId]

        if (search) {
            query += ` AND t.description ILIKE $2`
            params.push(`%${search}%`)
        }

        query += ` ORDER BY t.tx_date DESC, t.id DESC LIMIT $${params.length + 1}`
        params.push(limit)

        const rows = await neonQuery<{
            id: number
            tx_date: string
            description: string
            amount: string
            category_id: number | null
            category_name: string | null
        }>(query, params)

        const transactions: CountryTransaction[] = rows.map(row => ({
            id: row.id,
            tx_date: row.tx_date,
            description: row.description,
            amount: parseFloat(row.amount) || 0,
            category_id: row.category_id,
            category_name: row.category_name
        }))

        // Get total count of unlinked transactions
        const countResult = await neonQuery<{ count: string }>(
            `SELECT COUNT(*)::text as count
            FROM transactions
            WHERE user_id = $1 AND country_name IS NULL`,
            [userId]
        )

        const response: UnlinkedTransactionsResponse = {
            transactions,
            total: parseInt(countResult[0]?.count || '0', 10)
        }

        return NextResponse.json(response)

    } catch (error: unknown) {
        console.error('[World Map Unlinked Transactions] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch unlinked transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
