// lib/ai/parseCsvWithAI.ts
import { TxRow } from "../types/transactions";
import { getSiteUrl, getSiteName } from "@/lib/env";

export type AIParseDiagnostics = {
    usedAI: boolean;
    reason: string;
    rawResponse?: string;
    tokensUsed?: number;
    modelUsed?: string;
    error?: string;
};

export type AICsvParseResult = {
    rows: TxRow[];
    diagnostics: AIParseDiagnostics;
};

/**
 * Determines if the parser output looks problematic and needs AI help
 */
export function shouldUseAIFallback(
    rows: TxRow[],
    originalRowCount: number,
    invalidDateCount: number
): { shouldUse: boolean; reason: string } {
    // Case 1: No rows parsed at all
    if (rows.length === 0 && originalRowCount > 0) {
        return { shouldUse: true, reason: "Parser returned 0 rows from non-empty file" };
    }

    // Case 2: Very high invalid date ratio (> 50%)
    if (rows.length > 0) {
        const invalidDateRatio = invalidDateCount / rows.length;
        if (invalidDateRatio > 0.5) {
            return { shouldUse: true, reason: `High invalid date ratio: ${(invalidDateRatio * 100).toFixed(0)}%` };
        }
    }

    // Case 3: All amounts are 0 or NaN (likely parsing issue)
    const validAmounts = rows.filter(r => typeof r.amount === "number" && !isNaN(r.amount) && r.amount !== 0);
    if (rows.length > 3 && validAmounts.length === 0) {
        return { shouldUse: true, reason: "All amounts are 0 or invalid" };
    }

    // Case 4: All descriptions are empty or very short (likely wrong column mapping)
    const validDescriptions = rows.filter(r => r.description && r.description.trim().length > 3);
    if (rows.length > 3 && validDescriptions.length < rows.length * 0.3) {
        return { shouldUse: true, reason: "Most descriptions are empty or too short" };
    }

    // Case 5: Too few rows extracted compared to expected (< 20% of original)
    if (originalRowCount > 10 && rows.length < originalRowCount * 0.2) {
        return { shouldUse: true, reason: `Low extraction rate: ${rows.length}/${originalRowCount} rows` };
    }

    return { shouldUse: false, reason: "Parser output looks valid" };
}

/**
 * Parse CSV content using AI as a fallback when the regular parser fails
 */
export async function parseCsvWithAI(
    csvContent: string,
    fileName?: string
): Promise<AICsvParseResult> {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const SITE_URL = getSiteUrl();
    const SITE_NAME = getSiteName();

    if (!OPENROUTER_API_KEY) {
        return {
            rows: [],
            diagnostics: {
                usedAI: false,
                reason: "No OpenRouter API key configured",
                error: "OPENROUTER_API_KEY environment variable is not set"
            }
        };
    }

    // Truncate CSV if too long (AI has token limits)
    const MAX_CSV_LENGTH = 50000; // ~12k tokens
    let truncatedCsv = csvContent;
    let truncationNote = "";
    if (csvContent.length > MAX_CSV_LENGTH) {
        truncatedCsv = csvContent.substring(0, MAX_CSV_LENGTH);
        // Try to cut at a newline
        const lastNewline = truncatedCsv.lastIndexOf("\n");
        if (lastNewline > MAX_CSV_LENGTH * 0.8) {
            truncatedCsv = truncatedCsv.substring(0, lastNewline);
        }
        truncationNote = `\n\nNOTE: The file was truncated. There are more rows in the original file.`;
    }

    const systemPrompt = `You are an expert CSV/bank statement parser. Your job is to extract transaction data from messy, malformed, or unusual CSV files that standard parsers fail to handle.

TASK: Parse the provided CSV content and extract transactions.

EXPECTED OUTPUT FORMAT (JSON only):
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM" or null,
      "description": "merchant/transaction description",
      "amount": -123.45,
      "balance": 1000.00 or null
    }
  ],
  "notes": "Optional notes about the parsing"
}

PARSING RULES:
1. DATE: Convert any date format to ISO YYYY-MM-DD
   - Handle M/D/YYYY, D/M/YYYY, DD.MM.YYYY, YYYY-MM-DD, etc.
   - If you see dates like "8/31/2024 12:57", extract both date AND time
   - Be smart about ambiguous dates (8/5/2024 could be Aug 5 or May 8 - use context)

2. TIME: Extract time if present, otherwise set to null
   - Common formats: HH:MM, HH:MM:SS, with or without AM/PM

3. AMOUNT: 
   - Negative amounts are expenses/debits (money going out)
   - Positive amounts are income/credits (money coming in)
   - Handle European format (1.234,56) and US format (1,234.56)
   - Remove currency symbols (€, $, £, etc.)
   
4. DESCRIPTION: Extract the merchant/transaction description
   - This is typically the longest text field
   - Clean up excessive codes or reference numbers

5. BALANCE: Extract if available, otherwise set to null

6. HANDLE EDGE CASES:
   - Skip header rows and metadata
   - Handle files with multiple date columns (use the first relevant one)
   - Handle semicolon, tab, or other delimiters
   - Ignore rows that are clearly not transactions

RETURN ONLY VALID JSON. Do not include any explanation text outside the JSON.`;

    const userPrompt = `Parse this ${fileName ? `file "${fileName}"` : "CSV content"}:${truncationNote}

\`\`\`csv
${truncatedCsv}
\`\`\``;

    try {
        console.log("[AI CSV Parser] Calling OpenRouter API...");

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
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                max_tokens: 16000,
                provider: {
                    sort: "throughput"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[AI CSV Parser] API error:", response.status, errorText.substring(0, 300));
            return {
                rows: [],
                diagnostics: {
                    usedAI: true,
                    reason: "AI parsing attempted but failed",
                    error: `OpenRouter API error: ${response.status} - ${errorText.substring(0, 200)}`
                }
            };
        }

        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;
        const usage = json.usage;

        if (!content) {
            return {
                rows: [],
                diagnostics: {
                    usedAI: true,
                    reason: "AI returned empty response",
                    error: "No content in API response"
                }
            };
        }

        console.log("[AI CSV Parser] Parsing response...");

        // Parse the AI response
        const parsed = JSON.parse(content);
        const transactions = parsed.transactions || parsed.rows || parsed.data || [];

        if (!Array.isArray(transactions)) {
            return {
                rows: [],
                diagnostics: {
                    usedAI: true,
                    reason: "AI response format invalid",
                    rawResponse: content.substring(0, 500),
                    error: "Response did not contain a transactions array"
                }
            };
        }

        // Convert AI response to TxRow format
        const rows: TxRow[] = transactions.map((tx: any) => {
            // Parse date
            let date = tx.date || "";
            if (date && typeof date === "string") {
                // Ensure date is in YYYY-MM-DD format
                const dateMatch = date.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (!dateMatch) {
                    // Try to parse other formats
                    const parts = date.split(/[-\/\.]/);
                    if (parts.length === 3) {
                        const [a, b, c] = parts.map(p => parseInt(p, 10));
                        if (a > 1900) {
                            date = `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
                        } else if (c > 1900) {
                            date = `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
                        }
                    }
                }
            }

            // Parse amount
            let amount = tx.amount;
            if (typeof amount === "string") {
                amount = parseFloat(amount.replace(/[^0-9.-]/g, "")) || 0;
            }
            if (typeof amount !== "number" || isNaN(amount)) {
                amount = 0;
            }

            // Parse balance
            let balance: number | null = null;
            if (tx.balance !== null && tx.balance !== undefined) {
                balance = typeof tx.balance === "number"
                    ? tx.balance
                    : parseFloat(String(tx.balance).replace(/[^0-9.-]/g, "")) || null;
            }

            return {
                date,
                time: tx.time || undefined,
                description: String(tx.description || tx.merchant || tx.name || "").trim(),
                amount,
                balance
            };
        }).filter((row: TxRow) => {
            // Filter out rows with no useful data
            return row.date || row.description || row.amount !== 0;
        });

        console.log(`[AI CSV Parser] Successfully parsed ${rows.length} transactions`);

        return {
            rows,
            diagnostics: {
                usedAI: true,
                reason: "AI parsing successful",
                tokensUsed: usage?.total_tokens,
                modelUsed: json.model,
                rawResponse: content.length > 1000 ? content.substring(0, 1000) + "..." : content
            }
        };

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[AI CSV Parser] Error:", errorMessage);

        return {
            rows: [],
            diagnostics: {
                usedAI: true,
                reason: "AI parsing threw an exception",
                error: errorMessage
            }
        };
    }
}

/**
 * Attempt to fix problematic rows using AI
 * This is a lighter-weight option for when most rows are okay but some have issues
 */
export async function fixProblematicRows(
    rows: TxRow[],
    problematicIndices: number[],
    rawCsvLines: string[]
): Promise<TxRow[]> {
    if (problematicIndices.length === 0) return rows;

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
        console.warn("[AI CSV Parser] No API key, cannot fix problematic rows");
        return rows;
    }

    // Extract the problematic raw lines
    const problematicData = problematicIndices
        .slice(0, 20) // Limit to 20 rows to avoid token limits
        .map(idx => ({
            index: idx,
            raw: rawCsvLines[idx] || "",
            current: rows[idx]
        }))
        .filter(item => item.raw);

    if (problematicData.length === 0) return rows;

    const SITE_URL = getSiteUrl();
    const SITE_NAME = getSiteName();

    const systemPrompt = `You are fixing malformed transaction data. For each row, extract the correct date, description, amount, and balance.

Return JSON:
{
  "fixes": [
    {
      "index": 0,
      "date": "YYYY-MM-DD",
      "time": "HH:MM" or null,
      "description": "...",
      "amount": -123.45,
      "balance": 1000.00 or null
    }
  ]
}

Focus on:
1. Properly parsing dates with times (e.g., "8/31/2024 12:57")
2. Handling European vs US date formats
3. Extracting amounts correctly (negative for expenses)`;

    const userPrompt = JSON.stringify(problematicData.map(p => ({
        index: p.index,
        rawLine: p.raw.substring(0, 300)
    })));

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
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error("[AI CSV Parser] Fix rows API error:", response.status);
            return rows;
        }

        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;
        if (!content) return rows;

        const parsed = JSON.parse(content);
        const fixes = parsed.fixes || [];

        // Apply fixes
        const result = [...rows];
        for (const fix of fixes) {
            const idx = fix.index;
            if (typeof idx === "number" && idx >= 0 && idx < result.length) {
                if (fix.date) result[idx].date = fix.date;
                if (fix.time) result[idx].time = fix.time;
                if (fix.description) result[idx].description = fix.description;
                if (typeof fix.amount === "number") result[idx].amount = fix.amount;
                if (fix.balance !== undefined) result[idx].balance = fix.balance;
            }
        }

        console.log(`[AI CSV Parser] Fixed ${fixes.length} problematic rows`);
        return result;

    } catch (err) {
        console.error("[AI CSV Parser] Error fixing rows:", err);
        return rows;
    }
}
