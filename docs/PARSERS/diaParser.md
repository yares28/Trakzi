## Dia Parser

GOAL
Implement a deterministic, Dia-specific PDF-text parser that extracts fields perfectly for Dia receipts.

### Fields Extracted
Main:
- store_name: exactly "DIA RETAIL ESPAÑA, S.A.U."
- receipt_date: formatted "DD-MM-YYYY" for output, ISO "YYYY-MM-DD" for DB
- receipt_time: "HH:MM:SS"
- currency: "EUR" when € appears
- total_amount: from "Total to pay" line
- taxes_total_cuota: Sum of VAT QUOTA from tax section

Items (each product line):
- description
- quantity
- price_per_unit
- total_price
- category: null (assigned by preference + heuristics flow)

### Receipt Format

```
Buy at CL DELS LLEONS 48
17/01/2026 11:51 Store Number 1032

Simplified invoice No. 0103203-00196912
Cashier number: 3. Employee number 74646

Order summary
Total without promotions ─────────── €13,11
                Total saving         -€0,08
Total to pay ─────────────────────── €13,03

Payment method
Tarjeta Tef ─────────────────────── €13,03

Products sold by Dia
DESCRIPTION      QUANTITY    KG PRICE    TOTAL
NAPOLITANA       2 ud        €0,55       €1,10  B
CHOCOLATE
NAPOLITANA       2 ud        €0,75       €1,50  B
BARBACOA
NAPOLITANA JAM/AT/BA                    -€0,08
BOLSA 50%        1 ud        €0,15       €0,15  C
RECICLADA
GALLETA TRIPLE   1 ud        €0,89       €0,89  B
CHOCO
GALLETA CHOCO    1 ud        €0,89       €0,89  B
LECHE
LECHE SEMI       1 ud        €1,05       €1,05  A
CALCIO
CEREAL FROSTIES  1 ud        €4,35       €4,35  B
RED BULL SUGAR   2 ud        €1,59       €3,18  C
FREE

Total sale Day ────────────────────── €13,03

VAT breakdown
Products sold by Dia
TYPE    VAT     BASE    QUOTA
A       4%      €1,01   €0,04
B       10%     €7,86   €0,79
C       21%     €2,75   €0,58

VAT included
DIA RETAIL ESPAÑA, S.A.U. A80782519
```

### Detection

`canParse` returns true if:
- Text contains "DIA RETAIL" OR "Products sold by Dia" AND
- Text contains "Simplified invoice" OR "VAT breakdown"

### Parsing Rules

1. **store_name**: Extract and normalize to "DIA RETAIL ESPAÑA, S.A.U."

2. **receipt_date + receipt_time**:
   - Header pattern: `DD/MM/YYYY HH:MM`
   - Alternative (operation data): `FECHA: DD/MM/YYYY HORA: HH:MM`
   - Example: "17/01/2026 11:51" → ISO: "2026-01-17", Display: "17-01-2026", Time: "11:51:00"

3. **currency**: "EUR" if € or EUROS found

4. **total_amount**:
   - Pattern: `/Total\s+to\s+pay[─\-\s]*€?\s*([0-9]{1,6}[.,][0-9]{2})/i`
   - Fallback: `/Total\s+sale\s+Day[─\-\s]*€?\s*([0-9]{1,6}[.,][0-9]{2})/i`

5. **taxes_total_cuota**:
   - Find "VAT breakdown" section
   - Look for header "TYPE VAT BASE QUOTA"
   - Sum the QUOTA column (last €-prefixed value per line)

6. **items**:
   - Start after "Products sold by Dia" header
   - End before "Total sale Day" or "VAT breakdown"
   - Format: `DESCRIPTION qty ud €unit_price €total_price VAT_LETTER`
   - Handle discount lines: `DESCRIPTION -€amount`
   - Extract € prefixed amounts

### Special Cases

- **Discounts**: Lines with negative €-prefixed amounts (e.g., "NAPOLITANA JAM/AT/BA -€0,08")
  - Stored as items with negative total_price
- **Multi-line descriptions**: Description may wrap to next line
- **VAT categories**: A (4%), B (10%), C (21%) - not stored, just for reference

### File Location

`lib/receipts/parsers/dia.ts`

### Integration

Registered in `lib/receipts/parsers/index.ts` alongside mercadonaParser and consumParser.
