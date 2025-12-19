// app/api/statements/ai-parse/route.ts
// API endpoint for AI-assisted CSV parsing

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { aiParseCsv } from "@/lib/parsing/aiParseCsv";
import { rowsToCanonicalCsv } from "@/lib/parsing/rowsToCanonicalCsv";

export const POST = async (req: NextRequest) => {
    try {
        // Authenticate user
        const userId = await getCurrentUserId();

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const userContext = formData.get("userContext") as string | null;
        const categoriesHeader = req.headers.get("X-Custom-Categories");

        let existingCategories: string[] | undefined;
        if (categoriesHeader) {
            try {
                existingCategories = JSON.parse(categoriesHeader);
            } catch {
                // ignore
            }
        }

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Read file content
        const rawCsv = await file.text();

        if (!rawCsv || rawCsv.trim().length === 0) {
            return NextResponse.json(
                { error: "Empty file provided" },
                { status: 400 }
            );
        }

        // Parse with AI
        const result = await aiParseCsv({
            rawCsv,
            userContext: userContext || undefined,
            existingCategories
        });

        if (result.rows.length === 0) {
            return NextResponse.json(
                {
                    error: "AI could not extract any valid transactions from the file",
                    suggestions: result.suggestions
                },
                { status: 400 }
            );
        }

        // Convert to canonical CSV format
        const canonicalCsv = rowsToCanonicalCsv(result.rows);

        return new NextResponse(canonicalCsv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "X-Transaction-Count": String(result.rows.length),
                "X-AI-Confidence": String(result.confidence),
                "X-AI-Suggestions": result.suggestions || "",
            },
        });
    } catch (error: any) {
        console.error("[AI Parse API] Error:", error);

        if (error.message?.includes("Unauthorized") || error.message?.includes("DEMO_USER_ID")) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: error.message || "AI parsing failed" },
            { status: 500 }
        );
    }
};
