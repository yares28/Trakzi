import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

type ReceiptRow = {
  id: string
  receipt_file_id: string
  store_name: string | null
  receipt_date: string | Date | null
  receipt_time: string | null
  total_amount: string | number
  currency: string | null
  status: string
  created_at: string | Date
  updated_at: string | Date
  file_name: string | null
  mime_type: string | null
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

function toIsoDate(value: string | Date | null): string | null {
  if (!value) return null
  if (typeof value === "string") return value.split("T")[0]

  // `DATE` columns can come back as a JS Date at local midnight (no timezone).
  // Using `toISOString()` would shift the day for non-UTC server timezones.
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function toIsoTimestamp(value: string | Date): string {
  if (typeof value === "string") return new Date(value).toISOString()
  return value.toISOString()
}

export const GET = async (request: Request) => {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const limitParam = searchParams.get("limit")
    const offsetParam = searchParams.get("offset")
    const limit = Math.min(Math.max(parseInt(limitParam || "100", 10) || 100, 1), 500)
    const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0)

    let query = `
      SELECT
        r.id,
        r.receipt_file_id,
        r.store_name,
        r.receipt_date,
        r.receipt_time,
        r.total_amount,
        r.currency,
        r.status,
        r.created_at,
        r.updated_at,
        uf.file_name,
        uf.mime_type
      FROM receipts r
      LEFT JOIN user_files uf ON r.receipt_file_id = uf.id
      WHERE r.user_id = $1
    `

    const params: any[] = [userId]
    if (status) {
      query += ` AND r.status = $2`
      params.push(status)
    }

    const limitIndex = params.length + 1
    const offsetIndex = params.length + 2
    query += ` ORDER BY r.created_at DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`
    params.push(limit, offset)

    const rows = await neonQuery<ReceiptRow>(query, params)

    const payload = rows.map((row) => ({
      id: row.id,
      receiptFileId: row.receipt_file_id,
      storeName: row.store_name,
      receiptDate: toIsoDate(row.receipt_date),
      receiptTime: row.receipt_time,
      totalAmount: toNumber(row.total_amount),
      currency: row.currency ?? "EUR",
      status: row.status,
      createdAt: toIsoTimestamp(row.created_at),
      updatedAt: toIsoTimestamp(row.updated_at),
      fileName: row.file_name,
      mimeType: row.mime_type,
    }))

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to access receipts." }, { status: 401 })
    }

    console.error("[Receipts API] Error:", error)
    return NextResponse.json({ error: "Failed to load receipts" }, { status: 500 })
  }
}
