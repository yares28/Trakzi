import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import type { PocketLinkedTransaction } from '@/lib/types/pockets'

/**
 * GET /api/pockets/vehicle-transactions?pocket_id=123
 * Get all transactions linked to a vehicle (across all tabs: fuel, maintenance, insurance, certificate, parking, financing)
 */
export async function GET(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const pocketIdParam = searchParams.get('pocket_id')

        // Validate pocket_id parameter
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

        // Verify the pocket belongs to the user and is a vehicle
        const verifyPocket = await neonQuery<{ id: number; name: string; type: string }>(
            `SELECT id, name, type FROM pockets
            WHERE id = $1 AND user_id = $2 AND type = 'vehicle'`,
            [pocketId, userId]
        )

        if (verifyPocket.length === 0) {
            return NextResponse.json(
                { error: 'This vehicle was not found. It may have been deleted.' },
                { status: 404 }
            )
        }

        const vehicle = verifyPocket[0]

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

        // Fetch transactions linked to this vehicle, filtered to vehicle categories only
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
            [pocketId, userId, vehicleCategories]
        )

        // Calculate total
        const total = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        return NextResponse.json({
            pocket_id: pocketId,
            vehicle_name: vehicle.name,
            transactions,
            total
        })

    } catch (error: unknown) {
        console.error('[Vehicle Transactions] Error:', error)
        const message = error instanceof Error ? error.message : 'Something went wrong loading vehicle transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
