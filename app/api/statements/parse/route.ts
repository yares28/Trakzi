// app/api/statements/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveFileToNeon } from "@/lib/files/saveFileToNeon";
// Import parsePdfToRows dynamically to avoid DOMMatrix error during module evaluation
import { parseExcelToRows } from "@/lib/parsing/parseExcelToRows";
import { parseCsvToRows } from "@/lib/parsing/parseCsvToRows";
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv";
import { categoriseTransactions } from "@/lib/ai/categoriseTransactions";
import { TxRow } from "@/lib/types/transactions";

export const POST = async (req: NextRequest) => {
    const formData = await req.formData();
    const file = formData.get("file");
    const bankName = String(formData.get("bankName") ?? "Unknown");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

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

        // 2) Parse rows depending on type
        const buffer = Buffer.from(await file.arrayBuffer());
        let rows: TxRow[] = [];

        try {
            if (extension === "pdf") {
                // Dynamic import to avoid DOMMatrix error during SSR
                const { parsePdfToRows } = await import("@/lib/parsing/parsePdfToRows");
                rows = await parsePdfToRows(buffer);
            } else if (extension === "xls" || extension === "xlsx") {
                rows = parseExcelToRows(buffer);
            } else if (extension === "csv") {
                rows = parseCsvToRows(buffer.toString("utf-8"));
            } else {
                // Unsupported for parsing → just store file
                return NextResponse.json(
                    {
                        fileId: savedFile.id,
                        parseable: false,
                        message: `File stored but not parsed (extension: ${extension})`
                    },
                    { status: 200 }
                );
            }
        } catch (parseErr: any) {
            console.error("Parse error:", parseErr);
            const errorMessage = parseErr.message || "Unknown parsing error";
            
            // Provide more helpful error messages
            if (errorMessage.includes("No transactions found")) {
                return NextResponse.json({ 
                    error: `Parse Error: ${errorMessage}` 
                }, { status: 400 });
            }
            
            return NextResponse.json({ 
                error: `Parse Error: Failed to parse ${extension.toUpperCase()} file: ${errorMessage}` 
            }, { status: 500 });
        }

        if (rows.length === 0) {
            return NextResponse.json({ 
                error: `Parse Error: No transactions found in the ${extension.toUpperCase()} file. Please check the file format.` 
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
            "X-File-Id": savedFile.id
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
        const errorMessage = err.message || "An unexpected error occurred while processing the file";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
};
