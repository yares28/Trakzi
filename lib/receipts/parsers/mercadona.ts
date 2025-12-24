/**
 * =============================================================================
 * MERCADONA RECEIPT PARSER
 * =============================================================================
 * 
 * This parser is intentionally merchant-specific and test-driven.
 * 
 * DO NOT GENERALIZE THIS PARSER.
 * 
 * This file supports Mercadona PDF TEXT and OCR TEXT.
 * Do NOT move generic OCR logic here — only Mercadona-specific normalization.
 * Generic OCR belongs in lib/receipts/ocr/.
 * 
 * To add support for a new merchant:
 * 1. Create a new file in parsers/ (e.g., carrefour.ts)
 * 2. Implement the PdfTextParser interface
 * 3. Register it in parsers/index.ts
 * 
 * Any change to this parser must update fixtures/tests first.
 * =============================================================================
 */

import type { ExtractedReceipt, PdfTextParser } from "./types"
import {
    parseEuMoneyToNumber,
    toIsoDateFromAny,
    toDisplayDateDDMMYYYY,
    normalizeTimeToHHMMSS,
    trimAndCollapseSpaces,
} from "./utils"

/**
 * Check if the text is a Mercadona receipt.
 * Returns true if text contains "MERCADONA" AND ("FACTURA SIMPLIFICADA" OR "IVA BASE IMPONIBLE").
 * Works for both PDF text and OCR text.
 */
function canParse(receiptText: string): boolean {
    if (!receiptText || typeof receiptText !== "string") return false

    const upper = receiptText.toUpperCase()
    const hasMercadona = upper.includes("MERCADONA")
    const hasFactura = upper.includes("FACTURA SIMPLIFICADA")
    const hasIva = upper.includes("IVA BASE IMPONIBLE") || upper.includes("IVA BASEIMPONIBLE")

    return hasMercadona && (hasFactura || hasIva)
}

/**
 * =============================================================================
 * OCR-SPECIFIC NORMALIZATION
 * =============================================================================
 * This section contains Mercadona-specific text normalization for OCR output.
 * Keep it conservative: only fix known OCR patterns, don't rewrite arbitrary text.
 */

/**
 * Normalize OCR text for Mercadona receipts.
 * Goals:
 * - Collapse multiple spaces
 * - Normalize currency symbol variants (€, E, EUR)
 * - Normalize decimal separators safely
 * - Fix common OCR confusions ONLY in numeric contexts
 */
function normalizeMercadonaReceiptTextForOcr(input: string): string {
    let text = input

    // Collapse multiple spaces to single space
    text = text.replace(/[ \t]+/g, " ")

    // Normalize line endings
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

    // Normalize currency symbol variants to €
    // "TOTAL (E)" or "TOTAL(E)" -> "TOTAL (€)"
    text = text.replace(/TOTAL\s*\(\s*E\s*\)/gi, "TOTAL (€)")
    // "EUR" standalone after amounts -> "€"
    text = text.replace(/(\d[.,]\d{2})\s*EUR\b/g, "$1 €")

    // Fix common OCR mistakes in numeric contexts:
    // - "O" (letter O) mistaken for "0" in prices
    // Only apply to patterns that look like prices: e.g., "1O,50" -> "10,50"
    text = text.replace(/(\d)O(\d)/g, "$10$2")
    text = text.replace(/(\d)O([.,])/g, "$10$2")  // Handle O before decimal separator
    text = text.replace(/O(\d)/g, "0$1")

    // Fix "l" (lowercase L) mistaken for "1" in prices at start of line (qty)
    text = text.replace(/^l\s+/gm, "1 ")

    // Normalize decimal separators in price contexts
    // Handle OCR mixing dots and commas: "3.20" in Spanish should be "3,20"
    // But be careful: we want to preserve both as the parser handles both

    // Fix spacing issues around prices: "0, 80" -> "0,80"
    text = text.replace(/(\d)\s*,\s*(\d)/g, "$1,$2")
    text = text.replace(/(\d)\s*\.\s*(\d)/g, "$1.$2")

    // Trim each line
    text = text
        .split("\n")
        .map((line) => line.trim())
        .join("\n")

    return text
}

/**
 * =============================================================================
 * EXTRACTION FUNCTIONS
 * =============================================================================
 */

/**
 * Extract store name from Mercadona receipt.
 * Normalizes to exactly "MERCADONA, S.A" (removes trailing dot if present).
 */
function extractStoreName(receiptText: string): string {
    // Look for the header line containing MERCADONA, S.A
    // OCR might produce variations like "MERCADONA, SA" or "MERCADONA S.A"
    const match = receiptText.match(/MERCADONA[,.]?\s*S\.?A\.?/i)
    if (match) {
        // Normalize to standard format
        return "MERCADONA, S.A"
    }
    return "MERCADONA, S.A"
}

/**
 * Extract receipt date and time.
 * Format in PDF: "20/12/2025 19:32" or similar.
 * OCR might introduce spaces or different separators.
 */
function extractDateAndTime(receiptText: string): { receipt_date: string | null; receipt_date_iso: string | null; receipt_time: string | null } {
    // Match patterns like: 20/12/2025 19:32 or 20-12-2025 19:32:10
    // Also handle OCR variations with spaces: "20 / 12 / 2025"
    const dateTimeRegex = /(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{2,4})\s+(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?/
    const match = receiptText.match(dateTimeRegex)

    if (match) {
        const [, day, month, year, hour, minute, seconds] = match
        const dateStr = `${day}/${month}/${year}`

        // Convert date to ISO
        const isoDate = toIsoDateFromAny(dateStr)
        const displayDate = isoDate ? toDisplayDateDDMMYYYY(isoDate) : null

        // Normalize time to HH:MM:SS
        const timeBase = `${hour.padStart(2, "0")}:${minute}`
        const fullTime = seconds ? `${timeBase}:${seconds}` : timeBase
        const normalizedTime = normalizeTimeToHHMMSS(fullTime)

        return {
            receipt_date: displayDate,
            receipt_date_iso: isoDate,
            receipt_time: normalizedTime,
        }
    }

    return { receipt_date: null, receipt_date_iso: null, receipt_time: null }
}

/**
 * Detect currency from receipt text.
 * Returns "EUR" if € symbol or "TOTAL (€)" is found.
 * Also handles OCR variant "TOTAL (E)".
 */
function extractCurrency(receiptText: string): string | null {
    const upper = receiptText.toUpperCase()
    if (receiptText.includes("€") || upper.includes("TOTAL (€)") || upper.includes("TOTAL (E)") || upper.includes("EUR")) {
        return "EUR"
    }
    return null
}

/**
 * Extract total amount from receipt.
 * Prefers "Importe:" line, falls back to "TOTAL (€)" line.
 */
function extractTotalAmount(receiptText: string): number | null {
    // First try: "Importe: 61,36" (with OCR spacing tolerance)
    const importeMatch = receiptText.match(/Importe\s*:\s*([0-9]{1,6}[.,][0-9]{2})/i)
    if (importeMatch) {
        return parseEuMoneyToNumber(importeMatch[1])
    }

    // Fallback: "TOTAL (€) 61,36" or OCR variant "TOTAL (E) 61,36"
    const totalMatch = receiptText.match(/TOTAL\s*\([€E]\)\s*([0-9]{1,6}[.,][0-9]{2})/i)
    if (totalMatch) {
        return parseEuMoneyToNumber(totalMatch[1])
    }

    return null
}

/**
 * Extract VAT total CUOTA from the tax section.
 * Looks for "IVA BASE IMPONIBLE ... CUOTA" header, then finds
 * the TOTAL line with two amounts, and takes the second (CUOTA).
 */
function extractTaxesTotalCuota(receiptText: string): number | null {
    const upper = receiptText.toUpperCase()
    // Check if VAT section exists (with OCR tolerance for spacing)
    if (!upper.includes("IVA") || (!upper.includes("BASE IMPONIBLE") && !upper.includes("BASEIMPONIBLE"))) {
        return null
    }

    // Split by lines and find the VAT section
    const lines = receiptText.split(/\r?\n/)
    let inVatSection = false

    for (const line of lines) {
        const upperLine = line.toUpperCase()

        // Look for start of VAT section
        if (upperLine.includes("IVA") && (upperLine.includes("BASE IMPONIBLE") || upperLine.includes("BASEIMPONIBLE"))) {
            inVatSection = true
            continue
        }

        // In VAT section, look for TOTAL line with two amounts
        if (inVatSection && upperLine.startsWith("TOTAL")) {
            // Match: TOTAL 55,56 5,80 (with flexible spacing)
            const totalMatch = line.match(/^TOTAL\s+([0-9]{1,6}[.,][0-9]{2})\s+([0-9]{1,6}[.,][0-9]{2})/i)
            if (totalMatch) {
                // Return the second amount (CUOTA)
                return parseEuMoneyToNumber(totalMatch[2])
            }
        }

        // Exit VAT section when we hit certain markers
        if (inVatSection && (upperLine.includes("IMPORTE:") || upperLine.includes("FORMA DE PAGO"))) {
            break
        }
    }

    return null
}

/**
 * Extract money-like tokens from a line (for OCR-tolerant parsing).
 * Returns all matches of decimal numbers that look like prices.
 */
function extractMoneyTokens(line: string): number[] {
    const matches = line.match(/\d{1,6}[.,]\d{2}/g) || []
    return matches.map((m) => parseEuMoneyToNumber(m))
}

/**
 * Parse item lines from the receipt.
 * Items appear between "Descripción" header and "TOTAL" line.
 * 
 * This uses a "parse from right" strategy for OCR tolerance:
 * 1. Extract all money tokens from the line
 * 2. Last token = total_price
 * 3. If 2+ tokens: second-to-last = price_per_unit
 * 4. Quantity from the start of the line
 * 5. Description = text between quantity and first money token
 */
function extractItems(receiptText: string): ExtractedReceipt["items"] {
    const lines = receiptText.split(/\r?\n/)
    const items: NonNullable<ExtractedReceipt["items"]> = []

    let inItemsSection = false

    for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Look for start of items section (OCR may have spacing issues)
        if (/^Descripci[oó]n/i.test(trimmedLine.replace(/\s+/g, ""))) {
            inItemsSection = true
            continue
        }

        // End of items section at TOTAL line
        if (inItemsSection && /^TOTAL\s*(\([€E]\)|$)/i.test(trimmedLine)) {
            break
        }

        if (!inItemsSection) continue

        // Skip header-like lines
        if (/P\.?\s*Unit/i.test(trimmedLine) || /^Importe$/i.test(trimmedLine)) {
            continue
        }

        // Try OCR-tolerant "parse from right" strategy
        const moneyTokens = extractMoneyTokens(trimmedLine)

        if (moneyTokens.length === 0) {
            // No prices found, skip this line
            continue
        }

        // Check if line starts with quantity
        const qtyMatch = trimmedLine.match(/^(\d+(?:[.,]\d+)?)\s+/)
        if (!qtyMatch) {
            // Doesn't look like an item line
            continue
        }

        const quantity = parseEuMoneyToNumber(qtyMatch[1]) || 1
        const afterQty = trimmedLine.slice(qtyMatch[0].length)

        // Find where the first money token starts in the remaining text
        const firstMoneyMatch = afterQty.match(/\d{1,6}[.,]\d{2}/)
        if (!firstMoneyMatch || firstMoneyMatch.index === undefined) {
            continue
        }

        // Description is everything before the first money token
        const description = trimAndCollapseSpaces(afterQty.slice(0, firstMoneyMatch.index))
        if (!description) continue

        // Determine prices - improved logic for qty > 1
        let totalPrice: number
        let pricePerUnit: number

        if (moneyTokens.length >= 2) {
            // Two prices: could be (unit_price, total_price) or misparsed
            const price1 = moneyTokens[moneyTokens.length - 2]
            const price2 = moneyTokens[moneyTokens.length - 1]

            // Validate: if qty * price1 ≈ price2, then price1 is unit, price2 is total
            const expectedTotal = quantity * price1
            const tolerance = 0.02 // 2 cents tolerance for rounding

            if (Math.abs(expectedTotal - price2) <= tolerance) {
                // Correct order: unit_price, total_price
                pricePerUnit = price1
                totalPrice = price2
            } else if (Math.abs(quantity * price2 - price1) <= tolerance) {
                // Reversed order: total_price, unit_price (unlikely but check)
                pricePerUnit = price2
                totalPrice = price1
            } else if (quantity === 1) {
                // qty=1: both should be equal, take the last as total
                pricePerUnit = price2
                totalPrice = price2
            } else {
                // Can't determine relationship, use last as total and compute unit
                totalPrice = price2
                pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
            }
        } else {
            // Single price: it's the total, compute unit price
            totalPrice = moneyTokens[0]
            pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
        }

        items.push({
            description,
            quantity: Number(quantity.toFixed(2)),
            price_per_unit: Number(pricePerUnit.toFixed(2)),
            total_price: Number(totalPrice.toFixed(2)),
            category: null, // IMPORTANT: Do not assign category here
        })
    }

    return items
}

/**
 * =============================================================================
 * VALIDATION
 * =============================================================================
 */

/**
 * Check if the extracted receipt has minimal required fields.
 * Used to determine if deterministic parsing succeeded.
 */
function hasMinimalMercadonaFields(extracted: ExtractedReceipt): boolean {
    // Must have store_name as MERCADONA
    if (extracted.store_name !== "MERCADONA, S.A") {
        return false
    }

    // Must have date (either ISO or display format)
    if (!extracted.receipt_date_iso && !extracted.receipt_date) {
        return false
    }

    // Must have total amount
    if (typeof extracted.total_amount !== "number" || extracted.total_amount <= 0) {
        return false
    }

    // Must have at least one item
    if (!Array.isArray(extracted.items) || extracted.items.length === 0) {
        return false
    }

    // VALIDATION: Sum of item total_prices should match receipt total
    // Allow 5% tolerance for rounding errors and missed items
    const calculatedTotal = extracted.items.reduce((sum, item) => {
        const itemTotal = typeof item.total_price === "number" ? item.total_price : 0
        return sum + itemTotal
    }, 0)

    const tolerance = extracted.total_amount * 0.05 // 5% tolerance
    const difference = Math.abs(calculatedTotal - extracted.total_amount)

    if (difference > tolerance && difference > 0.50) {
        // Large discrepancy - likely misparsed items
        console.log("[Mercadona Parser] Total validation failed:", {
            extractedTotal: extracted.total_amount,
            calculatedTotal: calculatedTotal.toFixed(2),
            difference: difference.toFixed(2),
        })
        return false
    }

    return true
}

/**
 * =============================================================================
 * MAIN PARSING FUNCTIONS
 * =============================================================================
 */

/**
 * Parse Mercadona receipt text into structured data.
 */
function parse(receiptText: string): { extracted: ExtractedReceipt; rawText: string } {
    const storeName = extractStoreName(receiptText)
    const { receipt_date, receipt_date_iso, receipt_time } = extractDateAndTime(receiptText)
    const currency = extractCurrency(receiptText)
    const totalAmount = extractTotalAmount(receiptText)
    const taxesTotalCuota = extractTaxesTotalCuota(receiptText)
    const items = extractItems(receiptText)

    const extracted: ExtractedReceipt = {
        store_name: storeName,
        receipt_date,
        receipt_date_iso,
        receipt_time,
        currency,
        total_amount: totalAmount,
        taxes_total_cuota: taxesTotalCuota,
        items,
    }

    return { extracted, rawText: receiptText }
}

/**
 * Try to parse Mercadona receipt from text (PDF or OCR).
 * 
 * @param params.text - The receipt text (from PDF extraction or OCR)
 * @param params.source - Whether text is from "pdf" or "ocr"
 * @returns Parse result with ok=false if minimal fields are missing
 */
export function tryParseMercadonaFromText(params: {
    text: string
    source: "pdf" | "ocr"
}): { extracted: ExtractedReceipt | null; rawText: string; ok: boolean } {
    const { text, source } = params

    // Apply OCR normalization if from OCR source
    const normalizedText = source === "ocr"
        ? normalizeMercadonaReceiptTextForOcr(text)
        : text

    // Parse the text
    const { extracted, rawText } = parse(normalizedText)

    // Validate minimal fields
    const ok = hasMinimalMercadonaFields(extracted)

    return {
        extracted: ok ? extracted : null,
        rawText,
        ok,
    }
}

/**
 * Mercadona receipt text parser.
 * Implements the PdfTextParser interface for Mercadona receipts.
 */
export const mercadonaParser: PdfTextParser = {
    id: "mercadona",
    canParse,
    parse,
}

// Export individual functions for testing and pipeline use
export { canParse, parse, hasMinimalMercadonaFields, normalizeMercadonaReceiptTextForOcr }
