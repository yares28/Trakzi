import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { invalidateRoomCache } from "@/lib/cache/upstash"

// PATCH /api/splits/[splitId]/settle — Mark a split as settled
export async function PATCH(
    _req: NextRequest,
    { params }: { params: Promise<{ splitId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { splitId } = await params

        // Find the split and verify the current user is part of the transaction context
        // Join through room_members or friendship to enforce data isolation
        const rows = await neonQuery<{
            id: string
            user_id: string
            status: string
            uploaded_by: string
            room_id: string | null
            friendship_id: string | null
        }>(
            `SELECT ts.id, ts.user_id, ts.status, st.uploaded_by,
                    st.room_id, st.friendship_id
             FROM transaction_splits ts
             JOIN shared_transactions st ON st.id = ts.shared_tx_id
             WHERE ts.id = $1
               AND (
                   -- User is in the room
                   (st.room_id IS NOT NULL AND EXISTS (
                       SELECT 1 FROM room_members rm
                       WHERE rm.room_id = st.room_id AND rm.user_id = $2
                   ))
                   OR
                   -- User is part of the friendship
                   (st.friendship_id IS NOT NULL AND EXISTS (
                       SELECT 1 FROM friendships f
                       WHERE f.id = st.friendship_id
                         AND (f.requester_id = $2 OR f.addressee_id = $2)
                   ))
               )`,
            [splitId, userId]
        )

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Split not found" },
                { status: 404 }
            )
        }

        const split = rows[0]

        // Only the payer (uploader) or the debtor can settle
        if (split.uploaded_by !== userId && split.user_id !== userId) {
            return NextResponse.json(
                { success: false, error: "You are not authorized to settle this split" },
                { status: 403 }
            )
        }

        if (split.status === "settled") {
            return NextResponse.json(
                { success: false, error: "This split is already settled" },
                { status: 409 }
            )
        }

        await neonQuery(
            `UPDATE transaction_splits
             SET status = 'settled', settled_at = NOW()
             WHERE id = $1`,
            [splitId]
        )

        // Invalidate room cache if this split belongs to a room transaction
        if (split.room_id) {
            await invalidateRoomCache(split.room_id)
        }

        return NextResponse.json({
            success: true,
            data: { split_id: splitId, status: "settled" },
        })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to settle split" },
            { status: 500 }
        )
    }
}
