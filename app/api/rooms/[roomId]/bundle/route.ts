import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { verifyRoomMember } from '@/lib/rooms/permissions'
import { getRoomBalances } from '@/lib/rooms/balances'
import { getCachedOrCompute, buildCacheKey } from '@/lib/cache/upstash'
import type { Room, RoomMemberWithProfile, SharedTransaction, RoomBalance, SourceBreakdown } from '@/lib/types/rooms'

interface RoomBundleSummary {
    room: Room
    members: RoomMemberWithProfile[]
    balances: RoomBalance[]
    recentTransactions: (SharedTransaction & { uploader_name: string })[]
    totalSpent: number
    transactionCount: number
    unattributedTotal: number
    unattributedCount: number
    sourceBreakdown: SourceBreakdown
}

const ROOM_BUNDLE_TTL = 2 * 60 // 2 minutes

async function getRoomBundle(roomId: string): Promise<RoomBundleSummary> {
    const [roomRows, members, balances, recentTransactions, stats, unattributedRows, sourceRows] = await Promise.all([
        neonQuery<Room>(
            `SELECT * FROM rooms WHERE id = $1`,
            [roomId]
        ),
        neonQuery<RoomMemberWithProfile>(
            `SELECT rm.room_id, rm.user_id, rm.role, rm.joined_at,
                    u.name AS display_name, NULL AS avatar_url
             FROM room_members rm
             JOIN users u ON u.id = rm.user_id
             WHERE rm.room_id = $1
             ORDER BY rm.joined_at ASC`,
            [roomId]
        ),
        getRoomBalances(roomId),
        neonQuery<SharedTransaction & { uploader_name: string }>(
            `SELECT st.*, COALESCE(u.name, 'Unknown') AS uploader_name
             FROM shared_transactions st
             LEFT JOIN users u ON u.id = st.uploaded_by
             WHERE st.room_id = $1
             ORDER BY st.transaction_date DESC, st.created_at DESC
             LIMIT 50`,
            [roomId]
        ),
        neonQuery<{ total_spent: string; tx_count: string }>(
            `SELECT
                COALESCE(SUM(total_amount), 0)::text AS total_spent,
                COUNT(*)::text AS tx_count
             FROM shared_transactions
             WHERE room_id = $1`,
            [roomId]
        ),
        neonQuery<{ total: string; count: string }>(
            `SELECT
                COALESCE(SUM(st.total_amount), 0)::text AS total,
                COUNT(*)::text AS count
             FROM shared_transactions st
             WHERE st.room_id = $1
               AND NOT EXISTS (
                   SELECT 1 FROM transaction_splits ts WHERE ts.shared_tx_id = st.id
               )`,
            [roomId]
        ),
        neonQuery<{ source_type: string; total: string; count: string }>(
            `SELECT
                COALESCE(metadata->>'source_type', 'manual') AS source_type,
                COALESCE(SUM(total_amount), 0)::text AS total,
                COUNT(*)::text AS count
             FROM shared_transactions
             WHERE room_id = $1
             GROUP BY COALESCE(metadata->>'source_type', 'manual')`,
            [roomId]
        ),
    ])

    // Enrich recent transactions with splits and items
    const txIds = recentTransactions.map(t => t.id)
    const [txSplits, txItems] = txIds.length > 0 ? await Promise.all([
        neonQuery<{ shared_tx_id: string; user_id: string; amount: number; item_id: string | null; display_name: string }>(
            `SELECT ts.shared_tx_id, ts.user_id, ts.amount, ts.item_id, u.name AS display_name
             FROM transaction_splits ts
             LEFT JOIN users u ON u.id = ts.user_id
             WHERE ts.shared_tx_id = ANY($1::text[])`,
            [txIds]
        ),
        neonQuery<{ id: string; shared_tx_id: string; name: string; amount: number; quantity: number; category: string | null }>(
            `SELECT id, shared_tx_id, name, amount, quantity, category
             FROM receipt_items
             WHERE shared_tx_id = ANY($1::text[])`,
            [txIds]
        ),
    ]) : [[], []]

    const splitsByTx = txSplits.reduce<Record<string, typeof txSplits>>((acc, s) => {
        ;(acc[s.shared_tx_id] ??= []).push(s)
        return acc
    }, {})
    const itemsByTx = txItems.reduce<Record<string, typeof txItems>>((acc, i) => {
        ;(acc[i.shared_tx_id] ??= []).push(i)
        return acc
    }, {})

    const enrichedTransactions = recentTransactions.map(tx => {
        const splits = splitsByTx[tx.id] ?? []
        const items = itemsByTx[tx.id] ?? []
        const source_type = (tx.metadata as any)?.source_type ?? 'manual'
        return { ...tx, splits, items, is_attributed: splits.length > 0, source_type }
    })

    // Enrich members with Clerk profile images
    const memberUserIds = members.map(m => m.user_id)
    let imageMap = new Map<string, string>()
    if (memberUserIds.length > 0) {
        try {
            const { clerkClient } = await import('@clerk/nextjs/server')
            const client = await clerkClient()
            const result = await client.users.getUserList({ userId: memberUserIds, limit: 100 })
            imageMap = new Map(result.data.map(u => [u.id, u.imageUrl]))
        } catch {
            // best-effort — fall back to null avatars
        }
    }
    const enrichedMembers = members.map(m => ({
        ...m,
        avatar_url: imageMap.get(m.user_id) ?? null,
    }))

    // Build source breakdown from query results
    const sourceBreakdown: SourceBreakdown = {
        personal_import: { total: 0, count: 0 },
        receipt: { total: 0, count: 0 },
        statement: { total: 0, count: 0 },
        manual: { total: 0, count: 0 },
    }
    for (const row of sourceRows) {
        const key = row.source_type as keyof SourceBreakdown
        if (key in sourceBreakdown) {
            sourceBreakdown[key] = {
                total: parseFloat(row.total),
                count: parseInt(row.count, 10),
            }
        }
    }

    return {
        room: roomRows[0],
        members: enrichedMembers,
        balances,
        recentTransactions: enrichedTransactions,
        totalSpent: parseFloat(stats[0]?.total_spent ?? '0'),
        transactionCount: parseInt(stats[0]?.tx_count ?? '0', 10),
        unattributedTotal: parseFloat(unattributedRows[0]?.total ?? '0'),
        unattributedCount: parseInt(unattributedRows[0]?.count ?? '0', 10),
        sourceBreakdown,
    }
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            )
        }

        const cacheKey = buildCacheKey('room', roomId, 'all', 'bundle')

        const data = await getCachedOrCompute<RoomBundleSummary>(
            cacheKey,
            () => getRoomBundle(roomId),
            ROOM_BUNDLE_TTL
        )

        return NextResponse.json(data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'private, no-store',
            },
        })
    } catch (error: any) {
        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { error: 'Failed to fetch room bundle' },
            { status: 500 }
        )
    }
}
