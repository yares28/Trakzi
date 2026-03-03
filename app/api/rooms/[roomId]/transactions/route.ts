import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { verifyRoomMember } from "@/lib/rooms/permissions"
import { validateSplits, type SplitInput } from "@/lib/rooms/split-validation"
import { checkSharedTxLimit } from "@/lib/friends/limits"
import { invalidateRoomCache } from "@/lib/cache/upstash"
import type { SplitType, SharedTransaction, TransactionSplitWithProfile } from "@/lib/types/rooms"

const SplitInputSchema = z.object({
    user_id: z.string().min(1),
    amount: z.number().optional(),
    percentage: z.number().min(0).max(100).optional(),
})

const CreateSharedTxSchema = z.object({
    total_amount: z.number().positive("Amount must be positive"),
    description: z.string().min(1, "Description is required").max(500),
    category: z.string().max(100).optional(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    split_type: z.enum(["equal", "percentage", "custom", "item_level"]).default("equal"),
    currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
    splits: z.array(SplitInputSchema).min(1, "At least one split required"),
})

// POST /api/rooms/[roomId]/transactions — Create a shared transaction with splits
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json(
                { success: false, error: "Room not found" },
                { status: 404 }
            )
        }

        // Check monthly shared tx limit
        const txLimit = await checkSharedTxLimit(userId)
        if (!txLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Monthly shared transaction limit reached (${txLimit.current}/${txLimit.max}). Upgrade your plan for more.`,
                },
                { status: 403 }
            )
        }

        const body = await req.json()
        const data = CreateSharedTxSchema.parse(body)

        // Get room member IDs for validation
        const members = await neonQuery<{ user_id: string }>(
            `SELECT user_id FROM room_members WHERE room_id = $1`,
            [roomId]
        )
        const memberIds = members.map(m => m.user_id)

        // Validate and compute splits
        const resolvedSplits = validateSplits(
            data.split_type as SplitType,
            data.total_amount,
            memberIds,
            data.splits as SplitInput[]
        )

        // Create shared transaction
        const txRows = await neonInsert<Record<string, unknown>>("shared_transactions", {
            room_id: roomId,
            uploaded_by: userId,
            total_amount: data.total_amount,
            currency: data.currency,
            description: data.description,
            category: data.category ?? null,
            transaction_date: data.transaction_date,
            split_type: data.split_type,
        })

        const txId = (txRows[0] as any)?.id
        if (!txId) {
            return NextResponse.json(
                { success: false, error: "Failed to create transaction" },
                { status: 500 }
            )
        }

        // Create split rows
        for (const split of resolvedSplits) {
            await neonInsert("transaction_splits", {
                shared_tx_id: txId,
                user_id: split.user_id,
                amount: split.amount,
                // The payer's own split is auto-settled (they paid for it)
                status: split.user_id === userId ? "settled" : "pending",
                settled_at: split.user_id === userId ? new Date().toISOString() : null,
            })
        }

        // Invalidate room bundle cache after mutation
        await invalidateRoomCache(roomId)

        return NextResponse.json(
            {
                success: true,
                data: { id: txId, split_count: resolvedSplits.length },
            },
            { status: 201 }
        )
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: error.errors?.[0]?.message ?? "Invalid transaction data" },
                { status: 400 }
            )
        }
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        // Split validation errors
        if (error.message?.includes("must sum") || error.message?.includes("not a member") || error.message?.includes("Duplicate")) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to create shared transaction" },
            { status: 500 }
        )
    }
}

// GET /api/rooms/[roomId]/transactions — List shared transactions (paginated)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json(
                { success: false, error: "Room not found" },
                { status: 404 }
            )
        }

        const { searchParams } = new URL(req.url)
        const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10)
        const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10)
        const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 50 : rawLimit, 100))
        const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

        const transactions = await neonQuery<SharedTransaction & { uploader_name: string }>(
            `SELECT
                st.*,
                u.name AS uploader_name
             FROM shared_transactions st
             JOIN users u ON u.id = st.uploaded_by
             WHERE st.room_id = $1
             ORDER BY st.transaction_date DESC, st.created_at DESC
             LIMIT $2 OFFSET $3`,
            [roomId, limit, offset]
        )

        // Get total count for pagination
        const countRows = await neonQuery<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM shared_transactions WHERE room_id = $1`,
            [roomId]
        )

        return NextResponse.json({
            success: true,
            data: transactions,
            meta: {
                total: parseInt(countRows[0]?.count ?? "0", 10),
                limit,
                offset,
            },
        })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch transactions" },
            { status: 500 }
        )
    }
}
