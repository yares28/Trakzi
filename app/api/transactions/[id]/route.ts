// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery, neonInsert } from "@/lib/neonClient";

export const DELETE = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) => {
    try {
        const userId = await getCurrentUserId();
        const resolvedParams = await Promise.resolve(params);
        const transactionId = parseInt(resolvedParams.id, 10);

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
    { params }: { params: Promise<{ id: string }> | { id: string } }
) => {
    try {
        const userId = await getCurrentUserId();
        const resolvedParams = await Promise.resolve(params);
        const transactionId = parseInt(resolvedParams.id, 10);

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

        // First, get the transaction to check ownership and get raw_csv_row
        const getTxQuery = `
            SELECT raw_csv_row 
            FROM transactions 
            WHERE id = $1 AND user_id = $2
        `;
        const transactions = await neonQuery<{ raw_csv_row: string | null }>(
            getTxQuery,
            [transactionId, userId]
        );

        if (transactions.length === 0) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            );
        }

        // Find or create the category in the database
        const findCategoryQuery = `
            SELECT id 
            FROM categories 
            WHERE user_id = $1 AND name = $2
        `;
        const existingCategories = await neonQuery<{ id: number }>(
            findCategoryQuery,
            [userId, category]
        );

        let categoryId: number | null = null;

        if (existingCategories.length > 0) {
            categoryId = existingCategories[0].id;
        } else {
            // Create the category
            const newCategories = await neonInsert("categories", {
                user_id: userId,
                name: category,
            });
            categoryId = newCategories[0].id as number;
        }

        // Update raw_csv_row to include the new category
        let rawCsvRow = transactions[0].raw_csv_row;
        if (rawCsvRow) {
            try {
                const parsed = JSON.parse(rawCsvRow);
                parsed.category = category;
                rawCsvRow = JSON.stringify(parsed);
            } catch (e) {
                // If parsing fails, create a new raw_csv_row
                rawCsvRow = JSON.stringify({ category });
            }
        } else {
            rawCsvRow = JSON.stringify({ category });
        }

        // Update the transaction
        const updateQuery = `
            UPDATE transactions 
            SET category_id = $1, raw_csv_row = $2
            WHERE id = $3 AND user_id = $4
        `;
        await neonQuery(updateQuery, [categoryId, rawCsvRow, transactionId, userId]);

        return NextResponse.json({ success: true, category, categoryId });
    } catch (error: any) {
        console.error("[Update Transaction Category API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update transaction category" },
            { status: 500 }
        );
    }
};

