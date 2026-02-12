import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'
import type { PocketLinkRequest, PocketUnlinkRequest } from '@/lib/types/pockets'

/**
 * POST /api/pockets/item-links
 * Link transactions to a pocket under a specific tab.
 * Uses ON CONFLICT DO NOTHING for idempotent re-linking.
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body: PocketLinkRequest = await request.json()

        const { pocket_id, tab, transaction_ids } = body

        // Validate pocket_id
        if (!pocket_id || typeof pocket_id !== 'number') {
            return NextResponse.json(
                { error: 'pocket_id is required and must be a number' },
                { status: 400 }
            )
        }

        // Validate tab
        if (!tab || typeof tab !== 'string' || tab.trim().length === 0) {
            return NextResponse.json(
                { error: 'tab is required and must be a non-empty string' },
                { status: 400 }
            )
        }

        // Validate transaction_ids
        if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
            return NextResponse.json(
                { error: 'transaction_ids must be a non-empty array of numbers' },
                { status: 400 }
            )
        }

        if (transaction_ids.some(id => typeof id !== 'number' || id <= 0)) {
            return NextResponse.json(
                { error: 'All transaction_ids must be positive numbers' },
                { status: 400 }
            )
        }

        // Verify pocket belongs to user
        const verifyPocket = await neonQuery<{ id: number }>(
            `SELECT id FROM pockets WHERE id = $1 AND user_id = $2`,
            [pocket_id, userId]
        )

        if (verifyPocket.length === 0) {
            return NextResponse.json(
                { error: 'Pocket not found or access denied' },
                { status: 404 }
            )
        }

        // Verify all transaction_ids belong to user
        const validTxs = await neonQuery<{ id: number }>(
            `SELECT id FROM transactions
             WHERE id = ANY($1::int[]) AND user_id = $2`,
            [transaction_ids, userId]
        )

        const validIds = new Set(validTxs.map(t => t.id))
        const filteredIds = transaction_ids.filter(id => validIds.has(id))

        if (filteredIds.length === 0) {
            return NextResponse.json(
                { error: 'None of the provided transaction IDs belong to you' },
                { status: 400 }
            )
        }

        // Build batch INSERT with ON CONFLICT DO NOTHING
        const values: string[] = []
        const params: any[] = [pocket_id, userId, tab]
        let paramIdx = 4

        for (const txId of filteredIds) {
            values.push(`($1, $${paramIdx}, $2, $3)`)
            params.push(txId)
            paramIdx++
        }

        const insertResult = await neonQuery<{ id: number }>(
            `INSERT INTO pocket_transactions (pocket_id, transaction_id, user_id, tab)
             VALUES ${values.join(', ')}
             ON CONFLICT (pocket_id, transaction_id) DO NOTHING
             RETURNING id`,
            params
        )

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'pockets')

        return NextResponse.json({
            linked: insertResult.length,
            requested: transaction_ids.length,
        })

    } catch (error: unknown) {
        console.error('[Pockets Item-Links POST] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to link transactions'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * DELETE /api/pockets/item-links
 * Unlink transactions from a pocket.
 */
export async function DELETE(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body: PocketUnlinkRequest = await request.json()

        const { pocket_id, transaction_ids } = body

        // Validate pocket_id
        if (!pocket_id || typeof pocket_id !== 'number') {
            return NextResponse.json(
                { error: 'pocket_id is required and must be a number' },
                { status: 400 }
            )
        }

        // Validate transaction_ids
        if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
            return NextResponse.json(
                { error: 'transaction_ids must be a non-empty array of numbers' },
                { status: 400 }
            )
        }

        // Verify pocket belongs to user
        const verifyPocket = await neonQuery<{ id: number }>(
            `SELECT id FROM pockets WHERE id = $1 AND user_id = $2`,
            [pocket_id, userId]
        )

        if (verifyPocket.length === 0) {
            return NextResponse.json(
                { error: 'Pocket not found or access denied' },
                { status: 404 }
            )
        }

        // Delete the links (user_id filter ensures ownership)
        const deleted = await neonQuery<{ id: number }>(
            `DELETE FROM pocket_transactions
             WHERE pocket_id = $1
               AND user_id = $2
               AND transaction_id = ANY($3::int[])
             RETURNING id`,
            [pocket_id, userId, transaction_ids]
        )

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'pockets')

        return NextResponse.json({
            unlinked: deleted.length,
            requested: transaction_ids.length,
        })

    } catch (error: unknown) {
        console.error('[Pockets Item-Links DELETE] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to unlink transactions'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
