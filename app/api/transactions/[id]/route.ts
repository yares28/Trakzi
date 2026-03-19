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
        const { category, tx_type } = body;

        // Validate tx_type when provided — block settlement types from user edits
        const EDITABLE_TX_TYPES = new Set(['expense', 'income', 'transfer'])
        if (tx_type !== undefined && !EDITABLE_TX_TYPES.has(tx_type)) {
            return NextResponse.json(
                { error: "Invalid tx_type. Must be expense, income, or transfer." },
                { status: 400 }
            );
        }

        if (!category && tx_type === undefined) {
            return NextResponse.json(
                { error: "At least one of category or tx_type is required" },
                { status: 400 }
            );
        }

        let result: { id: number; category_id: number | null }[]

        if (category) {
            // Category update (possibly alongside tx_type)
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
            const params = tx_type !== undefined
                ? [userId, category, transactionId, tx_type]
                : [userId, category, transactionId]
            result = await neonQuery<{ id: number; category_id: number | null }>(updateQuery, params)
        } else {
            // tx_type only update
            const updateQuery = `
                UPDATE transactions SET tx_type = $1::text
                WHERE id = $2::integer AND user_id = $3::uuid
                  AND tx_type NOT IN ('settlement_sent', 'settlement_received')
                RETURNING id, category_id
            `
            result = await neonQuery<{ id: number; category_id: number | null }>(
                updateQuery,
                [tx_type, transactionId, userId]
            )
        }

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Transaction not found or cannot be modified" },
                { status: 404 }
            );
        }

        // Invalidate caches — tx_type changes affect analytics, home, trends, and savings
        await Promise.all([
            invalidateUserCachePrefix(userId, 'analytics'),
            invalidateUserCachePrefix(userId, 'data-library'),
            invalidateUserCachePrefix(userId, 'home'),
            invalidateUserCachePrefix(userId, 'trends'),
            invalidateUserCachePrefix(userId, 'savings'),
            invalidateUserCachePrefix(userId, 'pockets'),
            invalidateUserCachePrefix(userId, 'financial-health'),
        ]);

        return NextResponse.json({
            success: true,
            ...(category && { category, categoryId: result[0].category_id }),
            ...(tx_type !== undefined && { tx_type }),
        });
    } catch (error: any) {
        console.error("[Update Transaction Category API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update transaction category" },
            { status: 500 }
        );
    }
};

