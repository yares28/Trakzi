import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import type { CountryTransaction, CountryTransactionsResponse } from '@/lib/types/pockets'

/**
 * GET /api/pockets/transactions?instance_id=123
 * Get all transactions linked to a specific country instance
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const instanceIdParam = searchParams.get('instance_id')

        // Validate instance_id parameter
        if (!instanceIdParam) {
            return NextResponse.json(
                { error: 'Could not find which country to load transactions for' },
                { status: 400 }
            )
        }

        const instanceId = parseInt(instanceIdParam, 10)
        if (isNaN(instanceId)) {
            return NextResponse.json(
                { error: 'Could not find which country to load transactions for' },
                { status: 400 }
            )
        }

        // Verify the instance belongs to the user and get its details
        const instanceCheck = await neonQuery<{ id: number; country_name: string; label: string }>(
            `SELECT id, country_name, label FROM country_instances
            WHERE id = $1 AND user_id = $2`,
            [instanceId, userId]
        )

        if (instanceCheck.length === 0) {
            return NextResponse.json(
                { error: 'This country was not found. It may have been deleted.' },
                { status: 404 }
            )
        }

        const instance = instanceCheck[0]

        // Fetch transactions for this instance
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
            WHERE t.user_id = $1 AND t.country_instance_id = $2
            ORDER BY t.tx_date DESC, t.id DESC
            LIMIT 500`,
            [userId, instanceId]
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
            country: instance.country_name,
            label: instance.label,
            instance_id: instance.id,
            transactions,
            total
        }

        return NextResponse.json(response)

    } catch (error: unknown) {
        console.error('[Pockets Transactions] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong loading transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
