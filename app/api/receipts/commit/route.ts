import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonInsert, neonQuery } from "@/lib/neonClient"
import { ensureReceiptCategories } from "@/lib/receipts/receipt-categories-db"
import { upsertReceiptItemCategoryPreferences } from "@/lib/receipts/item-category-preferences"

type CommitReceiptTransaction = {
  description?: string | null
  quantity?: number | string | null
  pricePerUnit?: number | string | null
  totalPrice?: number | string | null
  categoryName?: string | null
}

type CommitReceipt = {
  fileId?: string | null
  fileName?: string | null
  storeName?: string | null
  receiptDate?: string | null
  receiptTime?: string | null
  currency?: string | null
  totalAmount?: number | string | null
  transactions?: CommitReceiptTransaction[] | null
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^0-9.+-]/g, "")
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  return trimmed
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return null
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed
}

function todayIsoDate(): string {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(now.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function nowIsoTime(): string {
  const now = new Date()
  const hh = String(now.getUTCHours()).padStart(2, "0")
  const mm = String(now.getUTCMinutes()).padStart(2, "0")
  const ss = String(now.getUTCSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

export const POST = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))

    const incoming = Array.isArray(body?.receipts) ? (body.receipts as CommitReceipt[]) : []
    if (incoming.length === 0) {
      return NextResponse.json({ error: "No receipts provided" }, { status: 400 })
    }

    const receiptCategories = await ensureReceiptCategories(userId)
    const categoryByName = new Map(receiptCategories.map((cat) => [cat.name.toLowerCase(), cat]))
    const otherCategory = categoryByName.get("other") ?? null

    const receipts: Array<{ receiptId: string; fileId: string; status: string }> = []
    const rejected: Array<{ fileId: string; reason: string }> = []

    for (const receipt of incoming) {
      const fileId = typeof receipt?.fileId === "string" ? receipt.fileId : ""
      if (!fileId) {
        rejected.push({ fileId: "", reason: "Missing fileId" })
        continue
      }

      try {
        const fileCheck = await neonQuery<{ id: string; file_name: string }>(
          `SELECT id, file_name FROM user_files WHERE id = $1 AND user_id = $2 LIMIT 1`,
          [fileId, userId]
        )
        if (fileCheck.length === 0) {
          rejected.push({ fileId, reason: "File not found" })
          continue
        }

        const existingReceipt = await neonQuery<{ id: string }>(
          `SELECT id FROM receipts WHERE user_id = $1 AND receipt_file_id = $2 LIMIT 1`,
          [userId, fileId]
        )
        if (existingReceipt.length > 0) {
          rejected.push({ fileId, reason: "Receipt already imported" })
          continue
        }

        const storeName =
          typeof receipt?.storeName === "string" && receipt.storeName.trim().length > 0
            ? receipt.storeName.trim()
            : null

        const receiptDate = normalizeDate(receipt?.receiptDate) || todayIsoDate()
        const receiptTime = normalizeTime(receipt?.receiptTime) || nowIsoTime()
        const currency =
          typeof receipt?.currency === "string" && receipt.currency.trim().length > 0
            ? receipt.currency.trim().toUpperCase()
            : "EUR"

        const rawTransactions = Array.isArray(receipt?.transactions) ? receipt.transactions : []
        const normalizedTransactions = rawTransactions
          .map((tx) => {
            const description = typeof tx?.description === "string" ? tx.description.trim() : ""
            if (!description) return null

            const quantityRaw = parseNumber(tx.quantity)
            const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1

            const pricePerUnitRaw = parseNumber(tx.pricePerUnit)
            const totalPriceRaw = parseNumber(tx.totalPrice)

            const inferredPricePerUnit =
              pricePerUnitRaw > 0
                ? pricePerUnitRaw
                : quantity > 0 && totalPriceRaw > 0
                  ? totalPriceRaw / quantity
                  : 0

            const normalizedPricePerUnit = Number(inferredPricePerUnit.toFixed(2))
            const normalizedTotalPrice = Number((normalizedPricePerUnit * quantity).toFixed(2))

            const rawCategoryName = typeof tx?.categoryName === "string" ? tx.categoryName.trim() : ""
            const category =
              rawCategoryName.length > 0
                ? categoryByName.get(rawCategoryName.toLowerCase()) ?? otherCategory
                : null

            return {
              receipt_id: "",
              user_id: userId,
              description,
              quantity: Number(quantity.toFixed(2)),
              price_per_unit: normalizedPricePerUnit,
              total_price: normalizedTotalPrice,
              category_id: category?.id ?? null,
              category_type_id: category?.type_id ?? null,
              receipt_date: receiptDate,
              receipt_time: receiptTime,
            }
          })
          .filter((value): value is NonNullable<typeof value> => Boolean(value))

        const summedTotal = normalizedTransactions.reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0)
        const totalAmount = Math.max(parseNumber(receipt?.totalAmount), summedTotal)

        const insertedReceipt = await neonQuery<{ id: string }>(
          `
            INSERT INTO receipts (
              user_id,
              receipt_file_id,
              store_name,
              receipt_date,
              receipt_time,
              total_amount,
              currency,
              status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
            RETURNING id
          `,
          [userId, fileId, storeName, receiptDate, receiptTime, Number(totalAmount.toFixed(2)), currency]
        )

        const receiptId = insertedReceipt[0]?.id
        if (!receiptId) {
          rejected.push({ fileId, reason: "Failed to create receipt" })
          continue
        }

        if (normalizedTransactions.length > 0) {
          const rowsToInsert = normalizedTransactions.map((tx) => ({
            ...tx,
            receipt_id: receiptId,
          }))
          await neonInsert("receipt_transactions", rowsToInsert, { returnRepresentation: false })
        }

        const preferenceEntries = normalizedTransactions
          .filter((tx) => Number.isFinite(tx.category_id) && (tx.category_id ?? 0) > 0)
          .map((tx) => ({ description: tx.description, categoryId: tx.category_id as number }))

        if (preferenceEntries.length > 0) {
          await upsertReceiptItemCategoryPreferences({
            userId,
            storeName,
            entries: preferenceEntries,
          })
        }

        receipts.push({ receiptId, fileId, status: "completed" })
      } catch (error: any) {
        const reason = String(error?.message || error) || "Failed to import receipt"
        rejected.push({ fileId, reason })
        continue
      }
    }

    return NextResponse.json({ receipts, rejected }, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to import receipts." }, { status: 401 })
    }

    console.error("[Receipts Commit API] Error:", error)
    return NextResponse.json({ error: "Failed to import receipts" }, { status: 500 })
  }
}
