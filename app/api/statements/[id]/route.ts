// app/api/statements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";
import { invalidateUserCachePrefix } from "@/lib/cache/upstash";

export const DELETE = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const userId = await getCurrentUserId();
        const { id: idParam } = await params;

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

        // First, verify the statement exists and belongs to the user
        const statementQuery = `
            SELECT id 
            FROM statements 
            WHERE id = $1 AND user_id = $2
        `;
        const statements = await neonQuery<{ id: number }>(
            statementQuery,
            [statementId, userId]
        );

        if (statements.length === 0) {
            return NextResponse.json(
                { error: "Statement not found" },
                { status: 404 }
            );
        }

        // Delete transactions first (CASCADE should handle this, but being explicit)
        const deleteTransactionsQuery = `
            DELETE FROM transactions 
            WHERE statement_id = $1 AND user_id = $2
        `;
        await neonQuery(deleteTransactionsQuery, [statementId, userId]);

        // Finally, delete the statement
        const deleteStatementQuery = `
            DELETE FROM statements 
            WHERE id = $1 AND user_id = $2
        `;
        await neonQuery(deleteStatementQuery, [statementId, userId]);

        // Invalidate ALL affected caches to ensure deleted transactions don't appear anywhere
        await Promise.all([
            invalidateUserCachePrefix(userId, 'data-library'),
            invalidateUserCachePrefix(userId, 'analytics'),
            invalidateUserCachePrefix(userId, 'home'),
            invalidateUserCachePrefix(userId, 'trends'),
            invalidateUserCachePrefix(userId, 'savings'),
        ]);

        // Revalidate all affected pages to clear Vercel's edge cache
        revalidatePath('/data-library');
        revalidatePath('/analytics');
        revalidatePath('/home');
        revalidatePath('/savings');
        revalidatePath('/trends');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Delete Statement API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete statement" },
            { status: 500 }
        );
    }
};

