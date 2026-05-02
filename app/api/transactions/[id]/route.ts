// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery, neonInsert } from "@/lib/neonClient";
import { invalidateUserCachePrefix } from "@/lib/cache/upstash";

export const DELETE = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const userId = await getCurrentUserId();
        const { id } = await params;
        const transactionId = parseInt(id, 10);

        if (isNaN(transactionId) || transactionId <= 0) {
            return NextResponse.json(
                { error: "Invalid transaction ID" },
                { status: 400 }
            );
        }

        // Delete the transaction (only if it belongs to the user)
        const deleteQuery = `
            DELETE FROM transactions 
            WHERE id = $1 AND user_id = $2
        `;
        
        await neonQuery(deleteQuery, [transactionId, userId]);

        // Invalidate caches after successful deletion
        await Promise.all([
            invalidateUserCachePrefix(userId, 'analytics'),
            invalidateUserCachePrefix(userId, 'data-library'),
            invalidateUserCachePrefix(userId, 'home'),
            invalidateUserCachePrefix(userId, 'trends'),
            invalidateUserCachePrefix(userId, 'savings'),
            invalidateUserCachePrefix(userId, 'pockets'),
            invalidateUserCachePrefix(userId, 'financial-health'),
        ]);

        // Revalidate pages
        revalidatePath('/data-library');
        revalidatePath('/analytics');
        revalidatePath('/home');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Delete Transaction API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete transaction" },
            { status: 500 }
        );
    }
};

export const PATCH = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const userId = await getCurrentUserId();
        const { id } = await params;
        const transactionId = parseInt(id, 10);

        if (isNaN(transactionId) || transactionId <= 0) {
            return NextResponse.json(
                { error: "Invalid transaction ID" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { category, tx_type, amount, tx_date } = body;

        const EDITABLE_TX_TYPES = new Set(['expense', 'income', 'transfer'])
        if (tx_type !== undefined && !EDITABLE_TX_TYPES.has(tx_type)) {
            return NextResponse.json(
                { error: "Invalid tx_type. Must be expense, income, or transfer." },
                { status: 400 }
            );
        }

        if (amount !== undefined && (typeof amount !== 'number' || !Number.isFinite(amount))) {
            return NextResponse.json(
                { error: "amount must be a finite number" },
                { status: 400 }
            );
        }

        if (tx_date !== undefined && (typeof tx_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tx_date))) {
            return NextResponse.json(
                { error: "tx_date must be YYYY-MM-DD" },
                { status: 400 }
            );
        }

        const cascadeNeeded = amount !== undefined || tx_date !== undefined;
        if (!cascadeNeeded && category === undefined && tx_type === undefined) {
            return NextResponse.json(
                { error: "At least one of category, tx_type, amount, or tx_date is required" },
                { status: 400 }
            );
        }

        let transferUnlinked = false;
        let resultId: number | null = null;
        let resultCategoryId: number | null = null;

        // Phase 1: amount/tx_date — auto-unlink any account_transfers pair (OQ-4).
        // Single CTE: DELETE the transfer row, revert the COUNTERPART leg, update this leg.
        // Counterpart and edited leg are disjoint rows so Postgres never touches the same
        // tuple twice in the same command.
        if (cascadeNeeded) {
            const cascadeRows = await neonQuery<{
                transfer_unlinked: number
                updated_id: number | null
            }>(
                `WITH affected_transfer AS (
                    DELETE FROM account_transfers
                    WHERE user_id = $1
                      AND (from_tx_id = $2::integer OR to_tx_id = $2::integer)
                    RETURNING from_tx_id, to_tx_id
                ),
                relink_counterpart AS (
                    UPDATE transactions t
                    SET tx_type    = CASE WHEN t.amount < 0 THEN 'expense' ELSE 'income' END,
                        updated_at = NOW()
                    WHERE t.user_id = $1
                      AND t.id IN (
                          SELECT from_tx_id FROM affected_transfer
                          UNION ALL
                          SELECT to_tx_id   FROM affected_transfer
                      )
                      AND t.id <> $2::integer
                      AND t.tx_type NOT IN ('settlement_sent', 'settlement_received')
                    RETURNING t.id
                ),
                update_main AS (
                    UPDATE transactions t
                    SET amount     = COALESCE($3::numeric, t.amount),
                        tx_date    = COALESCE($4::date,    t.tx_date),
                        tx_type    = CASE
                                         WHEN COALESCE($3::numeric, t.amount) < 0
                                         THEN 'expense' ELSE 'income'
                                     END,
                        updated_at = NOW()
                    WHERE t.id = $2::integer AND t.user_id = $1
                      AND t.tx_type NOT IN ('settlement_sent', 'settlement_received')
                    RETURNING t.id
                )
                SELECT
                    (SELECT COUNT(*) FROM affected_transfer)::int AS transfer_unlinked,
                    (SELECT id FROM update_main LIMIT 1) AS updated_id`,
                [userId, transactionId, amount ?? null, tx_date ?? null]
            )

            const cascadeRow = cascadeRows[0]
            if (!cascadeRow || cascadeRow.updated_id === null) {
                return NextResponse.json(
                    { error: "Transaction not found or cannot be modified" },
                    { status: 404 }
                );
            }
            transferUnlinked = cascadeRow.transfer_unlinked > 0
            resultId = cascadeRow.updated_id
        }

        // Phase 2: category and/or explicit tx_type
        if (category !== undefined) {
            const txTypeClause = tx_type !== undefined ? `, tx_type = $4::text` : ''
            const updateQuery = `
                WITH category_upsert AS (
                    INSERT INTO categories (user_id, name)
                    VALUES ($1::uuid, $2::text)
                    ON CONFLICT (user_id, name) DO NOTHING
                    RETURNING id
                ),
                category_id AS (
                    SELECT id::integer FROM category_upsert
                    UNION ALL
                    SELECT id::integer FROM categories
                    WHERE user_id = $1::uuid AND name = $2::text
                    AND NOT EXISTS (SELECT 1 FROM category_upsert)
                    LIMIT 1
                )
                UPDATE transactions
                SET
                    category_id = (SELECT id FROM category_id LIMIT 1),
                    raw_csv_row = COALESCE(
                        NULLIF(raw_csv_row, ''),
                        '{}'
                    )::jsonb || jsonb_build_object('category', $2::text)
                    ${txTypeClause}
                WHERE id = $3::integer AND user_id = $1::uuid
                RETURNING id, (SELECT id FROM category_id LIMIT 1) as category_id
            `;
            const catParams = tx_type !== undefined
                ? [userId, category, transactionId, tx_type]
                : [userId, category, transactionId]
            const catResult = await neonQuery<{ id: number; category_id: number | null }>(updateQuery, catParams)
            if (catResult.length === 0 && !cascadeNeeded) {
                return NextResponse.json(
                    { error: "Transaction not found or cannot be modified" },
                    { status: 404 }
                );
            }
            if (catResult.length > 0) {
                resultId = catResult[0].id
                resultCategoryId = catResult[0].category_id
            }
        } else if (tx_type !== undefined) {
            // tx_type only — or override the cascade-derived tx_type
            const txResult = await neonQuery<{ id: number; category_id: number | null }>(
                `UPDATE transactions SET tx_type = $1::text, updated_at = NOW()
                 WHERE id = $2::integer AND user_id = $3::uuid
                   AND tx_type NOT IN ('settlement_sent', 'settlement_received')
                 RETURNING id, category_id`,
                [tx_type, transactionId, userId]
            )
            if (txResult.length === 0 && !cascadeNeeded) {
                return NextResponse.json(
                    { error: "Transaction not found or cannot be modified" },
                    { status: 404 }
                );
            }
            if (txResult.length > 0) {
                resultId = txResult[0].id
                resultCategoryId = txResult[0].category_id
            }
        }

        await Promise.all([
            invalidateUserCachePrefix(userId, 'analytics'),
            invalidateUserCachePrefix(userId, 'data-library'),
            invalidateUserCachePrefix(userId, 'home'),
            invalidateUserCachePrefix(userId, 'trends'),
            invalidateUserCachePrefix(userId, 'savings'),
            invalidateUserCachePrefix(userId, 'pockets'),
            invalidateUserCachePrefix(userId, 'financial-health'),
        ]);

        revalidatePath('/data-library');
        revalidatePath('/analytics');
        revalidatePath('/home');

        return NextResponse.json({
            success: true,
            ...(category !== undefined && { category, categoryId: resultCategoryId }),
            ...(tx_type !== undefined && { tx_type }),
            ...(amount !== undefined && { amount }),
            ...(tx_date !== undefined && { tx_date }),
            ...(transferUnlinked && { transferUnlinked: true }),
        });
    } catch (error: any) {
        console.error("[Update Transaction API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update transaction" },
            { status: 500 }
        );
    }
};

