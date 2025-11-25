// app/api/categories/backfill/route.ts
// Backfill existing transactions: extract category from raw_csv_row and set category_id
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

export const POST = async (req: NextRequest) => {
    try {
        const userId = await getCurrentUserId();

        // 1) Fetch all transactions with null category_id that have raw_csv_row
        const transactionsQuery = `
            SELECT id, raw_csv_row
            FROM transactions
            WHERE user_id = $1 
            AND category_id IS NULL 
            AND raw_csv_row IS NOT NULL 
            AND raw_csv_row != ''
        `;

        const transactions = await neonQuery<{
            id: number;
            raw_csv_row: string;
        }>(transactionsQuery, [userId]);

        console.log(`[Backfill] Found ${transactions.length} transactions to process`);

        if (transactions.length === 0) {
            return NextResponse.json({
                message: "No transactions need backfilling",
                updated: 0
            });
        }

        // 2) Extract category names from raw_csv_row and build a map
        const categoryUpdates: Array<{ transactionId: number; categoryName: string }> = [];
        
        for (const tx of transactions) {
            try {
                const parsed = JSON.parse(tx.raw_csv_row);
                if (parsed.category && typeof parsed.category === 'string' && parsed.category.trim().length > 0) {
                    categoryUpdates.push({
                        transactionId: tx.id,
                        categoryName: parsed.category.trim()
                    });
                }
            } catch (e) {
                // Skip transactions with invalid JSON
                console.warn(`[Backfill] Failed to parse raw_csv_row for transaction ${tx.id}:`, e);
            }
        }

        console.log(`[Backfill] Found ${categoryUpdates.length} transactions with category data`);

        if (categoryUpdates.length === 0) {
            return NextResponse.json({
                message: "No transactions have category data in raw_csv_row",
                updated: 0
            });
        }

        // 3) Get unique category names
        const uniqueCategoryNames = Array.from(
            new Set(categoryUpdates.map(u => u.categoryName))
        );

        // 4) Fetch or create categories
        const categoryNameToId = new Map<string, number>();

        // Fetch existing categories
        if (uniqueCategoryNames.length > 0) {
            const placeholders = uniqueCategoryNames.map((_, i) => `$${i + 2}`).join(', ');
            const existingCategoriesQuery = `
                SELECT id, name 
                FROM categories 
                WHERE user_id = $1 AND name IN (${placeholders})
            `;
            const existingCategories = await neonQuery<{ id: number; name: string }>(
                existingCategoriesQuery,
                [userId, ...uniqueCategoryNames]
            );

            existingCategories.forEach(cat => {
                categoryNameToId.set(cat.name, cat.id);
            });

            // Create missing categories
            const missingCategories = uniqueCategoryNames.filter(
                name => !categoryNameToId.has(name)
            );

            if (missingCategories.length > 0) {
                console.log(`[Backfill] Creating ${missingCategories.length} new categories`);
                
                // Insert missing categories one by one (to handle conflicts)
                for (const name of missingCategories) {
                    try {
                        const insertQuery = `
                            INSERT INTO categories (user_id, name, color)
                            VALUES ($1, $2, NULL)
                            ON CONFLICT (user_id, name) DO NOTHING
                            RETURNING id
                        `;
                        const result = await neonQuery<{ id: number }>(
                            insertQuery,
                            [userId, name]
                        );
                        
                        if (result.length > 0) {
                            categoryNameToId.set(name, result[0].id);
                        } else {
                            // Category was created by another process, fetch it
                            const fetchQuery = `
                                SELECT id FROM categories 
                                WHERE user_id = $1 AND name = $2
                            `;
                            const fetched = await neonQuery<{ id: number }>(
                                fetchQuery,
                                [userId, name]
                            );
                            if (fetched.length > 0) {
                                categoryNameToId.set(name, fetched[0].id);
                            }
                        }
                    } catch (err) {
                        console.error(`[Backfill] Failed to create category "${name}":`, err);
                    }
                }
            }
        }

        // 5) Update transactions with category_id (batch by category)
        let updatedCount = 0;
        const errors: string[] = [];

        // Group updates by category_id for batch processing
        const updatesByCategory = new Map<number, number[]>();
        
        for (const update of categoryUpdates) {
            const categoryId = categoryNameToId.get(update.categoryName);
            
            if (!categoryId) {
                errors.push(`Transaction ${update.transactionId}: Category "${update.categoryName}" not found`);
                continue;
            }

            if (!updatesByCategory.has(categoryId)) {
                updatesByCategory.set(categoryId, []);
            }
            updatesByCategory.get(categoryId)!.push(update.transactionId);
        }

        // Batch update transactions by category
        for (const [categoryId, transactionIds] of updatesByCategory.entries()) {
            try {
                // Build placeholders for IN clause (start from $2 since $1 is categoryId)
                const placeholders = transactionIds.map((_, i) => `$${i + 2}`).join(', ');
                const userIdParamIndex = transactionIds.length + 2;
                const updateQuery = `
                    UPDATE transactions
                    SET category_id = $1
                    WHERE id IN (${placeholders}) 
                    AND user_id = $${userIdParamIndex}
                    AND category_id IS NULL
                    RETURNING id
                `;
                const result = await neonQuery<{ id: number }>(
                    updateQuery,
                    [categoryId, ...transactionIds, userId]
                );
                
                updatedCount += result.length;
            } catch (err: any) {
                errors.push(`Category ${categoryId}: ${err.message}`);
                console.error(`[Backfill] Failed to update transactions for category ${categoryId}:`, err);
            }
        }

        console.log(`[Backfill] Updated ${updatedCount} transactions`);

        return NextResponse.json({
            message: `Backfill complete`,
            processed: categoryUpdates.length,
            updated: updatedCount,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error("[Backfill API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to backfill transactions" },
            { status: 500 }
        );
    }
};

