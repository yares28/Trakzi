// app/api/statements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";
import { invalidateUserCachePrefix } from "@/lib/cache/upstash";
import { invalidateAccountAffectedCaches } from "@/lib/accounts/cache";

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
            invalidateUserCachePrefix(userId, 'pockets'),
            invalidateUserCachePrefix(userId, 'financial-health'),
        ]);

        // Revalidate all affected pages to clear Vercel's edge cache
        revalidatePath('/data-library');
        revalidatePath('/analytics');
        revalidatePath('/home');
        revalidatePath('/savings');
        revalidatePath('/trends');
        revalidatePath('/pockets');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Delete Statement API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete statement" },
            { status: 500 }
        );
    }
};

// PATCH /api/statements/[id]
// Assigns (or clears) an account for a statement and bulk-updates all its
// transactions to the same account_id so transfer detection and analytics
// can use the account dimension on historical data.
export const PATCH = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const userId = await getCurrentUserId();
        const { id: idParam } = await params;

        const statementId = parseInt(idParam, 10);
        if (isNaN(statementId) || statementId <= 0) {
            return NextResponse.json(
                { error: "Invalid statement ID" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { accountId } = body;

        // accountId must be a non-empty string or null/undefined (to clear)
        const resolvedAccountId: string | null =
            typeof accountId === "string" && accountId.trim().length > 0
                ? accountId.trim()
                : null;

        // Verify ownership of both the statement and (if set) the account
        const stmtRows = await neonQuery<{ id: number }>(
            `SELECT id FROM statements WHERE id = $1 AND user_id = $2`,
            [statementId, userId]
        );
        if (stmtRows.length === 0) {
            return NextResponse.json({ error: "Statement not found" }, { status: 404 });
        }

        if (resolvedAccountId !== null) {
            const acctRows = await neonQuery<{ id: string }>(
                `SELECT id FROM bank_accounts WHERE id = $1 AND user_id = $2 AND is_active = true`,
                [resolvedAccountId, userId]
            );
            if (acctRows.length === 0) {
                return NextResponse.json({ error: "Account not found" }, { status: 404 });
            }
        }

        // Update the statement's account reference
        await neonQuery(
            `UPDATE statements SET account_id = $1 WHERE id = $2 AND user_id = $3`,
            [resolvedAccountId, statementId, userId]
        );

        // Bulk-update all transactions in this statement to the same account
        const updatedRows = await neonQuery<{ id: number }>(
            `UPDATE transactions
             SET account_id = $1, updated_at = NOW()
             WHERE statement_id = $2 AND user_id = $3
             RETURNING id`,
            [resolvedAccountId, statementId, userId]
        );

        await invalidateAccountAffectedCaches(userId);
        revalidatePath("/data-library");
        revalidatePath("/analytics");
        revalidatePath("/home");

        return NextResponse.json({
            success: true,
            updatedCount: updatedRows.length,
            accountId: resolvedAccountId,
        });
    } catch (error: any) {
        console.error("[Assign Account Statement API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to assign account" },
            { status: 500 }
        );
    }
};

