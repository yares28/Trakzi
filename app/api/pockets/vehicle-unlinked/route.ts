import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import type { PocketLinkedTransaction, PocketUnlinkedResponse } from '@/lib/types/pockets'

/**
 * GET /api/pockets/vehicle-unlinked?pocket_id=123
 * Get transactions that match vehicle categories but are NOT linked to this vehicle.
 * Vehicle categories: Fuel, Car Maintenance, Insurance, Taxes & Fees, Car Certificate, Car Loan, Parking/Tolls
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const pocketIdParam = searchParams.get('pocket_id')

        // Validate pocket_id
        if (!pocketIdParam) {
            return NextResponse.json(
                { error: 'Could not find which vehicle to load transactions for' },
                { status: 400 }
            )
        }

        const pocketId = parseInt(pocketIdParam, 10)
        if (isNaN(pocketId)) {
            return NextResponse.json(
                { error: 'Could not find which vehicle to load transactions for' },
                { status: 400 }
            )
        }

        // Verify pocket belongs to user and is a vehicle
        const verifyPocket = await neonQuery<{ id: number }>(
            `SELECT id FROM pockets WHERE id = $1 AND user_id = $2 AND type = 'vehicle'`,
            [pocketId, userId]
        )

        if (verifyPocket.length === 0) {
            return NextResponse.json(
                { error: 'This vehicle was not found. It may have been deleted.' },
                { status: 404 }
            )
        }

        // Vehicle-related categories
        const vehicleCategories = [
            'Fuel',
            'Car Maintenance',
            'Insurance',
            'Taxes & Fees',
            'Car Certificate',
            'Car Loan',
            'Parking/Tolls'
        ]

        // Get transactions matching vehicle categories that are NOT linked to this vehicle
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
            [userId, vehicleCategories, pocketId]
        )

        const response: PocketUnlinkedResponse = {
            transactions,
            total: transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        }

        return NextResponse.json(response)

    } catch (error: unknown) {
        console.error('[Vehicle Unlinked Transactions] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong loading available transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
