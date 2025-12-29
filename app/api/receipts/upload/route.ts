import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { saveFileToNeon } from "@/lib/files/saveFileToNeon"
import { ensureReceiptCategories } from "@/lib/receipts/receipt-categories-db"
import {
  getReceiptItemCategoryPreferences,
  normalizeReceiptItemDescriptionKey,
  normalizeReceiptStoreKey,
} from "@/lib/receipts/item-category-preferences"
import { suggestReceiptCategoryNameFromDescription } from "@/lib/receipts/receipt-category-heuristics"
import { extractReceiptFromPdfTextWithParsers } from "@/lib/receipts/parsers"
import { parseReceiptFile } from "@/lib/receipts/ingestion"
import type { ReceiptParseWarning, ReceiptParseMeta } from "@/lib/receipts/parsers/types"
import { getSiteUrl, getSiteName } from "@/lib/env"
import { checkRateLimit, createRateLimitResponse } from "@/lib/security/rate-limiter"

function isSupportedReceiptImage(file: File): boolean {
  const mime = (file.type || "").toLowerCase()
  if (mime.startsWith("image/")) return true

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return ["png", "jpg", "jpeg", "webp", "heic", "heif"].includes(ext)
}

function isSupportedReceiptPdf(file: File): boolean {
  const mime = (file.type || "").toLowerCase()
  if (mime === "application/pdf") return true

  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return ext === "pdf"
}

async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  // Use unpdf which is designed for serverless environments (no DOM dependencies)
  const { extractText } = await import("unpdf")
  const result = await extractText(data)
  // unpdf returns text as an array of strings (one per page), join them
  const pages = result.text || []
  return Array.isArray(pages) ? pages.join("\n") : String(pages)
}

const MAX_RECEIPT_FILE_BYTES = 10 * 1024 * 1024

const RECEIPT_MODEL = "allenai/olmo-3.1-32b-think:free"

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

  // DEBUG: Remove "Other" to force AI to choose specific categories
  const allowed = params.allowedCategories.filter(cat => cat.toLowerCase() !== "other")
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
    "",
    "CATEGORY STRUCTURE:",
    "Categories are organized by macronutrient type (Protein, Carbs, Fat, Mixed, None, Other) and broad type (Food, Drinks, Other).",
    "",
    "CATEGORY GUIDELINES BY TYPE:",
    "- FRESH/WHOLE: Fruits, Vegetables, Herbs & Fresh Aromatics, Meat & Poultry, Fish & Seafood, Eggs, Dairy (Milk/Yogurt), Cheese, Deli / Cold Cuts, Fresh Ready-to-Eat",
    "- BAKERY: Bread, Pastries, Wraps & Buns",
    "- PANTRY: Pasta, Rice & Grains, Legumes, Canned & Jarred, Sauces, Condiments, Spices & Seasonings, Oils & Vinegars, Baking Ingredients, Breakfast & Spreads",
    "- SNACKS: Salty Snacks, Cookies & Biscuits, Chocolate & Candy, Nuts & Seeds, Ice Cream & Desserts",
    "- BEVERAGES: Water, Soft Drinks, Juice, Coffee & Tea, Energy & Sports Drinks",
    "- ALCOHOL: Beer, Wine, Spirits, Low/No Alcohol",
    "- FROZEN: Frozen Vegetables & Fruit, Frozen Meals",
    "- PREPARED: Ready Meals, Prepared Salads, Sandwiches / Takeaway",
    "- NON-FOOD: OTC Medicine, Supplements, First Aid, Hygiene & Toiletries, Hair Care, Skin Care, Oral Care, Cosmetics, Cleaning Supplies, Laundry, Paper Goods, Kitchen Consumables, Storage, Baby (Diapers & Wipes), Baby Food, Pet Food, Pet Supplies, Bags",
    "",
    "IMPORTANT RULES:",
    "- Cheese/cheese products → \"Cheese\" (not Dairy)",
    "- Sauces/ketchup/mayo/dressings → \"Sauces\" (not Condiments)",
    "- Cold cuts/sliced meats/deli meats → \"Deli / Cold Cuts\"",
    "- Pre-made salads/sandwiches → \"Fresh Ready-to-Eat\", \"Prepared Salads\", or \"Sandwiches / Takeaway\"",
    "- Rice/pasta/grains/potatoes/noodles → \"Pasta, Rice & Grains\"",
    "- Energy drinks (Furious, Monster, Aquarius, etc) → \"Energy & Sports Drinks\"",
    "- Soft drinks (Cola, Fanta, Sprite) → \"Soft Drinks\"",
    "- Plain water → \"Water\"",
    "- Coffee/tea (unsweetened) → \"Coffee & Tea\"",
    "- Milk/yogurt/PROTEINA → \"Dairy (Milk/Yogurt)\"",
    "- Soups/creams (CREMA, SOPA) → \"Canned & Jarred\" or \"Ready Meals\"",
    "",
    "COMMON MERCADONA PRODUCTS:",
    "- PROTEINA 0% NATURAL → Dairy (Milk/Yogurt)",
    "- FURIOUS ZERO / ENERGY BERRIES → Energy & Sports Drinks",
    "- CREMA CALABAZA / CREMA VERDURAS → Canned & Jarred",
    "- ALBÓNDIGAS POLLO → Meat & Poultry",
    "- COLA ZERO → Soft Drinks",
    "",
    "CRITICAL: Avoid \"Other\" category! Look at the product description carefully and assign the BEST matching category. Only use \"Other\" if the item is truly non-food (like batteries, phone chargers).",
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

  // DEBUG: Remove "Other" to force AI to choose specific categories
  const allowed = params.allowedCategories.filter(cat => cat.toLowerCase() !== "other")

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
    "",
    "CATEGORY STRUCTURE:",
    "Categories are organized by macronutrient type (Protein, Carbs, Fat, Mixed, None, Other) and broad type (Food, Drinks, Other).",
    "",
    "CATEGORY GUIDELINES BY TYPE:",
    "- FRESH/WHOLE: Fruits, Vegetables, Herbs & Fresh Aromatics, Meat & Poultry, Fish & Seafood, Eggs, Dairy (Milk/Yogurt), Cheese, Deli / Cold Cuts, Fresh Ready-to-Eat",
    "- BAKERY: Bread, Pastries, Wraps & Buns",
    "- PANTRY: Pasta, Rice & Grains, Legumes, Canned & Jarred, Sauces, Condiments, Spices & Seasonings, Oils & Vinegars, Baking Ingredients, Breakfast & Spreads",
    "- SNACKS: Salty Snacks, Cookies & Biscuits, Chocolate & Candy, Nuts & Seeds, Ice Cream & Desserts",
    "- BEVERAGES: Water, Soft Drinks, Juice, Coffee & Tea, Energy & Sports Drinks",
    "- ALCOHOL: Beer, Wine, Spirits, Low/No Alcohol",
    "- FROZEN: Frozen Vegetables & Fruit, Frozen Meals",
    "- PREPARED: Ready Meals, Prepared Salads, Sandwiches / Takeaway",
    "- NON-FOOD: OTC Medicine, Supplements, First Aid, Hygiene & Toiletries, Hair Care, Skin Care, Oral Care, Cosmetics, Cleaning Supplies, Laundry, Paper Goods, Kitchen Consumables, Storage, Baby (Diapers & Wipes), Baby Food, Pet Food, Pet Supplies, Bags",
    "",
    "IMPORTANT RULES:",
    "- Cheese/cheese products → \"Cheese\" (not Dairy)",
    "- Sauces/ketchup/mayo/dressings → \"Sauces\" (not Condiments)",
    "- Cold cuts/sliced meats/deli meats → \"Deli / Cold Cuts\"",
    "- Pre-made salads/sandwiches → \"Fresh Ready-to-Eat\", \"Prepared Salads\", or \"Sandwiches / Takeaway\"",
    "- Rice/pasta/grains/potatoes/noodles → \"Pasta, Rice & Grains\"",
    "- Energy drinks (Furious, Monster, Aquarius, etc) → \"Energy & Sports Drinks\"",
    "- Soft drinks (Cola, Fanta, Sprite) → \"Soft Drinks\"",
    "- Plain water → \"Water\"",
    "- Coffee/tea (unsweetened) → \"Coffee & Tea\"",
    "- Milk/yogurt/PROTEINA → \"Dairy (Milk/Yogurt)\"",
    "- Soups/creams (CREMA, SOPA) → \"Canned & Jarred\" or \"Ready Meals\"",
    "",
    "COMMON MERCADONA PRODUCTS:",
    "- PROTEINA 0% NATURAL → Dairy (Milk/Yogurt)",
    "- FURIOUS ZERO / ENERGY BERRIES → Energy & Sports Drinks",
    "- CREMA CALABAZA / CREMA VERDURAS → Canned & Jarred",
    "- ALBÓNDIGAS POLLO → Meat & Poultry",
    "- COLA ZERO → Soft Drinks",
    "",
    "CRITICAL: Avoid \"Other\" category! Look at the product description carefully and assign the BEST matching category. Only use \"Other\" if the item is truly non-food (like batteries, phone chargers).",
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

async function extractReceiptFromPdfText(params: {
  pdfText: string
  fileName: string
  allowedCategories: string[]
}): Promise<{ extracted: ExtractedReceipt; rawText: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const siteUrl = getSiteUrl()
  const siteName = getSiteName()

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set")
  }

  // DEBUG: Remove "Other" to force AI to choose specific categories
  const allowed = params.allowedCategories.filter(cat => cat.toLowerCase() !== "other")

  const schemaPrompt = buildReceiptSchemaPrompt()
  const prompt = [
    "You extract structured data from the text content of a grocery store receipt.",
    "Return ONLY valid JSON (no markdown, no code fences).",
    "",
    "Rules:",
    "- receipt_date must be YYYY-MM-DD.",
    "- receipt_time must be HH:MM or HH:MM:SS (24h).",
    "- All money values must be numbers (use . as decimal separator).",
    `- For item.category, choose exactly one from this list: ${allowed.join(", ")}.`,
    "",
    "CATEGORY STRUCTURE:",
    "Categories are organized by macronutrient type (Protein, Carbs, Fat, Mixed, None, Other) and broad type (Food, Drinks, Other).",
    "",
    "CATEGORY GUIDELINES BY TYPE:",
    "- FRESH/WHOLE: Fruits, Vegetables, Herbs & Fresh Aromatics, Meat & Poultry, Fish & Seafood, Eggs, Dairy (Milk/Yogurt), Cheese, Deli / Cold Cuts, Fresh Ready-to-Eat",
    "- BAKERY: Bread, Pastries, Wraps & Buns",
    "- PANTRY: Pasta, Rice & Grains, Legumes, Canned & Jarred, Sauces, Condiments, Spices & Seasonings, Oils & Vinegars, Baking Ingredients, Breakfast & Spreads",
    "- SNACKS: Salty Snacks, Cookies & Biscuits, Chocolate & Candy, Nuts & Seeds, Ice Cream & Desserts",
    "- BEVERAGES: Water, Soft Drinks, Juice, Coffee & Tea, Energy & Sports Drinks",
    "- ALCOHOL: Beer, Wine, Spirits, Low/No Alcohol",
    "- FROZEN: Frozen Vegetables & Fruit, Frozen Meals",
    "- PREPARED: Ready Meals, Prepared Salads, Sandwiches / Takeaway",
    "- NON-FOOD: OTC Medicine, Supplements, First Aid, Hygiene & Toiletries, Hair Care, Skin Care, Oral Care, Cosmetics, Cleaning Supplies, Laundry, Paper Goods, Kitchen Consumables, Storage, Baby (Diapers & Wipes), Baby Food, Pet Food, Pet Supplies, Bags",
    "",
    "IMPORTANT RULES:",
    "- Cheese/cheese products → \"Cheese\" (not Dairy)",
    "- Sauces/ketchup/mayo/dressings → \"Sauces\" (not Condiments)",
    "- Cold cuts/sliced meats/deli meats → \"Deli / Cold Cuts\"",
    "- Pre-made salads/sandwiches → \"Fresh Ready-to-Eat\", \"Prepared Salads\", or \"Sandwiches / Takeaway\"",
    "- Rice/pasta/grains/potatoes/noodles → \"Pasta, Rice & Grains\"",
    "- Energy drinks (Furious, Monster, Aquarius, etc) → \"Energy & Sports Drinks\"",
    "- Soft drinks (Cola, Fanta, Sprite) → \"Soft Drinks\"",
    "- Plain water → \"Water\"",
    "- Coffee/tea (unsweetened) → \"Coffee & Tea\"",
    "- Milk/yogurt/PROTEINA → \"Dairy (Milk/Yogurt)\"",
    "- Soups/creams (CREMA, SOPA) → \"Canned & Jarred\" or \"Ready Meals\"",
    "",
    "COMMON MERCADONA PRODUCTS:",
    "- PROTEINA 0% NATURAL → Dairy (Milk/Yogurt)",
    "- FURIOUS ZERO / ENERGY BERRIES → Energy & Sports Drinks",
    "- CREMA CALABAZA / CREMA VERDURAS → Canned & Jarred",
    "- ALBÓNDIGAS POLLO → Meat & Poultry",
    "- COLA ZERO → Soft Drinks",
    "",
    "CRITICAL: Avoid \"Other\" category! Look at the product description carefully and assign the BEST matching category. Only use \"Other\" if the item is truly non-food (like batteries, phone chargers).",
    "",
    schemaPrompt,
    "",
    `Receipt file name: ${params.fileName}`,
    "",
    "Receipt text content:",
    params.pdfText,
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

export const POST = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()

    // Rate limit check - file uploads are expensive
    const rateLimitResult = checkRateLimit(userId, 'upload')
    if (rateLimitResult.limited) {
      return createRateLimitResponse(rateLimitResult.resetIn)
    }

    const formData = await req.formData()
    const incoming = [
      ...(formData.getAll("files") as unknown[]),
      formData.get("file"),
    ].filter((item): item is File => item instanceof File)

    if (incoming.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Pre-check: Ensure user has SOME capacity before expensive OCR processing
    // This prevents wasting resources on files that can't be committed
    const { hasAnyRemainingCapacity } = await import("@/lib/limits/transactions-cap")
    const capacityCheck = await hasAnyRemainingCapacity(userId)

    if (!capacityCheck.hasCapacity) {
      // Return proper limit exceeded response
      const { getPlanLimits, getUpgradePlans } = await import("@/lib/plan-limits")
      const { getTransactionCount } = await import("@/lib/limits/transactions-cap")

      const limits = getPlanLimits(capacityCheck.plan)
      const counts = await getTransactionCount(userId)
      const upgradePlans = getUpgradePlans(capacityCheck.plan)

      return NextResponse.json({
        code: 'LIMIT_EXCEEDED',
        plan: capacityCheck.plan,
        cap: limits.maxTotalTransactions,
        used: counts.total,
        remaining: 0,
        message: 'You have reached your transaction limit. Please delete some transactions or upgrade your plan to add more receipts.',
        suggestedActions: ['DELETE_EXISTING', 'UPGRADE'],
        upgradePlans,
      }, { status: 403 })
    }

    const receiptCategories = await ensureReceiptCategories(userId)
    const allowedCategoryNames = receiptCategories.map((category) => category.name)
    const allowedCategorySet = new Set(allowedCategoryNames.map((name) => name.toLowerCase()))
    const allowedCategoryNameByLower = new Map(allowedCategoryNames.map((name) => [name.toLowerCase(), name]))

    const categoryBroadTypeByLowerName = new Map<string, string>()
    receiptCategories.forEach((category) => {
      const broadType = typeof category?.broad_type === "string" && category.broad_type.trim().length > 0
        ? category.broad_type.trim()
        : "Other"
      categoryBroadTypeByLowerName.set(category.name.toLowerCase(), broadType)
    })

    const categoryNameById = new Map<number, string>()
    receiptCategories.forEach((category) => {
      if (typeof category?.id === "number" && category.id > 0) {
        categoryNameById.set(category.id, category.name)
      }
    })

    const preferenceRows = await getReceiptItemCategoryPreferences({ userId }).catch(() => [])
    const preferenceCategoryIdByKey = new Map<string, number>()
    preferenceRows.forEach((row) => {
      if (!categoryNameById.has(row.category_id)) return
      const key = `${row.store_key}::${row.description_key}`
      if (!preferenceCategoryIdByKey.has(key)) {
        preferenceCategoryIdByKey.set(key, row.category_id)
      }
    })

    const receipts: Array<{
      receiptId: string
      status: string
      fileId: string
      fileName: string
      storeName: string | null
      receiptDate: string | null
      receiptTime: string | null
      totalAmount: number
      currency: string
      transactions: Array<{
        id: string
        description: string
        quantity: number
        pricePerUnit: number
        totalPrice: number
        categoryName: string | null
      }>
      warnings?: ReceiptParseWarning[]
      meta?: ReceiptParseMeta
    }> = []
    const rejected: Array<{ fileName: string; reason: string }> = []

    for (const file of incoming) {
      const isPdf = isSupportedReceiptPdf(file)
      const isImage = isSupportedReceiptImage(file)

      if (!isPdf && !isImage) {
        rejected.push({ fileName: file.name, reason: "Unsupported file type (upload an image or PDF)" })
        continue
      }

      if (file.size > MAX_RECEIPT_FILE_BYTES) {
        rejected.push({ fileName: file.name, reason: "File is too large (max 10MB)" })
        continue
      }

      try {
        const stored = await saveFileToNeon({ file, source: "Receipt" })

        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const buffer = Buffer.from(arrayBuffer)

        // Determine MIME type
        const mimeType = (file.type || stored.mime_type || (isPdf ? "application/pdf" : "image/jpeg")).toLowerCase()

        // Use the unified receipt parsing pipeline
        const parseResult = await parseReceiptFile({
          data: uint8Array,
          mimeType,
          fileName: file.name,
          allowedCategories: allowedCategoryNames,
          aiExtractFromPdfText: async (pdfText: string) => {
            return extractReceiptFromPdfText({
              pdfText,
              fileName: file.name,
              allowedCategories: allowedCategoryNames,
            })
          },
          aiExtractFromImageDataUrl: async (base64DataUrl: string) => {
            return extractReceiptWithAi({
              base64DataUrl,
              fileName: file.name,
              allowedCategories: allowedCategoryNames,
            })
          },
        })

        // Store warnings and meta for the response
        const parseWarnings = parseResult.warnings
        const parseMeta = parseResult.meta

        // Check if extraction succeeded
        if (!parseResult.extracted) {
          const errorMessage = parseWarnings.length > 0
            ? parseWarnings.map(w => w.message).join(" ")
            : "Failed to extract receipt data"
          rejected.push({ fileName: file.name, reason: errorMessage })
          continue
        }

        const extracted = parseResult.extracted

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
        const currency =
          typeof extracted.currency === "string" && extracted.currency.trim().length > 0
            ? extracted.currency.trim().toUpperCase()
            : "EUR"

        const storeName =
          typeof extracted.store_name === "string" && extracted.store_name.trim().length > 0
            ? extracted.store_name.trim()
            : null

        const storeKey = normalizeReceiptStoreKey(storeName)

        const rawItems = Array.isArray(extracted.items) ? extracted.items : []
        const transactions = rawItems
          .map((item, index) => {
            const description =
              typeof item?.description === "string" ? item.description.trim() : ""

            if (!description) return null

            const quantityRaw = parseNumber(item.quantity)
            const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1
            const totalPriceRaw = parseNumber(item.total_price)
            const pricePerUnitRaw = parseNumber(item.price_per_unit)

            const inferredPricePerUnit =
              pricePerUnitRaw > 0
                ? pricePerUnitRaw
                : quantity > 0 && totalPriceRaw > 0
                  ? totalPriceRaw / quantity
                  : 0

            const normalizedPricePerUnit = Number(inferredPricePerUnit.toFixed(2))
            const computedTotal =
              totalPriceRaw > 0 ? totalPriceRaw : normalizedPricePerUnit > 0 ? normalizedPricePerUnit * quantity : 0
            const normalizedTotalPrice = Number(computedTotal.toFixed(2))

            const rawCategoryName =
              typeof item?.category === "string" ? item.category.trim() : ""
            const rawCategoryLower = rawCategoryName.toLowerCase()
            const categoryName = rawCategoryName && allowedCategorySet.has(rawCategoryLower)
              ? allowedCategoryNameByLower.get(rawCategoryLower) ?? rawCategoryName
              : "Other"

            // Debug logging for category validation
            if (rawCategoryName && !allowedCategorySet.has(rawCategoryLower)) {
              console.log(`[RECEIPT MISMATCH] Item "${description}":`)
              console.log(`  - AI returned: "${rawCategoryName}"`)
              console.log(`  - Normalized: "${rawCategoryLower}"`)
              console.log(`  - Available categories:`, Array.from(allowedCategorySet).join(", "))
              console.log(`  - Defaulting to: "Other"`)
            } else if (rawCategoryName) {
              console.log(`[RECEIPT MATCH] Item "${description}": "${rawCategoryName}" ✓`)
            }

            const descriptionKey = normalizeReceiptItemDescriptionKey(description)
            let finalCategoryName = categoryName
            let usedPreference = false
            if (descriptionKey) {
              const scopedKey = `${storeKey}::${descriptionKey}`
              const globalKey = `::${descriptionKey}`
              const preferredCategoryId =
                preferenceCategoryIdByKey.get(scopedKey) ?? preferenceCategoryIdByKey.get(globalKey) ?? null

              if (preferredCategoryId) {
                const preferredName = categoryNameById.get(preferredCategoryId) ?? null
                if (preferredName && allowedCategorySet.has(preferredName.toLowerCase())) {
                  finalCategoryName = preferredName
                  usedPreference = true
                }
              }
            }

            if (!usedPreference) {
              const heuristicSuggestion = suggestReceiptCategoryNameFromDescription({
                description,
                categoryNameByLower: allowedCategoryNameByLower,
              })

              if (heuristicSuggestion && allowedCategorySet.has(heuristicSuggestion.toLowerCase())) {
                const currentLower = finalCategoryName.toLowerCase()

                // ALWAYS use heuristic if current category is "Other"
                if (currentLower === "other") {
                  finalCategoryName = heuristicSuggestion
                  console.log(`[RECEIPT HEURISTIC] Item "${description}": "Other" → "${heuristicSuggestion}"`)
                } else {
                  // For non-Other categories, only override on drink mismatch
                  const currentBroadType = categoryBroadTypeByLowerName.get(currentLower) ?? "Other"
                  const suggestedBroadType = categoryBroadTypeByLowerName.get(heuristicSuggestion.toLowerCase()) ?? "Other"
                  const isDrinkMismatch =
                    (currentBroadType === "Drinks" && suggestedBroadType !== "Drinks") ||
                    (currentBroadType !== "Drinks" && suggestedBroadType === "Drinks")

                  if (isDrinkMismatch) {
                    finalCategoryName = heuristicSuggestion
                    console.log(`[RECEIPT HEURISTIC] Item "${description}": Drink mismatch "${categoryName}" → "${heuristicSuggestion}"`)
                  }
                }
              }
            }

            return {
              id: `${stored.id}:${index}`,
              description,
              quantity: Number(quantity.toFixed(2)),
              pricePerUnit: normalizedPricePerUnit,
              totalPrice: normalizedTotalPrice,
              categoryName: finalCategoryName,
            }
          })
          .filter((value): value is NonNullable<typeof value> => Boolean(value))

        const summedTotal = transactions.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
        const totalAmount = Math.max(parseNumber(extracted.total_amount), summedTotal)

        receipts.push({
          receiptId: stored.id,
          status: "ready",
          fileId: stored.id,
          fileName: file.name,
          storeName,
          receiptDate,
          receiptTime,
          totalAmount: Number(totalAmount.toFixed(2)),
          currency,
          transactions,
          warnings: parseWarnings.length > 0 ? parseWarnings : undefined,
          meta: parseMeta,
        })
      } catch (error: any) {
        rejected.push({ fileName: file.name, reason: String(error?.message || error) })
        continue
      }
    }

    return NextResponse.json({ receipts, rejected }, { status: 201 })
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to upload receipts." }, { status: 401 })
    }

    console.error("[Receipts Upload API] Error:", error)
    return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 })
  }
}
