import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"

const CreateBudgetSchema = z.object({
  categoryName: z.string().min(1, "Category name is required").max(100).trim(),
  budget: z.number({ coerce: true }).nonnegative("Budget must be a positive number").finite(),
})

type BudgetRow = {
  category_name: string
  budget: string | number
}

const CATEGORY_COLORS = [
  "#f97316",
  "#6366f1",
  "#10b981",
  "#ec4899",
  "#0ea5e9",
  "#facc15",
  "#14b8a6",
  "#8b5cf6",
  "#f43f5e",
]

export const GET = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()

    // Note: filter column removed from query until database schema is updated
    // For now, return all budgets regardless of filter
    const query = `
      SELECT c.name AS category_name, cb.budget
      FROM category_budgets cb
      JOIN categories c ON c.id = cb.category_id
      WHERE cb.user_id = $1
        AND cb.scope = 'analytics'
    `
    const params = [userId]

    const rows = await neonQuery<BudgetRow>(query, params)

    const result: Record<string, number> = {}

    for (const row of rows) {
      const name = (row.category_name || "").trim()
      if (!name) continue

      const valueRaw = row.budget
      const value =
        typeof valueRaw === "string"
          ? parseFloat(valueRaw)
          : Number(valueRaw ?? 0)

      if (Number.isFinite(value) && value > 0) {
        result[name] = value
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Budgets API] GET error:", error)
    return NextResponse.json(
      { error: "Failed to load budgets" },
      { status: 500 }
    )
  }
}

export const POST = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))
    const parsed = CreateBudgetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { categoryName, budget: budgetValue } = parsed.data

    // Normalize category name (same as categories API)
    const normalizedName = categoryName.trim().replace(/\s+/g, " ")

    // Try to find the category_id for the given categoryName and user_id
    let categoryResult = await neonQuery<{ id: number }>(
      `SELECT id FROM categories WHERE user_id = $1 AND name = $2`,
      [userId, normalizedName]
    )

    let categoryId: number

    // If category doesn't exist, create it
    if (categoryResult.length === 0) {
      const paletteColor =
        CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]

      try {
        const [newCategory] = await neonInsert<{ user_id: string; name: string; color: string; id?: number }>(
          "categories",
          {
            user_id: userId,
            name: normalizedName,
            color: paletteColor,
          },
          { returnRepresentation: true }
        ) as Array<{ id: number; user_id: string; name: string; color: string }>

        categoryId = newCategory.id
      } catch (insertError: any) {
        // If insert fails due to duplicate (race condition), try to find it again
        const message = String(insertError?.message || "")
        if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
          categoryResult = await neonQuery<{ id: number }>(
            `SELECT id FROM categories WHERE user_id = $1 AND name = $2`,
            [userId, normalizedName]
          )

          if (categoryResult.length > 0) {
            categoryId = categoryResult[0].id
          } else {
            throw insertError
          }
        } else {
          throw insertError
        }
      }
    } else {
      categoryId = categoryResult[0].id
    }

    // Upsert the budget (no filter column - not in database schema)
    const scope = "analytics"

    // Check if a budget already exists for this combination
    const existingBudget = await neonQuery<{ id: number }>(
      `SELECT id FROM category_budgets 
       WHERE user_id = $1 AND category_id = $2 AND scope = $3`,
      [userId, categoryId, scope]
    )

    if (existingBudget.length > 0) {
      // Update existing budget
      await neonQuery(
        `UPDATE category_budgets 
         SET budget = $1, updated_at = NOW()
         WHERE user_id = $2 AND category_id = $3 AND scope = $4`,
        [budgetValue, userId, categoryId, scope]
      )
    } else {
      // Insert new budget (no filter column)
      await neonQuery(
        `INSERT INTO category_budgets (user_id, category_id, scope, budget)
         VALUES ($1, $2, $3, $4)`,
        [userId, categoryId, scope, budgetValue]
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[Budgets API] POST error:", error)
    return NextResponse.json(
      { error: "Failed to save budget" },
      { status: 500 }
    )
  }
}

export const DELETE = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))

    const categoryName = (body.categoryName ?? "").trim()

    if (!categoryName) {
      return NextResponse.json(
        { error: "Invalid category name" },
        { status: 400 }
      )
    }

    // Normalize category name
    const normalizedName = categoryName.trim().replace(/\s+/g, " ")

    // Find the category_id
    const categoryResult = await neonQuery<{ id: number }>(
      `SELECT id FROM categories WHERE user_id = $1 AND name = $2`,
      [userId, normalizedName]
    )

    if (categoryResult.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    const categoryId = categoryResult[0].id
    const scope = "analytics"

    // Delete the budget (no filter column)
    await neonQuery(
      `DELETE FROM category_budgets 
       WHERE user_id = $1 AND category_id = $2 AND scope = $3`,
      [userId, categoryId, scope]
    )

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[Budgets API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    )
  }
}
