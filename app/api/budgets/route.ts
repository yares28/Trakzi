import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserId } from "@/lib/auth"
import { neonQuery, neonInsert } from "@/lib/neonClient"

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
    const { searchParams } = new URL(req.url)
    // Get filter from query params: null means "all time", string values are specific filters
    // searchParams.get() returns null if param doesn't exist, or the string value if it does
    const filterParam = searchParams.get("filter")
    const filter = filterParam === null ? null : (filterParam === "" ? null : filterParam)

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

    const categoryName = (body.categoryName ?? "").trim()
    const budgetValue =
      typeof body.budget === "string"
        ? parseFloat(body.budget)
        : typeof body.budget === "number"
          ? body.budget
          : NaN
    // Handle filter: null means "all time", string values are specific filters
    // body.filter can be: null (All Time), a string (specific filter), undefined (default to null), or "" (treat as null)
    let filter: string | null = null
    if (body.filter === null) {
      filter = null // Explicitly null for "all time"
    } else if (body.filter !== undefined && body.filter !== "" && body.filter !== null) {
      filter = String(body.filter) // Convert to string for specific filters like "last7days", "2024", etc.
    } else {
      filter = null // Default to null for "all time" if undefined or empty string
    }

    if (!categoryName || !Number.isFinite(budgetValue) || budgetValue < 0) {
      return NextResponse.json(
        { error: "Invalid category name or budget value" },
        { status: 400 }
      )
    }

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

    // Upsert the budget with filter
    // Since we're using partial unique indexes, we need to manually check and update
    const scope = "analytics" // Default scope for these budgets

    // Check if a budget already exists for this combination
    let existingBudget
    if (filter === null) {
      existingBudget = await neonQuery<{ id: number }>(
        `SELECT id FROM category_budgets 
         WHERE user_id = $1 AND category_id = $2 AND scope = $3 AND filter IS NULL`,
        [userId, categoryId, scope]
      )
    } else {
      existingBudget = await neonQuery<{ id: number }>(
        `SELECT id FROM category_budgets 
         WHERE user_id = $1 AND category_id = $2 AND scope = $3 AND filter = $4`,
        [userId, categoryId, scope, filter]
      )
    }

    if (existingBudget.length > 0) {
      // Update existing budget
      if (filter === null) {
        await neonQuery(
          `UPDATE category_budgets 
           SET budget = $1, updated_at = NOW()
           WHERE user_id = $2 AND category_id = $3 AND scope = $4 AND filter IS NULL`,
          [budgetValue, userId, categoryId, scope]
        )
      } else {
        await neonQuery(
          `UPDATE category_budgets 
           SET budget = $1, updated_at = NOW()
           WHERE user_id = $2 AND category_id = $3 AND scope = $4 AND filter = $5`,
          [budgetValue, userId, categoryId, scope, filter]
        )
      }
    } else {
      // Insert new budget
      await neonQuery(
        `INSERT INTO category_budgets (user_id, category_id, scope, budget, filter)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, categoryId, scope, budgetValue, filter]
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

    // Handle filter: null means "all time", string values are specific filters
    let filter: string | null = null
    if (body.filter === null) {
      filter = null // Explicitly null for "all time"
    } else if (body.filter !== undefined && body.filter !== "" && body.filter !== null) {
      filter = String(body.filter) // Convert to string for specific filters
    } else {
      filter = null // Default to null for "all time"
    }

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

    // Delete the budget for this filter
    if (filter === null) {
      await neonQuery(
        `DELETE FROM category_budgets 
         WHERE user_id = $1 AND category_id = $2 AND scope = $3 AND filter IS NULL`,
        [userId, categoryId, scope]
      )
    } else {
      await neonQuery(
        `DELETE FROM category_budgets 
         WHERE user_id = $1 AND category_id = $2 AND scope = $3 AND filter = $4`,
        [userId, categoryId, scope, filter]
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("[Budgets API] DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete budget" },
      { status: 500 }
    )
  }
}
