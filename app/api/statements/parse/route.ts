// app/api/statements/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveFileToNeon } from "@/lib/files/saveFileToNeon";
import { parseCsvToRows, type CsvDiagnostics } from "@/lib/parsing/parseCsvToRows";
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv";
import { categoriseTransactions } from "@/lib/ai/categoriseTransactions";
import { TxRow } from "@/lib/types/transactions";
import { getSiteName, getSiteUrl } from "@/lib/env";
import Papa from "papaparse";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type AiParseHint = {
    delimiter: string | null;
    headerRowIndex: number | null;
    columnMap: {
        date: number | null;
        time?: number | null;
        description: number | null;
        amount: number | null;
        balance?: number | null;
        category?: number | null;
    };
};

const AI_PARSE_MODEL = "google/gemini-2.0-flash-001";
const ALLOWED_DELIMITERS = new Set([",", ";", "\t", "|"]);

function normalizeDelimiter(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "tab" || trimmed === "\\t" || trimmed === "t") return "\t";
    if (ALLOWED_DELIMITERS.has(value)) return value;
    if (ALLOWED_DELIMITERS.has(trimmed)) return trimmed;
    return null;
}

function normalizeColumnIndex(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return null;
}

function evaluateParseQuality(rows: TxRow[], diagnostics: CsvDiagnostics): { failed: boolean; reason?: string } {
    if (rows.length === 0) {
        return { failed: true, reason: "No rows were parsed from the CSV." };
    }

    const total = rows.length;
    const missingDateCount = rows.filter((row) => !row.date || row.date.trim() === "").length;
    const missingDescriptionCount = rows.filter((row) => !row.description || row.description.trim() === "").length;
    const missingDateRatio = missingDateCount / total;
    const missingDescriptionRatio = missingDescriptionCount / total;
    const coverageRatio = diagnostics.totalRowsInFile > 0
        ? diagnostics.rowsAfterFiltering / diagnostics.totalRowsInFile
        : 1;

    if (missingDateRatio > 0.4) {
        return { failed: true, reason: "Too many rows have empty dates after parsing." };
    }
    if (missingDescriptionRatio > 0.4) {
        return { failed: true, reason: "Too many rows have empty descriptions after parsing." };
    }
    if (coverageRatio < 0.5) {
        return { failed: true, reason: "Too many rows were filtered out during parsing." };
    }

    return { failed: false };
}

function assertParseQuality(rows: TxRow[], diagnostics: CsvDiagnostics): void {
    const quality = evaluateParseQuality(rows, diagnostics);
    if (quality.failed) {
        throw new Error(quality.reason || "Parsing quality is too low.");
    }
}

async function inferCsvSchemaWithAI(sample: string, context: string | null): Promise<AiParseHint> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("AI parsing is not configured.");
    }

    const systemPrompt = `
You infer CSV parsing schemas.
Return ONLY valid JSON with:
{
  "delimiter": "," | ";" | "\\t" | "|",
  "headerRowIndex": number | null,
  "columnMap": {
    "date": number | null,
    "time": number | null,
    "description": number | null,
    "amount": number | null,
    "balance": number | null,
    "category": number | null
  }
}

Rules:
- Use 0-based column indexes.
- headerRowIndex is the row (0-based) that contains column headers, or null if none.
- If date+time are in the same column, set "time" to null.
- If a column is missing, set it to null.
`.trim();

    const userPrompt = [
        context ? `Context: ${context}` : "Context: none",
        "",
        "CSV sample (first lines):",
        sample
    ].join("\n");

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": getSiteUrl(),
            "X-Title": getSiteName(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: AI_PARSE_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            provider: { sort: "throughput" }
        })
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AI parsing request failed (${res.status}): ${errorText.substring(0, 200)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error("AI parsing response was empty.");
    }

    let parsed: AiParseHint;
    try {
        parsed = JSON.parse(content) as AiParseHint;
    } catch (error) {
        throw new Error("AI parsing response was not valid JSON.");
    }

    return parsed;
}

async function parseCsvWithAiFallback(params: { csvContent: string; context: string | null }): Promise<{ rows: TxRow[]; diagnostics: CsvDiagnostics }> {
    const lines = params.csvContent.split(/\r?\n/).filter(line => line.trim() !== "");
    const sample = lines.slice(0, 30).join("\n");
    const hint = await inferCsvSchemaWithAI(sample, params.context);

    const delimiter = normalizeDelimiter(hint.delimiter) ?? ",";
    const parsed = Papa.parse(params.csvContent, {
        header: false,
        skipEmptyLines: true,
        delimiter
    });

    const rowsData = (parsed.data as unknown[]).map((row) => Array.isArray(row) ? row : []);
    const headerRowIndex = typeof hint.headerRowIndex === "number" && hint.headerRowIndex >= 0
        ? hint.headerRowIndex
        : null;

    const startIndex = headerRowIndex !== null && headerRowIndex + 1 < rowsData.length
        ? headerRowIndex + 1
        : 0;

    const dateIndex = normalizeColumnIndex(hint.columnMap?.date);
    const timeIndex = normalizeColumnIndex(hint.columnMap?.time);
    const descriptionIndex = normalizeColumnIndex(hint.columnMap?.description);
    const amountIndex = normalizeColumnIndex(hint.columnMap?.amount);
    const balanceIndex = normalizeColumnIndex(hint.columnMap?.balance);
    const categoryIndex = normalizeColumnIndex(hint.columnMap?.category);

    if (dateIndex === null || descriptionIndex === null || amountIndex === null) {
        throw new Error("AI parsing did not return required column indexes.");
    }

    const headerLabels = new Set(["date", "time", "description", "amount", "balance", "category"]);
    const mappedRows = rowsData
        .slice(startIndex)
        .filter((cells) => {
            const candidates = [dateIndex, descriptionIndex, amountIndex];
            let headerHits = 0;
            for (const idx of candidates) {
                const value = String(cells[idx] ?? "").toLowerCase().trim();
                if (headerLabels.has(value)) {
                    headerHits += 1;
                }
            }
            return headerHits < 2;
        })
        .map((cells) => ({
            date: String(cells[dateIndex] ?? "").trim(),
            time: timeIndex !== null ? String(cells[timeIndex] ?? "").trim() : "",
            description: String(cells[descriptionIndex] ?? "").trim(),
            amount: String(cells[amountIndex] ?? "").trim(),
            balance: balanceIndex !== null ? String(cells[balanceIndex] ?? "").trim() : "",
            category: categoryIndex !== null ? String(cells[categoryIndex] ?? "").trim() : ""
        }))
        .filter((row) => Object.values(row).some((value) => value !== ""));

    if (mappedRows.length === 0) {
        throw new Error("AI parsing did not produce any rows.");
    }

    const canonicalCsv = Papa.unparse(mappedRows, {
        columns: ["date", "time", "description", "amount", "balance", "category"]
    });

    return parseCsvToRows(canonicalCsv, { returnDiagnostics: true });
}

export const POST = async (req: NextRequest) => {
    const formData = await req.formData();
    const file = formData.get("file");
    const bankName = String(formData.get("bankName") ?? "Unknown");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: "File too large. Maximum size is 10MB." },
            { status: 400 }
        );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    // Only accept CSV files
    if (extension !== "csv") {
        return NextResponse.json(
            { error: `Only CSV files are supported. Received: .${extension}` },
            { status: 400 }
        );
    }

    try {
        // 1) Save file in user_files
        let savedFile;
        try {
            savedFile = await saveFileToNeon({
                file,
                source: "statement-upload"
            });
        } catch (err: any) {
            console.error("Error saving file:", err);
            if (err.message?.includes("DEMO_USER_ID") || err.message?.includes("user auth")) {
                return NextResponse.json({
                    error: "Authentication not configured. Please set DEMO_USER_ID in your environment variables."
                }, { status: 500 });
            }
            throw new Error(`Failed to save file: ${err.message}`);
        }

        // 2) Parse CSV to rows
        const buffer = Buffer.from(await file.arrayBuffer());
        let rows: TxRow[] = [];
        let diagnostics: CsvDiagnostics | null = null;
        let parseModeUsed: "auto" | "ai" = "auto";

        const parseMode = String(formData.get("parseMode") ?? "auto").toLowerCase();
        const aiContextValue = formData.get("aiContext");
        const aiContext = typeof aiContextValue === "string" ? aiContextValue.trim() : null;

        // Handle UTF-8 BOM if present
        let csvContent = buffer.toString("utf-8");
        if (csvContent.charCodeAt(0) === 0xFEFF) {
            csvContent = csvContent.slice(1);
        }

        try {
            if (parseMode === "ai") {
                const aiResult = await parseCsvWithAiFallback({ csvContent, context: aiContext });
                rows = aiResult.rows;
                diagnostics = aiResult.diagnostics;
                parseModeUsed = "ai";
                assertParseQuality(rows, diagnostics);
            } else {
                const parsed = parseCsvToRows(csvContent, { returnDiagnostics: true });
                rows = parsed.rows;
                diagnostics = parsed.diagnostics;
                assertParseQuality(rows, diagnostics);
            }
        } catch (parseErr: any) {
            if (parseMode !== "ai") {
                try {
                    const aiResult = await parseCsvWithAiFallback({ csvContent, context: aiContext });
                    rows = aiResult.rows;
                    diagnostics = aiResult.diagnostics;
                    parseModeUsed = "ai";
                    assertParseQuality(rows, diagnostics);
                } catch (aiErr: any) {
                    console.error("Parse error:", parseErr);
                    console.error("AI parse error:", aiErr);
                    const errorMessage = parseErr.message || "Unknown parsing error";

                    if (errorMessage.includes("No transactions found")) {
                        return NextResponse.json({
                            error: `Parse Error: ${errorMessage}`
                        }, { status: 400 });
                    }

                    return NextResponse.json({
                        error: `Parse Error: ${errorMessage}`
                    }, { status: 500 });
                }
            } else {
                console.error("AI parse error:", parseErr);
                const errorMessage = parseErr.message || "Unknown parsing error";
                return NextResponse.json({
                    error: `Parse Error: ${errorMessage}`
                }, { status: 500 });
            }
        }

        if (rows.length === 0) {
            return NextResponse.json({
                error: `Parse Error: No transactions found in the CSV file. Please check the file format.`
            }, { status: 400 });
        }

        // 3) AI categorisation
        console.log(`[PARSE API] Starting categorization for ${rows.length} transactions`);
        let withCategories: TxRow[];
        let categorizationError: string | null = null;
        try {
            // Get custom categories from request if provided (from frontend localStorage)
            const customCategoriesHeader = req.headers.get("X-Custom-Categories");
            const customCategories = customCategoriesHeader ? JSON.parse(customCategoriesHeader) : undefined;

            console.log(`[PARSE API] Calling categoriseTransactions with ${rows.length} rows`);
            withCategories = await categoriseTransactions(rows, customCategories);
            const categorizedCount = withCategories.filter(r => r.category && r.category !== "Other").length;
            console.log(`[PARSE API] Categorization complete: ${categorizedCount}/${withCategories.length} have non-Other categories`);
            console.log(`[PARSE API] Sample categories:`, withCategories.slice(0, 5).map(r => ({ desc: r.description.substring(0, 30), cat: r.category })));
        } catch (aiErr: any) {
            const errorMessage = aiErr?.message || String(aiErr) || "Unknown AI categorization error";
            console.error("[PARSE API] AI categorization error:", errorMessage);
            console.error("[PARSE API] Full error:", aiErr);
            // Continue without categories if AI fails
            withCategories = rows.map(r => ({ ...r, category: "Other" }));
            categorizationError = errorMessage;
        }

        // 4) Build canonical CSV
        console.log(`[PARSE API] Building CSV from ${withCategories.length} rows`);
        const csv = rowsToCanonicalCsv(withCategories);
        console.log(`[PARSE API] CSV length: ${csv.length} chars`);
        console.log(`[PARSE API] CSV first 500 chars:`, csv.substring(0, 500));

        const headers: Record<string, string> = {
            "Content-Type": "text/csv",
            "X-File-Id": String(savedFile.id),
            "X-Parse-Mode": parseModeUsed
        };

        // Add warning header if categorization failed
        if (categorizationError) {
            headers["X-Categorization-Error"] = encodeURIComponent(categorizationError);
            headers["X-Categorization-Warning"] = "true";
        }

        return new NextResponse(csv, {
            status: 200,
            headers
        });
    } catch (err: any) {
        console.error("Unexpected error:", err);
        return NextResponse.json({ error: "An unexpected error occurred while processing the file" }, { status: 500 });
    }
};
