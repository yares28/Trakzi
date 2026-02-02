/**
 * =============================================================================
 * DIA RECEIPT PARSER
 * =============================================================================
 *
 * This parser is intentionally merchant-specific and test-driven.
 *
 * DO NOT GENERALIZE THIS PARSER.
 *
 * Supports TWO Dia receipt formats:
 * 1. English POS receipt format ("Products sold by Dia", "Total to pay")
 * 2. Spanish "factura de canje" format ("Fecha factura simplificada", "Desglose de IVA")
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
 * Supports both English POS format and Spanish "factura" format.
 */
function canParse(receiptText: string): boolean {
    if (!receiptText || typeof receiptText !== "string") return false

    const upper = receiptText.toUpperCase()

    // Must contain DIA RETAIL
    const hasDia = upper.includes("DIA RETAIL")
    if (!hasDia) return false

    // English format markers
    const hasEnglishFormat = upper.includes("SIMPLIFIED INVOICE") ||
                            upper.includes("VAT BREAKDOWN") ||
                            upper.includes("PRODUCTS SOLD BY DIA")

    // Spanish format markers
    const hasSpanishFormat = upper.includes("FACTURA SIMPLIFICADA") ||
                            upper.includes("DESGLOSE DE IVA") ||
                            upper.includes("FECHA FACTURA")

    return hasEnglishFormat || hasSpanishFormat
}

/**
 * Detect which format the receipt is in
 */
function detectFormat(receiptText: string): "spanish" | "english" {
    const upper = receiptText.toUpperCase()
    // Spanish format has "Fecha factura simplificada" or "Desglose de IVA"
    if (upper.includes("FECHA FACTURA SIMPLIFICADA") ||
        upper.includes("DESGLOSE DE IVA") ||
        upper.includes("TOTAL BASE IMPONIBLE")) {
        return "spanish"
    }
    return "english"
}

/**
 * =============================================================================
 * OCR-SPECIFIC NORMALIZATION
 * =============================================================================
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
 */
function extractStoreName(receiptText: string): string {
    const match = receiptText.match(/DIA\s+RETAIL\s+ESPA[ÑN]A[,.]?\s*S\.?A\.?U?\.?/i)
    if (match) {
        return "DIA RETAIL ESPAÑA, S.A.U."
    }
    if (receiptText.toUpperCase().includes("DIA RETAIL")) {
        return "DIA RETAIL ESPAÑA, S.A.U."
    }
    return "DIA"
}

/**
 * Extract receipt date and time.
 * Supports multiple formats:
 * - Spanish: "Fecha factura simplificada: 17/01/2026"
 * - English header: "17/01/2026 11:51 Store Number 1032"
 * - Operation data: "FECHA: 17/01/2026 HORA: 11:52"
 */
function extractDateAndTime(receiptText: string): { receipt_date: string | null; receipt_date_iso: string | null; receipt_time: string | null } {
    // Try Spanish format: "Fecha factura simplificada: 17/01/2026"
    const spanishDateMatch = receiptText.match(/Fecha\s+factura\s+simplificada\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i)
    if (spanishDateMatch) {
        const [, day, month, year] = spanishDateMatch
        const dateStr = `${day}/${month}/${year}`
        const isoDate = toIsoDateFromAny(dateStr)
        const displayDate = isoDate ? toDisplayDateDDMMYYYY(isoDate) : null

        // Try to find time from ticket único (contains timestamp)
        // Format: ES-01032-03-00196912-20260117-105136 (last part is HHMMSS)
        const ticketMatch = receiptText.match(/ticket\s+[úu]nico\s*:\s*\S+-(\d{2})(\d{2})(\d{2})\s*$/im)
        let normalizedTime: string | null = null
        if (ticketMatch) {
            const [, hour, minute, second] = ticketMatch
            normalizedTime = `${hour}:${minute}:${second}`
        }

        return {
            receipt_date: displayDate,
            receipt_date_iso: isoDate,
            receipt_time: normalizedTime,
        }
    }

    // Try English header format: "17/01/2026 11:51"
    const headerDateTimeRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
    const headerMatch = receiptText.match(headerDateTimeRegex)

    if (headerMatch) {
        const [, day, month, year, hour, minute, seconds] = headerMatch
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
 */
function extractCurrency(receiptText: string): string | null {
    if (receiptText.includes("€") || receiptText.toUpperCase().includes("EUROS") || receiptText.toUpperCase().includes("EUR")) {
        return "EUR"
    }
    return null
}

/**
 * Extract total amount from receipt.
 * Supports:
 * - Spanish: "Total base imponible más IVA 13,03 €"
 * - English: "Total to pay €13,03" or "Total sale Day €13,03"
 */
function extractTotalAmount(receiptText: string): number | null {
    // Spanish format: "Total base imponible más IVA 13,03 €"
    const spanishTotalMatch = receiptText.match(/Total\s+base\s+imponible\s+m[áa]s\s+IVA\s+([0-9]{1,6}[.,][0-9]{2})\s*€/i)
    if (spanishTotalMatch) {
        return parseEuMoneyToNumber(spanishTotalMatch[1])
    }

    // English format: "Total to pay" followed by €amount
    const totalToPayMatch = receiptText.match(/Total\s+to\s+pay[─\-\s]*€?\s*([0-9]{1,6}[.,][0-9]{2})/i)
    if (totalToPayMatch) {
        return parseEuMoneyToNumber(totalToPayMatch[1])
    }

    // English: "Total sale Day"
    const totalSaleMatch = receiptText.match(/Total\s+sale\s+Day[─\-\s]*€?\s*([0-9]{1,6}[.,][0-9]{2})/i)
    if (totalSaleMatch) {
        return parseEuMoneyToNumber(totalSaleMatch[1])
    }

    // Fallback: IMPORTE
    const importeMatch = receiptText.match(/IMPORTE\s*:\s*([0-9]{1,6}[.,][0-9]{2})\s*(?:€|EUROS?)?/i)
    if (importeMatch) {
        return parseEuMoneyToNumber(importeMatch[1])
    }

    return null
}

/**
 * Extract VAT total from the tax section.
 * Supports:
 * - Spanish: "Total cuotas de IVA 1,41 €" or "Desglose de IVA" table
 * - English: "VAT breakdown" table
 */
function extractTaxesTotalCuota(receiptText: string): number | null {
    // Spanish direct total: "Total cuotas de IVA 1,41 €"
    const spanishCuotaMatch = receiptText.match(/Total\s+cuotas\s+de\s+IVA\s+([0-9]{1,6}[.,][0-9]{2})\s*€/i)
    if (spanishCuotaMatch) {
        return parseEuMoneyToNumber(spanishCuotaMatch[1])
    }

    const upper = receiptText.toUpperCase()
    if (!upper.includes("VAT BREAKDOWN") && !upper.includes("DESGLOSE DE IVA") && !upper.includes("IVA")) {
        return null
    }

    const lines = receiptText.split(/\r?\n/)
    let inVatSection = false
    let totalQuota = 0
    let foundQuota = false

    for (const line of lines) {
        const upperLine = line.toUpperCase()

        // Look for VAT header (English or Spanish)
        if (upperLine.includes("VAT BREAKDOWN") ||
            upperLine.includes("DESGLOSE DE IVA") ||
            (upperLine.includes("% IVA") && upperLine.includes("CUOTA"))) {
            inVatSection = true
            continue
        }

        if (inVatSection) {
            // Spanish table format: "4% 1,01 € 0,04 € 1,05 €"
            // Match lines with percentage and euro amounts
            const vatLineMatch = line.match(/(\d+)%\s+([0-9]{1,6}[.,][0-9]{2})\s*€?\s+([0-9]{1,6}[.,][0-9]{2})\s*€/i)
            if (vatLineMatch) {
                // Second amount is Cuota IVA
                const cuota = parseEuMoneyToNumber(vatLineMatch[3])
                totalQuota += cuota
                foundQuota = true
                continue
            }

            // English format: "A 4% €1,01 €0,04"
            const quotaMatches = line.match(/€([0-9]{1,6}[.,][0-9]{2})/g)
            if (quotaMatches && quotaMatches.length >= 2) {
                const quotaValue = quotaMatches[quotaMatches.length - 1].replace("€", "")
                totalQuota += parseEuMoneyToNumber(quotaValue)
                foundQuota = true
                continue
            }

            // End markers
            if (upperLine.includes("VAT INCLUDED") ||
                upperLine.includes("TOTAL BASE IMPONIBLE") ||
                upperLine.includes("DESCUENTOS APLICADOS")) {
                break
            }
        }
    }

    return foundQuota ? Number(totalQuota.toFixed(2)) : null
}

/**
 * Parse items from Spanish "factura" format.
 * Table format: Código, Descripción, Unid/Kg, Precio Unit. sin IVA, Descuento, % IVA, Cuota IVA, PVP Total sin IVA
 * Example: "191604 BOLSA 50% RECICLADA 1 unid. 0,12397 € 0,00000 € 21% 0,02603 € 0,12397 €"
 */
function extractItemsSpanish(receiptText: string): ExtractedReceipt["items"] {
    const lines = receiptText.split(/\r?\n/)
    const items: NonNullable<ExtractedReceipt["items"]> = []

    let inItemsSection = false

    for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Look for table header start
        if (trimmedLine.includes("Código") && trimmedLine.includes("Descripción")) {
            inItemsSection = true
            continue
        }

        // Also start after header line with columns
        if (trimmedLine.includes("PVP") && trimmedLine.includes("Total sin IVA")) {
            inItemsSection = true
            continue
        }

        // End of items section
        if (inItemsSection && (
            trimmedLine.includes("Desglose de IVA") ||
            trimmedLine.includes("Total base imponible") ||
            trimmedLine.includes("Descuentos aplicados") ||
            trimmedLine.includes("Sociedad inscrita")
        )) {
            break
        }

        if (!inItemsSection) continue

        // Skip header-like lines
        if (trimmedLine.includes("Código") || trimmedLine.includes("Precio Unit")) {
            continue
        }

        // Parse item line
        // Format: CODE DESCRIPTION QTY unid. UNIT_PRICE € DISCOUNT € VAT% CUOTA € TOTAL €
        // Example: "191604 BOLSA 50% RECICLADA 1 unid. 0,12397 € 0,00000 € 21% 0,02603 € 0,12397 €"

        // Extract all euro amounts
        const euroMatches = trimmedLine.match(/([0-9]{1,6}[.,][0-9]{2,5})\s*€/g) || []
        if (euroMatches.length < 3) continue // Need at least unit price, cuota, total

        // Extract quantity
        const qtyMatch = trimmedLine.match(/(\d+)\s*unid/i)
        const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1

        // Extract VAT percentage to calculate final price
        const vatMatch = trimmedLine.match(/(\d+)%/)
        const vatRate = vatMatch ? parseInt(vatMatch[1], 10) / 100 : 0.21 // Default to 21%

        // Extract code (6 digits at start)
        const codeMatch = trimmedLine.match(/^(\d{5,6})\s+/)

        // Extract description: between code and quantity
        let description = ""
        if (codeMatch && qtyMatch) {
            const afterCode = trimmedLine.slice(codeMatch[0].length)
            const qtyIndex = afterCode.indexOf(qtyMatch[0])
            if (qtyIndex > 0) {
                description = trimAndCollapseSpaces(afterCode.slice(0, qtyIndex))
            }
        } else if (qtyMatch) {
            // No code, description is before quantity
            const qtyIndex = trimmedLine.indexOf(qtyMatch[0])
            if (qtyIndex > 0) {
                description = trimAndCollapseSpaces(trimmedLine.slice(0, qtyIndex))
            }
        }

        if (!description) continue

        // Parse euro values - format is: unit_price, discount, vat%, cuota, total_sin_iva
        const moneyValues = euroMatches.map(m => parseEuMoneyToNumber(m.replace("€", "").trim()))

        // In Spanish format:
        // - Last value is PVP Total sin IVA (total without VAT)
        // - Second to last is Cuota IVA
        // We need to add them together for total WITH VAT
        const totalSinIva = moneyValues[moneyValues.length - 1]
        const cuotaIva = moneyValues[moneyValues.length - 2]
        const totalConIva = totalSinIva + cuotaIva
        const pricePerUnit = quantity > 0 ? totalConIva / quantity : totalConIva

        items.push({
            description,
            quantity,
            price_per_unit: Number(pricePerUnit.toFixed(2)),
            total_price: Number(totalConIva.toFixed(2)),
            category: null,
        })
    }

    // Also extract discounts from "Descuentos aplicados a PVP" section
    const discountSection = receiptText.match(/Descuentos aplicados a PVP[\s\S]*?(?=Sociedad inscrita|$)/i)
    if (discountSection) {
        const discountLines = discountSection[0].split(/\r?\n/)
        for (const line of discountLines) {
            const discountMatch = line.match(/^([A-Z][A-Z\s/]+?)\s+([0-9]{1,6}[.,][0-9]{2})\s*€/i)
            if (discountMatch) {
                const description = trimAndCollapseSpaces(discountMatch[1])
                const amount = parseEuMoneyToNumber(discountMatch[2])
                if (description && amount > 0 && !description.includes("Descuentos")) {
                    items.push({
                        description: description,
                        quantity: 1,
                        price_per_unit: -amount,
                        total_price: -amount,
                        category: null,
                    })
                }
            }
        }
    }

    return items
}

/**
 * Parse items from English POS format.
 * Format: DESCRIPTION qty ud €unit_price €total_price VAT_LETTER
 */
function extractItemsEnglish(receiptText: string): ExtractedReceipt["items"] {
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

        // Check for discount line (negative amount)
        const discountMatch = trimmedLine.match(/^(.+?)\s+-€([0-9]{1,6}[.,][0-9]{2})(?:\s+[A-C])?$/i)
        if (discountMatch) {
            const description = trimAndCollapseSpaces(discountMatch[1])
            const discountAmount = parseEuMoneyToNumber(discountMatch[2])
            if (description && discountAmount > 0) {
                items.push({
                    description,
                    quantity: 1,
                    price_per_unit: -discountAmount,
                    total_price: -discountAmount,
                    category: null,
                })
            }
            continue
        }

        // Regular item
        const euroMatches = trimmedLine.match(/€([0-9]{1,6}[.,][0-9]{2})/g) || []
        const moneyValues = euroMatches.map(m => parseEuMoneyToNumber(m.replace("€", "")))

        if (moneyValues.length === 0) continue

        const qtyMatch = trimmedLine.match(/(\d+)\s*ud/i)
        const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1

        let description = ""
        const qtyIndex = qtyMatch ? trimmedLine.indexOf(qtyMatch[0]) : -1
        const euroIndex = trimmedLine.indexOf("€")

        if (qtyIndex > 0) {
            description = trimAndCollapseSpaces(trimmedLine.slice(0, qtyIndex))
        } else if (euroIndex > 0) {
            description = trimAndCollapseSpaces(trimmedLine.slice(0, euroIndex))
        }

        if (!description) continue

        let totalPrice: number
        let pricePerUnit: number

        if (moneyValues.length >= 2) {
            pricePerUnit = moneyValues[0]
            totalPrice = moneyValues[1]

            const expectedTotal = quantity * pricePerUnit
            const tolerance = 0.02
            if (Math.abs(expectedTotal - totalPrice) > tolerance && quantity > 1) {
                totalPrice = moneyValues[moneyValues.length - 1]
                pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
            }
        } else {
            totalPrice = moneyValues[0]
            pricePerUnit = quantity > 0 ? totalPrice / quantity : totalPrice
        }

        items.push({
            description,
            quantity,
            price_per_unit: Number(pricePerUnit.toFixed(2)),
            total_price: Number(totalPrice.toFixed(2)),
            category: null,
        })
    }

    return items
}

/**
 * Extract items based on detected format.
 */
function extractItems(receiptText: string): ExtractedReceipt["items"] {
    const format = detectFormat(receiptText)
    if (format === "spanish") {
        return extractItemsSpanish(receiptText)
    }
    return extractItemsEnglish(receiptText)
}

/**
 * =============================================================================
 * VALIDATION
 * =============================================================================
 */

function hasMinimalDiaFields(extracted: ExtractedReceipt): boolean {
    if (!extracted.store_name?.toUpperCase().includes("DIA")) {
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

    // Validate sum of items matches total (10% tolerance for Spanish format due to VAT calculations)
    const calculatedTotal = extracted.items.reduce((sum, item) => {
        const itemTotal = typeof item.total_price === "number" ? item.total_price : 0
        return sum + itemTotal
    }, 0)

    const tolerance = extracted.total_amount * 0.10 // 10% tolerance
    const difference = Math.abs(calculatedTotal - extracted.total_amount)

    if (difference > tolerance && difference > 1.00) {
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

export const diaParser: PdfTextParser = {
    id: "dia",
    canParse,
    parse,
}

export { canParse, parse, hasMinimalDiaFields, normalizeDiaReceiptTextForOcr }
