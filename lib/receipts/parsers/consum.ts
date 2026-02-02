/**
 * =============================================================================
 * CONSUM RECEIPT PARSER
 * =============================================================================
 *
 * This parser is intentionally merchant-specific and test-driven.
 *
 * DO NOT GENERALIZE THIS PARSER.
 *
 * This file supports Consum PDF TEXT and OCR TEXT.
 * Do NOT move generic OCR logic here — only Consum-specific normalization.
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
 * Check if the text is a Consum receipt.
 * Returns true if text contains "CONSUM" AND "FACTURA SIMPLIFICADA".
 * Works for both PDF text and OCR text.
 */
function canParse(receiptText: string): boolean {
    if (!receiptText || typeof receiptText !== "string") return false

    const upper = receiptText.toUpperCase()
    const hasConsum = upper.includes("CONSUM")
    const hasFactura = upper.includes("FACTURA SIMPLIFICADA")
    // Additional check to differentiate from other stores
    const hasConsumIdentifier = upper.includes("CONSUM, S.COOP") || upper.includes("CONSUM S.COOP")

    return hasConsum && hasFactura && hasConsumIdentifier
}

/**
 * =============================================================================
 * OCR-SPECIFIC NORMALIZATION
 * =============================================================================
 */

/**
 * Normalize OCR text for Consum receipts.
 */
function normalizeConsumReceiptTextForOcr(input: string): string {
    let text = input

    // Collapse multiple spaces to single space
    text = text.replace(/[ \t]+/g, " ")

    // Normalize line endings
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

    // Fix common OCR mistakes in numeric contexts
    text = text.replace(/(\d)O(\d)/g, "$10$2")
    text = text.replace(/(\d)O([.,])/g, "$10$2")
    text = text.replace(/O(\d)/g, "0$1")

    // Fix "l" (lowercase L) mistaken for "1" at start of line (qty)
    text = text.replace(/^l\s+/gm, "1 ")

    // Fix spacing issues around prices
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
 * Extract store name from Consum receipt.
 * Normalizes to exactly "CONSUM, S.COOP.V."
 */
function extractStoreName(receiptText: string): string {
    const match = receiptText.match(/CONSUM[,.]?\s*S\.?COOP\.?V?\.?/i)
    if (match) {
        return "CONSUM, S.COOP.V."
    }
    return "CONSUM, S.COOP.V."
}

/**
 * Extract receipt date and time.
 * Consum format: "C:0012 02/000027 07.01.2026 11:20 644828"
 * Date uses dots: DD.MM.YYYY
 */
function extractDateAndTime(receiptText: string): { receipt_date: string | null; receipt_date_iso: string | null; receipt_time: string | null } {
    // Match pattern like: 07.01.2026 11:20
    // Consum uses dots for date separator
    const dateTimeRegex = /(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
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
 * Returns "EUR" if € symbol is found.
 */
function extractCurrency(receiptText: string): string | null {
    if (receiptText.includes("€") || receiptText.toUpperCase().includes("EUR")) {
        return "EUR"
    }
    return null
}

/**
 * Extract total amount from receipt.
 * Consum uses "Total factura:" or "IMPORTE A ABONAR"
 */
function extractTotalAmount(receiptText: string): number | null {
    // First try: "Total factura: 23,51"
    const totalFacturaMatch = receiptText.match(/Total\s+factura\s*:\s*([0-9]{1,6}[.,][0-9]{2})/i)
    if (totalFacturaMatch) {
        return parseEuMoneyToNumber(totalFacturaMatch[1])
    }

    // Fallback: "IMPORTE A ABONAR 23,51"
    const importeMatch = receiptText.match(/IMPORTE\s+A\s+ABONAR\s+([0-9]{1,6}[.,][0-9]{2})/i)
    if (importeMatch) {
        return parseEuMoneyToNumber(importeMatch[1])
    }

    return null
}

/**
 * Extract VAT total CUOTA from the tax section.
 * Consum format:
 * FACTURA SIMPLIFICADA
 * Base IVA Cuota Importe
 * 12,33 10,00 1,24 13,57
 * 8,20 21,00 1,74 9,94
 *
 * Sum the "Cuota" column (3rd number in each line)
 */
function extractTaxesTotalCuota(receiptText: string): number | null {
    const upper = receiptText.toUpperCase()
    if (!upper.includes("FACTURA SIMPLIFICADA")) {
        return null
    }

    const lines = receiptText.split(/\r?\n/)
    let inVatSection = false
    let totalCuota = 0
    let foundCuota = false

    for (const line of lines) {
        const upperLine = line.toUpperCase()

        // Look for VAT header
        if (upperLine.includes("BASE") && upperLine.includes("IVA") && upperLine.includes("CUOTA")) {
            inVatSection = true
            continue
        }

        // In VAT section, look for lines with 4 numbers (Base, IVA%, Cuota, Importe)
        if (inVatSection) {
            // Match: "12,33 10,00 1,24 13,57"
            const vatLineMatch = line.match(/^\s*([0-9]{1,6}[.,][0-9]{2})\s+([0-9]{1,3}[.,][0-9]{2})\s+([0-9]{1,6}[.,][0-9]{2})\s+([0-9]{1,6}[.,][0-9]{2})\s*$/)
            if (vatLineMatch) {
                const cuota = parseEuMoneyToNumber(vatLineMatch[3])
                totalCuota += cuota
                foundCuota = true
            } else if (foundCuota && !line.trim().match(/^[0-9]/)) {
                // End of VAT lines
                break
            }
        }
    }

    return foundCuota ? Number(totalCuota.toFixed(2)) : null
}

/**
 * Extract money-like tokens from a line.
 */
function extractMoneyTokens(line: string): number[] {
    const matches = line.match(/\d{1,6}[.,]\d{2}/g) || []
    return matches.map((m) => parseEuMoneyToNumber(m))
}

/**
 * Parse item lines from the receipt.
 * Consum format:
 * Items appear after the header line (UND PVP / KG ARTICULO €/KG TOTAL)
 * and before "Total factura:"
 *
 * Format examples:
 * "1 PASTEL CREMA 3U 1,29" (qty=1, no unit price, total=1.29)
 * "2 RED BULL SANDÍA 0,2 1,59 3,18" (qty=2, unit=1.59, total=3.18)
 */
function extractItems(receiptText: string): ExtractedReceipt["items"] {
    const lines = receiptText.split(/\r?\n/)
    const items: NonNullable<ExtractedReceipt["items"]> = []

    let inItemsSection = false

    for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Look for start of items section (after the dashed line following header)
        if (trimmedLine.includes("---") || trimmedLine.match(/^-{5,}$/)) {
            inItemsSection = true
            continue
        }

        // End of items section
        if (inItemsSection && (
            trimmedLine.toLowerCase().startsWith("total factura") ||
            trimmedLine.toLowerCase().startsWith("importe a abonar") ||
            trimmedLine.toLowerCase().includes("socio-cliente")
        )) {
            break
        }

        if (!inItemsSection) continue

        // Skip non-item lines
        if (trimmedLine.startsWith("---") || trimmedLine.match(/^-{5,}$/)) {
            continue
        }

        // Try to parse item line
        // Consum format: qty description [unit_price] total_price
        const moneyTokens = extractMoneyTokens(trimmedLine)

        if (moneyTokens.length === 0) {
            continue
        }

        // Check if line starts with quantity
        const qtyMatch = trimmedLine.match(/^(\d+(?:[.,]\d+)?)\s+/)
        if (!qtyMatch) {
            continue
        }

        const quantity = parseEuMoneyToNumber(qtyMatch[1]) || 1
        const afterQty = trimmedLine.slice(qtyMatch[0].length)

        // Find where the first money token starts
        const firstMoneyMatch = afterQty.match(/\d{1,6}[.,]\d{2}/)
        if (!firstMoneyMatch || firstMoneyMatch.index === undefined) {
            continue
        }

        // Description is everything before the first money token
        const description = trimAndCollapseSpaces(afterQty.slice(0, firstMoneyMatch.index))
        if (!description) continue

        // Determine prices
        let totalPrice: number
        let pricePerUnit: number

        if (moneyTokens.length >= 2) {
            const price1 = moneyTokens[moneyTokens.length - 2]
            const price2 = moneyTokens[moneyTokens.length - 1]

            // Validate: if qty * price1 ≈ price2, then price1 is unit, price2 is total
            const expectedTotal = quantity * price1
            const tolerance = 0.02

            if (Math.abs(expectedTotal - price2) <= tolerance) {
                pricePerUnit = price1
                totalPrice = price2
            } else if (quantity === 1) {
                pricePerUnit = price2
                totalPrice = price2
            } else {
                totalPrice = price2
                pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
            }
        } else {
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
 */
function hasMinimalConsumFields(extracted: ExtractedReceipt): boolean {
    if (extracted.store_name !== "CONSUM, S.COOP.V.") {
        return false
    }

    if (!extracted.receipt_date_iso && !extracted.receipt_date) {
        return false
    }

    if (typeof extracted.total_amount !== "number" || extracted.total_amount <= 0) {
        return false
    }

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
        console.log("[Consum Parser] Total validation failed:", {
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
 * Parse Consum receipt text into structured data.
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
 * Try to parse Consum receipt from text (PDF or OCR).
 */
export function tryParseConsumFromText(params: {
    text: string
    source: "pdf" | "ocr"
}): { extracted: ExtractedReceipt | null; rawText: string; ok: boolean } {
    const { text, source } = params

    const normalizedText = source === "ocr"
        ? normalizeConsumReceiptTextForOcr(text)
        : text

    const { extracted, rawText } = parse(normalizedText)
    const ok = hasMinimalConsumFields(extracted)

    return {
        extracted: ok ? extracted : null,
        rawText,
        ok,
    }
}

/**
 * Consum receipt text parser.
 * Implements the PdfTextParser interface for Consum receipts.
 */
export const consumParser: PdfTextParser = {
    id: "consum",
    canParse,
    parse,
}

// Export individual functions for testing
export { canParse, parse, hasMinimalConsumFields, normalizeConsumReceiptTextForOcr }
