## Dia Parser

GOAL
Implement a deterministic, Dia-specific PDF-text parser that extracts fields perfectly for Dia receipts.

### Supported Formats

The parser supports **TWO** Dia receipt formats:

1. **English POS Format** - Point-of-sale receipt style
2. **Spanish "Factura de Canje" Format** - Formal invoice style

### Fields Extracted
Main:
- store_name: exactly "DIA RETAIL ESPAÑA, S.A.U."
- receipt_date: formatted "DD-MM-YYYY" for output, ISO "YYYY-MM-DD" for DB
- receipt_time: "HH:MM:SS"
- currency: "EUR" when € appears
- total_amount: final amount including VAT
- taxes_total_cuota: Sum of VAT QUOTA from tax section

Items (each product line):
- description
- quantity
- price_per_unit (WITH VAT)
- total_price (WITH VAT)
- category: null (assigned by preference + heuristics flow)

---

## Format 1: Spanish "Factura de Canje"

### Receipt Format

```
DIA RETAIL ESPAÑA, S.A.U. CIF: A80782519
C/JACINTO BENAVENTE,2A TRIPARK, 28232, LAS ROZAS, MADRID

Nº factura simplificada: 0103203-00196912
Tienda: 1032
Fecha factura simplificada: 17/01/2026
Nº ticket único: ES-01032-03-00196912-20260117-105136

Código  Descripción           Unid/Kg  Precio Unit.  Descuento  % IVA  Cuota IVA  PVP Total
                                       sin IVA       sin IVA                       sin IVA
191604  BOLSA 50% RECICLADA   1 unid.  0,12397 €     0,00000 €  21%    0,02603 €  0,12397 €
130842  CEREAL FROSTIES       1 unid.  3,95455 €     0,00000 €  10%    0,39545 €  3,95455 €
302887  NAPOLITANA BARBACOA   2 unid.  0,68182 €   - 0,07273 €  10%    0,12909 €  1,29091 €

Desglose de IVA:
% IVA  Base imponible  Cuota IVA  Base + IVA incluido
4%     1,01 €          0,04 €     1,05 €
10%    7,86 €          0,79 €     8,65 €
21%    2,75 €          0,58 €     3,33 €

Total base imponible           11,62 €
Total cuotas de IVA            1,41 €
Total base imponible más IVA   13,03 €

Descuentos aplicados a PVP
NAPOLITANA JAM/AT/BA           0,08 €
```

### Detection (Spanish Format)
- Contains "DIA RETAIL" AND
- Contains "FACTURA SIMPLIFICADA" OR "DESGLOSE DE IVA" OR "FECHA FACTURA"

### Parsing Rules (Spanish Format)

1. **store_name**: "DIA RETAIL ESPAÑA, S.A.U."

2. **receipt_date**:
   - Pattern: `Fecha factura simplificada: DD/MM/YYYY`
   - Time extracted from ticket único: `...20260117-105136` → `10:51:36`

3. **total_amount**:
   - Pattern: `/Total\s+base\s+imponible\s+más\s+IVA\s+([0-9]+[.,][0-9]{2})\s*€/i`

4. **taxes_total_cuota**:
   - Direct: `Total cuotas de IVA X,XX €`

5. **items**:
   - Table format: Código, Descripción, Unid/Kg, Precio Unit. sin IVA, etc.
   - **IMPORTANT**: Prices are WITHOUT VAT in the table
   - Calculate WITH VAT: `total_with_vat = PVP_sin_IVA + Cuota_IVA`

6. **discounts**:
   - Section: "Descuentos aplicados a PVP"
   - Stored as negative-priced items

---

## Format 2: English POS Receipt

### Receipt Format

```
Buy at CL DELS LLEONS 48
17/01/2026 11:51 Store Number 1032

Simplified invoice No. 0103203-00196912

Total to pay ─────────────────────── €13,03

Products sold by Dia
DESCRIPTION      QUANTITY    KG PRICE    TOTAL
NAPOLITANA       2 ud        €0,55       €1,10  B
CHOCOLATE
GALLETA TRIPLE   1 ud        €0,89       €0,89  B
CHOCO

VAT breakdown
TYPE    VAT     BASE    QUOTA
A       4%      €1,01   €0,04
B       10%     €7,86   €0,79
C       21%     €2,75   €0,58

DIA RETAIL ESPAÑA, S.A.U. A80782519
```

### Detection (English Format)
- Contains "DIA RETAIL" OR "Products sold by Dia" AND
- Contains "Simplified invoice" OR "VAT breakdown"

### Parsing Rules (English Format)

1. **receipt_date + receipt_time**:
   - Header: `DD/MM/YYYY HH:MM`

2. **total_amount**:
   - Pattern: `/Total\s+to\s+pay[─\-\s]*€?\s*([0-9]+[.,][0-9]{2})/i`

3. **items**:
   - Format: `DESCRIPTION qty ud €unit_price €total_price VAT_LETTER`
   - Prices are already WITH VAT

---

## File Location

`lib/receipts/parsers/dia.ts`

## Integration

Registered in `lib/receipts/parsers/index.ts` alongside mercadonaParser and consumParser.

## Validation

- 10% tolerance on total validation (due to VAT calculation rounding)
- Minimum 1 item required
- Date and total amount required
