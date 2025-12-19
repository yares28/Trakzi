// app/api/statements/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveFileToNeon } from "@/lib/files/saveFileToNeon";
import { parseCsvToRowsWithAIFallback } from "@/lib/parsing/parseCsvToRows";
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv";
import { categoriseTransactions } from "@/lib/ai/categoriseTransactions";
import { TxRow } from "@/lib/types/transactions";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

        // 2) Parse CSV to rows with AI fallback for problematic files
        const buffer = Buffer.from(await file.arrayBuffer());
        let rows: TxRow[] = [];
        let aiUsed = false;
        let aiReason: string | undefined;
        let aiError: string | undefined;

        try {
            // Handle UTF-8 BOM if present
            let csvContent = buffer.toString("utf-8");
            if (csvContent.charCodeAt(0) === 0xFEFF) {
                csvContent = csvContent.slice(1);
            }

            // Use AI-enhanced parser with fallback
            const parseResult = await parseCsvToRowsWithAIFallback(csvContent, {
                fileName: file.name,
                enableAIFallback: true
            });

            rows = parseResult.rows;
            aiUsed = parseResult.aiUsed;
            aiReason = parseResult.aiReason;
            aiError = parseResult.aiError;

            if (aiUsed) {
                console.log(`[PARSE API] AI fallback was used. Reason: ${aiReason || "Unknown"}`);
                if (aiError) {
                    console.warn(`[PARSE API] AI had an error: ${aiError}`);
                }
            }

            // Log parsing diagnostics
            if (parseResult.diagnostics.warnings.length > 0) {
                console.log(`[PARSE API] Parser warnings:`, parseResult.diagnostics.warnings);
            }
        } catch (parseErr: any) {
            console.error("Parse error:", parseErr);
            const errorMessage = parseErr.message || "Unknown parsing error";

            // Provide more helpful error messages
            if (errorMessage.includes("No transactions found") || errorMessage.includes("Both regular parser and AI fallback failed")) {
                return NextResponse.json({
                    error: `Parse Error: ${errorMessage}`
                }, { status: 400 });
            }

            return NextResponse.json({
                error: `Parse Error: Failed to parse CSV file. Please check the file format. Details: ${errorMessage.substring(0, 200)}`
            }, { status: 500 });
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
            "X-File-Id": String(savedFile.id)
        };

        // Add AI fallback headers
        if (aiUsed) {
            headers["X-AI-Parsing-Used"] = "true";
            if (aiReason) {
                headers["X-AI-Parsing-Reason"] = encodeURIComponent(aiReason);
            }
            if (aiError) {
                headers["X-AI-Parsing-Error"] = encodeURIComponent(aiError);
            }
        }

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
