import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { invalidateUserCachePrefix } from "@/lib/cache/upstash"

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

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params

    const receipt = await neonQuery<{
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
    }>(
      `
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
          r.updated_at
        FROM receipts r
        WHERE r.id = $1 AND r.user_id = $2
        LIMIT 1
      `,
      [id, userId]
    )

    if (receipt.length === 0) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 })
    }

    const transactions = await neonQuery<{
      id: number
      description: string
      quantity: string | number
      price_per_unit: string | number
      total_price: string | number
      receipt_date: string | Date
      receipt_time: string
      category_id: number | null
      category_name: string | null
      category_color: string | null
    }>(
      `
        SELECT
          rt.id,
          rt.description,
          rt.quantity,
          rt.price_per_unit,
          rt.total_price,
          rt.receipt_date,
          rt.receipt_time,
          rt.category_id,
          rc.name as category_name,
          rc.color as category_color
        FROM receipt_transactions rt
        LEFT JOIN receipt_categories rc ON rt.category_id = rc.id
        WHERE rt.receipt_id = $1 AND rt.user_id = $2
        ORDER BY rt.id ASC
      `,
      [id, userId]
    )

    const receiptData = receipt[0]
    return NextResponse.json({
      id: receiptData.id,
      receiptFileId: receiptData.receipt_file_id,
      storeName: receiptData.store_name,
      receiptDate: toIsoDate(receiptData.receipt_date),
      receiptTime: receiptData.receipt_time,
      totalAmount: Number(receiptData.total_amount),
      currency: receiptData.currency ?? "EUR",
      status: receiptData.status,
      createdAt:
        typeof receiptData.created_at === "string"
          ? receiptData.created_at
          : receiptData.created_at.toISOString(),
      updatedAt:
        typeof receiptData.updated_at === "string"
          ? receiptData.updated_at
          : receiptData.updated_at.toISOString(),
      transactions: transactions.map((t) => ({
        id: t.id,
        description: t.description,
        quantity: Number(t.quantity),
        pricePerUnit: Number(t.price_per_unit),
        totalPrice: Number(t.total_price),
        receiptDate: toIsoDate(t.receipt_date) ?? "",
        receiptTime: t.receipt_time,
        categoryId: t.category_id,
        categoryName: t.category_name,
        categoryColor: t.category_color,
      })),
    })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Please sign in to access receipts." },
        { status: 401 }
      )
    }

    console.error("[Receipt API] Error:", error)
    return NextResponse.json(
      { error: "Failed to load receipt" },
      { status: 500 }
    )
  }
}

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const userId = await getCurrentUserId()
    const { id } = await params

    // First, get the receipt and file_id to delete the file later
    const receiptQuery = `
      SELECT receipt_file_id 
      FROM receipts 
      WHERE id = $1 AND user_id = $2
    `
    const receipts = await neonQuery<{ receipt_file_id: string }>(
      receiptQuery,
      [id, userId]
    )

    if (receipts.length === 0) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      )
    }

    const fileId = receipts[0].receipt_file_id

    // Delete receipt_transactions first (CASCADE should handle this, but being explicit)
    const deleteTransactionsQuery = `
      DELETE FROM receipt_transactions 
      WHERE receipt_id = $1 AND user_id = $2
    `
    await neonQuery(deleteTransactionsQuery, [id, userId])

    // Delete the receipt (this will CASCADE delete receipt_transactions)
    const deleteReceiptQuery = `
      DELETE FROM receipts 
      WHERE id = $1 AND user_id = $2
    `
    await neonQuery(deleteReceiptQuery, [id, userId])

    // Delete the associated file if it exists
    if (fileId) {
      const deleteFileQuery = `
        DELETE FROM user_files 
        WHERE id = $1 AND user_id = $2
      `
      await neonQuery(deleteFileQuery, [fileId, userId])
    }

    // Invalidate data-library cache to ensure UI reflects deletion instantly
    console.log('[Delete Receipt API] Invalidating cache for user:', userId)
    await invalidateUserCachePrefix(userId, 'data-library')
    console.log('[Delete Receipt API] Cache invalidation completed')

    return NextResponse.json({ success: true, message: "Receipt deleted successfully" })
  } catch (error: any) {
    console.error("[Delete Receipt API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete receipt" },
      { status: 500 }
    )
  }
}













