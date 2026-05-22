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
    // Balance is calculated purely from splits to avoid inflating balances
    // with unattributed transactions.
    //
    // others_owe_me = sum of non-payer splits on transactions I uploaded
    //                 (i.e. how much others owe me for expenses I fronted)
    //
    // i_owe_others  = sum of my splits on transactions others uploaded
    //                 (i.e. how much I owe for expenses others fronted)
    //
    // net_balance   = others_owe_me - i_owe_others
    //   positive → others still owe you
    //   negative → you still owe others
    //
    // Payer's own split on their own transaction is excluded from both sides
    // so that A uploading $100 and splitting $50/$50 with B gives:
    //   A: net = +50 (B owes A)   B: net = -50 (B owes A)
    const rows = await neonQuery<RoomBalance>(
        `WITH others_owe_me AS (
            SELECT
                st.uploaded_by AS user_id,
                COALESCE(SUM(ts.amount), 0) AS amount
            FROM transaction_splits ts
            JOIN shared_transactions st ON st.id = ts.shared_tx_id
            WHERE st.room_id = $1
              AND ts.status = 'pending'
              AND ts.user_id != st.uploaded_by
            GROUP BY st.uploaded_by
        ),
        i_owe_others AS (
            SELECT
                ts.user_id,
                COALESCE(SUM(ts.amount), 0) AS amount
            FROM transaction_splits ts
            JOIN shared_transactions st ON st.id = ts.shared_tx_id
            WHERE st.room_id = $1
              AND ts.status = 'pending'
              AND ts.user_id != st.uploaded_by
            GROUP BY ts.user_id
        )
        SELECT
            rm.user_id,
            u.name AS display_name,
            COALESCE(oom.amount, 0) - COALESCE(ioo.amount, 0) AS net_balance,
            COALESCE(oom.amount, 0) AS total_paid,
            COALESCE(ioo.amount, 0) AS total_owed
        FROM room_members rm
        JOIN users u ON u.id = rm.user_id
        LEFT JOIN others_owe_me oom ON oom.user_id = rm.user_id
        LEFT JOIN i_owe_others ioo ON ioo.user_id = rm.user_id
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
