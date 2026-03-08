import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getCurrentUserId } from '@/lib/auth'
import { neonQuery } from '@/lib/neonClient'
import { verifyRoomMember } from '@/lib/rooms/permissions'
import { getRoomBalances } from '@/lib/rooms/balances'
import { getCachedOrCompute, buildCacheKey } from '@/lib/cache/upstash'
import type { Room, RoomMemberWithProfile, SharedTransaction, RoomBalance } from '@/lib/types/rooms'

interface RoomBundleSummary {
    room: Room
    members: RoomMemberWithProfile[]
    balances: RoomBalance[]
    recentTransactions: (SharedTransaction & { uploader_name: string })[]
    totalSpent: number
    transactionCount: number
}

const ROOM_BUNDLE_TTL = 2 * 60 // 2 minutes

async function getRoomBundle(roomId: string): Promise<RoomBundleSummary> {
    const [roomRows, members, balances, recentTransactions, stats] = await Promise.all([
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
            `SELECT st.*, u.name AS uploader_name
             FROM shared_transactions st
             JOIN users u ON u.id = st.uploaded_by
             WHERE st.room_id = $1
             ORDER BY st.transaction_date DESC, st.created_at DESC
             LIMIT 20`,
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
    ])

    // Enrich members with Clerk profile images
    const memberUserIds = members.map(m => m.user_id)
    let imageMap = new Map<string, string>()
    if (memberUserIds.length > 0) {
        try {
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

    return {
        room: roomRows[0],
        members: enrichedMembers,
        balances,
        recentTransactions,
        totalSpent: parseFloat(stats[0]?.total_spent ?? '0'),
        transactionCount: parseInt(stats[0]?.tx_count ?? '0', 10),
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
