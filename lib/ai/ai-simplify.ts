// lib/ai/ai-simplify.ts
import { SimplifyResult } from "@/lib/types/transactions";

const AI_SIMPLIFY_MODEL = process.env.OPENROUTER_SIMPLIFY_MODEL || "anthropic/claude-3.5-sonnet";
const FREE_FALLBACK_MODEL = "google/gemini-2.0-flash-exp:free";
const SIMPLIFY_BATCH_SIZE = 25; // Smaller batches for better reliability

type SimplifyBatchItem = {
    id: string;
    sanitized_description: string;
};

type SimplifyBatchResult = Map<string, SimplifyResult>;

/**
 * AI-based simplification (fallback when rules don't match).
 * Batches transactions for efficiency with automatic free model fallback.
 * 
 * @param items - Array of items to simplify (id + sanitized description)
 * @returns Map of id -> SimplifyResult
 */
export async function aiSimplifyBatch(items: SimplifyBatchItem[]): Promise<SimplifyBatchResult> {
    if (items.length === 0) return new Map();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.warn("[AI Simplify] No OPENROUTER_API_KEY found, skipping AI simplification");
        return createFallbackResults(items);
    }

    const results = new Map<string, SimplifyResult>();

    // Process in batches
    for (let i = 0; i < items.length; i += SIMPLIFY_BATCH_SIZE) {
        const batch = items.slice(i, i + SIMPLIFY_BATCH_SIZE);

        let batchResults: SimplifyBatchResult;
        try {
            // Try primary model first
            batchResults = await processBatch(batch, apiKey, AI_SIMPLIFY_MODEL);
        } catch (error) {
            console.warn(`[AI Simplify] Primary model failed, falling back to free model: ${FREE_FALLBACK_MODEL}`);
            try {
                // Fallback to free model
                batchResults = await processBatch(batch, apiKey, FREE_FALLBACK_MODEL);
            } catch (fallbackError) {
                console.error("[AI Simplify] Both models failed, using hard fallback");
                batchResults = createFallbackResults(batch);
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
 * Process a single batch of simplification requests
 */
async function processBatch(
    batch: SimplifyBatchItem[],
    apiKey: string,
    model: string = AI_SIMPLIFY_MODEL
): Promise<SimplifyBatchResult> {
    const systemPrompt = `You are a transaction description simplifier. Your task is to extract clean, concise merchant names or labels from bank transaction descriptions.

RULES:
1. Extract the PRIMARY merchant or service name (e.g., "Amazon", "Spotify", "Uber")
2. For transfers, keep format: "Transfer <FirstName>" or just "Transfer"
3. For generic operations, use labels: "Bank Fee", "ATM Withdrawal", "Salary", "Refund"
4. Remove banking jargon (COMPRA, PAGO, TPV, POS, etc.)
5. Remove location details (MADRID, VALENCIA, etc.)
6. Use proper capitalization (Title Case)
7. Keep it SHORT (1-3 words max)
8. If unclear, make best guess (don't return the full description)

EXAMPLES:
Input: "COMPRA ONLINE WWW.BOOKING.COM"
Output: "Booking.com"

Input: "PAGO RESTAURANTE LA TASCA MADRID"
Output: "La Tasca"

Input: "RECIBO MENSUAL ENDESA ENERGIA"
Output: "Endesa"

Input: "CAJERO AUTOMATICO BBVA"
Output: "ATM Withdrawal"

RESPONSE FORMAT - Return ONLY valid JSON array:
[
  {"id": "tx_0", "simplified": "Amazon", "confidence": 0.9},
  {"id": "tx_1", "simplified": "Transfer Maria", "confidence": 0.7}
]

IMPORTANT: 
- Return ALL ${batch.length} items
- Use "id" exactly as provided
- Confidence: 0.0-1.0 (how certain you are)
- Keep simplified SHORT (max 50 chars)`;

    const userPrompt = JSON.stringify(
        batch.map((item) => ({
            id: item.id,
            description: item.sanitized_description,
        }))
    );

    const fetchStart = Date.now();
    console.log(`[AI Simplify] Calling OpenRouter: model="${model}", batchSize=${batch.length}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Trakzi - Transaction Simplification",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
        }),
    });

    const duration = Date.now() - fetchStart;

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Simplify] OpenRouter Error ${response.status} (${duration}ms):`, errorText.substring(0, 150));
        throw new Error(`OpenRouter API error: ${response.status} ${errorText.substring(0, 100)}`);
    }

    const json = await response.json();
    console.log(`[AI Simplify] Success from "${model}" (${duration}ms)`);
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("[AI Simplify] No content in API response");
    }

    // Parse AI response
    return parseAiResponse(content, batch);
}

/**
 * Parse AI response and validate results
 */
function parseAiResponse(content: string, batch: SimplifyBatchItem[]): SimplifyBatchResult {
    try {
        const parsed = JSON.parse(content);

        // Handle both array and object with array
        const items = Array.isArray(parsed) ? parsed : (parsed.results || parsed.items || []);

        if (!Array.isArray(items)) {
            console.error("[AI Simplify] Response is not an array:", typeof items);
            return createFallbackResults(batch);
        }

        const results = new Map<string, SimplifyResult>();

        for (const item of items) {
            const id = item.id || item.i || item.transaction_id;
            const simplified = item.simplified || item.merchant || item.label || item.name;
            const confidence = typeof item.confidence === 'number'
                ? item.confidence
                : (item.conf || 0.5);

            if (typeof id === 'string' && typeof simplified === 'string') {
                results.set(id, {
                    simplified: simplified.trim().substring(0, 50), // Max 50 chars
                    confidence: Math.max(0, Math.min(1, confidence)), // Clamp 0-1
                    matchedRule: "ai",
                    typeHint: "other",
                });
            }
        }

        // Fill in missing items with fallback
        for (const item of batch) {
            if (!results.has(item.id)) {
                const fallback = extractFallbackName(item.sanitized_description);
                results.set(item.id, {
                    simplified: fallback,
                    confidence: 0.3,
                    matchedRule: "ai_fallback",
                    typeHint: "other",
                });
            }
        }

        return results;

    } catch (error) {
        console.error("[AI Simplify] Error parsing AI response:", error);
        return createFallbackResults(batch);
    }
}

/**
 * Create fallback results when AI fails
 */
function createFallbackResults(batch: SimplifyBatchItem[]): SimplifyBatchResult {
    const results = new Map<string, SimplifyResult>();

    for (const item of batch) {
        const fallback = extractFallbackName(item.sanitized_description);
        results.set(item.id, {
            simplified: fallback,
            confidence: 0.3,
            matchedRule: "fallback",
            typeHint: "other",
        });
    }

    return results;
}

/**
 * Extract a reasonable merchant name from description (no AI)
 * Used as last resort fallback
 */
function extractFallbackName(description: string): string {
    if (!description) return "Transaction";

    // Remove common prefixes
    let cleaned = description
        .replace(/^(COMPRA|PAGO|PAYMENT|PURCHASE|RECIBO|CARGO)\s+/i, "")
        .replace(/^(EN|IN|AT|DE|A)\s+/i, "")
        .replace(/^(WWW\.|HTTP[S]?:\/\/)/i, "");

    // Take first 1-3 meaningful words
    const words = cleaned
        .split(/[\s\-_\/\\]+/)
        .filter(w => w.length >= 3)
        .filter(w => !/^(TARJ|CARD|TPV|POS|ONLINE)$/i.test(w))
        .slice(0, 3);

    if (words.length === 0) {
        return description.substring(0, 30).trim() || "Transaction";
    }

    // Title case
    const result = words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

    return result.substring(0, 50);
}
