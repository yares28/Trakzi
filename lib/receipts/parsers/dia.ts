/**
 * =============================================================================
 * DIA RECEIPT PARSER
 * =============================================================================
 *
 * This parser is intentionally merchant-specific and test-driven.
 *
 * DO NOT GENERALIZE THIS PARSER.
 *
 * This file supports Dia PDF TEXT and OCR TEXT.
 * Do NOT move generic OCR logic here — only Dia-specific normalization.
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
 * Check if the text is a Dia receipt.
 * Returns true if text contains "DIA RETAIL" or "Products sold by Dia"
 * AND ("Simplified invoice" OR "VAT breakdown").
 * Works for both PDF text and OCR text.
 */
function canParse(receiptText: string): boolean {
    if (!receiptText || typeof receiptText !== "string") return false

    const upper = receiptText.toUpperCase()
    const hasDia = upper.includes("DIA RETAIL") || upper.includes("PRODUCTS SOLD BY DIA") || upper.includes("SOLD BY DIA")
    const hasInvoice = upper.includes("SIMPLIFIED INVOICE") || upper.includes("VAT BREAKDOWN")

    return hasDia && hasInvoice
}

/**
 * =============================================================================
 * OCR-SPECIFIC NORMALIZATION
 * =============================================================================
 */

/**
 * Normalize OCR text for Dia receipts.
 */
function normalizeDiaReceiptTextForOcr(input: string): string {
    let text = input

    // Collapse multiple spaces to single space
    text = text.replace(/[ \t]+/g, " ")

    // Normalize line endings
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

    // Fix common OCR mistakes in numeric contexts
    text = text.replace(/(\d)O(\d)/g, "$10$2")
    text = text.replace(/(\d)O([.,])/g, "$10$2")
    text = text.replace(/O(\d)/g, "0$1")

    // Fix "l" (lowercase L) mistaken for "1"
    text = text.replace(/^l\s+/gm, "1 ")

    // Fix spacing issues around prices
    text = text.replace(/(\d)\s*,\s*(\d)/g, "$1,$2")
    text = text.replace(/(\d)\s*\.\s*(\d)/g, "$1.$2")

    // Normalize € symbol variations
    text = text.replace(/E(\d)/g, "€$1")
    text = text.replace(/(\d)E/g, "$1€")

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
 * Extract store name from Dia receipt.
 * Normalizes to exactly "DIA RETAIL ESPAÑA, S.A.U."
 */
function extractStoreName(receiptText: string): string {
    const match = receiptText.match(/DIA\s+RETAIL\s+ESPA[ÑN]A[,.]?\s*S\.?A\.?U?\.?/i)
    if (match) {
        return "DIA RETAIL ESPAÑA, S.A.U."
    }
    // Fallback if "DIA RETAIL" is found
    if (receiptText.toUpperCase().includes("DIA RETAIL")) {
        return "DIA RETAIL ESPAÑA, S.A.U."
    }
    return "DIA"
}

/**
 * Extract receipt date and time.
 * Dia format in header: "17/01/2026 11:51 Store Number 1032"
 * Or in operation data: "FECHA: 17/01/2026 HORA: 11:52"
 */
function extractDateAndTime(receiptText: string): { receipt_date: string | null; receipt_date_iso: string | null; receipt_time: string | null } {
    // Try header format: "17/01/2026 11:51"
    const headerDateTimeRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
    let match = receiptText.match(headerDateTimeRegex)

    if (match) {
        const [, day, month, year, hour, minute, seconds] = match
        const dateStr = `${day}/${month}/${year}`

        const isoDate = toIsoDateFromAny(dateStr)
        const displayDate = isoDate ? toDisplayDateDDMMYYYY(isoDate) : null

        const timeBase = `${hour.padStart(2, "0")}:${minute}`
        const fullTime = seconds ? `${timeBase}:${seconds}` : timeBase
        const normalizedTime = normalizeTimeToHHMMSS(fullTime)

        return {
            receipt_date: displayDate,
            receipt_date_iso: isoDate,
            receipt_time: normalizedTime,
        }
    }

    // Try operation data format: "FECHA: 17/01/2026 HORA: 11:52"
    const fechaMatch = receiptText.match(/FECHA\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i)
    const horaMatch = receiptText.match(/HORA\s*:\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i)

    if (fechaMatch) {
        const [, day, month, year] = fechaMatch
        const dateStr = `${day}/${month}/${year}`
        const isoDate = toIsoDateFromAny(dateStr)
        const displayDate = isoDate ? toDisplayDateDDMMYYYY(isoDate) : null

        let normalizedTime: string | null = null
        if (horaMatch) {
            const [, hour, minute, seconds] = horaMatch
            const timeBase = `${hour.padStart(2, "0")}:${minute}`
            const fullTime = seconds ? `${timeBase}:${seconds}` : timeBase
            normalizedTime = normalizeTimeToHHMMSS(fullTime)
        }

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
 * Returns "EUR" if € symbol or EUROS is found.
 */
function extractCurrency(receiptText: string): string | null {
    if (receiptText.includes("€") || receiptText.toUpperCase().includes("EUROS") || receiptText.toUpperCase().includes("EUR")) {
        return "EUR"
    }
    return null
}

/**
 * Extract total amount from receipt.
 * Dia uses "Total to pay" with €-prefixed amount
 */
function extractTotalAmount(receiptText: string): number | null {
    // Try: "Total to pay" followed by €amount (possibly with dash before amount)
    // Format: "Total to pay ─────────────────────────────────────────-€13,03"
    const totalToPayMatch = receiptText.match(/Total\s+to\s+pay[─\-\s]*€?\s*([0-9]{1,6}[.,][0-9]{2})/i)
    if (totalToPayMatch) {
        return parseEuMoneyToNumber(totalToPayMatch[1])
    }

    // Alternative: "Total sale Day" (at bottom of products section)
    const totalSaleMatch = receiptText.match(/Total\s+sale\s+Day[─\-\s]*€?\s*([0-9]{1,6}[.,][0-9]{2})/i)
    if (totalSaleMatch) {
        return parseEuMoneyToNumber(totalSaleMatch[1])
    }

    // Fallback: IMPORTE: followed by amount
    const importeMatch = receiptText.match(/IMPORTE\s*:\s*([0-9]{1,6}[.,][0-9]{2})\s*(?:€|EUROS?)?/i)
    if (importeMatch) {
        return parseEuMoneyToNumber(importeMatch[1])
    }

    return null
}

/**
 * Extract VAT total QUOTA from the tax section.
 * Dia format:
 * VAT breakdown
 * TYPE    VAT     BASE    QUOTA
 * A       4%      €1,01   €0,04
 * B       10%     €7,86   €0,79
 * C       21%     €2,75   €0,58
 *
 * Sum the "QUOTA" column
 */
function extractTaxesTotalCuota(receiptText: string): number | null {
    const upper = receiptText.toUpperCase()
    if (!upper.includes("VAT BREAKDOWN") && !upper.includes("IVA")) {
        return null
    }

    const lines = receiptText.split(/\r?\n/)
    let inVatSection = false
    let totalQuota = 0
    let foundQuota = false

    for (const line of lines) {
        const upperLine = line.toUpperCase()

        // Look for VAT header
        if (upperLine.includes("VAT BREAKDOWN") || (upperLine.includes("TYPE") && upperLine.includes("QUOTA"))) {
            inVatSection = true
            continue
        }

        // In VAT section, look for lines with VAT data
        if (inVatSection) {
            // Match: "A 4% €1,01 €0,04" or "B 10% €7,86 €0,79"
            // The QUOTA is the last €-prefixed number
            const quotaMatches = line.match(/€([0-9]{1,6}[.,][0-9]{2})/g)
            if (quotaMatches && quotaMatches.length >= 2) {
                // Last match is the QUOTA
                const quotaValue = quotaMatches[quotaMatches.length - 1].replace("€", "")
                totalQuota += parseEuMoneyToNumber(quotaValue)
                foundQuota = true
            } else if (foundQuota && upperLine.includes("VAT INCLUDED")) {
                // End of VAT section
                break
            }
        }
    }

    return foundQuota ? Number(totalQuota.toFixed(2)) : null
}

/**
 * Parse item lines from the receipt.
 * Dia format:
 * Products sold by Dia
 * DESCRIPTION    QUANTITY    KG PRICE    TOTAL
 * NAPOLITANA CHOCOLATE    2 ud    €0,55    €1,10    B
 *
 * Items can also have discounts (negative values in red):
 * NAPOLITANA JAM/AT/BA                    -€0,08
 */
function extractItems(receiptText: string): ExtractedReceipt["items"] {
    const lines = receiptText.split(/\r?\n/)
    const items: NonNullable<ExtractedReceipt["items"]> = []

    let inItemsSection = false

    for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Look for start of items section
        if (trimmedLine.toLowerCase().includes("products sold by dia") ||
            (trimmedLine.toUpperCase().includes("DESCRIPTION") && trimmedLine.toUpperCase().includes("QUANTITY"))) {
            inItemsSection = true
            continue
        }

        // End of items section
        if (inItemsSection && (
            trimmedLine.toLowerCase().includes("total sale day") ||
            trimmedLine.toLowerCase().includes("vat breakdown") ||
            trimmedLine.toLowerCase().includes("payment method")
        )) {
            break
        }

        if (!inItemsSection) continue

        // Skip header line
        if (trimmedLine.toUpperCase().includes("DESCRIPTION") && trimmedLine.toUpperCase().includes("QUANTITY")) {
            continue
        }

        // Try to parse item line
        // Dia format: DESCRIPTION    qty ud    €unit_price    €total_price    VAT_LETTER
        // Or discount: DESCRIPTION    -€amount

        // Check for discount line (negative amount, no quantity)
        const discountMatch = trimmedLine.match(/^(.+?)\s+-€([0-9]{1,6}[.,][0-9]{2})(?:\s+[A-C])?$/i)
        if (discountMatch) {
            const description = trimAndCollapseSpaces(discountMatch[1])
            const discountAmount = parseEuMoneyToNumber(discountMatch[2])
            if (description && discountAmount > 0) {
                items.push({
                    description: description,
                    quantity: 1,
                    price_per_unit: -discountAmount,
                    total_price: -discountAmount,
                    category: null,
                })
            }
            continue
        }

        // Regular item: DESCRIPTION    qty ud    €unit_price    €total_price    VAT_LETTER
        // Extract € amounts from line
        const euroMatches = trimmedLine.match(/€([0-9]{1,6}[.,][0-9]{2})/g) || []
        const moneyValues = euroMatches.map(m => parseEuMoneyToNumber(m.replace("€", "")))

        if (moneyValues.length === 0) {
            continue
        }

        // Extract quantity (number followed by "ud")
        const qtyMatch = trimmedLine.match(/(\d+)\s*ud/i)
        const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1

        // Find description: everything before the quantity or first €
        let description = ""
        const qtyIndex = qtyMatch ? trimmedLine.indexOf(qtyMatch[0]) : -1
        const euroIndex = trimmedLine.indexOf("€")

        if (qtyIndex > 0) {
            description = trimAndCollapseSpaces(trimmedLine.slice(0, qtyIndex))
        } else if (euroIndex > 0) {
            description = trimAndCollapseSpaces(trimmedLine.slice(0, euroIndex))
        }

        if (!description) continue

        // Determine prices
        let totalPrice: number
        let pricePerUnit: number

        if (moneyValues.length >= 2) {
            // Two prices: unit_price and total_price
            pricePerUnit = moneyValues[0]
            totalPrice = moneyValues[1]

            // Validate calculation
            const expectedTotal = quantity * pricePerUnit
            const tolerance = 0.02
            if (Math.abs(expectedTotal - totalPrice) > tolerance && quantity > 1) {
                // Might be reversed or different, use last as total
                totalPrice = moneyValues[moneyValues.length - 1]
                pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
            }
        } else {
            // Single price: it's the total
            totalPrice = moneyValues[0]
            pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
        }

        items.push({
            description,
            quantity: quantity,
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
 */
function hasMinimalDiaFields(extracted: ExtractedReceipt): boolean {
    // Must have store_name containing DIA
    if (!extracted.store_name?.toUpperCase().includes("DIA")) {
        return false
    }

    // Must have date
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

    // Validate sum of items matches total (5% tolerance)
    const calculatedTotal = extracted.items.reduce((sum, item) => {
        const itemTotal = typeof item.total_price === "number" ? item.total_price : 0
        return sum + itemTotal
    }, 0)

    const tolerance = extracted.total_amount * 0.05
    const difference = Math.abs(calculatedTotal - extracted.total_amount)

    if (difference > tolerance && difference > 0.50) {
        console.log("[Dia Parser] Total validation failed:", {
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
 * Parse Dia receipt text into structured data.
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
 * Try to parse Dia receipt from text (PDF or OCR).
 */
export function tryParseDiaFromText(params: {
    text: string
    source: "pdf" | "ocr"
}): { extracted: ExtractedReceipt | null; rawText: string; ok: boolean } {
    const { text, source } = params

    const normalizedText = source === "ocr"
        ? normalizeDiaReceiptTextForOcr(text)
        : text

    const { extracted, rawText } = parse(normalizedText)
    const ok = hasMinimalDiaFields(extracted)

    return {
        extracted: ok ? extracted : null,
        rawText,
        ok,
    }
}

/**
 * Dia receipt text parser.
 * Implements the PdfTextParser interface for Dia receipts.
 */
export const diaParser: PdfTextParser = {
    id: "dia",
    canParse,
    parse,
}

// Export individual functions for testing
export { canParse, parse, hasMinimalDiaFields, normalizeDiaReceiptTextForOcr }
