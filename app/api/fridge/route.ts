import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

function getDateRange(filter: string | null): { startDate: string | null; endDate: string | null } {
  if (!filter) return { startDate: null, endDate: null }

  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const formatDate = (date: Date): string => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, "0")
    const day = String(date.getUTCDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  switch (filter) {
    case "last7days": {
      const startDate = new Date(today)
      startDate.setUTCDate(startDate.getUTCDate() - 7)
      return { startDate: formatDate(startDate), endDate: formatDate(today) }
    }
    case "last30days": {
      const startDate = new Date(today)
      startDate.setUTCDate(startDate.getUTCDate() - 30)
      return { startDate: formatDate(startDate), endDate: formatDate(today) }
    }
    case "last3months": {
      const startDate = new Date(today)
      startDate.setUTCMonth(startDate.getUTCMonth() - 3)
      return { startDate: formatDate(startDate), endDate: formatDate(today) }
    }
    case "last6months": {
      const startDate = new Date(today)
      startDate.setUTCMonth(startDate.getUTCMonth() - 6)
      return { startDate: formatDate(startDate), endDate: formatDate(today) }
    }
    case "lastyear": {
      const startDate = new Date(today)
      startDate.setUTCFullYear(startDate.getUTCFullYear() - 1)
      return { startDate: formatDate(startDate), endDate: formatDate(today) }
    }
    default: {
      const year = parseInt(filter)
      if (!Number.isNaN(year)) {
        return { startDate: `${year}-01-01`, endDate: `${year}-12-31` }
      }
      return { startDate: null, endDate: null }
    }
  }
}

type ReceiptTransactionRow = {
  id: number
  description: string
  quantity: string | number
  price_per_unit: string | number
  total_price: string | number
  category_id: number | null
  category_type_id: number | null
  receipt_date: string | Date
  receipt_time: string
  store_name: string | null
  receipt_id: string
  receipt_total_amount: string | number
  receipt_status: string
  category_name: string | null
  category_color: string | null
  category_type_name: string | null
  category_type_color: string | null
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

function toIsoDate(value: string | Date): string {
  if (typeof value === "string") return value.split("T")[0]

  // `DATE` columns can come back as a JS Date at local midnight (no timezone).
  // Using `toISOString()` would shift the day for non-UTC server timezones.
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const GET = async (request: Request) => {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(request.url)

    const filter = searchParams.get("filter")
    const { startDate, endDate } = getDateRange(filter)

    const limitParam = searchParams.get("limit")
    const offsetParam = searchParams.get("offset")
    const limit = Math.min(Math.max(parseInt(limitParam || "1000", 10) || 1000, 1), 5000)
    const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0)

    let query = `
      SELECT 
        rt.id,
        rt.description,
        rt.quantity,
        rt.price_per_unit,
        rt.total_price,
        rt.category_id,
        rt.category_type_id,
        rt.receipt_date,
        rt.receipt_time,
        r.store_name,
        r.id as receipt_id,
        r.total_amount as receipt_total_amount,
        r.status as receipt_status,
        rc.name as category_name,
        rc.color as category_color,
        rct.name as category_type_name,
        rct.color as category_type_color
      FROM receipt_transactions rt
      INNER JOIN receipts r ON rt.receipt_id = r.id
      LEFT JOIN receipt_categories rc ON rt.category_id = rc.id
      LEFT JOIN receipt_category_types rct ON rt.category_type_id = rct.id
      WHERE rt.user_id = $1
    `

    const params: any[] = [userId]

    if (startDate && endDate) {
      query += ` AND rt.receipt_date >= $2 AND rt.receipt_date <= $3`
      params.push(startDate, endDate)
    }

    query += ` ORDER BY rt.receipt_date DESC, rt.receipt_time DESC, rt.id DESC`

    const limitIndex = params.length + 1
    const offsetIndex = params.length + 2
    query += ` LIMIT $${limitIndex} OFFSET $${offsetIndex}`
    params.push(limit, offset)

    const rows = await neonQuery<ReceiptTransactionRow>(query, params)

    const payload = rows.map((row) => ({
      id: row.id,
      receiptId: row.receipt_id,
      storeName: row.store_name,
      receiptDate: toIsoDate(row.receipt_date),
      receiptTime: row.receipt_time,
      receiptTotalAmount: toNumber(row.receipt_total_amount),
      receiptStatus: row.receipt_status,
      description: row.description,
      quantity: toNumber(row.quantity),
      pricePerUnit: toNumber(row.price_per_unit),
      totalPrice: toNumber(row.total_price),
      categoryId: row.category_id,
      categoryTypeId: row.category_type_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      categoryTypeName: row.category_type_name,
      categoryTypeColor: row.category_type_color,
    }))

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to access receipts." }, { status: 401 })
    }

    console.error("[Fridge API] Error:", error)
    return NextResponse.json({ error: "Failed to load fridge receipts" }, { status: 500 })
  }
}
