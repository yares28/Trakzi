// app/api/statements/route.ts
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

export const GET = async () => {
    try {
        const userId = await getCurrentUserId();

        // Fetch statements with file information
        const query = `
            SELECT 
                s.id,
                s.source_filename as name,
                s.raw_format,
                s.uploaded_at as date,
                s.file_id,
                uf.file_name,
                uf.source,
                CASE 
                    WHEN uf.source = 'statement-upload' THEN 'Income/Expenses'
                    WHEN uf.source LIKE '%fridge%' OR uf.source LIKE '%receipt%' THEN 'Fridge/Receipts'
                    ELSE 'Income/Expenses'
                END as type
            FROM statements s
            LEFT JOIN user_files uf ON s.file_id = uf.id
            WHERE s.user_id = $1
            ORDER BY s.uploaded_at DESC
        `;

        const statements = await neonQuery<{
            id: number;
            name: string | null;
            raw_format: string;
            date: Date | string;
            file_id: string | null;
            file_name: string | null;
            source: string | null;
            type: string;
        }>(query, [userId]);

        // Transform to match the reportSchema format
        const reports = statements.map((stmt) => ({
            id: String(stmt.id),
            name: stmt.name || stmt.file_name || `Statement ${stmt.id}`,
            type: stmt.type || "Income/Expenses",
            date: typeof stmt.date === 'string' ? stmt.date : stmt.date.toISOString(),
            reviewer: "System", // Placeholder
            statementId: stmt.id,
            fileId: stmt.file_id,
        }));

        return NextResponse.json(reports);
    } catch (error: any) {
        console.error("[Statements API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch statements" },
            { status: 500 }
        );
    }
};














