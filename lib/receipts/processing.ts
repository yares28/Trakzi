import { neonInsert, neonQuery } from "@/lib/neonClient"
import { ensureReceiptCategories } from "@/lib/receipts/receipt-categories-db"
import {
  getReceiptItemCategoryPreferences,
  normalizeReceiptItemDescriptionKey,
  normalizeReceiptStoreKey,
} from "@/lib/receipts/item-category-preferences"
import { suggestReceiptCategoryNameFromDescription } from "@/lib/receipts/receipt-category-heuristics"
import { getSiteUrl, getSiteName } from "@/lib/env"

const RECEIPT_MODEL = "google/gemini-2.0-flash-001"

type EnqueueParams = {
  receiptId: string
  userId: string
}

type ReceiptFileRow = {
  receipt_id: string
  receipt_file_id: string
  file_name: string
  mime_type: string
  data: Buffer
}

type ReceiptCategoryRow = {
  id: number
  name: string
  color: string | null
  type_id: number
  broad_type: string | null
}

type ExtractedReceipt = {
  store_name?: string | null
  receipt_date?: string | null
  receipt_time?: string | null
  currency?: string | null
  total_amount?: number | string | null
  items?: Array<{
    description?: string | null
    quantity?: number | string | null
    price_per_unit?: number | string | null
    total_price?: number | string | null
    category?: string | null
  }>
}

const inFlightReceiptIds = new Set<string>()

export function enqueueReceiptProcessing({ receiptId, userId }: EnqueueParams) {
  if (inFlightReceiptIds.has(receiptId)) return
  inFlightReceiptIds.add(receiptId)

  setTimeout(() => {
    void processReceiptNow({ receiptId, userId })
      .catch((error) => {
        console.error("[Receipts] Processing failed:", error)
      })
      .finally(() => {
        inFlightReceiptIds.delete(receiptId)
      })
  }, 0)
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

async function fetchReceiptFile(receiptId: string, userId: string): Promise<ReceiptFileRow | null> {
  const rows = await neonQuery<ReceiptFileRow>(
    `
      SELECT
        r.id as receipt_id,
        r.receipt_file_id,
        uf.file_name,
        uf.mime_type,
        uf.data
      FROM receipts r
      INNER JOIN user_files uf ON uf.id = r.receipt_file_id
      WHERE r.id = $1 AND r.user_id = $2
      LIMIT 1
    `,
    [receiptId, userId]
  )

  return rows[0] ?? null
}

async function extractReceiptWithAi(params: {
  base64DataUrl: string
  fileName: string
  allowedCategories: string[]
}): Promise<{ extracted: ExtractedReceipt; rawText: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const siteUrl = getSiteUrl()
  const siteName = getSiteName()

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set")
  }

  const allowed = params.allowedCategories.length ? params.allowedCategories : ["Other"]

  const prompt = [
    "You extract structured data from a grocery store receipt image.",
    "Return ONLY valid JSON (no markdown, no code fences).",
    "",
    "Rules:",
    "- receipt_date must be YYYY-MM-DD.",
    "- receipt_time must be HH:MM or HH:MM:SS (24h).",
    "- All money values must be numbers (use . as decimal separator).",
    `- For item.category, choose exactly one from this list: ${allowed.join(", ")}.`,
    "- Choose the closest matching category based on the item description (what the item is).",
    "- ONLY choose a drinks category for beverages/liquids meant to drink (water, soda, juice, coffee, tea, beer, wine, energy drinks).",
    "- Food staples like rice/pasta/bread are NOT drinks.",
    "- If you are unsure, choose \"Other\" instead of guessing.",
    "",
    "JSON schema to return:",
    "{",
    '  \"store_name\": string | null,',
    '  \"receipt_date\": \"YYYY-MM-DD\" | null,',
    '  \"receipt_time\": \"HH:MM:SS\" | null,',
    '  \"currency\": string | null,',
    '  \"total_amount\": number | null,',
    '  \"items\": [',
    "    {",
    '      \"description\": string,',
    '      \"quantity\": number,',
    '      \"price_per_unit\": number,',
    '      \"total_price\": number,',
    '      \"category\": string',
    "    }",
    "  ]",
    "}",
    "",
    `Receipt file name: ${params.fileName}`,
  ].join("\n")

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": siteUrl,
      "X-Title": siteName,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: RECEIPT_MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: params.base64DataUrl } },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${errorText.substring(0, 500)}`)
  }

  const payload = await response.json()
  const rawText =
    payload?.choices?.[0]?.message?.content ||
    payload?.choices?.[0]?.delta?.content ||
    ""

  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    throw new Error("AI response was empty")
  }

  const trimmed = rawText.trim()
  try {
    return { extracted: JSON.parse(trimmed) as ExtractedReceipt, rawText: trimmed }
  } catch {
    const first = trimmed.indexOf("{")
    const last = trimmed.lastIndexOf("}")
    if (first === -1 || last === -1 || last <= first) {
      throw new Error("AI response was not valid JSON")
    }
    const sliced = trimmed.slice(first, last + 1)
    return { extracted: JSON.parse(sliced) as ExtractedReceipt, rawText: trimmed }
  }
}

async function updateReceiptFailure(params: {
  receiptId: string
  userId: string
  error: string
  meta?: Record<string, unknown>
}) {
  const aiData = {
    status: "failed",
    error: params.error,
    ...params.meta,
    processedAt: new Date().toISOString(),
  }

  await neonQuery(
    `
      UPDATE receipts
      SET status = 'failed',
          ai_extraction_data = $3::jsonb,
          updated_at = now()
      WHERE id = $1 AND user_id = $2
    `,
    [params.receiptId, params.userId, JSON.stringify(aiData)]
  )
}

export async function processReceiptNow({ receiptId, userId }: EnqueueParams) {
  const receiptFile = await fetchReceiptFile(receiptId, userId)
  if (!receiptFile) {
    return
  }

  const categories = (await ensureReceiptCategories(userId)) as ReceiptCategoryRow[]
  const categoryNameToRow = new Map<string, ReceiptCategoryRow>()
  const categoryNameByLower = new Map<string, string>()
  const categoryIdToRow = new Map<number, ReceiptCategoryRow>()
  categories.forEach((cat) => categoryNameToRow.set(cat.name.toLowerCase(), cat))
  categories.forEach((cat) => categoryNameByLower.set(cat.name.toLowerCase(), cat.name))
  categories.forEach((cat) => categoryIdToRow.set(cat.id, cat))
  const otherCategory = categoryNameToRow.get("other") ?? null

  const preferenceRows = await getReceiptItemCategoryPreferences({ userId }).catch(() => [])
  const preferenceCategoryIdByKey = new Map<string, number>()
  preferenceRows.forEach((row) => {
    if (!categoryIdToRow.has(row.category_id)) return
    const key = `${row.store_key}::${row.description_key}`
    if (!preferenceCategoryIdByKey.has(key)) {
      preferenceCategoryIdByKey.set(key, row.category_id)
    }
  })

  const mimeType = (receiptFile.mime_type || "image/jpeg").toLowerCase()
  const base64 = receiptFile.data.toString("base64")
  const base64DataUrl = `data:${mimeType};base64,${base64}`

  let extracted: ExtractedReceipt
  let rawText: string

  try {
    const result = await extractReceiptWithAi({
      base64DataUrl,
      fileName: receiptFile.file_name,
      allowedCategories: categories.map((c) => c.name),
    })
    extracted = result.extracted
    rawText = result.rawText
  } catch (error: any) {
    await updateReceiptFailure({
      receiptId,
      userId,
      error: String(error?.message || error),
      meta: { model: RECEIPT_MODEL, fileName: receiptFile.file_name },
    })
    return
  }

  const receiptDate = normalizeDate(extracted.receipt_date) || todayIsoDate()
  const receiptTime = normalizeTime(extracted.receipt_time) || nowIsoTime()
  const currency = typeof extracted.currency === "string" && extracted.currency.trim().length > 0
    ? extracted.currency.trim().toUpperCase()
    : "EUR"

  const storeName =
    typeof extracted.store_name === "string" && extracted.store_name.trim().length > 0
      ? extracted.store_name.trim()
      : null

  const storeKey = normalizeReceiptStoreKey(storeName)

  const rawItems = Array.isArray(extracted.items) ? extracted.items : []
  const items = rawItems
    .map((item) => {
      const description =
        typeof item?.description === "string" ? item.description.trim() : ""

      if (!description) return null

      const quantity = Math.max(1, parseNumber(item.quantity) || 1)
      const totalPrice = parseNumber(item.total_price)
      const pricePerUnit = parseNumber(item.price_per_unit)

      const inferredPricePerUnit =
        pricePerUnit > 0 ? pricePerUnit : quantity > 0 && totalPrice > 0 ? totalPrice / quantity : 0
      const inferredTotalPrice =
        totalPrice > 0 ? totalPrice : inferredPricePerUnit > 0 ? inferredPricePerUnit * quantity : 0

      const rawCategoryName =
        typeof item?.category === "string" ? item.category.trim() : ""

      const descriptionKey = normalizeReceiptItemDescriptionKey(description)
      const preferredCategoryId = descriptionKey
        ? (preferenceCategoryIdByKey.get(`${storeKey}::${descriptionKey}`) ??
          preferenceCategoryIdByKey.get(`::${descriptionKey}`) ??
          null)
        : null

      let category = preferredCategoryId
        ? categoryIdToRow.get(preferredCategoryId) ?? otherCategory
        : categoryNameToRow.get(rawCategoryName.toLowerCase()) ?? otherCategory

      if (!preferredCategoryId) {
        const heuristicSuggestion = suggestReceiptCategoryNameFromDescription({
          description,
          categoryNameByLower,
        })

        if (heuristicSuggestion) {
          const currentBroadType = category?.broad_type || "Other"
          const suggestedBroadType = categoryNameToRow.get(heuristicSuggestion.toLowerCase())?.broad_type || "Other"
          const currentIsOther = category?.name.toLowerCase() === "other"

          const isDrinkMismatch =
            (currentBroadType === "Drinks" && suggestedBroadType !== "Drinks") ||
            (currentBroadType !== "Drinks" && suggestedBroadType === "Drinks")

          if (currentIsOther || isDrinkMismatch) {
            category = categoryNameToRow.get(heuristicSuggestion.toLowerCase()) ?? category
          }
        }
      }

      const categoryId = category?.id ?? null
      const categoryTypeId = category?.type_id ?? null

      return {
        receipt_id: receiptId,
        user_id: userId,
        description,
        quantity,
        price_per_unit: Number(inferredPricePerUnit.toFixed(2)),
        total_price: Number(inferredTotalPrice.toFixed(2)),
        category_id: categoryId,
        category_type_id: categoryTypeId,
        receipt_date: receiptDate,
        receipt_time: receiptTime,
      }
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))

  const summedTotal = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0)
  const totalAmount = Math.max(parseNumber(extracted.total_amount), summedTotal)

  const aiExtractionData = {
    status: "completed",
    model: RECEIPT_MODEL,
    rawText,
    extracted,
    normalized: {
      storeName,
      receiptDate,
      receiptTime,
      currency,
      totalAmount,
      itemCount: items.length,
    },
    processedAt: new Date().toISOString(),
  }

  try {
    await neonQuery(`DELETE FROM receipt_transactions WHERE receipt_id = $1 AND user_id = $2`, [
      receiptId,
      userId,
    ])

    if (items.length > 0) {
      await neonInsert("receipt_transactions", items, { returnRepresentation: false })
    }

    await neonQuery(
      `
        UPDATE receipts
        SET store_name = $3,
            receipt_date = $4,
            receipt_time = $5,
            total_amount = $6,
            currency = $7,
            status = 'completed',
            ai_extraction_data = $8::jsonb,
            updated_at = now()
        WHERE id = $1 AND user_id = $2
      `,
      [receiptId, userId, storeName, receiptDate, receiptTime, totalAmount, currency, JSON.stringify(aiExtractionData)]
    )
  } catch (error: any) {
    await updateReceiptFailure({
      receiptId,
      userId,
      error: String(error?.message || error),
      meta: { model: RECEIPT_MODEL, fileName: receiptFile.file_name },
    })
  }
}
