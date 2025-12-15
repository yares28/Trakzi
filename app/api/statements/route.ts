// app/api/statements/route.ts
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

export const GET = async () => {
    try {
        const userId = await getCurrentUserId();

        // Fetch statements with file information
        const statementsQuery = `
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
        }>(statementsQuery, [userId]);

        // Fetch receipts with file information
        const receiptsQuery = `
            SELECT 
                r.id,
                r.store_name as name,
                r.created_at as date,
                r.receipt_file_id as file_id,
                uf.file_name,
                uf.source,
                'Receipts' as type
            FROM receipts r
            LEFT JOIN user_files uf ON r.receipt_file_id = uf.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `;

        const receipts = await neonQuery<{
            id: string;
            name: string | null;
            date: Date | string;
            file_id: string | null;
            file_name: string | null;
            source: string | null;
            type: string;
        }>(receiptsQuery, [userId]);

        // Transform statements to match the reportSchema format
        const statementReports = statements.map((stmt) => ({
            id: String(stmt.id),
            name: stmt.name || stmt.file_name || `Statement ${stmt.id}`,
            type: stmt.type || "Income/Expenses",
            date: typeof stmt.date === 'string' ? stmt.date : stmt.date.toISOString(),
            reviewer: "System", // Placeholder
            statementId: stmt.id,
            fileId: stmt.file_id,
            receiptId: null,
        }));

        // Transform receipts to match the reportSchema format
        const receiptReports = receipts.map((receipt) => ({
            id: `receipt-${receipt.id}`,
            name: receipt.name || receipt.file_name || `Receipt ${receipt.id}`,
            type: "Receipts",
            date: typeof receipt.date === 'string' ? receipt.date : receipt.date.toISOString(),
            reviewer: "System", // Placeholder
            statementId: null,
            fileId: receipt.file_id,
            receiptId: receipt.id,
        }));

        // Combine and sort by date (newest first)
        const allReports = [...statementReports, ...receiptReports].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
        });

        // Add caching headers - statements change infrequently
        // Cache for 2 minutes, revalidate in background
        return NextResponse.json(allReports, {
            headers: {
                'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
            },
        });
    } catch (error: any) {
        console.error("[Statements API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch statements" },
            { status: 500 }
        );
    }
};


















