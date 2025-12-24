// app/api/statements/route.ts
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

export const GET = async () => {
    try {
        const userId = await getCurrentUserId();

        // Fetch statements - only show statements that have actual imported transactions
        const statementsQuery = `
            SELECT DISTINCT
                s.id,
                s.file_name as name,
                s.status,
                s.row_count,
                s.imported_count,
                s.created_at as date,
                'Income/Expenses' as type
            FROM statements s
            INNER JOIN transactions t ON t.statement_id = s.id AND t.user_id = s.user_id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `;

        const statements = await neonQuery<{
            id: number;
            name: string | null;
            status: string | null;
            row_count: number | null;
            imported_count: number | null;
            date: Date | string;
            type: string;
        }>(statementsQuery, [userId]);

        // Fetch receipts
        const receiptsQuery = `
            SELECT 
                r.id,
                r.store_name as name,
                r.created_at as date,
                'Receipts' as type
            FROM receipts r
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `;

        const receipts = await neonQuery<{
            id: string;
            name: string | null;
            date: Date | string;
            type: string;
        }>(receiptsQuery, [userId]);

        // Transform statements to match the reportSchema format
        const statementReports = statements.map((stmt) => ({
            id: String(stmt.id),
            name: stmt.name || `Statement ${stmt.id}`,
            type: stmt.type || "Income/Expenses",
            date: typeof stmt.date === 'string' ? stmt.date : stmt.date.toISOString(),
            reviewer: "System",
            statementId: stmt.id,
            fileId: null,
            receiptId: null,
            rowCount: stmt.row_count,
            importedCount: stmt.imported_count,
            status: stmt.status,
        }));

        // Transform receipts to match the reportSchema format
        const receiptReports = receipts.map((receipt) => ({
            id: `receipt-${receipt.id}`,
            name: receipt.name || `Receipt ${receipt.id}`,
            type: "Receipts",
            date: typeof receipt.date === 'string' ? receipt.date : receipt.date.toISOString(),
            reviewer: "System",
            statementId: null,
            fileId: null,
            receiptId: receipt.id,
        }));

        // Combine and sort by date (newest first)
        const allReports = [...statementReports, ...receiptReports].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
        });

        // Add caching headers - statements change infrequently
        return NextResponse.json(allReports, {
            headers: {
                'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
            },
        });
    } catch (error: any) {
        console.error("[Statements API] Error:", error);

        // User-friendly error messages
        let userMessage = "Unable to load your files. Please try again.";

        if (error.message?.includes("Unauthorized")) {
            userMessage = "Please sign in to view your files.";
            return NextResponse.json({ error: userMessage }, { status: 401 });
        }

        if (error.message?.includes("database") || error.message?.includes("query")) {
            userMessage = "A temporary database issue occurred. Please try again in a moment.";
        }

        return NextResponse.json({ error: userMessage }, { status: 500 });
    }
};
