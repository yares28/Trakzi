import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonInsert, neonQuery } from "@/lib/neonClient"
import { ensureReceiptCategoryTypes } from "@/lib/receipts/receipt-categories-db"

type ReceiptCategoryTypeRow = {
  id: number
  name: string
  color: string | null
}

type ReceiptCategoryTypeStatsRow = ReceiptCategoryTypeRow & {
  created_at: string | Date
  category_count: string | number
  transaction_count: string | number
  total_spend: string | number
}

const TYPE_COLORS = ["#ef4444", "#f59e0b", "#eab308", "#10b981", "#3b82f6", "#6366f1"]

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const normalized = value.replace(",", ".")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function toIsoTimestamp(value: string | Date): string {
  if (typeof value === "string") return new Date(value).toISOString()
  return value.toISOString()
}

export const GET = async () => {
  try {
    const userId = await getCurrentUserId()

    await ensureReceiptCategoryTypes(userId)

    const rows = await neonQuery<ReceiptCategoryTypeStatsRow>(
      `
        SELECT
          rct.id,
          rct.name,
          rct.color,
          rct.created_at,
          COALESCE(cat.category_count, 0) as category_count,
          COALESCE(tx.transaction_count, 0) as transaction_count,
          COALESCE(tx.total_spend, 0) as total_spend
        FROM receipt_category_types rct
        LEFT JOIN (
          SELECT type_id, COUNT(*) as category_count
          FROM receipt_categories
          WHERE user_id = $1
          GROUP BY type_id
        ) cat ON cat.type_id = rct.id
        LEFT JOIN (
          SELECT category_type_id, COUNT(*) as transaction_count, COALESCE(SUM(total_price), 0) as total_spend
          FROM receipt_transactions
          WHERE user_id = $1
          GROUP BY category_type_id
        ) tx ON tx.category_type_id = rct.id
        WHERE rct.user_id = $1
        ORDER BY rct.name ASC
      `,
      [userId]
    )

    const payload = rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: toIsoTimestamp(row.created_at),
      categoryCount: toNumber(row.category_count),
      transactionCount: toNumber(row.transaction_count),
      totalSpend: toNumber(row.total_spend),
    }))

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to access receipt types." }, { status: 401 })
    }

    console.error("[Receipt Category Types API] Error:", error)
    return NextResponse.json({ error: "Failed to load receipt category types" }, { status: 500 })
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))

    const rawName = typeof body?.name === "string" ? body.name : ""
    const normalizedName = normalizeName(rawName)

    if (!normalizedName) {
      return NextResponse.json({ error: "Type name is required" }, { status: 400 })
    }

    const color =
      typeof body?.color === "string" && body.color.trim().length > 0
        ? body.color.trim()
        : TYPE_COLORS[Math.floor(Math.random() * TYPE_COLORS.length)]

    const [inserted] = await neonInsert<{
      id?: number
      user_id: string
      name: string
      color: string | null
    }>("receipt_category_types", {
      user_id: userId,
      name: normalizedName,
      color,
    }) as ReceiptCategoryTypeRow[]

    return NextResponse.json(inserted, { status: 201 })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to create receipt types." }, { status: 401 })
    }
    if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "Type already exists" }, { status: 409 })
    }

    console.error("[Receipt Category Types API] POST error:", error)
    return NextResponse.json({ error: "Failed to create receipt category type" }, { status: 500 })
  }
}

export const DELETE = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))

    const id = Number(body?.id)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid type id" }, { status: 400 })
    }

    const existing = await neonQuery<{ id: number; name: string }>(
      `SELECT id, name FROM receipt_category_types WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId]
    )
    if (existing.length === 0) {
      return NextResponse.json({ error: "Type not found" }, { status: 404 })
    }

    await neonQuery(`DELETE FROM receipt_category_types WHERE id = $1 AND user_id = $2`, [id, userId])

    return NextResponse.json(
      { success: true, message: `Deleted "${existing[0].name}"` },
      { status: 200 }
    )
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to delete receipt types." }, { status: 401 })
    }
    if (message.toLowerCase().includes("foreign key")) {
      return NextResponse.json(
        { error: "Cannot delete a type that is used by receipt items." },
        { status: 409 }
      )
    }

    console.error("[Receipt Category Types API] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete receipt category type" }, { status: 500 })
  }
}
