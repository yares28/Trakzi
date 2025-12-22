/**
 * =============================================================================
 * MERCADONA RECEIPT PARSER
 * =============================================================================
 * 
 * This parser is intentionally merchant-specific and test-driven.
 * 
 * DO NOT GENERALIZE THIS PARSER.
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
 * Check if the PDF text is a Mercadona receipt.
 * Returns true if text contains "MERCADONA" AND ("FACTURA SIMPLIFICADA" OR "IVA BASE IMPONIBLE").
 */
function canParse(pdfText: string): boolean {
    if (!pdfText || typeof pdfText !== "string") return false

    const upper = pdfText.toUpperCase()
    const hasMercadona = upper.includes("MERCADONA")
    const hasFactura = upper.includes("FACTURA SIMPLIFICADA")
    const hasIva = upper.includes("IVA BASE IMPONIBLE")

    return hasMercadona && (hasFactura || hasIva)
}

/**
 * Extract store name from Mercadona receipt.
 * Normalizes to exactly "MERCADONA, S.A" (removes trailing dot if present).
 */
function extractStoreName(pdfText: string): string {
    // Look for the header line containing MERCADONA, S.A
    const match = pdfText.match(/MERCADONA,?\s*S\.?A\.?/i)
    if (match) {
        // Normalize to standard format
        return "MERCADONA, S.A"
    }
    return "MERCADONA, S.A"
}

/**
 * Extract receipt date and time.
 * Format in PDF: "20/12/2025 19:32" or similar.
 */
function extractDateAndTime(pdfText: string): { receipt_date: string | null; receipt_date_iso: string | null; receipt_time: string | null } {
    // Match patterns like: 20/12/2025 19:32 or 20-12-2025 19:32:10
    const dateTimeRegex = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+(\d{1,2}:\d{2})(?::(\d{2}))?/
    const match = pdfText.match(dateTimeRegex)

    if (match) {
        const [, dateStr, timeBase, seconds] = match

        // Convert date to ISO
        const isoDate = toIsoDateFromAny(dateStr)
        const displayDate = isoDate ? toDisplayDateDDMMYYYY(isoDate) : null

        // Normalize time to HH:MM:SS
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
 */
function extractCurrency(pdfText: string): string | null {
    if (pdfText.includes("€") || pdfText.includes("TOTAL (€)")) {
        return "EUR"
    }
    return null
}

/**
 * Extract total amount from receipt.
 * Prefers "Importe:" line, falls back to "TOTAL (€)" line.
 */
function extractTotalAmount(pdfText: string): number | null {
    // First try: "Importe: 61,36"
    const importeMatch = pdfText.match(/Importe:\s*([0-9]{1,6}[.,][0-9]{2})/i)
    if (importeMatch) {
        return parseEuMoneyToNumber(importeMatch[1])
    }

    // Fallback: "TOTAL (€) 61,36"
    const totalMatch = pdfText.match(/TOTAL\s*\(€\)\s*([0-9]{1,6}[.,][0-9]{2})/i)
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
function extractTaxesTotalCuota(pdfText: string): number | null {
    // Check if VAT section exists
    if (!pdfText.toUpperCase().includes("IVA BASE IMPONIBLE")) {
        return null
    }

    // Split by lines and find the VAT section
    const lines = pdfText.split(/\r?\n/)
    let inVatSection = false

    for (const line of lines) {
        const upperLine = line.toUpperCase()

        // Look for start of VAT section
        if (upperLine.includes("IVA") && upperLine.includes("BASE IMPONIBLE")) {
            inVatSection = true
            continue
        }

        // In VAT section, look for TOTAL line with two amounts
        if (inVatSection && upperLine.startsWith("TOTAL")) {
            // Match: TOTAL 55,56 5,80
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
 * Parse item lines from the receipt.
 * Items appear between "Descripción" header and "TOTAL" line.
 */
function extractItems(pdfText: string): ExtractedReceipt["items"] {
    const lines = pdfText.split(/\r?\n/)
    const items: NonNullable<ExtractedReceipt["items"]> = []

    let inItemsSection = false

    for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Look for start of items section
        if (/^Descripci[oó]n\b/i.test(trimmedLine)) {
            inItemsSection = true
            continue
        }

        // End of items section at TOTAL line
        if (inItemsSection && /^TOTAL\s*(\(€\)|$)/i.test(trimmedLine)) {
            break
        }

        if (!inItemsSection) continue

        // Skip header-like lines
        if (/P\.\s*Unit/i.test(trimmedLine) || /Importe/i.test(trimmedLine)) {
            continue
        }

        // Try to parse item line
        // Format 1: With explicit unit price - "4 COLA ZERO 2L 0,80 3,20"
        // qty description unit_price total_price
        const withUnitMatch = trimmedLine.match(
            /^(\d+(?:[.,]\d+)?)\s+(.+?)\s+([0-9]{1,6}[.,][0-9]{2})\s+([0-9]{1,6}[.,][0-9]{2})$/
        )

        if (withUnitMatch) {
            const [, qtyStr, desc, unitStr, totalStr] = withUnitMatch
            const quantity = parseEuMoneyToNumber(qtyStr) || 1
            const pricePerUnit = parseEuMoneyToNumber(unitStr)
            const totalPrice = parseEuMoneyToNumber(totalStr)

            items.push({
                description: trimAndCollapseSpaces(desc),
                quantity: Number(quantity.toFixed(2)),
                price_per_unit: Number(pricePerUnit.toFixed(2)),
                total_price: Number(totalPrice.toFixed(2)),
                category: null, // IMPORTANT: Do not assign category here
            })
            continue
        }

        // Format 2: Without explicit unit price - "1 BURGER M POLLO 500GR 3,56"
        // qty description total_price
        const withoutUnitMatch = trimmedLine.match(
            /^(\d+(?:[.,]\d+)?)\s+(.+?)\s+([0-9]{1,6}[.,][0-9]{2})$/
        )

        if (withoutUnitMatch) {
            const [, qtyStr, desc, totalStr] = withoutUnitMatch
            const quantity = parseEuMoneyToNumber(qtyStr) || 1
            const totalPrice = parseEuMoneyToNumber(totalStr)
            // Compute unit price: total / quantity
            const pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice

            items.push({
                description: trimAndCollapseSpaces(desc),
                quantity: Number(quantity.toFixed(2)),
                price_per_unit: Number(pricePerUnit.toFixed(2)),
                total_price: Number(totalPrice.toFixed(2)),
                category: null, // IMPORTANT: Do not assign category here
            })
            continue
        }

        // Skip lines that don't match item patterns (e.g., discount lines, messages)
    }

    return items
}

/**
 * Parse Mercadona receipt PDF text into structured data.
 */
function parse(pdfText: string): { extracted: ExtractedReceipt; rawText: string } {
    const storeName = extractStoreName(pdfText)
    const { receipt_date, receipt_date_iso, receipt_time } = extractDateAndTime(pdfText)
    const currency = extractCurrency(pdfText)
    const totalAmount = extractTotalAmount(pdfText)
    const taxesTotalCuota = extractTaxesTotalCuota(pdfText)
    const items = extractItems(pdfText)

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

    return { extracted, rawText: pdfText }
}

/**
 * Mercadona PDF text parser.
 * Implements the PdfTextParser interface for Mercadona receipts.
 */
export const mercadonaParser: PdfTextParser = {
    id: "mercadona",
    canParse,
    parse,
}

// Also export individual functions for testing
export { canParse, parse }
