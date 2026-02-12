import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'
import type {
    PocketItem,
    PocketItemWithTotals,
    PocketType,
    CreatePocketRequest,
    UpdatePocketRequest,
    PocketMetadata,
} from '@/lib/types/pockets'

const VALID_POCKET_TYPES: PocketType[] = ["vehicle", "property", "other"]

/**
 * GET /api/pockets/items
 * Returns all pockets for the authenticated user with aggregated totals.
 * Uses 2 indexed queries merged in-memory (no N+1).
 */
export async function GET() {
    try {
        const userId = await getCurrentUserId()

        // Query 1: Get all pockets
        const pockets = await neonQuery<PocketItem>(
            `SELECT id, user_id, type, name, metadata, svg_path,
                    created_at::text as created_at,
                    updated_at::text as updated_at
             FROM pockets
             WHERE user_id = $1
             ORDER BY type, created_at DESC`,
            [userId]
        )

        // Query 2: Get aggregated totals per pocket per tab
        const totals = await neonQuery<{
            pocket_id: number
            tab: string
            tx_count: string
            total: string
        }>(
            `SELECT
                pt.pocket_id,
                pt.tab,
                COUNT(*) as tx_count,
                COALESCE(SUM(ABS(t.amount)), 0) as total
             FROM pocket_transactions pt
             JOIN transactions t ON t.id = pt.transaction_id
             WHERE pt.user_id = $1
             GROUP BY pt.pocket_id, pt.tab`,
            [userId]
        )

        // Build totals lookup: pocket_id → { tab → total, ... }
        const totalsMap = new Map<number, {
            tabTotals: Record<string, number>
            totalInvested: number
            transactionCount: number
        }>()

        for (const row of totals) {
            const pocketId = row.pocket_id
            const tabTotal = parseFloat(row.total) || 0
            const txCount = parseInt(row.tx_count, 10) || 0

            if (!totalsMap.has(pocketId)) {
                totalsMap.set(pocketId, {
                    tabTotals: {},
                    totalInvested: 0,
                    transactionCount: 0,
                })
            }

            const entry = totalsMap.get(pocketId)!
            entry.tabTotals[row.tab] = tabTotal
            entry.totalInvested += tabTotal
            entry.transactionCount += txCount
        }

        // Merge pockets with totals
        const items: PocketItemWithTotals[] = pockets.map((pocket) => {
            const entry = totalsMap.get(pocket.id)
            return {
                id: pocket.id,
                type: pocket.type,
                name: pocket.name,
                metadata: pocket.metadata,
                svg_path: pocket.svg_path,
                created_at: pocket.created_at,
                totals: entry?.tabTotals ?? {},
                totalInvested: entry?.totalInvested ?? 0,
                transactionCount: entry?.transactionCount ?? 0,
            }
        })

        return NextResponse.json({ items })

    } catch (error: unknown) {
        console.error('[Pockets Items GET] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch pockets'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * POST /api/pockets/items
 * Create a new pocket (vehicle, property, or other).
 */
export async function POST(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const body: CreatePocketRequest = await request.json()

        const { type, name, metadata, svg_path } = body

        // Validate type
        if (!type || !VALID_POCKET_TYPES.includes(type)) {
            return NextResponse.json(
                { error: `type must be one of: ${VALID_POCKET_TYPES.join(', ')}` },
                { status: 400 }
            )
        }

        // Validate name
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'name is required and must be a non-empty string' },
                { status: 400 }
            )
        }

        const trimmedName = name.trim()

        // Validate metadata is an object
        if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata))) {
            return NextResponse.json(
                { error: 'metadata must be a JSON object' },
                { status: 400 }
            )
        }

        // Check for duplicate name (user_id, type, name)
        const existing = await neonQuery<{ id: number }>(
            `SELECT id FROM pockets
             WHERE user_id = $1 AND type = $2 AND name = $3`,
            [userId, type, trimmedName]
        )

        if (existing.length > 0) {
            return NextResponse.json(
                { error: `A ${type} pocket named "${trimmedName}" already exists. Please choose a different name.` },
                { status: 409 }
            )
        }

        // Create the pocket
        const result = await neonQuery<PocketItem>(
            `INSERT INTO pockets (user_id, type, name, metadata, svg_path)
             VALUES ($1, $2, $3, $4::jsonb, $5)
             RETURNING
                id,
                user_id,
                type,
                name,
                metadata,
                svg_path,
                created_at::text as created_at,
                updated_at::text as updated_at`,
            [userId, type, trimmedName, JSON.stringify(metadata || {}), svg_path || null]
        )

        if (result.length === 0) {
            throw new Error('Failed to create pocket')
        }

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'pockets')

        return NextResponse.json({ item: result[0] }, { status: 201 })

    } catch (error: unknown) {
        console.error('[Pockets Items POST] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to create pocket'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * PATCH /api/pockets/items?id=123
 * Update pocket metadata (name, metadata fields, svg_path).
 * Metadata is merged with existing — partial updates are safe.
 */
export async function PATCH(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const pocketId = searchParams.get('id')
        const body: UpdatePocketRequest = await request.json()

        if (!pocketId) {
            return NextResponse.json(
                { error: 'id query parameter is required' },
                { status: 400 }
            )
        }

        const id = parseInt(pocketId, 10)
        if (isNaN(id)) {
            return NextResponse.json(
                { error: 'id must be a valid integer' },
                { status: 400 }
            )
        }

        // Verify ownership
        const verify = await neonQuery<{ id: number; type: string; name: string }>(
            `SELECT id, type, name FROM pockets
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (verify.length === 0) {
            return NextResponse.json(
                { error: 'Pocket not found or access denied' },
                { status: 404 }
            )
        }

        const pocket = verify[0]
        const { name, metadata, svg_path } = body

        // Build SET clauses dynamically
        const setClauses: string[] = []
        const params: any[] = []
        let paramIndex = 1

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return NextResponse.json(
                    { error: 'name must be a non-empty string' },
                    { status: 400 }
                )
            }

            const trimmedName = name.trim()

            // Check for duplicate name if name is changing
            if (trimmedName !== pocket.name) {
                const duplicate = await neonQuery<{ id: number }>(
                    `SELECT id FROM pockets
                     WHERE user_id = $1 AND type = $2 AND name = $3 AND id != $4`,
                    [userId, pocket.type, trimmedName, id]
                )

                if (duplicate.length > 0) {
                    return NextResponse.json(
                        { error: `A ${pocket.type} pocket named "${trimmedName}" already exists.` },
                        { status: 409 }
                    )
                }
            }

            setClauses.push(`name = $${paramIndex}`)
            params.push(trimmedName)
            paramIndex++
        }

        if (metadata !== undefined) {
            if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
                return NextResponse.json(
                    { error: 'metadata must be a JSON object' },
                    { status: 400 }
                )
            }

            // Merge with existing metadata using jsonb_concat (||)
            setClauses.push(`metadata = metadata || $${paramIndex}::jsonb`)
            params.push(JSON.stringify(metadata))
            paramIndex++
        }

        if (svg_path !== undefined) {
            setClauses.push(`svg_path = $${paramIndex}`)
            params.push(svg_path)
            paramIndex++
        }

        if (setClauses.length === 0) {
            return NextResponse.json(
                { error: 'No fields to update. Provide name, metadata, or svg_path.' },
                { status: 400 }
            )
        }

        // Add WHERE params
        params.push(id)
        const idParam = paramIndex
        paramIndex++
        params.push(userId)
        const userParam = paramIndex

        const result = await neonQuery<PocketItem>(
            `UPDATE pockets
             SET ${setClauses.join(', ')}
             WHERE id = $${idParam} AND user_id = $${userParam}
             RETURNING
                id,
                user_id,
                type,
                name,
                metadata,
                svg_path,
                created_at::text as created_at,
                updated_at::text as updated_at`,
            params
        )

        if (result.length === 0) {
            throw new Error('Failed to update pocket')
        }

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'pockets')

        return NextResponse.json({ success: true, item: result[0] })

    } catch (error: unknown) {
        console.error('[Pockets Items PATCH] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to update pocket'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * DELETE /api/pockets/items?id=123
 * Delete a pocket. Linked transactions are automatically unlinked
 * via ON DELETE CASCADE on pocket_transactions.
 */
export async function DELETE(request: Request) {
    try {
        const userId = await getCurrentUserId()
        const { searchParams } = new URL(request.url)
        const pocketId = searchParams.get('id')

        if (!pocketId) {
            return NextResponse.json(
                { error: 'id query parameter is required' },
                { status: 400 }
            )
        }

        const id = parseInt(pocketId, 10)
        if (isNaN(id)) {
            return NextResponse.json(
                { error: 'id must be a valid integer' },
                { status: 400 }
            )
        }

        // Verify ownership before deleting
        const verify = await neonQuery<{ id: number }>(
            `SELECT id FROM pockets
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        if (verify.length === 0) {
            return NextResponse.json(
                { error: 'Pocket not found or access denied' },
                { status: 404 }
            )
        }

        // Delete the pocket (pocket_transactions cascade automatically)
        await neonQuery(
            `DELETE FROM pockets
             WHERE id = $1 AND user_id = $2`,
            [id, userId]
        )

        // Invalidate cache
        await invalidateUserCachePrefix(userId, 'pockets')

        return NextResponse.json({ success: true, deleted: id })

    } catch (error: unknown) {
        console.error('[Pockets Items DELETE] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to delete pocket'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
