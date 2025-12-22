/**
 * Unit tests for Mercadona receipt parser.
 * 
 * These tests verify that the deterministic parser correctly extracts
 * data from Mercadona receipt PDF text.
 */

import { mercadonaParser, canParse, parse } from "@/lib/receipts/parsers/mercadona"

// Sample Mercadona receipt text (representative of unpdf output)
const MERCADONA_RECEIPT_FIXTURE = `
MERCADONA, S.A. A-46103834
C/ EJEMPLO 123
08001 BARCELONA
TELÉFONO: 900 500 103

FACTURA SIMPLIFICADA
20/12/2025 19:32 OP: 123456

Descripción P. Unit Importe
4 COLA ZERO 2L 0,80 3,20
1 BURGER M POLLO 500GR 3,56
2 LECHE ENTERA 1L 0,95 1,90
3 PAN MOLDE INTEGRAL 1,25 3,75
1 ACEITE OLIVA VIRGEN 4,99
2 HUEVOS L DOCENA 2,15 4,30
1 YOGUR NATURAL PACK 1,85
5 MANZANA GOLDEN KG 0,99 4,95
1 QUESO MANCHEGO 250G 3,25
2 JAMON COCIDO 150G 1,95 3,90
1 SALMON AHUMADO 100G 2,99
3 CERVEZA SIN 0,33L 0,65 1,95
1 DETERGENTE LIQUIDO 4,50
2 PAPEL HIGIENICO 1,99 3,98
1 CAFE MOLIDO 250G 2,45
3 TOMATE TRITURADO 0,89 2,67
1 PASTA ESPAGUETI 500G 0,75
2 ATUN CLARO LATA 1,35 2,70
1 GALLETAS DIGESTIVE 1,65
4 AGUA MINERAL 1,5L 0,35 1,40
1 PLATANO KG 1,89
1 ZANAHORIA 500G 0,89
1 LECHUGA ICEBERG 0,99
1 CHAMPIÑON 250G 1,45
TOTAL (€) 61,36

IVA BASE IMPONIBLE CUOTA
10% 45,80 4,58
4% 9,76 1,22
TOTAL 55,56 5,80

Importe: 61,36 € Forma de pago: TARJETA
`.trim()

const NON_MERCADONA_RECEIPT = `
CARREFOUR
Receipt #12345
Date: 20/12/2025

Product A: 5.00 EUR
Product B: 3.50 EUR
Total: 8.50 EUR
`.trim()

describe("Mercadona Parser", () => {
    describe("canParse", () => {
        it("returns true for Mercadona receipts with FACTURA SIMPLIFICADA", () => {
            expect(canParse(MERCADONA_RECEIPT_FIXTURE)).toBe(true)
        })

        it("returns true for Mercadona receipts with IVA BASE IMPONIBLE", () => {
            const text = "MERCADONA\nSome receipt text\nIVA BASE IMPONIBLE CUOTA"
            expect(canParse(text)).toBe(true)
        })

        it("returns false for non-Mercadona receipts", () => {
            expect(canParse(NON_MERCADONA_RECEIPT)).toBe(false)
        })

        it("returns false for empty or null input", () => {
            expect(canParse("")).toBe(false)
            expect(canParse(null as unknown as string)).toBe(false)
        })

        it("returns false if MERCADONA present but no identifying markers", () => {
            const text = "MERCADONA store visit notes"
            expect(canParse(text)).toBe(false)
        })
    })

    describe("parse", () => {
        const { extracted, rawText } = parse(MERCADONA_RECEIPT_FIXTURE)

        it("extracts store_name as MERCADONA, S.A", () => {
            expect(extracted.store_name).toBe("MERCADONA, S.A")
        })

        it("extracts receipt_date_iso as YYYY-MM-DD", () => {
            expect(extracted.receipt_date_iso).toBe("2025-12-20")
        })

        it("extracts receipt_date as DD-MM-YYYY", () => {
            expect(extracted.receipt_date).toBe("20-12-2025")
        })

        it("extracts receipt_time as HH:MM:SS", () => {
            expect(extracted.receipt_time).toBe("19:32:00")
        })

        it("extracts currency as EUR", () => {
            expect(extracted.currency).toBe("EUR")
        })

        it("extracts total_amount correctly", () => {
            expect(extracted.total_amount).toBe(61.36)
        })

        it("extracts taxes_total_cuota correctly", () => {
            expect(extracted.taxes_total_cuota).toBe(5.8)
        })

        it("returns the raw PDF text", () => {
            expect(rawText).toBe(MERCADONA_RECEIPT_FIXTURE)
        })

        describe("items extraction", () => {
            it("extracts multiple items", () => {
                expect(extracted.items).toBeDefined()
                expect(extracted.items!.length).toBeGreaterThan(10)
            })

            it("parses item with explicit unit price (COLA ZERO 2L)", () => {
                const colaItem = extracted.items?.find(item =>
                    item.description?.includes("COLA ZERO")
                )
                expect(colaItem).toBeDefined()
                expect(colaItem?.quantity).toBe(4)
                expect(colaItem?.price_per_unit).toBe(0.8)
                expect(colaItem?.total_price).toBe(3.2)
            })

            it("parses item without explicit unit price and computes it (BURGER M POLLO)", () => {
                const burgerItem = extracted.items?.find(item =>
                    item.description?.includes("BURGER M POLLO")
                )
                expect(burgerItem).toBeDefined()
                expect(burgerItem?.quantity).toBe(1)
                expect(burgerItem?.total_price).toBe(3.56)
                expect(burgerItem?.price_per_unit).toBe(3.56) // computed: total/quantity
            })

            it("does not assign category (leaves null for preference/heuristics)", () => {
                const firstItem = extracted.items?.[0]
                expect(firstItem?.category).toBeNull()
            })
        })
    })

    describe("mercadonaParser object", () => {
        it("has correct id", () => {
            expect(mercadonaParser.id).toBe("mercadona")
        })

        it("implements canParse method", () => {
            expect(typeof mercadonaParser.canParse).toBe("function")
            expect(mercadonaParser.canParse(MERCADONA_RECEIPT_FIXTURE)).toBe(true)
        })

        it("implements parse method", () => {
            expect(typeof mercadonaParser.parse).toBe("function")
            const result = mercadonaParser.parse(MERCADONA_RECEIPT_FIXTURE)
            expect(result.extracted).toBeDefined()
            expect(result.rawText).toBeDefined()
        })
    })
})
