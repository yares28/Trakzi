import { neonInsert, neonQuery } from "@/lib/neonClient"
import { logAiCategoryFeedbackBatch } from "@/lib/ai/ai-category-feedback"
import { ensureReceiptCategories } from "@/lib/receipts/receipt-categories-db"
import {
  getReceiptItemCategoryPreferences,
  normalizeReceiptItemDescriptionKey,
  normalizeReceiptStoreKey,
} from "@/lib/receipts/item-category-preferences"
import { getReceiptCategorySuggestion } from "@/lib/receipts/receipt-category-heuristics"
import { createReceiptCategoryResolver } from "@/lib/receipts/receipt-category-normalization"
import { detectLanguageFromSamples, type SupportedLocale } from "@/lib/language/language-detection"
import { getReceiptStoreLanguagePreference } from "@/lib/receipts/receipt-store-language-preferences"
import { extractReceiptFromPdfTextWithParsers } from "@/lib/receipts/parsers"
import { parseReceiptFile } from "@/lib/receipts/ingestion"
import type { ReceiptParseWarning, ReceiptParseMeta } from "@/lib/receipts/parsers/types"
import { getSiteUrl, getSiteName } from "@/lib/env"

const RECEIPT_MODEL = "allenai/olmo-3.1-32b-think:free"
const SUPPORTED_RECEIPT_LOCALES = new Set<SupportedLocale>(["es", "en", "pt", "fr", "it", "de", "nl", "ca"])

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

function buildReceiptSchemaPrompt() {
  return [
    "JSON schema to return:",
    "{",
    '  "store_name": string | null,',
    '  "receipt_date": "YYYY-MM-DD" | null,',
    '  "receipt_time": "HH:MM:SS" | null,',
    '  "currency": string | null,',
    '  "total_amount": number | null,',
    '  "items": [',
    "    {",
    '      "description": string,',
    '      "quantity": number,',
    '      "price_per_unit": number,',
    '      "total_price": number,',
    '      "category": string',
    "    }",
    "  ]",
    "}",
  ].join("\n")
}

function normalizeJsonCandidate(rawText: string) {
  return rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()
}

function insertMissingCommasBetweenFields(rawText: string) {
  let fixed = rawText
  const patterns = [
    /(:\s*(?:"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null))(\s*(?:\r?\n)\s*")/g,
    /(:\s*(?:"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null))(\s*(?:\r?\n)\s*\{)/g,
    /(:\s*(?:"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null))(\s*(?:\r?\n)\s*\[)/g,
    /("(?:(?:[^"\\]|\\.)*)")(\s*(?:\r?\n)\s*")/g,
    /(-?\d+(?:\.\d+)?)(\s*(?:\r?\n)\s*(?=["{\[\d-]))/g,
    /(true|false|null)(\s*(?:\r?\n)\s*(?=["{\[\d-]))/g,
  ]

  for (const pattern of patterns) {
    fixed = fixed.replace(pattern, "$1,$2")
  }

  return fixed
}

function insertMissingCommas(rawText: string) {
  let result = ""
  let inString = false
  let escape = false

  for (let i = 0; i < rawText.length; i += 1) {
    const char = rawText[i]
    result += char

    if (inString) {
      if (escape) {
        escape = false
      } else if (char === "\\") {
        escape = true
      } else if (char === "\"") {
        inString = false
      }
      continue
    }

    if (char === "\"") {
      inString = true
      continue
    }

    if (char === "}" || char === "]") {
      let j = i + 1
      while (j < rawText.length && /\s/.test(rawText[j])) {
        j += 1
      }
      const next = rawText[j]
      if (next && next !== "," && next !== "}" && next !== "]") {
        if (next === "{" || next === "[" || next === "\"" || next === "-" || (next >= "0" && next <= "9")) {
          result += ","
        }
      }
    }
  }

  return result
}

function buildJsonCandidates(rawText: string) {
  const cleaned = normalizeJsonCandidate(rawText)
  const candidates = new Set<string>()
  const bases: string[] = [cleaned]
  const first = cleaned.indexOf("{")
  const last = cleaned.lastIndexOf("}")
  if (first !== -1 && last > first) {
    bases.push(cleaned.slice(first, last + 1))
  }

  for (const base of bases) {
    if (!base) continue
    const trimmed = base.trim()
    const withoutTrailingCommas = trimmed.replace(/,\s*([}\]])/g, "$1")
    const withFieldCommas = insertMissingCommasBetweenFields(trimmed)
    const withFieldAndTrailing = withFieldCommas.replace(/,\s*([}\]])/g, "$1")
    const withInsertedCommas = insertMissingCommas(trimmed)
    const withInsertedAndTrimmed = insertMissingCommas(withoutTrailingCommas)
    const withAllFixes = insertMissingCommas(insertMissingCommasBetweenFields(withoutTrailingCommas))
    candidates.add(trimmed)
    candidates.add(withoutTrailingCommas)
    candidates.add(withFieldCommas)
    candidates.add(withFieldAndTrailing)
    candidates.add(withInsertedCommas)
    candidates.add(withInsertedAndTrimmed)
    candidates.add(withAllFixes)
  }

  return Array.from(candidates)
}

function tryParseReceiptJson(rawText: string): ExtractedReceipt | null {
  const candidates = buildJsonCandidates(rawText)
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as ExtractedReceipt
    } catch {
      // Try next candidate
    }
  }

  return null
}

async function repairReceiptJsonWithAi(params: {
  rawText: string
  fileName: string
  allowedCategories: string[]
}): Promise<ExtractedReceipt> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const siteUrl = getSiteUrl()
  const siteName = getSiteName()

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set")
  }

  const filtered = params.allowedCategories.filter(
    (category) => category.toLowerCase() !== "other"
  )
  const allowed = filtered.length > 0
    ? filtered
    : (params.allowedCategories.length ? params.allowedCategories : ["Other"])
  const schemaPrompt = buildReceiptSchemaPrompt()

  const prompt = [
    "The following receipt extraction output is not valid JSON.",
    "Fix it and return ONLY valid JSON (no markdown, no code fences).",
    "",
    "Rules:",
    "- receipt_date must be YYYY-MM-DD.",
    "- receipt_time must be HH:MM or HH:MM:SS (24h).",
    "- All money values must be numbers (use . as decimal separator).",
    `- For item.category, choose exactly one from this list: ${allowed.join(", ")}.`,
    "- Items can be in Spanish, English, Portuguese, French, Italian, German, Dutch, or Catalan.",
    "- Translate item names, but output the category label EXACTLY as listed (case-sensitive).",
    "- Do not invent categories, do not translate category labels, do not use singular/plural variants.",
    "- Choose the closest matching category based on the item description (what the item is).",
    "- Multi-word items: use the most specific noun (e.g., lemon juice -> Juice; ham slices -> Deli / Cold Cuts).",
    "- Sauces (tomato sauce, pasta sauce, BBQ sauce, salsa) go to 'Sauces'.",
    "- Cheese products go to 'Cheese'.",
    "- Deli meats and sliced meats go to 'Deli / Cold Cuts'.",
    "- Ready-to-eat or pre-made meals go to 'Ready Meals', 'Prepared Salads', or 'Sandwiches / Takeaway'.",
    "- ONLY choose a drinks category for beverages meant to drink (water, soda, juice, coffee, tea, beer, wine, energy drinks).",
    "- Food staples like rice/pasta/bread are NOT drinks.",
    "- If unsure between two categories, pick the one that best matches the primary ingredient or purpose.",
    "",
    schemaPrompt,
    "",
    `Receipt file name: ${params.fileName}`,
    "",
    "Invalid output:",
    params.rawText,
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
      temperature: 0,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      provider: { sort: "throughput" },
      reasoning: { enabled: true },
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
    throw new Error("AI repair response was empty")
  }

  const parsed = tryParseReceiptJson(rawText)
  if (!parsed) {
    throw new Error("AI repair response was not valid JSON")
  }

  return parsed
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

  const filtered = params.allowedCategories.filter(
    (category) => category.toLowerCase() !== "other"
  )
  const allowed = filtered.length > 0
    ? filtered
    : (params.allowedCategories.length ? params.allowedCategories : ["Other"])

  const schemaPrompt = buildReceiptSchemaPrompt()
  const prompt = [
    "You extract structured data from a grocery store receipt image or PDF.",
    "Return ONLY valid JSON (no markdown, no code fences).",
    "",
    "Rules:",
    "- receipt_date must be YYYY-MM-DD.",
    "- receipt_time must be HH:MM or HH:MM:SS (24h).",
    "- All money values must be numbers (use . as decimal separator).",
    `- For item.category, choose exactly one from this list: ${allowed.join(", ")}.`,
    "- Items can be in Spanish, English, Portuguese, French, Italian, German, Dutch, or Catalan.",
    "- Translate item names, but output the category label EXACTLY as listed (case-sensitive).",
    "- Do not invent categories, do not translate category labels, do not use singular/plural variants.",
    "- Choose the closest matching category based on the item description (what the item is).",
    "- Multi-word items: use the most specific noun (e.g., lemon juice -> Juice; ham slices -> Deli / Cold Cuts).",
    "- Sauces (tomato sauce, pasta sauce, BBQ sauce, salsa) go to 'Sauces'.",
    "- Cheese products go to 'Cheese'.",
    "- Deli meats and sliced meats go to 'Deli / Cold Cuts'.",
    "- Ready-to-eat or pre-made meals go to 'Ready Meals', 'Prepared Salads', or 'Sandwiches / Takeaway'.",
    "- ONLY choose a drinks category for beverages meant to drink (water, soda, juice, coffee, tea, beer, wine, energy drinks).",
    "- Food staples like rice/pasta/bread are NOT drinks.",
    "- If unsure between two categories, pick the one that best matches the primary ingredient or purpose.",
    "",
    schemaPrompt,
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
      temperature: 0,
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
      response_format: { type: "json_object" },
      provider: { sort: "throughput" },
      reasoning: { enabled: true },
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
  const parsed = tryParseReceiptJson(trimmed)
  if (parsed) {
    return { extracted: parsed, rawText: trimmed }
  }

  try {
    const repaired = await repairReceiptJsonWithAi({
      rawText: trimmed,
      fileName: params.fileName,
      allowedCategories: allowed,
    })
    return { extracted: repaired, rawText: trimmed }
  } catch (repairError) {
    const message = repairError instanceof Error ? repairError.message : String(repairError)
    throw new Error(`AI response was not valid JSON (repair failed: ${message})`)
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
  const resolveReceiptCategoryName = createReceiptCategoryResolver(categories.map((cat) => cat.name))
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
  let parseWarnings: ReceiptParseWarning[] = []
  let parseMeta: ReceiptParseMeta | undefined
  const isPdf = mimeType === "application/pdf" || receiptFile.file_name.toLowerCase().endsWith(".pdf")

  try {
    // Use the unified receipt parsing pipeline for both PDFs and images
    const pdfData = new Uint8Array(receiptFile.data)

    const parseResult = await parseReceiptFile({
      data: pdfData,
      mimeType,
      fileName: receiptFile.file_name,
      allowedCategories: categories.map((c) => c.name),
      aiExtractFromPdfText: async (pdfText: string) => {
        // Use AI to extract from PDF text
        const schemaPrompt = buildReceiptSchemaPrompt()
        // Inline text-based AI extraction
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set")
        const siteUrl = getSiteUrl()
        const siteName = getSiteName()
        const allowedCategories = categories.map((c) => c.name)
        const filteredAllowed = allowedCategories.filter(
          (category) => category.toLowerCase() !== "other"
        )
        const allowed = filteredAllowed.length > 0 ? filteredAllowed : allowedCategories

        const prompt = [
          "You extract structured data from the text content of a grocery store receipt.",
          "Return ONLY valid JSON (no markdown, no code fences).",
          "",
          "Rules:",
          "- receipt_date must be YYYY-MM-DD.",
          "- receipt_time must be HH:MM or HH:MM:SS (24h).",
          "- All money values must be numbers (use . as decimal separator).",
          `- For item.category, choose exactly one from this list: ${allowed.join(", ")}.`,
          "- Items can be in Spanish, English, Portuguese, French, Italian, German, Dutch, or Catalan.",
          "- Translate item names, but output the category label EXACTLY as listed (case-sensitive).",
          "- Do not invent categories, do not translate category labels, do not use singular/plural variants.",
          "- Choose the closest matching category based on the item description.",
          "- Multi-word items: use the most specific noun (e.g., lemon juice -> Juice; ham slices -> Deli / Cold Cuts).",
          "",
          schemaPrompt,
          "",
          `Receipt file name: ${receiptFile.file_name}`,
          "",
          "Receipt text content:",
          pdfText,
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
            temperature: 0,
            max_tokens: 1200,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            provider: { sort: "throughput" },
            reasoning: { enabled: true },
          }),
        })

        if (!response.ok) {
          throw new Error(`OpenRouter error ${response.status}`)
        }

        const payload = await response.json()
        const respText = payload?.choices?.[0]?.message?.content || ""
        const parsed = tryParseReceiptJson(respText)
        if (!parsed) throw new Error("AI response was not valid JSON")
        return { extracted: parsed, rawText: respText }
      },
      aiExtractFromImageDataUrl: async (dataUrl: string) => {
        return extractReceiptWithAi({
          base64DataUrl: dataUrl,
          fileName: receiptFile.file_name,
          allowedCategories: categories.map((c) => c.name),
        })
      },
    })

    parseWarnings = parseResult.warnings
    parseMeta = parseResult.meta

    if (!parseResult.extracted) {
      const errorMessage = parseWarnings.length > 0
        ? parseWarnings.map(w => w.message).join(" ")
        : "Failed to extract receipt data"
      throw new Error(errorMessage)
    }

    extracted = parseResult.extracted
    rawText = parseResult.rawText || ""
  } catch (error: any) {
    await updateReceiptFailure({
      receiptId,
      userId,
      error: String(error?.message || error),
      meta: { model: RECEIPT_MODEL, fileName: receiptFile.file_name },
    })
    return
  }

  // Handle date: prefer receipt_date_iso (from deterministic parsers), 
  // fall back to receipt_date (from AI), convert DD-MM-YYYY if needed
  let receiptDate: string
  const extractedAny = extracted as Record<string, unknown>
  if (typeof extractedAny.receipt_date_iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(extractedAny.receipt_date_iso)) {
    receiptDate = extractedAny.receipt_date_iso
  } else if (typeof extracted.receipt_date === "string") {
    // Try to parse DD-MM-YYYY or DD/MM/YYYY format from deterministic parser
    const ddmmMatch = extracted.receipt_date.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
    if (ddmmMatch) {
      const [, day, month, year] = ddmmMatch
      receiptDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    } else {
      receiptDate = normalizeDate(extracted.receipt_date) || todayIsoDate()
    }
  } else {
    receiptDate = todayIsoDate()
  }
  const receiptTime = normalizeTime(extracted.receipt_time) || nowIsoTime()
  const currency = typeof extracted.currency === "string" && extracted.currency.trim().length > 0
    ? extracted.currency.trim().toUpperCase()
    : "EUR"

  const storeName =
    typeof extracted.store_name === "string" && extracted.store_name.trim().length > 0
      ? extracted.store_name.trim()
      : null

  const storeKey = normalizeReceiptStoreKey(storeName)
  const storeLanguagePreference = storeName
    ? await getReceiptStoreLanguagePreference({ userId, storeName }).catch(() => null)
    : null
  const languageOverrideCandidate = storeLanguagePreference?.language?.trim().toLowerCase() as SupportedLocale | undefined
  const languageOverride = languageOverrideCandidate && SUPPORTED_RECEIPT_LOCALES.has(languageOverrideCandidate)
    ? languageOverrideCandidate
    : null

  const rawItems = Array.isArray(extracted.items) ? extracted.items : []
  const detectedLanguage = languageOverride
    ? null
    : detectLanguageFromSamples(
      rawItems
        .map((item) => (typeof item?.description === "string" ? item.description : ""))
        .filter((value) => value.trim().length > 0)
    )
  const receiptLanguage = languageOverride
    ? { locale: languageOverride, score: 1, confidence: 1, iso: languageOverride }
    : detectedLanguage
  const feedbackEntries: Array<{
    userId: string
    scope: "receipt"
    inputText?: string | null
    rawCategory?: string | null
    normalizedCategory?: string | null
    locale?: string | null
    storeName?: string | null
    receiptFileName?: string | null
  }> = []
  const feedbackLimit = 30
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
      const resolvedCategoryName = rawCategoryName
        ? resolveReceiptCategoryName(rawCategoryName)
        : null
      if (rawCategoryName && !resolvedCategoryName && feedbackEntries.length < feedbackLimit) {
        feedbackEntries.push({
          userId,
          scope: "receipt",
          inputText: description,
          rawCategory: rawCategoryName,
          normalizedCategory: null,
          locale: receiptLanguage?.locale ?? null,
          storeName,
          receiptFileName: receiptFile.file_name,
        })
      }
      const resolvedCategory = resolvedCategoryName
        ? categoryNameToRow.get(resolvedCategoryName.toLowerCase()) ?? null
        : null

      const descriptionKey = normalizeReceiptItemDescriptionKey(description)
      const preferredCategoryId = descriptionKey
        ? (preferenceCategoryIdByKey.get(`${storeKey}::${descriptionKey}`) ??
          preferenceCategoryIdByKey.get(`::${descriptionKey}`) ??
          null)
        : null

      let category = preferredCategoryId
        ? categoryIdToRow.get(preferredCategoryId) ?? otherCategory
        : resolvedCategory ?? otherCategory

      if (!preferredCategoryId) {
        const heuristicSuggestion = getReceiptCategorySuggestion({
          description,
          categoryNameByLower,
          locale: receiptLanguage?.locale,
        })

        if (heuristicSuggestion) {
          const suggestionLower = heuristicSuggestion.category.toLowerCase()
          const currentBroadType = category?.broad_type || "Other"
          const suggestedBroadType = categoryNameToRow.get(suggestionLower)?.broad_type || "Other"
          const currentIsOther = category?.name.toLowerCase() === "other"

          const isDrinkMismatch =
            (currentBroadType === "Drinks" && suggestedBroadType !== "Drinks") ||
            (currentBroadType !== "Drinks" && suggestedBroadType === "Drinks")

          const strongOverride =
            heuristicSuggestion.confidence === "strong" &&
            category?.name.toLowerCase() !== suggestionLower

          if (currentIsOther || isDrinkMismatch || strongOverride) {
            category = categoryNameToRow.get(suggestionLower) ?? category
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

  if (feedbackEntries.length > 0) {
    await logAiCategoryFeedbackBatch(feedbackEntries)
  }

  const summedTotal = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0)
  const totalAmount = Math.max(parseNumber(extracted.total_amount), summedTotal)

  // Extract taxes_total_cuota if present (from deterministic parsers)
  const taxesTotalCuota = typeof extractedAny.taxes_total_cuota === "number"
    ? extractedAny.taxes_total_cuota
    : typeof extractedAny.taxes_total_cuota === "string"
      ? parseFloat(extractedAny.taxes_total_cuota)
      : null

  const aiExtractionData = {
    status: "completed",
    model: isPdf ? "deterministic-parser-or-ai" : RECEIPT_MODEL,
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
    // Store additional Mercadona parser data
    taxes_total_cuota: Number.isFinite(taxesTotalCuota) ? taxesTotalCuota : null,
    receipt_date_display: typeof extractedAny.receipt_date === "string" ? extractedAny.receipt_date : null,
    receipt_date_iso: receiptDate,
    // Store parse pipeline metadata
    parse_warnings: parseWarnings.length > 0 ? parseWarnings : undefined,
    parse_meta: parseMeta,
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
