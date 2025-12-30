# Parsing and Categorization Scores

This document scores the current parsing and categorization pipelines and lists targeted upgrades. Scores are on a 1 to 10 scale (10 = most robust, 1 = not supported).

## Quick scores

Parsing:
- Fridge - PDF: 8/10
- Fridge - Image: 8/10
- Spending - PDF: 6.5/10
- Spending - CSV: 8/10

Categorization:
- Fridge: 8/10
- Spending: 7/10

## Parsing scores and upgrades

### Fridge parsing - PDF (8/10)
Where:
- `app/api/receipts/upload/route.ts`
- `lib/receipts/ingestion/parseReceiptFile.ts`
- `lib/receipts/parsers/mercadona.ts`
- `lib/receipts/parsers/mercadona/` (helpers)

Why this score:
- Digital PDFs extract text with `unpdf`, then run a deterministic Mercadona parser or AI fallback.
- Scanned PDFs with low text density trigger OCR fallback (render pages to images and run OCR).
- Validation checks flag total mismatches and missing line items, with auto-repair passes when needed.
- Parse quality metadata (text density, OCR usage, validation) is returned and surfaced in the Fridge review UI.
- Only one deterministic parser (Mercadona), everything else is AI-only.

Upgrades:
- Add more merchant-specific parsers (Carrefour, Lidl, Dia) and auto-select by merchant detection.
- Add store-specific templates to reduce AI reliance for common chains.

### Fridge parsing - Image (8/10)
Where:
- `lib/receipts/ocr/extractTextFromImage.ts`
- `lib/receipts/ingestion/parseReceiptFile.ts`
- `app/api/receipts/upload/route.ts`

Why this score:
- Image preprocessing (deskew, auto-crop, contrast normalization) runs before OCR.
- OCR includes a low-text retry pass with a stricter prompt for faint scans.
- Validation checks flag total mismatches, missing items, and line-item inconsistencies.
- Parse quality metadata (validation + repair signals) is returned for user review.
- Weakness: OCR is still sensitive to severe blur or heavy motion.

Upgrades:
- Add store-specific item dictionaries to correct common OCR errors (brand or product tokens).

### Spending parsing - PDF (6.5/10)
Where:
- `app/api/statements/parse/route.ts` (CSV-only, PDF rejected)
- `app/home/_page/hooks/useCsvImport.ts` (uploads PDF but parse API still requires CSV)

Why this score:
- Digital PDFs extract text with `unpdf`, then use table detection heuristics to map columns into rows.
- Scanned PDFs run OCR (render pages to images and run OCR) and retry on low-text pages.
- AI fallback extracts rows when deterministic table parsing is weak, then reuses the CSV parser for normalization.
- Weakness: column alignment still varies by bank layout; long statements can be costly to OCR/AI parse.

Upgrades:
- Add bank-specific templates to reduce AI usage and improve column alignment.
- Add statement-period validation (first/last date vs summary range).
- Add optional PDF table extraction via layout-aware tooling for multi-column PDFs.

### Spending parsing - CSV (8/10)
Where:
- `app/api/statements/parse/route.ts`
- `lib/parsing/parseCsvToRows.ts`
- `app/home/_page/hooks/useCsvImport.ts`
- `app/analytics/_page/hooks/useCsvImport.ts`

Why this score:
- Good delimiter and header inference, plus robust amount parsing and date-order inference.
- AI fallback exists when the deterministic parser fails.
- Supports debit and credit columns, and type-based sign correction.
- XLS/XLSX parsing is supported and reused through the same normalization pipeline.
- Multi-line descriptions are merged, with continuation rows supplying missing amounts/balances.
- Weakness: bank-specific formats can still cause column drift in edge-case exports.

Upgrades:
- Add bank-specific templates (column maps) and prefer them when bank name is known.
- Add statement-period validation (first/last date vs summary range).
- Add layout-aware PDF table extraction for complex exports.

## Categorization scores and upgrades

### Fridge categorization (8/10)
Where:
- `app/api/receipts/upload/route.ts`
- `lib/receipts/receipt-category-heuristics.ts`
- `lib/receipts/receipt-category-normalization.ts`
- `lib/receipts/item-category-preferences.ts`
- `lib/receipts/receipt-store-language-preferences.ts`

Why this score:
- AI extracts category per item with a strict allowed list, then normalization resolves variants.
- Heuristics override bad AI output and avoid obvious mislabels (e.g., juice vs fruit).
- User preferences and store language overrides improve accuracy over time.
- Weakness: OCR noise and abbreviated item names still cause misses.
- Limited locale coverage beyond ES/EN/PT/FR/IT and no store-specific dictionaries by default.

Upgrades:
- Add store-specific vocab and normalization (abbreviations, internal item codes).
- Add category confidence scoring and auto-flag low-confidence items for review.
- Expand locale dictionaries and tokenization rules to handle more languages.
- Add negative keyword guards (e.g., "zero" energy drinks vs fruit juice) to reduce false positives.

### Spending categorization (7/10)
Where:
- `lib/ai/categoriseTransactions.ts`
- `lib/transactions/transaction-category-preferences.ts`
- `lib/categories.ts`

Why this score:
- Uses merchant pattern matching, keyword rules, language detection, and AI fallback.
- Custom categories and user preferences are respected.
- Weakness: relies almost entirely on free-text descriptions; no MCC or bank metadata.
- Some merchants are ambiguous (e.g., department stores vs groceries), which can default to "Other" or misclassify.

Upgrades:
- Add a merchant database with normalized names and known categories.
- Use MCC or bank-provided category if present (as a high-confidence signal).
- Add per-user corrections loop to auto-train custom rules (already partially present, expand it).
- Add category conflict resolution rules (e.g., groceries vs restaurants vs takeaway) with explicit priorities.
