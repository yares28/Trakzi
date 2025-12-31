// lib/ai/categorize-v2.ts
import { CategorizeResult } from "@/lib/types/transactions";
import { DEFAULT_CATEGORIES } from '@/lib/categories';

const AI_CATEGORY_MODEL = process.env.OPENROUTER_CATEGORY_MODEL || "anthropic/claude-3.5-sonnet";
const FREE_FALLBACK_MODEL = "google/gemini-2.0-flash-exp:free";
const CATEGORIZE_BATCH_SIZE = 50; // Smaller batches for better reliability

type CategorizeBatchItem = {
    id: string;
    simplified_description: string;
    sanitized_description: string; // For disambiguation
    amount: number;
};

type CategorizeBatchResult = Map<string, CategorizeResult>;

/**
 * AI-based categorization using simplified descriptions (v2 pipeline).
 * This is optimized for simplified merchant names rather than raw descriptions.
 * Batches transactions with automatic free model fallback.
 * 
 * @param items - Array of items to categorize
 * @param categories - Available category names
 * @returns Map of id -> CategorizeResult
 */
export async function aiCategorizeBatch(
    items: CategorizeBatchItem[],
    categories: string[] = DEFAULT_CATEGORIES
): Promise<CategorizeBatchResult> {
    if (items.length === 0) return new Map();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn("[AI Categorize] No OPENROUTER_API_KEY found, using fallback categories");
        return createFallbackCategories(items);
    }

    const results = new Map<string, CategorizeResult>();

    // Process in batches
    for (let i = 0; i < items.length; i += CATEGORIZE_BATCH_SIZE) {
        const batch = items.slice(i, i + CATEGORIZE_BATCH_SIZE);

        let batchResults: CategorizeBatchResult;
        try {
            // Try primary model first
            batchResults = await processBatch(batch, categories, apiKey, AI_CATEGORY_MODEL);
        } catch (error) {
            console.warn(`[AI Categorize] Primary model failed, falling back to free model: ${FREE_FALLBACK_MODEL}`);
            try {
                // Fallback to free model
                batchResults = await processBatch(batch, categories, apiKey, FREE_FALLBACK_MODEL);
            } catch (fallbackError) {
                console.error("[AI Categorize] Both models failed, using hard fallback");
                batchResults = createFallbackCategories(batch);
            }
        }

        // Merge batch results
        batchResults.forEach((result, id) => {
            results.set(id, result);
        });
    }

    return results;
}

/**
 * Process a single batch of categorization requests
 */
async function processBatch(
    batch: CategorizeBatchItem[],
    categories: string[],
    apiKey: string,
    model: string = AI_CATEGORY_MODEL
): Promise<CategorizeBatchResult> {
    const categoryList = categories.join(", ");

    const systemPrompt = `You are a transaction categorization expert. Categorize each transaction into ONE of the available categories based on the simplified merchant name and transaction details.

AVAILABLE CATEGORIES:
${categoryList}

CATEGORIZATION RULES:
1. Use ONLY categories from the list above
2. The "simplified_description" is the primary signal (e.g., "Amazon", "Spotify", "Transfer Juan")
3. Use "amount" to help distinguish (negative = expense, positive = income)
4. Common patterns:
   - Groceries: Mercadona, Carrefour, Lidl, DIA, Aldi
   - Subscriptions: Spotify, Netflix, Disney+, Apple, Google
   - Transport: Uber, Cabify, Bolt, Renfe, Metro
   - Transfers: Transfer <Name>, Bizum <Name>, or just "Transfer"
   - Bank Fee: Bank fees, commissions
   - Salary: Salary, payroll (positive amount)
   - Refunds: Refund, reversal (positive amount)
5. If amount is positive and not salary/bonus/freelance → likely Transfers or Refunds
6. Use "Other" ONLY as last resort
7. Be consistent: same merchant → same category

RESPONSE FORMAT - Return ONLY valid JSON array:
[
  {"id": "tx_0", "category": "Groceries", "confidence": 0.95},
  {"id": "tx_1", "category": "Transfers", "confidence": 0.85}
]

IMPORTANT:
- Return ALL ${batch.length} transactions
- Use "id" exactly as provided
- Use exact category names from the list
- Confidence: 0.0-1.0 (how certain you are)`;

    const userPrompt = JSON.stringify(
        batch.map((item) => ({
            id: item.id,
            simplified_description: item.simplified_description,
            amount: item.amount,
        }))
    );

    const fetchStart = Date.now();
    console.log(`[AI Categorize] Calling OpenRouter: model="${model}", batchSize=${batch.length}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Trakzi - Transaction Categorization",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.1, // Very low for consistency
            response_format: { type: "json_object" },
        }),
    });

    const duration = Date.now() - fetchStart;

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Categorize] OpenRouter Error ${response.status} (${duration}ms):`, errorText.substring(0, 150));
        throw new Error(`OpenRouter API error: ${response.status} ${errorText.substring(0, 100)}`);
    }

    const json = await response.json();
    console.log(`[AI Categorize] Success from "${model}" (${duration}ms)`);
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("[AI Categorize] No content in API response");
    }

    // Parse AI response
    return parseAiResponse(content, batch, categories);
}

/**
 * Parse AI response and validate categories
 */
function parseAiResponse(
    content: string,
    batch: CategorizeBatchItem[],
    validCategories: string[]
): CategorizeBatchResult {
    try {
        const parsed = JSON.parse(content);

        // Handle both array and object with array
        const items = Array.isArray(parsed) ? parsed : (parsed.results || parsed.items || []);

        if (!Array.isArray(items)) {
            console.error("[AI Categorize] Response is not an array:", typeof items);
            return createFallbackCategories(batch);
        }

        const results = new Map<string, CategorizeResult>();
        const validCategorySet = new Set(validCategories.map(c => c.toLowerCase()));

        for (const item of items) {
            const id = item.id || item.i || item.transaction_id;
            const category = item.category || item.cat || item.c;
            const confidence = typeof item.confidence === 'number'
                ? item.confidence
                : (item.conf || 0.5);

            if (typeof id === 'string' && typeof category === 'string') {
                // Validate category against valid list
                const normalizedCategory = normalizeCategory(category, validCategories, validCategorySet);

                results.set(id, {
                    category: normalizedCategory,
                    confidence: Math.max(0, Math.min(1, confidence)), // Clamp 0-1
                });
            }
        }

        // Fill in missing items with fallback
        for (const item of batch) {
            if (!results.has(item.id)) {
                const fallbackCategory = getFallbackCategory(item);
                results.set(item.id, {
                    category: fallbackCategory,
                    confidence: 0.3,
                });
            }
        }

        return results;

    } catch (error) {
        console.error("[AI Categorize] Error parsing AI response:", error);
        return createFallbackCategories(batch);
    }
}

/**
 * Normalize category name to match valid categories
 */
function normalizeCategory(
    aiCategory: string,
    validCategories: string[],
    validCategorySet: Set<string>
): string {
    // Direct match (case-insensitive)
    const normalized = aiCategory.trim();
    const lower = normalized.toLowerCase();

    // Check if it's already valid
    if (validCategorySet.has(lower)) {
        // Find the correct capitalization from valid list
        return validCategories.find(c => c.toLowerCase() === lower) || normalized;
    }

    // Common aliases
    const aliases: Record<string, string> = {
        "grocery": "Groceries",
        "grocery store": "Groceries",
        "supermarket": "Groceries",
        "dining": "Restaurants",
        "restaurant": "Restaurants",
        "cafe": "Coffee",
        "coffee shop": "Coffee",
        "bank fee": "Bank Fees",
        "fees": "Bank Fees",
        "transfer": "Transfers",
        "income": "Salary",
        "refund": "Refunds",
        "subscription": "Subscriptions",
        "transport": "Public Transport",
        "taxi": "Taxi/Rideshare",
        "utilities": "Utilities",
    };

    if (aliases[lower]) {
        return aliases[lower];
    }

    // If unrecognized, return "Other"
    return "Other";
}

/**
 * Create fallback categories when AI fails
 */
function createFallbackCategories(batch: CategorizeBatchItem[]): CategorizeBatchResult {
    const results = new Map<string, CategorizeResult>();

    for (const item of batch) {
        const category = getFallbackCategory(item);
        results.set(item.id, {
            category,
            confidence: 0.3,
        });
    }

    return results;
}

/**
 * Get fallback category based on simplified description and amount
 */
function getFallbackCategory(item: CategorizeBatchItem): string {
    const desc = item.simplified_description.toLowerCase();
    const amount = item.amount;

    // Income indicators (positive amount)
    if (amount > 0) {
        if (/salary|payroll|nomina/i.test(desc)) return "Salary";
        if (/bonus/i.test(desc)) return "Bonus";
        if (/refund|reversal|devolucion/i.test(desc)) return "Refunds";
        if (/transfer|bizum/i.test(desc)) return "Transfers";
        return "Other";
    }

    // Expense indicators (negative amount)
    if (/mercadona|carrefour|lidl|dia|aldi|eroski/i.test(desc)) return "Groceries";
    if (/spotify|netflix|disney|hbo|apple|google/i.test(desc)) return "Subscriptions";
    if (/uber|cabify|bolt|taxi/i.test(desc)) return "Taxi/Rideshare";
    if (/amazon|zara|ikea/i.test(desc)) return "Shopping";
    if (/glovo|just eat|uber eats/i.test(desc)) return "Takeaway/Delivery";
    if (/renfe|metro|emt|tmb/i.test(desc)) return "Public Transport";
    if (/fee|comision|gastos/i.test(desc)) return "Bank Fees";
    if (/atm|cajero/i.test(desc)) return "Bank Fees";
    if (/transfer|bizum/i.test(desc)) return "Transfers";

    return "Other";
}
