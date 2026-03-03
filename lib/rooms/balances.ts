// lib/rooms/balances.ts
// Balance calculation engine for rooms and friendships.
//
// Core concept: the "payer" of a shared transaction is owed by everyone else.
// Each split row records how much a user owes on that transaction.
// The payer's own split is what they "paid for themselves" (not owed).
//
// Net balance between two users =
//   SUM(what they owe me on my transactions) - SUM(what I owe them on their transactions)

import { neonQuery } from '@/lib/neonClient'
import type { RoomBalance } from '@/lib/types/rooms'

/**
 * Calculate per-member balances within a room.
 * Returns each member's net position (positive = others owe them).
 */
export async function getRoomBalances(roomId: string): Promise<RoomBalance[]> {
    const rows = await neonQuery<RoomBalance>(
        `WITH member_paid AS (
            -- Total each member paid (uploaded transactions)
            SELECT
                st.uploaded_by AS user_id,
                COALESCE(SUM(st.total_amount), 0) AS total_paid
            FROM shared_transactions st
            WHERE st.room_id = $1
            GROUP BY st.uploaded_by
        ),
        member_owes AS (
            -- Total each member owes across all splits (pending only)
            SELECT
                ts.user_id,
                COALESCE(SUM(ts.amount), 0) AS total_owed
            FROM transaction_splits ts
            JOIN shared_transactions st ON st.id = ts.shared_tx_id
            WHERE st.room_id = $1 AND ts.status = 'pending'
            GROUP BY ts.user_id
        )
        SELECT
            rm.user_id,
            u.name AS display_name,
            COALESCE(mp.total_paid, 0) - COALESCE(mo.total_owed, 0) AS net_balance,
            COALESCE(mp.total_paid, 0) AS total_paid,
            COALESCE(mo.total_owed, 0) AS total_owed
        FROM room_members rm
        JOIN users u ON u.id = rm.user_id
        LEFT JOIN member_paid mp ON mp.user_id = rm.user_id
        LEFT JOIN member_owes mo ON mo.user_id = rm.user_id
        WHERE rm.room_id = $1
        ORDER BY net_balance DESC`,
        [roomId]
    )
    return rows
}

/**
 * Calculate net balance between the current user and a specific friend.
 * Considers both room-based and direct (quick split) transactions.
 * Positive = friend owes you, negative = you owe friend.
 */
export async function getFriendshipBalance(
    userId: string,
    friendUserId: string,
    friendshipId: string
): Promise<{ net_balance: number; currency: string }> {
    // Only count direct friendship splits — room splits are tracked separately
    // via getRoomBalances(). Including room splits here would double-count.
    const theyOweMe = await neonQuery<{ total: string }>(
        `SELECT COALESCE(SUM(ts.amount), 0)::text AS total
         FROM transaction_splits ts
         JOIN shared_transactions st ON st.id = ts.shared_tx_id
         WHERE st.uploaded_by = $1
           AND ts.user_id = $2
           AND ts.status = 'pending'
           AND st.friendship_id = $3`,
        [userId, friendUserId, friendshipId]
    )

    const iOweThem = await neonQuery<{ total: string }>(
        `SELECT COALESCE(SUM(ts.amount), 0)::text AS total
         FROM transaction_splits ts
         JOIN shared_transactions st ON st.id = ts.shared_tx_id
         WHERE st.uploaded_by = $1
           AND ts.user_id = $2
           AND ts.status = 'pending'
           AND st.friendship_id = $3`,
        [friendUserId, userId, friendshipId]
    )

    const net = parseFloat(theyOweMe[0]?.total ?? '0') - parseFloat(iOweThem[0]?.total ?? '0')

    return { net_balance: net, currency: 'EUR' }
}

/**
 * Get aggregate balances across ALL friendships and rooms for a user.
 * Used for the net balance summary cards on the Friends tab.
 */
export async function getAggregateBalances(userId: string): Promise<{
    totalOwedToYou: number
    totalYouOwe: number
}> {
    // All pending splits where I am the payer (others owe me)
    const owedToMe = await neonQuery<{ total: string }>(
        `SELECT COALESCE(SUM(ts.amount), 0)::text AS total
         FROM transaction_splits ts
         JOIN shared_transactions st ON st.id = ts.shared_tx_id
         WHERE st.uploaded_by = $1
           AND ts.user_id != $1
           AND ts.status = 'pending'`,
        [userId]
    )

    // All pending splits where I am the debtor (I owe others)
    const iOwe = await neonQuery<{ total: string }>(
        `SELECT COALESCE(SUM(ts.amount), 0)::text AS total
         FROM transaction_splits ts
         JOIN shared_transactions st ON st.id = ts.shared_tx_id
         WHERE ts.user_id = $1
           AND st.uploaded_by != $1
           AND ts.status = 'pending'`,
        [userId]
    )

    return {
        totalOwedToYou: parseFloat(owedToMe[0]?.total ?? '0'),
        totalYouOwe: parseFloat(iOwe[0]?.total ?? '0'),
    }
}
