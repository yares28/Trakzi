import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import type { FriendWithBalance } from "@/lib/types/friends"

// GET /api/friends — List accepted friends with net balance
export async function GET() {
    try {
        const userId = await getCurrentUserId()

        const friends = await neonQuery<FriendWithBalance>(
            `SELECT
                f.id AS friendship_id,
                CASE
                    WHEN f.requester_id = $1 THEN f.addressee_id
                    ELSE f.requester_id
                END AS user_id,
                u.name AS display_name,
                NULL AS avatar_url,
                COALESCE(balances.net, 0) AS net_balance,
                'EUR' AS currency,
                f.updated_at AS last_active_at
             FROM friendships f
             JOIN users u ON u.id = CASE
                 WHEN f.requester_id = $1 THEN f.addressee_id
                 ELSE f.requester_id
             END
             LEFT JOIN LATERAL (
                 SELECT COALESCE(SUM(
                     CASE WHEN ts.user_id = $1 THEN -ts.amount ELSE ts.amount END
                 ), 0) AS net
                 FROM transaction_splits ts
                 JOIN shared_transactions st ON st.id = ts.shared_tx_id
                 WHERE st.friendship_id = f.id
                   AND ts.status = 'pending'
             ) balances ON true
             WHERE f.status = 'accepted'
               AND (f.requester_id = $1 OR f.addressee_id = $1)
             ORDER BY u.name ASC`,
            [userId]
        )

        return NextResponse.json({ success: true, data: friends })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch friends list" },
            { status: 500 }
        )
    }
}
