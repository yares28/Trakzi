## Mercadona Parser

GOAL
Implement a deterministic, Mercadona-specific PDF-text parser that extracts these fields perfectly for Mercadona receipts, and integrate it into BOTH codepaths (route.ts and processing.ts) WITHOUT breaking other merchants:
Main:
- store_name: exactly "MERCADONA, S.A"
- receipt_date: formatted "DD-MM-YYYY" for output, but ALSO keep a canonical ISO date "YYYY-MM-DD" for DB/sorting
- receipt_time: "HH:MM:SS" (add ":00" if seconds missing)
- currency: "EUR" when € appears
- total_amount: final amount (prefer "Importe:"; fallback to "TOTAL (€)")
- taxes_total_cuota: VAT total CUOTA (e.g., 5,80), nullable if not present
Items (each product line):
- description
- quantity
- price_per_unit (if not present explicitly, compute = total_price/quantity, rounded 2 decimals)
- total_price
- category: DO NOT decide inside the Mercadona parser; leave null/empty so the existing preference + heuristics logic assigns it

ARCHITECTURE (MANDATORY — do it this way for long-term maintainability)
1) Create a new folder:
   src/lib/receipts/parsers/
2) Add these files:
   - src/lib/receipts/parsers/types.ts
   - src/lib/receipts/parsers/utils.ts
   - src/lib/receipts/parsers/mercadona.ts
   - src/lib/receipts/parsers/index.ts

3) Define a stable interface in types.ts depending on the existing database and give me how to add the new "taxes_total_cuota" table to my database:
   export type ExtractedReceipt = {
     store_name?: string | null
     receipt_date?: string | null              // DD-MM-YYYY (display)
     receipt_date_iso?: string | null          // YYYY-MM-DD (canonical)
     receipt_time?: string | null              // HH:MM:SS
     currency?: string | null
     total_amount?: number | string | null
     taxes_total_cuota?: number | string | null
     items?: Array<{
       description?: string | null
       quantity?: number | string | null
       price_per_unit?: number | string | null
       total_price?: number | string | null
       category?: string | null
     }>
   }

   export type PdfTextParser = {
     id: string
     canParse(pdfText: string): boolean
     parse(pdfText: string): { extracted: ExtractedReceipt; rawText: string }
   }

4) In utils.ts, implement safe helpers (and REUSE them everywhere; remove duplication gradually but don’t risk big refactors):
   - parseEuMoneyToNumber("61,36") => 61.36 (also accept "61.36")
   - toIsoDateFromAny(input: string) => "YYYY-MM-DD" supports:
       "DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD", "YYYY/MM/DD"
   - toDisplayDateDDMMYYYY(iso: "YYYY-MM-DD") => "DD-MM-YYYY"
   - normalizeTimeToHHMMSS("19:32") => "19:32:00" and accept "19:32:10"
   - trimAndCollapseSpaces(s)

5) In mercadona.ts implement the deterministic parser:
   - Detection (`canParse`):
     return true if pdfText contains "MERCADONA" AND ("FACTURA SIMPLIFICADA" OR "IVA BASE IMPONIBLE") to avoid false positives.
   - Parsing rules (based on actual Mercadona layout):
     a) store_name:
        Extract the header line starting with "MERCADONA, S.A" and normalize to exactly "MERCADONA, S.A" (remove trailing dot if present).
     b) receipt_date + receipt_time:
        Find first match of:
          /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+(\d{1,2}:\d{2})(?::(\d{2}))?/
        Convert date to iso with toIsoDateFromAny -> receipt_date_iso
        Convert iso to DD-MM-YYYY -> receipt_date
        Convert time to HH:MM:SS -> receipt_time
     c) currency:
        If pdfText includes "€" OR "TOTAL (€)" => "EUR" else null (keep your existing defaulting to EUR later)
     d) total_amount:
        Prefer regex:
          /Importe:\s*([0-9]{1,6}[.,][0-9]{2})/
        Else fallback:
          /TOTAL\s*\(€\)\s*([0-9]{1,6}[.,][0-9]{2})/
        Parse with parseEuMoneyToNumber.
     e) taxes_total_cuota (nullable):
        Locate VAT section by finding the line containing "IVA BASE IMPONIBLE" and "CUOTA".
        Then find the first subsequent line starting with "TOTAL" that has TWO money amounts:
          /^TOTAL\s+([0-9]{1,6}[.,][0-9]{2})\s+([0-9]{1,6}[.,][0-9]{2})/m
        taxes_total_cuota = second amount parsed.
     f) items:
        Identify items block:
          start after line that matches /^Descripción\b/i
          or specifically "Descripción P. Unit Importe"
        End before line that starts with "TOTAL" (the grand total line).
        For each line, parse either:
          - With explicit unit price:
            /^(\d+(?:[.,]\d+)?)\s+(.+?)\s+([0-9]{1,6}[.,][0-9]{2})\s+([0-9]{1,6}[.,][0-9]{2})$/
              qty, desc, unit, total
          - Without explicit unit:
            /^(\d+(?:[.,]\d+)?)\s+(.+?)\s+([0-9]{1,6}[.,][0-9]{2})$/
              qty, desc, total
            unit = total/qty (rounded 2)
        Normalize:
          description = trimAndCollapseSpaces(desc)
          quantity = parse number with comma support, min 1
          total_price = parsed total
          price_per_unit = explicit unit if present else computed
          category = null (IMPORTANT: do not categorize here)
        Ignore non-item lines and empty lines.
     g) Return, and put in the upload table after uploading the file:
        { extracted: {store_name, receipt_date, receipt_date_iso, receipt_time, currency, total_amount, taxes_total_cuota, items}, rawText: pdfText }

6) In parsers/index.ts implement dispatcher:
   export function extractReceiptFromPdfTextWithParsers(params: {
     pdfText: string
     fileName: string
     allowedCategories: string[]
     aiFallback: () => Promise<{ extracted: ExtractedReceipt; rawText: string }>
   }): Promise<{ extracted: ExtractedReceipt; rawText: string }>
   Behavior:
     - If mercadona.canParse(pdfText): return mercadona.parse(pdfText)
     - Else: return await aiFallback()

INTEGRATION (DO THIS IN BOTH route.ts AND processing.ts)
7) Replace the current direct call to AI extraction for PDFs with the dispatcher:
   - Keep all the existing post-processing logic for:
     - defaulting currency
     - mapping categories via preferences + heuristics
     - inserting receipt_transactions
     - updating receipts table + ai_extraction_data
   - Only swap the “extracted receipt” source.

8) Receipt date handling MUST become robust and support both old AI and new Mercadona outputs:
   - Introduce:
     const receiptDateIso =
        normalizeDate(extracted.receipt_date_iso) ||
        normalizeDate(extracted.receipt_date) ||   // AI gives ISO today; Mercadona gives DD-MM-YYYY
        todayIsoDate()
     const receiptDateDisplay = toDisplayDateDDMMYYYY(receiptDateIso)
   - Keep DB `receipt_date` = receiptDateIso (do NOT store DD-MM-YYYY in DB).
   - For API response (route.ts), expose BOTH:
        receipt_date: receiptDateDisplay
        receipt_date_iso: receiptDateIso
     so my “columns” requirement is satisfied while DB stays sane.

9) Taxes storage:
   - Do not add a new DB column now.
   - Save taxes_total_cuota into receipts.ai_extraction_data JSONB (it already exists) so it’s queryable later.
   - In processing.ts, when you build `aiExtractionData`, include:
        taxes_total_cuota: number|null
        receipt_date_display: receiptDateDisplay
        receipt_date_iso: receiptDateIso

“DO NOT TOUCH IN THE FUTURE” RULE (ENFORCE IN CODE)
10) Add a large header comment at the TOP of mercadona.ts:
   - This parser is intentionally merchant-specific and test-driven.
   - Do not generalize it.
   - Add new merchants as new files in parsers/.
   - Any change must update fixtures/tests first.

TESTS (MANDATORY)
11) Add a unit test file for mercadona parser, using the repo’s existing test runner (Vitest or Jest).
   - Create: src/lib/receipts/parsers/mercadona.test.ts
   - Use this exact extracted text fixture (copy/paste):
     (PASTE THE TEXT OUTPUT FROM unpdf FOR mercadona.pdf; it includes:
      "MERCADONA, S.A. A-46103834"
      "20/12/2025 19:32 OP: ..."
      items including "4 COLA ZERO 2L 0,80 3,20"
      "TOTAL (€) 61,36"
      "TOTAL 55,56 5,80"
      "Importe: 61,36 € ...")
   Assertions:
     - store_name === "MERCADONA, S.A"
     - receipt_date_iso === "2025-12-20"
     - receipt_date === "20-12-2025"
     - receipt_time === "19:32:00"
     - currency === "EUR"
     - total_amount === 61.36
     - taxes_total_cuota === 5.8
     - items length === 24
     - the "COLA ZERO 2L" line parses:
          quantity=4, price_per_unit=0.8, total_price=3.2
     - the "BURGER M POLLO 500GR" line parses:
          quantity=1, total_price=3.56, price_per_unit=3.56 (computed)

NON-NEGOTIABLE CONSTRAINTS
- Do NOT remove my existing category preference + heuristics flow. The Mercadona parser must not assign categories.
- Do NOT change DB schema.
- Do NOT change the AI schema except optionally adding `taxes_total_cuota` as an optional key if you want.
- Keep changes localized: parsers/* + small integration edits in route.ts and processing.ts.
- Ensure TypeScript types compile and both codepaths behave identically for non-Mercadona receipts (still uses AI).

DELIVERABLES
- New files in src/lib/receipts/parsers/*
- Updated route.ts and processing.ts importing and using the dispatcher.
- Passing tests.