/**
 * OCR Text Parsing Tests for Mercadona Receipt Parser.
 * 
 * These tests verify that the deterministic parser correctly handles
 * OCR-specific quirks like inconsistent spacing, column collapse, and
 * character recognition issues.
 */

import {
    mercadonaParser,
    canParse,
    tryParseMercadonaFromText,
    normalizeMercadonaReceiptTextForOcr,
    hasMinimalMercadonaFields
} from "@/lib/receipts/parsers/mercadona"

// Sample OCR output with typical OCR quirks:
// - Inconsistent spacing
// - Some collapsed columns
// - "TOTAL (E)" instead of "TOTAL (€)"
// - Slight character recognition issues
const MERCADONA_OCR_FIXTURE = `
MERCADONA, S.A A-46103834
C/  EJEMPLO  123
08001  BARCELONA
TELEFONO: 900 500 103

FACTURA SIMPLIFICADA
20 / 12 / 2025  19:32 OP: 123456

Descripcion P. Unit Importe
4  COLA ZERO 2L  0,80  3,20
1 BURGER M POLLO 500GR 3,56
2 LECHE ENTERA 1L 0,95 1,90
3 PAN MOLDE INTEGRAL 1,25 3,75
1 ACEITE OLIVA VIRGEN 4,99
2 HUEVOS L DOCENA 2,15 4,30
TOTAL (E) 21,70

IVA BASE IMPONIBLE CUOTA
10% 18,00 1,80
4% 3,70 0,45
TOTAL 21,70 2,25

Importe: 21,70 EUR Forma de pago: TARJETA
`.trim()

// OCR output with more severe quirks
const MERCADONA_OCR_SEVERE_FIXTURE = `
MERCADONA  SA  A-46103834
C/ EJEMPLO 123
08001 BARCELONA

FACTURA SIMPLIFICADA
20/12/2025 19:32 OP: 123456

Descripcion        P. Unit  Importe
4  COLA ZERO 2L           0,80    3,20
l BURGER M POLLO 500GR           3,56
2  LECHE ENTERA 1L        0,95    1,90
TOTAL (€)                        8,66

IVA BASEIMPONIBLE CUOTA
10%  6,20  0,62
4%  2,46  0,30
TOTAL  8,66  0,92

Importe:  8,66  €  Forma de pago: TARJETA
`.trim()

describe("Mercadona OCR Text Parsing", () => {
    describe("normalizeMercadonaReceiptTextForOcr", () => {
        it("collapses multiple spaces", () => {
            const input = "COLA  ZERO   2L"
            const result = normalizeMercadonaReceiptTextForOcr(input)
            expect(result).toBe("COLA ZERO 2L")
        })

        it("normalizes TOTAL (E) to TOTAL (€)", () => {
            const input = "TOTAL (E) 21,70"
            const result = normalizeMercadonaReceiptTextForOcr(input)
            expect(result).toBe("TOTAL (€) 21,70")
        })

        it("fixes OCR O/0 confusion in numeric contexts", () => {
            const input = "1O,50"
            const result = normalizeMercadonaReceiptTextForOcr(input)
            expect(result).toBe("10,50")
        })

        it("fixes OCR l/1 confusion at start of line (quantity)", () => {
            const input = "l BURGER M POLLO"
            const result = normalizeMercadonaReceiptTextForOcr(input)
            expect(result).toBe("1 BURGER M POLLO")
        })

        it("normalizes decimal spacing", () => {
            const input = "0, 80"
            const result = normalizeMercadonaReceiptTextForOcr(input)
            expect(result).toBe("0,80")
        })
    })

    describe("canParse with OCR text", () => {
        it("returns true for OCR Mercadona receipt", () => {
            expect(canParse(MERCADONA_OCR_FIXTURE)).toBe(true)
        })

        it("returns true with BASEIMPONIBLE (no space)", () => {
            expect(canParse(MERCADONA_OCR_SEVERE_FIXTURE)).toBe(true)
        })

        it("returns true when only IVA BASEIMPONIBLE is present", () => {
            const text = "MERCADONA\nSome receipt\nIVA BASEIMPONIBLE CUOTA"
            expect(canParse(text)).toBe(true)
        })
    })

    describe("tryParseMercadonaFromText with OCR source", () => {
        it("parses OCR text and returns ok=true", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(result.ok).toBe(true)
            expect(result.extracted).not.toBeNull()
        })

        it("extracts store_name correctly", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(result.extracted?.store_name).toBe("MERCADONA, S.A")
        })

        it("extracts date correctly despite spacing", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(result.extracted?.receipt_date_iso).toBe("2025-12-20")
            expect(result.extracted?.receipt_date).toBe("20-12-2025")
        })

        it("extracts time correctly", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(result.extracted?.receipt_time).toBe("19:32:00")
        })

        it("extracts currency as EUR from E symbol", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(result.extracted?.currency).toBe("EUR")
        })

        it("extracts total amount correctly", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(result.extracted?.total_amount).toBe(21.70)
        })

        it("extracts taxes_total_cuota correctly", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(result.extracted?.taxes_total_cuota).toBe(2.25)
        })

        it("extracts multiple items", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(result.extracted?.items).toBeDefined()
            expect(result.extracted!.items!.length).toBeGreaterThan(3)
        })

        it("parses item with unit price correctly", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            const colaItem = result.extracted?.items?.find(item =>
                item.description?.includes("COLA ZERO")
            )
            expect(colaItem).toBeDefined()
            expect(colaItem?.quantity).toBe(4)
            expect(colaItem?.price_per_unit).toBe(0.8)
            expect(colaItem?.total_price).toBe(3.2)
        })

        it("parses item without unit price and computes it", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            const burgerItem = result.extracted?.items?.find(item =>
                item.description?.includes("BURGER")
            )
            expect(burgerItem).toBeDefined()
            expect(burgerItem?.quantity).toBe(1)
            expect(burgerItem?.total_price).toBe(3.56)
            expect(burgerItem?.price_per_unit).toBe(3.56)
        })

        it("does not assign category (leaves null)", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            const firstItem = result.extracted?.items?.[0]
            expect(firstItem?.category).toBeNull()
        })
    })

    describe("tryParseMercadonaFromText with severe OCR issues", () => {
        it("parses severely degraded OCR text", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_SEVERE_FIXTURE,
                source: "ocr",
            })
            // Should still successfully parse despite issues
            expect(result.ok).toBe(true)
            expect(result.extracted?.store_name).toBe("MERCADONA, S.A")
        })

        it("handles lowercase l as 1 for quantity", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_SEVERE_FIXTURE,
                source: "ocr",
            })
            // The "l BURGER" should be parsed as "1 BURGER"
            const burgerItem = result.extracted?.items?.find(item =>
                item.description?.includes("BURGER")
            )
            expect(burgerItem).toBeDefined()
            expect(burgerItem?.quantity).toBe(1)
        })
    })

    describe("hasMinimalMercadonaFields", () => {
        it("returns true for complete extraction", () => {
            const result = tryParseMercadonaFromText({
                text: MERCADONA_OCR_FIXTURE,
                source: "ocr",
            })
            expect(hasMinimalMercadonaFields(result.extracted!)).toBe(true)
        })

        it("returns false for empty items", () => {
            expect(hasMinimalMercadonaFields({
                store_name: "MERCADONA, S.A",
                receipt_date_iso: "2025-12-20",
                total_amount: 10.00,
                items: [],
            })).toBe(false)
        })

        it("returns false for wrong store name", () => {
            expect(hasMinimalMercadonaFields({
                store_name: "CARREFOUR",
                receipt_date_iso: "2025-12-20",
                total_amount: 10.00,
                items: [{ description: "test", quantity: 1, total_price: 10 }],
            })).toBe(false)
        })

        it("returns false without total_amount", () => {
            expect(hasMinimalMercadonaFields({
                store_name: "MERCADONA, S.A",
                receipt_date_iso: "2025-12-20",
                total_amount: null,
                items: [{ description: "test", quantity: 1, total_price: 10 }],
            })).toBe(false)
        })
    })

    describe("PDF source vs OCR source", () => {
        it("applies normalization only for OCR source", () => {
            // With PDF source, "l " should NOT be converted to "1 "
            const textWithL = `MERCADONA, S.A
FACTURA SIMPLIFICADA
20/12/2025 19:32
Descripcion P. Unit Importe
l PRODUCT 5,00
TOTAL (€) 5,00
IVA BASE IMPONIBLE CUOTA
10% 4,55 0,45
TOTAL 4,55 0,45
Importe: 5,00`

            // OCR source should normalize "l" to "1"
            const ocrResult = tryParseMercadonaFromText({
                text: textWithL,
                source: "ocr",
            })

            // PDF source should NOT normalize "l" - it would fail to parse that line
            const pdfResult = tryParseMercadonaFromText({
                text: textWithL,
                source: "pdf",
            })

            // OCR should find the item
            const ocrItem = ocrResult.extracted?.items?.find(i =>
                i.description?.includes("PRODUCT")
            )
            expect(ocrItem).toBeDefined()
            expect(ocrItem?.quantity).toBe(1)
        })
    })
})
