# AI Categorization Deep Dive (Analytics/Home + Fridge)

This document explains how AI-based categorization works for:
- Analytics/Home transactions (CSV import)
- Fridge receipt items (receipt upload + review)

It also lists the key files and improvements for edge cases (languages, locales, messy item names).

## Analytics + Home (transaction categorization)

### Where it lives
- `app/api/statements/parse/route.ts` - CSV parsing, invokes categorization, returns canonical CSV.
- `lib/ai/categoriseTransactions.ts` - core categorization logic (preferences, patterns, AI, fallback).
- `lib/ai/ai-category-feedback.ts` - logs AI outputs that do not match allowed categories.
- `lib/transactions/transaction-category-preferences.ts` - preference storage + description key normalization.
- `lib/language/language-detection.ts` - language detection for locale-aware keyword routing.
- `app/api/transactions/preferences/route.ts` - saves user corrections to preferences.
- `app/analytics/_page/hooks/useCsvImport.ts` - Analytics UI import, sends `X-Custom-Categories`.
- `app/home/_page/hooks/useCsvImport.ts` - Home UI import, sends `X-Custom-Categories`.
- `lib/categories.ts` - default category list when no custom categories are available.

### Flow (high level)
1) UI uploads CSV to `/api/statements/parse` (Analytics and Home use the same endpoint).
2) CSV is parsed (auto parser first, AI parser as fallback when needed).
3) The endpoint loads user category preferences (`transaction_category_preferences`).
4) Language is detected from transaction samples to choose locale keyword sets (fallback to per-row detection when weak).
5) It calls `categoriseTransactions(...)` with rows + custom category list.
6) The endpoint returns a canonical CSV with categories; warning headers are set if AI fails.
7) If the user edits categories in the UI, preferences are saved and used on future imports.

### Categorization algorithm (priority order)
`lib/ai/categoriseTransactions.ts` processes each transaction in this order:
1) Preferences
   - `normalizeTransactionDescriptionKey(...)` maps description -> stable key.
   - If a preference exists, it wins.
2) Pattern match
   - `MERCHANT_PATTERNS` maps known merchants to categories (country-heavy).
3) AI classification (OpenRouter)
   - Runs only for rows with no preference or pattern match.
   - Category list is `X-Custom-Categories` if provided, else defaults from `lib/categories.ts`.
   - Model defaults to `anthropic/claude-3.5-sonnet` unless `OPENROUTER_CATEGORY_MODEL` overrides.
4) Rule-based fallback
   - Regex rules + keyword scoring by amount sign.
   - Keyword lists are merged with locale-specific lists (Spanish, Portuguese, French, Italian, German, Dutch, Catalan).
   - User corrections are converted into per-user keyword rules and merged into fallback + AI glossary.
5) Final normalization
   - Any category is normalized to the allowed list; otherwise falls back to "Other".
   - AI outputs that cannot be normalized are logged to `ai_category_feedback` (scope = `transaction`).

### Notes
- Categories sent to the AI are *only* those in `X-Custom-Categories` or defaults.
- `CATEGORY_DEFINITIONS` and keyword rules are not complete for all default categories.
  This weakens guidance when categories like "Coffee", "Takeaway/Delivery", etc. exist.
- AI failures result in all categories being set to "Other" and a warning header.
- Language detection uses `franc-min` on combined descriptions to decide a global locale when possible.
- Food-related conflicts (Groceries vs Restaurants vs Takeaway/Delivery) use explicit priority rules in keyword fallback.
- If AI returns an unknown category label, it is dropped and logged for later analysis.

## Fridge (receipt item categorization)

### Where it lives
- `app/api/receipts/upload/route.ts` - receipt upload + AI extraction + category assignment.
- `lib/receipts/ingestion/parseReceiptFile.ts` - unified OCR + deterministic parsing + AI fallback.
- `lib/receipts/receipt-category-heuristics.ts` - keyword heuristics for item categories.
- `lib/receipts/receipt-category-normalization.ts` - normalizes AI category labels to allowed categories.
- `lib/receipts/item-category-preferences.ts` - preference storage keyed by store + description.
- `lib/receipts/receipt-store-language-preferences.ts` - per-store language overrides for better heuristics.
- `app/api/receipt-stores/language/route.ts` - get/set store language preference.
- `lib/receipts/receipt-categories-db.ts` - ensures default receipt categories and broad types.
- `lib/receipt-categories.ts` - default receipt category taxonomy.
- `app/api/receipts/commit/route.ts` - persists receipt items and writes preferences.
- `app/api/receipt-transactions/[id]/category/route.ts` - manual re-categorization + preferences.
- `lib/ai/ai-category-feedback.ts` - logs AI outputs that do not match allowed categories.
- `lib/language/language-detection.ts` - language detection for locale-aware heuristics.

### Flow (high level)
1) Upload a receipt (PDF/image) to `/api/receipts/upload`.
2) `parseReceiptFile` tries:
   - OCR + deterministic parser (Mercadona) when possible
   - AI extraction as fallback (OpenRouter multimodal or text prompt)
3) Determine locale:
   - If a store language override exists, use it.
   - Otherwise detect language from item descriptions (franc-min).
4) AI extraction returns items with `category` labels *from the allowed list*.
5) For each item:
   - Normalize AI category via synonym/singular/stopword resolver.
   - Invalid AI categories are logged to `ai_category_feedback` and treated as "Other".
   - Apply user preferences (store-specific first, then global).
   - Apply heuristics with locale-aware rules and limited overrides:
     - Always override "Other" with a heuristic suggestion.
     - Override non-Other when drink/non-drink mismatch is detected.
     - Override when a strong heuristic disagrees.
   - Heuristics now emit confidence scores; low-confidence items are auto-flagged for review.
   - If a strong heuristic disagrees with AI, set `needsReview` for the review queue.
6) On commit or manual edit, preferences are updated for future imports.

### Categorization algorithm (priority order)
1) AI output category (from receipt extraction)
2) Preference override (by store + description key)
3) Heuristics override:
   - Only if category is "Other", if drink vs non-drink mismatch is detected, or if a strong heuristic disagrees.
4) Final normalization to allowed categories

### Notes
- Receipt AI prompts explicitly remove "Other" from the allowed list to reduce overuse.
- Heuristics rely on multilingual keywords (Spanish, English, Portuguese, French, Italian, German, Dutch, Catalan) and a fixed taxonomy from `lib/receipt-categories.ts`.
- Negative keyword guards (beverage/cleaning/sauce signals) prevent false positives like juice vs fruit.
- Token normalization now strips diacritics and punctuation for better cross-locale matches.
- Upload responses now include `categoryConfidence` and `confidenceSource` for each item.
- Receipt responses include `languageOverride`, `languageDetected`, and `languageSource` to explain which locale was used.

### Store language override (how it is used)
- A user can set a store language in the review dialog (Auto, ES, EN, PT, FR, IT, DE, NL, CA).
- Preferences are stored per user + store in `receipt_store_language_preferences`.
- When set, the override is used to select locale-specific heuristics for that store.
- If Auto is selected, language detection is re-enabled.

### Review queue (how it is used)
- If AI and a strong heuristic disagree, the item is flagged with `needsReview`.
- If the heuristic confidence score is low, the item is flagged with `needsReview`.
- The review dialog highlights those rows and lets users filter to “Review queue”.
- Any manual category/broad type/macronutrient edit clears the review flag.

### AI feedback logging (how it is used)
- Unknown AI categories are logged to `ai_category_feedback` for both:
  - Receipt items (scope = `receipt`).
  - CSV transactions (scope = `transaction`).
- Logged fields include input text, raw AI category, locale, store name, and receipt file name.
- This supports building better synonym maps, prompt rules, and locale keyword sets.

### Language detection (how it is used)
- `franc-min` detects language from item/transaction samples.
- If a strong global locale is found, it is used for keyword routing; otherwise per-row detection is used.

## Improvements for edge cases

### Analytics/Home (transactions)
- Locale-aware dictionaries:
  - Use user locale, currency, or bank name to load region-specific merchant patterns.
  - Maintain a per-locale keyword list (Spanish, French, German, etc).
- Multi-language support:
  - Detect language per description and route to language-specific keyword sets.
  - Consider transliteration for non-Latin scripts instead of stripping them.
- Category guidance alignment:
  - Expand `CATEGORY_DEFINITIONS`, aliases, and keyword rules to cover all default categories.
  - Add a "custom category glossary" (user-defined categories + synonyms) to the AI prompt.
- Fuzzy matching:
  - Add token-based or Levenshtein matching for merchant names and bank abbreviations.
  - Use a "closest category" map when custom categories are present (e.g., "Eating Out" -> "Restaurants").
- Sign inversion handling:
  - Some banks flip the sign; add a pass that detects income/refund keywords even if amount is negative.
- Prompt hardening:
  - Apply `sanitizeForAI` to descriptions before sending to the LLM.
  - Log and suppress repeated prompt-injection attempts.

### Fridge (receipt items)
- Better non-English coverage:
  - Add multilingual keyword lists and store-specific item dictionaries.
  - Use language detection or locale to select heuristics.
- Deli and abbreviated item names:
  - Add store-specific abbreviation expansions (e.g., "charcut", "embut", "jam coc").
  - Use a short dictionary of common deli/charcuterie terms across regions.
- Country-specific items:
  - Maintain regional vocab lists (e.g., "chorizo", "prosciutto", "kimchi") -> category map.
  - Use store + country metadata to select the right map.
- Confidence scoring:
  - Implemented heuristic confidence scores and low-confidence review flags.
- Unified categorization pipeline:
  - There are two similar AI extraction implementations (`app/api/receipts/upload` and `lib/receipts/processing`).
  - Consider consolidating to reduce drift and keep prompts/logic consistent.
- Enriched preference matching:
  - Use approximate matching for description keys to account for OCR noise.
  - Persist per-store synonyms based on frequent corrections.
