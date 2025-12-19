// app/api/statements/reparse-ai/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseCsvWithAI } from "@/lib/ai/parseCsvWithAI";
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv";
import { categoriseTransactions } from "@/lib/ai/categoriseTransactions";
import { TxRow } from "@/lib/types/transactions";

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json();
        const { csvContent, fileName, userDirective, wasAlreadyAIParsed, previousIssues } = body;

        if (!csvContent || typeof csvContent !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid CSV content" },
                { status: 400 }
            );
        }

        // Build an enhanced prompt based on context
        let additionalContext = "";

        if (wasAlreadyAIParsed) {
            additionalContext += "\n\nIMPORTANT: A previous AI parsing attempt did not produce correct results.";
            if (previousIssues) {
                additionalContext += ` The user reported: "${previousIssues}"`;
            }
            additionalContext += " Please try a different parsing approach.";
        }

        if (userDirective && userDirective.trim()) {
            additionalContext += `\n\nUSER INSTRUCTION: ${userDirective.trim()}`;
        }

        console.log(`[REPARSE-AI] Starting AI reparse. File: ${fileName || "unknown"}, Directive: ${userDirective || "none"}`);

        // Call AI parser with enhanced context
        const aiResult = await parseCsvWithAIWithContext(csvContent, fileName, additionalContext);

        if (aiResult.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: aiResult.diagnostics.error || "AI parsing returned no results",
                tips: getParsingTips(csvContent)
            }, { status: 400 });
        }

        // Categorize the transactions
        let withCategories: TxRow[];
        try {
            const customCategoriesHeader = req.headers.get("X-Custom-Categories");
            const customCategories = customCategoriesHeader ? JSON.parse(customCategoriesHeader) : undefined;
            withCategories = await categoriseTransactions(aiResult.rows, customCategories);
        } catch (catErr) {
            console.warn("[REPARSE-AI] Categorization failed:", catErr);
            withCategories = aiResult.rows.map(r => ({ ...r, category: "Other" }));
        }

        // Build canonical CSV
        const csv = rowsToCanonicalCsv(withCategories);

        console.log(`[REPARSE-AI] Successfully reparsed ${withCategories.length} transactions`);

        return NextResponse.json({
            success: true,
            csv,
            transactionCount: withCategories.length,
            tokensUsed: aiResult.diagnostics.tokensUsed,
            tips: null
        });

    } catch (err: any) {
        console.error("[REPARSE-AI] Error:", err);
        return NextResponse.json({
            success: false,
            error: err.message || "AI reparsing failed",
            tips: ["Make sure your file contains transaction data", "Check that dates, descriptions, and amounts are present"]
        }, { status: 500 });
    }
};

// Enhanced AI parser with additional context
async function parseCsvWithAIWithContext(
    csvContent: string,
    fileName?: string,
    additionalContext?: string
) {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const { getSiteUrl, getSiteName } = await import("@/lib/env");
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

    // Truncate CSV if too long
    const MAX_CSV_LENGTH = 50000;
    let truncatedCsv = csvContent;
    let truncationNote = "";
    if (csvContent.length > MAX_CSV_LENGTH) {
        truncatedCsv = csvContent.substring(0, MAX_CSV_LENGTH);
        const lastNewline = truncatedCsv.lastIndexOf("\n");
        if (lastNewline > MAX_CSV_LENGTH * 0.8) {
            truncatedCsv = truncatedCsv.substring(0, lastNewline);
        }
        truncationNote = `\n\nNOTE: The file was truncated. There are more rows in the original file.`;
    }

    const systemPrompt = `You are an expert CSV/bank statement parser. Your job is to extract transaction data from messy, malformed, or unusual CSV files.
${additionalContext || ""}

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
  "parsingNotes": "Brief description of how you interpreted the data"
}

CRITICAL PARSING RULES:
1. DATE: Convert ANY date format to ISO YYYY-MM-DD
   - Formats: M/D/YYYY, D/M/YYYY, DD.MM.YYYY, YYYY-MM-DD, "Aug 31, 2024", etc.
   - If dates include time like "8/31/2024 12:57", extract BOTH date AND time
   - For ambiguous dates (8/5/2024), use context clues or assume M/D/YYYY

2. TIME: Extract time if present (HH:MM or HH:MM:SS), otherwise null

3. AMOUNT: 
   - NEGATIVE = expense/debit (money going OUT)
   - POSITIVE = income/credit (money coming IN)
   - Handle European format (1.234,56) and US format (1,234.56)
   - Remove currency symbols (€, $, £)
   
4. DESCRIPTION: Extract the merchant/transaction description
   - This is usually the longest text field
   - Clean up reference codes if possible

5. BALANCE: Extract running balance if available, otherwise null

6. COMMON FILE FORMATS TO HANDLE:
   - Revolut: Type, Account, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance
   - Bank statements with header rows and metadata
   - Semicolon-delimited files
   - Tab-delimited files
   - Files with multiple date columns (use first relevant one)

RETURN ONLY VALID JSON. No explanation text outside the JSON.`;

    const userPrompt = `Parse this ${fileName ? `file "${fileName}"` : "CSV content"}:${truncationNote}

\`\`\`csv
${truncatedCsv}
\`\`\``;

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
                response_format: { type: "json_object" },
                max_tokens: 16000,
                provider: { sort: "throughput" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                rows: [],
                diagnostics: {
                    usedAI: true,
                    reason: "AI parsing failed",
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

        const parsed = JSON.parse(content);
        const transactions = parsed.transactions || parsed.rows || parsed.data || [];

        if (!Array.isArray(transactions)) {
            return {
                rows: [],
                diagnostics: {
                    usedAI: true,
                    reason: "AI response format invalid",
                    error: "Response did not contain a transactions array"
                }
            };
        }

        // Convert AI response to TxRow format
        const rows: TxRow[] = transactions.map((tx: any) => {
            let date = tx.date || "";
            let amount = tx.amount;
            if (typeof amount === "string") {
                amount = parseFloat(amount.replace(/[^0-9.-]/g, "")) || 0;
            }
            if (typeof amount !== "number" || isNaN(amount)) {
                amount = 0;
            }

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
        }).filter((row: TxRow) => row.date || row.description || row.amount !== 0);

        return {
            rows,
            diagnostics: {
                usedAI: true,
                reason: "AI parsing successful",
                tokensUsed: usage?.total_tokens,
                parsingNotes: parsed.parsingNotes
            }
        };

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
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

// Generate helpful tips based on CSV content
function getParsingTips(csvContent: string): string[] {
    const tips: string[] = [];
    const lines = csvContent.split("\n").slice(0, 10);
    const firstLines = lines.join("\n").toLowerCase();

    // Check for common issues
    if (!firstLines.includes("date") && !firstLines.includes("fecha")) {
        tips.push("Your file doesn't seem to have a 'Date' column header. Make sure your CSV has clear column headers.");
    }

    if (!firstLines.includes("amount") && !firstLines.includes("importe") && !firstLines.includes("debit") && !firstLines.includes("credit")) {
        tips.push("Couldn't find an 'Amount' column. Make sure transaction amounts are clearly labeled.");
    }

    if (csvContent.includes(";") && !csvContent.includes(",")) {
        tips.push("Your file uses semicolons as delimiters. This is supported but make sure headers are correct.");
    }

    if (lines.length < 3) {
        tips.push("Your file appears to have very few rows. Make sure it contains actual transaction data.");
    }

    // Check for PDF-like content
    if (csvContent.includes("%PDF") || csvContent.includes("endobj")) {
        tips.push("This appears to be a PDF file, not a CSV. Please export your statement as CSV first.");
    }

    // Check for Excel binary
    if (csvContent.includes("PK") && csvContent.includes("[Content_Types]")) {
        tips.push("This appears to be an Excel file (.xlsx). Please save it as CSV first.");
    }

    if (tips.length === 0) {
        tips.push("Try providing more context about your bank or file format using the text box below.");
        tips.push("Make sure your file contains: Date, Description, and Amount columns.");
    }

    return tips;
}
