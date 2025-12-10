// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { neonQuery } from "@/lib/neonClient";

export const DELETE = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const userId = await getCurrentUserId();
        const { id } = await params;
        const categoryId = parseInt(id, 10);

        if (isNaN(categoryId) || categoryId <= 0) {
            return NextResponse.json(
                { error: "Invalid category ID" },
                { status: 400 }
            );
        }

        // Check if category exists and belongs to user
        const checkQuery = `
            SELECT id, name 
            FROM categories 
            WHERE id = $1 AND user_id = $2
        `;
        const existing = await neonQuery<{ id: number; name: string }>(
            checkQuery,
            [categoryId, userId]
        );

        if (existing.length === 0) {
            return NextResponse.json(
                { error: "Category not found" },
                { status: 404 }
            );
        }

        // Delete the category (transactions will have category_id set to NULL due to foreign key)
        const deleteQuery = `
            DELETE FROM categories 
            WHERE id = $1 AND user_id = $2
        `;
        
        await neonQuery(deleteQuery, [categoryId, userId]);

        return NextResponse.json({ 
            success: true,
            message: `Category "${existing[0].name}" deleted successfully`
        });
    } catch (error: any) {
        console.error("[Delete Category API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete category" },
            { status: 500 }
        );
    }
};































