import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'
import type { LinkTransactionsRequest, UnlinkTransactionsRequest } from '@/lib/types/world-map'

/**
 * POST /api/world-map/links
 * Link transactions to a country instance
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body: LinkTransactionsRequest = await request.json()

        const { country_instance_id, transaction_ids } = body

        // Validate country instance ID
        if (!country_instance_id || typeof country_instance_id !== 'number' || !Number.isInteger(country_instance_id)) {
            return NextResponse.json(
                { error: 'country_instance_id is required and must be an integer' },
                { status: 400 }
            )
        }

        // Verify the instance belongs to the user
        const instanceCheck = await neonQuery<{ id: number; country_name: string; label: string }>(
            `SELECT id, country_name, label FROM country_instances
            WHERE id = $1 AND user_id = $2`,
            [country_instance_id, userId]
        )

        if (instanceCheck.length === 0) {
            return NextResponse.json(
                { error: 'Country instance not found or access denied' },
                { status: 404 }
            )
        }

        const instance = instanceCheck[0]

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

        // Update transactions - link to country instance and set country_name for backward compatibility
        const result = await neonQuery<{ count: string }>(
            `WITH updated AS (
                UPDATE transactions
                SET country_instance_id = $1, country_name = $2, updated_at = now()
                WHERE id = ANY($3::int[]) AND user_id = $4
                RETURNING id
            )
            SELECT COUNT(*)::text as count FROM updated`,
            [country_instance_id, instance.country_name, transaction_ids, userId]
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
            country_instance_id,
            country: instance.country_name,
            label: instance.label,
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

        // Update transactions - unlink from country instance (set both to NULL)
        const result = await neonQuery<{ count: string }>(
            `WITH updated AS (
                UPDATE transactions
                SET country_instance_id = NULL, country_name = NULL, updated_at = now()
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
