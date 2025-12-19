// lib/parsing/aiParseCsv.ts
// AI-assisted CSV parsing for when standard parsing fails

import { TxRow } from "../types/transactions";
import { getSiteUrl, getSiteName } from '@/lib/env';

export interface AiParseOptions {
    rawCsv: string;
    userContext?: string; // Optional context hint from user (e.g., "European date format", "bank statement from Spain")
    existingCategories?: string[];
}

export interface AiParseResult {
    rows: TxRow[];
    confidence: number; // 0-100 confidence score
    suggestions?: string; // Any suggestions from AI for the user
    rawResponse?: string; // For debugging
}

/**
 * Use AI to parse a CSV file when standard parsing fails or returns poor quality results.
 * This is more expensive but can handle non-standard formats.
 */
export async function aiParseCsv(options: AiParseOptions): Promise<AiParseResult> {
    const { rawCsv, userContext, existingCategories } = options;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const SITE_URL = getSiteUrl();
    const SITE_NAME = getSiteName();

    if (!OPENROUTER_API_KEY) {
        throw new Error("AI parsing requires OPENROUTER_API_KEY to be configured");
    }

    // Truncate CSV if too long to avoid token limits
    const maxCsvLength = 50000; // ~12k tokens
    const truncatedCsv = rawCsv.length > maxCsvLength
        ? rawCsv.substring(0, maxCsvLength) + "\n... (truncated)"
        : rawCsv;

    const categories = existingCategories && existingCategories.length > 0
        ? existingCategories
        : ["Groceries", "Shopping", "Restaurants", "Transport", "Utilities", "Insurance", "Transfers", "Income", "Taxes", "Savings", "Other"];

    const systemPrompt = `You are an expert financial data parser. Your job is to extract transaction data from CSV files that may have non-standard formats.

TASK: Parse the provided CSV content and extract transactions with the following fields:
- date: ISO format YYYY-MM-DD (e.g., "2024-12-15")
- description: Clean transaction description
- amount: Numeric value (negative for expenses, positive for income)
- category: One of: ${categories.join(", ")}

RULES:
1. Dates can be in ANY format - detect and convert to YYYY-MM-DD
2. Handle European formats (DD/MM/YYYY, DD.MM.YYYY, etc.)
3. Amounts may use comma as decimal separator
4. Negative amounts indicate expenses
5. Skip header rows and any summary/total rows
6. Clean up descriptions (remove reference numbers, extra codes)

${userContext ? `USER CONTEXT: ${userContext}` : ""}

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "Clean description", "amount": -123.45, "category": "Category"},
    ...
  ],
  "confidence": 85,
  "suggestions": "Any notes or suggestions for the user"
}`;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-001",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Parse this CSV:\n\n${truncatedCsv}` }
                ],
                response_format: { type: "json_object" },
                provider: {
                    sort: "throughput"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[AI Parse] OpenRouter API error:", response.status, errorText.substring(0, 200));
            throw new Error(`AI parsing failed: ${response.status}`);
        }

        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("AI returned empty response");
        }

        const parsed = JSON.parse(content);
        const transactions = parsed.transactions || [];

        // Validate and normalize the transactions
        const rows: TxRow[] = transactions.map((tx: any) => ({
            date: normalizeAiDate(tx.date),
            description: String(tx.description || "").trim(),
            amount: typeof tx.amount === "number" ? tx.amount : parseFloat(tx.amount) || 0,
            balance: null,
            category: tx.category || "Other"
        })).filter((row: TxRow) => row.date && row.description);

        return {
            rows,
            confidence: parsed.confidence || 50,
            suggestions: parsed.suggestions,
            rawResponse: content
        };
    } catch (error: any) {
        console.error("[AI Parse] Error:", error);
        throw new Error(`AI parsing failed: ${error.message}`);
    }
}

/**
 * Normalize a date from AI response to YYYY-MM-DD format
 */
function normalizeAiDate(dateStr: string): string {
    if (!dateStr) return "";

    // Already in correct format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Try native date parsing as fallback
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            if (year >= 1900 && year <= 2100) {
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
    } catch {
        // ignore
    }

    return dateStr;
}
