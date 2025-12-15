import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { upsertReceiptItemCategoryPreferences } from "@/lib/receipts/item-category-preferences"

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

type ReceiptCategoryRow = {
  id: number
  name: string
  color: string | null
  type_id: number
  type_name: string
  type_color: string | null
}

async function getReceiptCategoryById(userId: string, categoryId: number): Promise<ReceiptCategoryRow | null> {
  const rows = await neonQuery<ReceiptCategoryRow>(
    `
      SELECT
        rc.id,
        rc.name,
        rc.color,
        rc.type_id,
        rct.name as type_name,
        rct.color as type_color
      FROM receipt_categories rc
      INNER JOIN receipt_category_types rct ON rc.type_id = rct.id
      WHERE rc.user_id = $1 AND rc.id = $2
      LIMIT 1
    `,
    [userId, categoryId]
  )
  return rows[0] ?? null
}

async function getReceiptCategoryByName(userId: string, name: string): Promise<ReceiptCategoryRow | null> {
  const rows = await neonQuery<ReceiptCategoryRow>(
    `
      SELECT
        rc.id,
        rc.name,
        rc.color,
        rc.type_id,
        rct.name as type_name,
        rct.color as type_color
      FROM receipt_categories rc
      INNER JOIN receipt_category_types rct ON rc.type_id = rct.id
      WHERE rc.user_id = $1 AND LOWER(rc.name) = LOWER($2)
      LIMIT 1
    `,
    [userId, name]
  )
  return rows[0] ?? null
}

export const PATCH = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = await getCurrentUserId()
    const { id } = await context.params
    const receiptTransactionId = Number.parseInt(id, 10)

    if (!Number.isFinite(receiptTransactionId)) {
      return NextResponse.json({ error: "Invalid receipt transaction id" }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const rawCategoryId = body?.categoryId
    const rawCategoryName = typeof body?.categoryName === "string" ? body.categoryName : null

    let nextCategoryId: number | null = null
    let category: ReceiptCategoryRow | null = null

    if (rawCategoryId === null) {
      nextCategoryId = null
    } else if (rawCategoryId !== undefined) {
      const parsed = Number(rawCategoryId)
      if (!Number.isFinite(parsed)) {
        return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 })
      }
      const found = await getReceiptCategoryById(userId, parsed)
      if (!found) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 })
      }
      category = found
      nextCategoryId = found.id
    } else if (rawCategoryName && rawCategoryName.trim().length > 0) {
      const normalized = normalizeName(rawCategoryName)
      const found = await getReceiptCategoryByName(userId, normalized)
      if (!found) {
        return NextResponse.json({ error: "Unknown category" }, { status: 400 })
      }
      category = found
      nextCategoryId = found.id
    }

    const updated = await neonQuery<{
      id: number
      category_id: number | null
      category_type_id: number | null
    }>(
      `
        UPDATE receipt_transactions rt
        SET category_id = $3,
            category_type_id = $4
        WHERE rt.id = $1
          AND rt.user_id = $2
        RETURNING rt.id, rt.category_id, rt.category_type_id
      `,
      [receiptTransactionId, userId, nextCategoryId, category?.type_id ?? null]
    )

    if (updated.length === 0) {
      return NextResponse.json({ error: "Receipt transaction not found" }, { status: 404 })
    }

    if (nextCategoryId && category) {
      const txRows = await neonQuery<{ description: string; store_name: string | null }>(
        `
          SELECT rt.description, r.store_name
          FROM receipt_transactions rt
          INNER JOIN receipts r ON rt.receipt_id = r.id
          WHERE rt.id = $1 AND rt.user_id = $2
          LIMIT 1
        `,
        [receiptTransactionId, userId]
      )

      const description = typeof txRows[0]?.description === "string" ? txRows[0].description : ""
      const storeName = typeof txRows[0]?.store_name === "string" ? txRows[0].store_name : null

      if (description.trim().length > 0) {
        await upsertReceiptItemCategoryPreferences({
          userId,
          storeName,
          entries: [{ description, categoryId: nextCategoryId }],
        })
      }
    }

    return NextResponse.json(
      {
        id: updated[0].id,
        categoryId: updated[0].category_id,
        categoryTypeId: updated[0].category_type_id,
        categoryName: category?.name ?? null,
        categoryColor: category?.color ?? null,
        categoryTypeName: category?.type_name ?? null,
        categoryTypeColor: category?.type_color ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to update categories." }, { status: 401 })
    }

    console.error("[Receipt Transaction Category API] Error:", error)
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
  }
}
