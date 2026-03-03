import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"
import { checkQuickSplitLimit } from "@/lib/friends/limits"
import type { SharedTransaction, TransactionSplitWithProfile } from "@/lib/types/rooms"

const QuickSplitSchema = z.object({
    total_amount: z.number().positive("Amount must be positive"),
    description: z.string().min(1, "Description is required").max(500),
    category: z.string().max(100).optional(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
    /** How much the OTHER person owes. If omitted, splits 50/50. */
    friend_amount: z.number().positive().optional(),
})

// POST /api/friends/[friendshipId]/splits — Create a 1:1 quick split
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ friendshipId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { friendshipId } = await params

        // Verify friendship exists and is accepted
        const friendship = await neonQuery<{
            id: string
            requester_id: string
            addressee_id: string
            status: string
        }>(
            `SELECT id, requester_id, addressee_id, status FROM friendships
             WHERE id = $1
               AND (requester_id = $2 OR addressee_id = $2)`,
            [friendshipId, userId]
        )

        if (friendship.length === 0) {
            return NextResponse.json(
                { success: false, error: "Friendship not found" },
                { status: 404 }
            )
        }
        if (friendship[0].status !== "accepted") {
            return NextResponse.json(
                { success: false, error: "This friendship is not active" },
                { status: 403 }
            )
        }

        const friendUserId = friendship[0].requester_id === userId
            ? friendship[0].addressee_id
            : friendship[0].requester_id

        // Check monthly quick split limit
        const splitLimit = await checkQuickSplitLimit(userId)
        if (!splitLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Monthly quick split limit reached (${splitLimit.current}/${splitLimit.max}). Upgrade your plan for more.`,
                },
                { status: 403 }
            )
        }

        const body = await req.json()
        const data = QuickSplitSchema.parse(body)

        // Calculate split amounts
        const friendAmount = data.friend_amount ?? Math.round((data.total_amount / 2) * 100) / 100
        const myAmount = Math.round((data.total_amount - friendAmount) * 100) / 100

        if (friendAmount > data.total_amount) {
            return NextResponse.json(
                { success: false, error: "Friend's amount cannot exceed total" },
                { status: 400 }
            )
        }

        // Create shared transaction linked to friendship
        const txRows = await neonInsert<Record<string, unknown>>("shared_transactions", {
            friendship_id: friendshipId,
            uploaded_by: userId,
            total_amount: data.total_amount,
            currency: data.currency,
            description: data.description,
            category: data.category ?? null,
            transaction_date: data.transaction_date,
            split_type: "custom",
        })

        const txId = (txRows[0] as any)?.id
        if (!txId) {
            return NextResponse.json(
                { success: false, error: "Failed to create split" },
                { status: 500 }
            )
        }

        // Create split rows — payer's split is auto-settled
        await neonInsert("transaction_splits", {
            shared_tx_id: txId,
            user_id: userId,
            amount: myAmount,
            status: "settled",
            settled_at: new Date().toISOString(),
        })

        await neonInsert("transaction_splits", {
            shared_tx_id: txId,
            user_id: friendUserId,
            amount: friendAmount,
            status: "pending",
        })

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: txId,
                    friend_owes: friendAmount,
                    you_paid: myAmount,
                },
            },
            { status: 201 }
        )
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { success: false, error: error.errors?.[0]?.message ?? "Invalid split data" },
                { status: 400 }
            )
        }
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to create quick split" },
            { status: 500 }
        )
    }
}

// GET /api/friends/[friendshipId]/splits — Get split history with a friend
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ friendshipId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { friendshipId } = await params

        // Verify friendship
        const friendship = await neonQuery<{ id: string }>(
            `SELECT id FROM friendships
             WHERE id = $1
               AND (requester_id = $2 OR addressee_id = $2)
               AND status = 'accepted'`,
            [friendshipId, userId]
        )

        if (friendship.length === 0) {
            return NextResponse.json(
                { success: false, error: "Friendship not found" },
                { status: 404 }
            )
        }

        const { searchParams } = new URL(req.url)
        const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10)
        const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10)
        const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 50 : rawLimit, 100))
        const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

        const transactions = await neonQuery<SharedTransaction & { uploader_name: string }>(
            `SELECT st.*, u.name AS uploader_name
             FROM shared_transactions st
             JOIN users u ON u.id = st.uploaded_by
             WHERE st.friendship_id = $1
             ORDER BY st.transaction_date DESC, st.created_at DESC
             LIMIT $2 OFFSET $3`,
            [friendshipId, limit, offset]
        )

        return NextResponse.json({
            success: true,
            data: transactions,
        })
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            )
        }
        return NextResponse.json(
            { success: false, error: "Failed to fetch split history" },
            { status: 500 }
        )
    }
}
