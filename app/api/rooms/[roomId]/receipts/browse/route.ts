import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { verifyRoomMember } from "@/lib/rooms/permissions"

// GET /api/rooms/[roomId]/receipts/browse
// Returns the user's personal receipts (with items) for import selection.
//
// Without ?receipt_id  — returns paginated list of receipts with item counts
// With    ?receipt_id  — returns the items for that specific receipt
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const userId = await getCurrentUserId()
        const { roomId } = await params

        const isMember = await verifyRoomMember(roomId, userId)
        if (!isMember) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 })
        }

        const { searchParams } = new URL(req.url)
        const receiptId = searchParams.get("receipt_id")

        // ── Return items for a specific receipt ───────────────────────────────
        if (receiptId) {
            const items = await neonQuery<{
                id: number
                description: string
                quantity: number
                total_price: number
                category_name: string | null
            }>(
                `SELECT
                    rt.id,
                    rt.description,
                    COALESCE(rt.quantity, 1)::numeric AS quantity,
                    rt.total_price,
                    rc.name AS category_name
                 FROM receipt_transactions rt
                 LEFT JOIN receipt_categories rc ON rc.id = rt.category_id
                 WHERE rt.receipt_id = $1
                   AND rt.user_id   = $2
                 ORDER BY rt.id ASC`,
                [receiptId, userId]
            )
            return NextResponse.json({ items })
        }

        // ── Return paginated receipt list ─────────────────────────────────────
        const search = searchParams.get("search")?.trim() ?? ""
        const rawLimit  = parseInt(searchParams.get("limit")  ?? "50", 10)
        const rawOffset = parseInt(searchParams.get("offset") ?? "0",  10)
        const limit  = Math.max(1, Math.min(isNaN(rawLimit)  ? 50 : rawLimit,  200))
        const offset = Math.max(0,              isNaN(rawOffset) ? 0  : rawOffset)

        const conditions: string[] = ["r.user_id = $1", "r.status = 'completed'"]
        const qParams: unknown[]   = [userId]
        let pi = 2

        if (search) {
            conditions.push(`r.store_name ILIKE $${pi}`)
            qParams.push(`%${search}%`)
            pi++
        }

        const where = conditions.join(" AND ")

        const [receipts, countRows] = await Promise.all([
            neonQuery<{
                id: string
                store_name: string | null
                receipt_date: string | null
                total_amount: number
                currency: string
                item_count: number
            }>(
                `SELECT
                    r.id,
                    r.store_name,
                    r.receipt_date::text AS receipt_date,
                    COALESCE(r.total_amount, 0)::numeric AS total_amount,
                    COALESCE(r.currency, 'EUR') AS currency,
                    COUNT(rt.id)::int AS item_count
                 FROM receipts r
                 LEFT JOIN receipt_transactions rt ON rt.receipt_id = r.id
                 WHERE ${where}
                 GROUP BY r.id
                 ORDER BY r.receipt_date DESC NULLS LAST, r.created_at DESC
                 LIMIT $${pi} OFFSET $${pi + 1}`,
                [...qParams, limit, offset]
            ),
            neonQuery<{ count: string }>(
                `SELECT COUNT(*)::text AS count
                 FROM receipts r
                 WHERE ${where}`,
                qParams
            ),
        ])

        return NextResponse.json({
            receipts,
            meta: {
                total: parseInt(countRows[0]?.count ?? "0", 10),
                limit,
                offset,
            },
        })
    } catch (err: any) {
        if (err.message?.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        console.error("[receipts/browse]", err)
        return NextResponse.json({ error: "Failed to browse receipts" }, { status: 500 })
    }
}
