import { NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

// POST /api/receipt-categories/migrate
// Migrates old category types (Vitamins/Minerals, Fiber) to "None"
export async function POST() {
    const userId = await getCurrentUserId()
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        // First, ensure "None" type exists
        const noneTypeResult = await neonQuery<{ id: number }>(
            `INSERT INTO receipt_category_types (user_id, name, color)
       VALUES ($1, 'None', '#3b82f6')
       ON CONFLICT (user_id, name) DO UPDATE SET color = '#3b82f6'
       RETURNING id`,
            [userId]
        )
        const noneTypeId = noneTypeResult[0]?.id

        if (!noneTypeId) {
            return NextResponse.json({ error: "Failed to create None type" }, { status: 500 })
        }

        // Get IDs of old types to migrate
        const oldTypes = await neonQuery<{ id: number; name: string }>(
            `SELECT id, name FROM receipt_category_types 
       WHERE user_id = $1 AND name IN ('Vitamins/Minerals', 'Fiber')`,
            [userId]
        )

        let categoriesUpdated = 0
        let typesDeleted = 0

        for (const oldType of oldTypes) {
            // Update categories using the old type to use "None"
            const updateResult = await neonQuery<{ count: string }>(
                `WITH updated AS (
           UPDATE receipt_categories 
           SET type_id = $1, updated_at = now()
           WHERE user_id = $2 AND type_id = $3
           RETURNING id
         )
         SELECT count(*)::text as count FROM updated`,
                [noneTypeId, userId, oldType.id]
            )
            categoriesUpdated += parseInt(updateResult[0]?.count || "0", 10)

            // Delete the old type
            await neonQuery(
                `DELETE FROM receipt_category_types WHERE id = $1 AND user_id = $2`,
                [oldType.id, userId]
            )
            typesDeleted++
        }

        return NextResponse.json({
            success: true,
            message: `Migration complete`,
            details: {
                noneTypeId,
                oldTypesMigrated: oldTypes.map(t => t.name),
                categoriesUpdated,
                typesDeleted,
            },
        })
    } catch (error) {
        console.error("[migrate] Error:", error)
        const message = error instanceof Error ? error.message : String(error)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
