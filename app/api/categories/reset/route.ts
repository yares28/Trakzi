import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { DEFAULT_CATEGORIES } from "@/lib/categories"
import { neonInsert, neonQuery } from "@/lib/neonClient"

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

export const POST = async () => {
  try {
    const userId = await getCurrentUserId()

    // Delete all existing categories for this user
    await neonQuery(
      `DELETE FROM categories WHERE user_id = $1`,
      [userId]
    )

    // Insert only the categories from lib/categories.ts
    const defaultRows = DEFAULT_CATEGORIES.map((name, index) => ({
      user_id: userId,
      name,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }))

    await neonInsert("categories", defaultRows, {
      returnRepresentation: false,
    })

    return NextResponse.json(
      { 
        success: true, 
        message: `Reset categories: inserted ${DEFAULT_CATEGORIES.length} categories`,
        categories: DEFAULT_CATEGORIES
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Categories Reset API] Error:", error)
    return NextResponse.json(
      { error: "Failed to reset categories", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}




















