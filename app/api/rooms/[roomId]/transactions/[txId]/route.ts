import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { verifyRoomMember, verifyRoomAdmin } from "@/lib/rooms/permissions"
import { invalidateRoomCache } from "@/lib/cache/upstash"
import type { SharedTransaction, TransactionSplitWithProfile } from "@/lib/types/rooms"

// GET /api/rooms/[roomId]/transactions/[txId] — Transaction detail with splits
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ roomId: string; txId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId, txId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json(
                { success: false, error: "Room not found" },
                { status: 404 }
            )
        }

        const txRows = await neonQuery<SharedTransaction & { uploader_name: string }>(
            `SELECT st.*, u.name AS uploader_name
             FROM shared_transactions st
             JOIN users u ON u.id = st.uploaded_by
             WHERE st.id = $1 AND st.room_id = $2`,
            [txId, roomId]
        )

        if (txRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Transaction not found" },
                { status: 404 }
            )
        }

        // Get splits with user profiles
        const splits = await neonQuery<TransactionSplitWithProfile>(
            `SELECT
                ts.*,
                u.name AS display_name,
                NULL AS avatar_url
             FROM transaction_splits ts
             JOIN users u ON u.id = ts.user_id
             WHERE ts.shared_tx_id = $1
             ORDER BY ts.amount DESC`,
            [txId]
        )

        return NextResponse.json({
            success: true,
            data: { ...txRows[0], splits },
        })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch transaction" },
            { status: 500 }
        )
    }
}

// DELETE /api/rooms/[roomId]/transactions/[txId] — Delete (uploader or admin)
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ roomId: string; txId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId, txId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json(
                { success: false, error: "Room not found" },
                { status: 404 }
            )
        }

        // Check the transaction exists and belongs to this room
        const txRows = await neonQuery<{ uploaded_by: string }>(
            `SELECT uploaded_by FROM shared_transactions WHERE id = $1 AND room_id = $2`,
            [txId, roomId]
        )

        if (txRows.length === 0) {
            return NextResponse.json(
                { success: false, error: "Transaction not found" },
                { status: 404 }
            )
        }

        // Only the uploader or a room admin/owner can delete
        const isUploader = txRows[0].uploaded_by === userId
        const isAdmin = await verifyRoomAdmin(roomId, userId)

        if (!isUploader && !isAdmin) {
            return NextResponse.json(
                { success: false, error: "Only the uploader or a room admin can delete this transaction" },
                { status: 403 }
            )
        }

        // CASCADE will delete related splits and receipt_items
        await neonQuery(
            `DELETE FROM shared_transactions WHERE id = $1`,
            [txId]
        )

        // Invalidate room bundle cache after deletion
        await invalidateRoomCache(roomId)

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to delete transaction" },
            { status: 500 }
        )
    }
}
