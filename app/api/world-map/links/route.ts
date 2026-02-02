import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'
import { isValidCountryName } from '@/lib/data/country-codes'
import type { LinkTransactionsRequest, UnlinkTransactionsRequest } from '@/lib/types/world-map'

/**
 * POST /api/world-map/links
 * Link transactions to a country
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body: LinkTransactionsRequest = await request.json()

        const { country_name, transaction_ids } = body

        // Validate country name
        if (!country_name || typeof country_name !== 'string') {
            return NextResponse.json(
                { error: 'country_name is required' },
                { status: 400 }
            )
        }

        if (!isValidCountryName(country_name)) {
            return NextResponse.json(
                { error: `Invalid country name: "${country_name}". Must match GeoJSON country names.` },
                { status: 400 }
            )
        }

        // Validate transaction IDs
        if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
            return NextResponse.json(
                { error: 'transaction_ids must be a non-empty array' },
                { status: 400 }
            )
        }

        // Validate all IDs are numbers
        if (!transaction_ids.every(id => typeof id === 'number' && Number.isInteger(id))) {
            return NextResponse.json(
                { error: 'All transaction_ids must be integers' },
                { status: 400 }
            )
        }

        // Update transactions - only those belonging to this user
        const result = await neonQuery<{ count: string }>(
            `WITH updated AS (
                UPDATE transactions
                SET country_name = $1, updated_at = now()
                WHERE id = ANY($2::int[]) AND user_id = $3
                RETURNING id
            )
            SELECT COUNT(*)::text as count FROM updated`,
            [country_name, transaction_ids, userId]
        )

        const updatedCount = parseInt(result[0]?.count || '0', 10)

        // Check if all requested transactions were updated
        if (updatedCount < transaction_ids.length) {
            console.warn(`[World Map Links] Only ${updatedCount} of ${transaction_ids.length} transactions updated for user ${userId}`)
        }

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'world-map')

        return NextResponse.json({
            success: true,
            country: country_name,
            linked: updatedCount,
            requested: transaction_ids.length
        })

    } catch (error: unknown) {
        console.error('[World Map Links POST] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to link transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/world-map/links
 * Unlink transactions from countries
 */
export async function DELETE(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body: UnlinkTransactionsRequest = await request.json()

        const { transaction_ids } = body

        // Validate transaction IDs
        if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
            return NextResponse.json(
                { error: 'transaction_ids must be a non-empty array' },
                { status: 400 }
            )
        }

        // Validate all IDs are numbers
        if (!transaction_ids.every(id => typeof id === 'number' && Number.isInteger(id))) {
            return NextResponse.json(
                { error: 'All transaction_ids must be integers' },
                { status: 400 }
            )
        }

        // Update transactions - set country_name to NULL
        const result = await neonQuery<{ count: string }>(
            `WITH updated AS (
                UPDATE transactions
                SET country_name = NULL, updated_at = now()
                WHERE id = ANY($1::int[]) AND user_id = $2
                RETURNING id
            )
            SELECT COUNT(*)::text as count FROM updated`,
            [transaction_ids, userId]
        )

        const updatedCount = parseInt(result[0]?.count || '0', 10)

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'world-map')

        return NextResponse.json({
            success: true,
            unlinked: updatedCount,
            requested: transaction_ids.length
        })

    } catch (error: unknown) {
        console.error('[World Map Links DELETE] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to unlink transactions'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
