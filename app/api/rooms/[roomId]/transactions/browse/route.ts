import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { verifyRoomMember } from "@/lib/rooms/permissions"

// GET /api/rooms/[roomId]/transactions/browse
// Returns the current user's personal transactions for import selection.
// Query params:
//   search=grocery        — description ILIKE match
//   from=2026-01-01       — date range start (inclusive)
//   to=2026-03-09         — date range end (inclusive)
//   categories=Food,Rent  — comma-separated category names
//   min_amount=10         — minimum absolute amount
//   max_amount=500        — maximum absolute amount
//   limit=50&offset=0
//   include_categories=1  — also return available categories in meta
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
        const search = searchParams.get("search")?.trim() ?? ""
        const from = searchParams.get("from") ?? null
        const to = searchParams.get("to") ?? null
        const categoriesParam = searchParams.get("categories")?.trim() ?? ""
        const selectedCategories = categoriesParam
            ? categoriesParam.split(",").map(s => s.trim()).filter(Boolean)
            : []
        const rawMinAmount = searchParams.get("min_amount")
        const rawMaxAmount = searchParams.get("max_amount")
        const minAmount = rawMinAmount != null && rawMinAmount !== "" ? parseFloat(rawMinAmount) : null
        const maxAmount = rawMaxAmount != null && rawMaxAmount !== "" ? parseFloat(rawMaxAmount) : null
        const includeCategories = searchParams.get("include_categories") === "1"

        const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10)
        const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10)
        const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 50 : rawLimit, 100))
        const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

        // Build dynamic WHERE conditions
        const conditions: string[] = ["t.user_id = $1"]
        const queryParams: unknown[] = [userId]
        let paramIdx = 2

        if (search) {
            conditions.push(`t.description ILIKE $${paramIdx}`)
            queryParams.push(`%${search}%`)
            paramIdx++
        }
        if (from) {
            conditions.push(`t.date >= $${paramIdx}`)
            queryParams.push(from)
            paramIdx++
        }
        if (to) {
            conditions.push(`t.date <= $${paramIdx}`)
            queryParams.push(to)
            paramIdx++
        }
        if (selectedCategories.length > 0) {
            conditions.push(`c.name = ANY($${paramIdx}::text[])`)
            queryParams.push(selectedCategories)
            paramIdx++
        }
        if (minAmount !== null && !isNaN(minAmount)) {
            conditions.push(`ABS(t.amount) >= $${paramIdx}`)
            queryParams.push(minAmount)
            paramIdx++
        }
        if (maxAmount !== null && !isNaN(maxAmount)) {
            conditions.push(`ABS(t.amount) <= $${paramIdx}`)
            queryParams.push(maxAmount)
            paramIdx++
        }

        const whereClause = conditions.join(" AND ")

        const queries: [Promise<any[]>, Promise<any[]>, Promise<any[]>?] = [
            neonQuery<{
                id: number
                date: string
                description: string
                amount: number
                category_name: string | null
                already_in_room: boolean
            }>(
                `SELECT
                    t.id,
                    t.date,
                    t.description,
                    t.amount,
                    c.name AS category_name,
                    EXISTS (
                        SELECT 1 FROM shared_transactions st
                        WHERE st.room_id = $${paramIdx}
                          AND st.original_tx_id = t.id
                    ) AS already_in_room
                 FROM transactions t
                 LEFT JOIN categories c ON c.id = t.category_id
                 WHERE ${whereClause}
                 ORDER BY t.date DESC, t.created_at DESC
                 LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
                [...queryParams, roomId, limit, offset]
            ),
            neonQuery<{ count: string }>(
                `SELECT COUNT(*)::text AS count
                 FROM transactions t
                 LEFT JOIN categories c ON c.id = t.category_id
                 WHERE ${whereClause}`,
                queryParams
            ),
        ]

        // Fetch distinct categories for this user (for filter options)
        const categoriesPromise = includeCategories
            ? neonQuery<{ name: string }>(
                `SELECT DISTINCT c.name
                 FROM transactions t
                 JOIN categories c ON c.id = t.category_id
                 WHERE t.user_id = $1
                 ORDER BY c.name ASC`,
                [userId]
            )
            : Promise.resolve([])

        const [rows, countRows, categoryRows] = await Promise.all([
            queries[0],
            queries[1],
            categoriesPromise,
        ])

        return NextResponse.json({
            success: true,
            data: rows,
            meta: {
                total: parseInt((countRows[0] as any)?.count ?? "0", 10),
                limit,
                offset,
                ...(includeCategories && {
                    availableCategories: (categoryRows as { name: string }[]).map(r => r.name),
                }),
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
            { success: false, error: "Failed to browse transactions" },
            { status: 500 }
        )
    }
}
