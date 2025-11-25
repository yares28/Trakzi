import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { neonInsert, neonQuery } from "@/lib/neonClient"

type CategoryRow = {
  id: number
  name: string
  color: string | null
  created_at: string
  transaction_count: string | number
  total_spend: string | number
  total_amount: string | number
}

const CATEGORY_LIST_QUERY = `
  SELECT 
    c.id,
    c.name,
    c.color,
    c.created_at,
    COUNT(t.id) AS transaction_count,
    COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS total_spend,
    COALESCE(SUM(t.amount), 0) AS total_amount
  FROM categories c
  LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = $1
  WHERE c.user_id = $1
  GROUP BY c.id
  HAVING COUNT(t.id) > 0
  ORDER BY COALESCE(SUM(t.amount), 0) ASC
`

export const GET = async () => {
  try {
    const userId = await getCurrentUserId()

    let categories = await neonQuery<CategoryRow>(CATEGORY_LIST_QUERY, [userId])

    if (categories.length === 0) {
      const defaultRows = DEFAULT_CATEGORIES.map((name, index) => ({
        user_id: userId,
        name,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }))

      await neonInsert("categories", defaultRows, {
        returnRepresentation: false,
      })

      categories = await neonQuery<CategoryRow>(CATEGORY_LIST_QUERY, [userId])
    }

    const payload = categories
      .map((category) => {
        const totalAmount = typeof category.total_amount === "string"
          ? parseFloat(category.total_amount)
          : Number(category.total_amount ?? 0)
        
        return {
          id: category.id,
          name: category.name,
          color: category.color,
          createdAt:
            typeof category.created_at === "string"
              ? category.created_at
              : new Date(category.created_at).toISOString(),
          transactionCount:
            typeof category.transaction_count === "string"
              ? parseInt(category.transaction_count)
              : Number(category.transaction_count ?? 0),
          totalSpend:
            typeof category.total_spend === "string"
              ? parseFloat(category.total_spend)
              : Number(category.total_spend ?? 0),
          totalAmount: totalAmount,
        }
      })
      // Filter out categories with 0 transactions (double-check, though HAVING should handle this)
      .filter((cat) => cat.transactionCount > 0)
      // Sort by total amount ascending (most negative/highest expenses first, then income)
      .sort((a, b) => a.totalAmount - b.totalAmount)

    return NextResponse.json(payload)
  } catch (error) {
    console.error("[Categories API] Error:", error)
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    )
  }
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

export const POST = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))
    const rawName = typeof body.name === "string" ? body.name : ""
    const color = typeof body.color === "string" ? body.color.trim() : null

    const normalizedName = rawName.trim().replace(/\s+/g, " ")

    if (!normalizedName) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      )
    }

    const paletteColor =
      color ||
      CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]

    const [category] = await neonInsert("categories", {
      user_id: userId,
      name: normalizedName,
      color: paletteColor,
    })

    return NextResponse.json(
      {
        id: category.id,
        name: category.name,
        color: category.color,
      },
      { status: 201 }
    )
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.toLowerCase().includes("duplicate")) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      )
    }

    console.error("[Categories API] POST error:", error)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}

