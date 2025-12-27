import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonInsert, neonQuery } from "@/lib/neonClient"
import {
  ensureReceiptCategories,
  normalizeReceiptCategoryName,
} from "@/lib/receipts/receipt-categories-db"

type ReceiptCategoryRow = {
  id: number
  name: string
  color: string | null
  type_id: number
  broad_type: string | null
  type_name: string
  type_color: string | null
}

type ReceiptCategoryStatsRow = ReceiptCategoryRow & {
  created_at: string | Date
  transaction_count: string | number
  total_spend: string | number
}

const CATEGORY_COLORS = [
  "#f97316",
  "#6366f1",
  "#10b981",
  "#ec4899",
  "#0ea5e9",
  "#facc15",
  "#14b8a6",
  "#8b5cf6",
  "#f43f5e",
]

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

    await ensureReceiptCategories(userId)
    const rows = await neonQuery<ReceiptCategoryStatsRow>(
      `
        SELECT
          rc.id,
          rc.name,
          rc.color,
          rc.type_id,
          rc.broad_type,
          rct.name as type_name,
          rct.color as type_color,
          rc.created_at,
          COUNT(rt.id) as transaction_count,
          COALESCE(SUM(rt.total_price), 0) as total_spend
        FROM receipt_categories rc
        INNER JOIN receipt_category_types rct ON rc.type_id = rct.id
        LEFT JOIN receipt_transactions rt
          ON rt.category_id = rc.id
          AND rt.user_id = $1
        WHERE rc.user_id = $1
        GROUP BY
          rc.id,
          rc.name,
          rc.color,
          rc.type_id,
          rct.name,
          rct.color,
          rc.created_at
        ORDER BY rct.name ASC, rc.name ASC
      `,
      [userId]
    )

    const payload = rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      typeId: row.type_id,
      typeName: row.type_name,
      typeColor: row.type_color,
      broadType: row.broad_type,
      createdAt: toIsoTimestamp(row.created_at),
      transactionCount: toNumber(row.transaction_count),
      totalSpend: toNumber(row.total_spend),
    }))

    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to access receipt categories." }, { status: 401 })
    }

    console.error("[Receipt Categories API] Error:", error)
    return NextResponse.json({ error: "Failed to load receipt categories" }, { status: 500 })
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()

    // Check category limit before creating
    const { canCreateCategory } = await import("@/lib/limits/category-cap")
    const limitCheck = await canCreateCategory(userId, 'receipt')

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.message || "Receipt category limit reached",
          code: 'CATEGORY_LIMIT_EXCEEDED',
          capacity: limitCheck.capacity,
          plan: limitCheck.capacity.plan,
        },
        { status: 403 }
      )
    }

    await ensureReceiptCategories(userId)
    const body = await req.json().catch(() => ({}))

    const rawName = typeof body?.name === "string" ? body.name : ""
    const normalizedName = normalizeReceiptCategoryName(rawName)

    if (!normalizedName) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const rawTypeId = body?.typeId ?? body?.type_id
    const typeId = Number(rawTypeId)
    if (!Number.isFinite(typeId)) {
      return NextResponse.json({ error: "typeId is required" }, { status: 400 })
    }

    const broadType =
      typeof body?.broadType === "string" && body.broadType.trim().length > 0
        ? body.broadType.trim()
        : typeof body?.broad_type === "string" && body.broad_type.trim().length > 0
          ? body.broad_type.trim()
          : "Other"

    const typeCheck = await neonQuery<{ id: number }>(
      `SELECT id FROM receipt_category_types WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [typeId, userId]
    )
    if (typeCheck.length === 0) {
      return NextResponse.json({ error: "Invalid typeId" }, { status: 400 })
    }

    const color =
      typeof body?.color === "string" && body.color.trim().length > 0
        ? body.color.trim()
        : CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]

    const [inserted] = await neonInsert<{
      id?: number
      user_id: string
      type_id: number
      name: string
      color: string | null
      broad_type: string | null
    }>("receipt_categories", {
      user_id: userId,
      type_id: typeId,
      name: normalizedName,
      color,
      broad_type: broadType,
    }) as Array<{
      id: number
      user_id: string
      type_id: number
      name: string
      color: string | null
      broad_type: string | null
    }>

    const joined = await neonQuery<ReceiptCategoryRow>(
      `
        SELECT
          rc.id,
          rc.name,
          rc.color,
          rc.type_id,
          rc.broad_type,
          rct.name as type_name,
          rct.color as type_color
        FROM receipt_categories rc
        INNER JOIN receipt_category_types rct ON rc.type_id = rct.id
        WHERE rc.id = $1 AND rc.user_id = $2
        LIMIT 1
      `,
      [inserted.id, userId]
    )

    return NextResponse.json(joined[0] ?? inserted, { status: 201 })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to create receipt categories." }, { status: 401 })
    }
    if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 })
    }

    console.error("[Receipt Categories API] POST error:", error)
    return NextResponse.json({ error: "Failed to create receipt category" }, { status: 500 })
  }
}

export const DELETE = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))

    const id = Number(body?.id)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid category id" }, { status: 400 })
    }

    const existing = await neonQuery<{ id: number; name: string }>(
      `SELECT id, name FROM receipt_categories WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId]
    )
    if (existing.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    await neonQuery(`DELETE FROM receipt_categories WHERE id = $1 AND user_id = $2`, [id, userId])

    return NextResponse.json({ success: true, message: `Deleted "${existing[0].name}"` }, { status: 200 })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to delete receipt categories." }, { status: 401 })
    }

    console.error("[Receipt Categories API] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete receipt category" }, { status: 500 })
  }
}
