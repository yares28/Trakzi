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
        const { category } = body;

        if (!category || typeof category !== 'string') {
            return NextResponse.json(
                { error: "Category is required" },
                { status: 400 }
            );
        }

        // Optimized: Single query with explicit type casts to avoid parameter inference issues
        // This reduces from 3 queries to 1 query
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
            WHERE id = $3::integer AND user_id = $1::uuid
            RETURNING id, (SELECT id FROM category_id LIMIT 1) as category_id
        `;
        
        const result = await neonQuery<{ id: number; category_id: number }>(
            updateQuery,
            [userId, category, transactionId]
        );

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            );
        }

        // Invalidate caches after category update (affects analytics breakdown)
        invalidateUserCachePrefix(userId, 'analytics').catch((err) => {
            console.error('[Update Transaction] Analytics cache invalidation error:', err);
        });
        invalidateUserCachePrefix(userId, 'data-library').catch((err) => {
            console.error('[Update Transaction] Data library cache invalidation error:', err);
        });

        return NextResponse.json({ 
            success: true, 
            category, 
            categoryId: result[0].category_id 
        });
    } catch (error: any) {
        console.error("[Update Transaction Category API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update transaction category" },
            { status: 500 }
        );
    }
};

