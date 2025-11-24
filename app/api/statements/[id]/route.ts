// app/api/statements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

export const DELETE = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) => {
    try {
        const userId = await getCurrentUserId();
        // In Next.js 16, params might be a Promise
        const resolvedParams = await Promise.resolve(params);
        const idParam = resolvedParams.id;
        
        console.log("[Delete Statement API] Received ID param:", idParam, typeof idParam);
        
        if (!idParam || idParam === 'undefined' || idParam === 'null') {
            console.error("[Delete Statement API] Missing or invalid ID param:", idParam);
            return NextResponse.json(
                { error: `Missing or invalid statement ID: ${idParam}` },
                { status: 400 }
            );
        }
        
        const statementId = parseInt(idParam, 10);

        if (isNaN(statementId) || statementId <= 0) {
            console.error("[Delete Statement API] Invalid statement ID after parsing:", idParam, "->", statementId);
            return NextResponse.json(
                { error: `Invalid statement ID: ${idParam}` },
                { status: 400 }
            );
        }

        // First, get the statement and file_id to delete the file later
        const statementQuery = `
            SELECT file_id 
            FROM statements 
            WHERE id = $1 AND user_id = $2
        `;
        const statements = await neonQuery<{ file_id: string | null }>(
            statementQuery,
            [statementId, userId]
        );

        if (statements.length === 0) {
            return NextResponse.json(
                { error: "Statement not found" },
                { status: 404 }
            );
        }

        const fileId = statements[0].file_id;

        // Delete transactions first (CASCADE should handle this, but being explicit)
        const deleteTransactionsQuery = `
            DELETE FROM transactions 
            WHERE statement_id = $1 AND user_id = $2
        `;
        await neonQuery(deleteTransactionsQuery, [statementId, userId]);

        // Delete the file first (before deleting the statement to avoid FK constraint issues)
        // But first, we need to set the statement's file_id to NULL to break the FK constraint
        if (fileId) {
            // First, remove the foreign key reference
            const updateStatementQuery = `
                UPDATE statements 
                SET file_id = NULL 
                WHERE id = $1 AND user_id = $2
            `;
            await neonQuery(updateStatementQuery, [statementId, userId]);

            // Now delete the file
            const deleteFileQuery = `
                DELETE FROM user_files 
                WHERE id = $1 AND user_id = $2
            `;
            await neonQuery(deleteFileQuery, [fileId, userId]);
        }

        // Finally, delete the statement
        const deleteStatementQuery = `
            DELETE FROM statements 
            WHERE id = $1 AND user_id = $2
        `;
        await neonQuery(deleteStatementQuery, [statementId, userId]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Delete Statement API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete statement" },
            { status: 500 }
        );
    }
};

