## Consum Parser

GOAL
Implement a deterministic, Consum-specific PDF-text parser that extracts fields perfectly for Consum receipts.

### Fields Extracted
Main:
- store_name: exactly "CONSUM, S.COOP.V."
- receipt_date: formatted "DD-MM-YYYY" for output, ISO "YYYY-MM-DD" for DB
- receipt_time: "HH:MM:SS"
- currency: "EUR" when € appears
- total_amount: from "Total factura:" or "IMPORTE A ABONAR"
- taxes_total_cuota: Sum of VAT CUOTA from tax section

Items (each product line):
- description
- quantity
- price_per_unit
- total_price
- category: null (assigned by preference + heuristics flow)

### Receipt Format

```
12 - V.Justo y Pastor
Tlf.963553980

C:0012 02/000027 07.01.2026 11:20 644828
UND                           PVP
KG ARTICULO                   €/KG TOTAL
----------------------------------------
1 PASTEL CREMA 3U             1,29
1 LONCH.VEGALIA 100G          1,99
2 RED BULL SANDÍA 0,2    1,59 3,18
1 MONSTER FIESTA 0,50         1,79
1 MONSTER ULTRA ROSA          1,79
2 REDBULL ZERO 0,25L.    1,59 3,18
1 ONE CAT ESTERIL+HAI         10,29
Socio-Cliente 2902646625013
----------------------------------------
Total factura:                23,51

IMPORTE A ABONAR              23,51
Tarj. Crédito                 23,51
Cambio                        0,00

FACTURA SIMPLIFICADA
Base   IVA   Cuota  Importe
12,33  10,00 1,24   13,57
8,20   21,00 1,74   9,94

CONSUM, S.COOP.V.
Avd. Alginet, nº 1
Silla
N.I.F.F46078986
```

### Detection

`canParse` returns true if:
- Text contains "CONSUM" AND
- Text contains "FACTURA SIMPLIFICADA" AND
- Text contains "CONSUM, S.COOP" or "CONSUM S.COOP"

### Parsing Rules

1. **store_name**: Extract and normalize to "CONSUM, S.COOP.V."

2. **receipt_date + receipt_time**:
   - Pattern: `DD.MM.YYYY HH:MM` (dots for date)
   - Example: "07.01.2026 11:20" → ISO: "2026-01-07", Display: "07-01-2026", Time: "11:20:00"

3. **currency**: "EUR" if € found

4. **total_amount**:
   - Prefer: `/Total\s+factura\s*:\s*([0-9]{1,6}[.,][0-9]{2})/i`
   - Fallback: `/IMPORTE\s+A\s+ABONAR\s+([0-9]{1,6}[.,][0-9]{2})/i`

5. **taxes_total_cuota**:
   - Find "FACTURA SIMPLIFICADA" section
   - Look for header "Base IVA Cuota Importe"
   - Sum the 3rd column (Cuota) from each tax line

6. **items**:
   - Start after dashed line (---) following header
   - End before "Total factura:" or "Socio-Cliente"
   - Format: `qty description [unit_price] total_price`
   - Parse quantity from start of line
   - Extract prices from right side

### File Location

`lib/receipts/parsers/consum.ts`

### Integration

Registered in `lib/receipts/parsers/index.ts` alongside mercadonaParser and diaParser.
