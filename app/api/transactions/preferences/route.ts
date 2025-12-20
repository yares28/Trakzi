import { NextRequest, NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"
import { upsertTransactionCategoryPreferences } from "@/lib/transactions/transaction-category-preferences"

type CategoryRow = {
  id: number
  name: string
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

export const POST = async (req: NextRequest) => {
  try {
    const userId = await getCurrentUserId()
    const body = await req.json().catch(() => ({}))
    const rawEntries = Array.isArray(body?.entries) ? body.entries : []

    const cleanedEntries = rawEntries
      .map((entry) => {
        const description = typeof entry?.description === "string" ? entry.description.trim() : ""
        const categoryName = typeof entry?.category === "string"
          ? entry.category.trim()
          : (typeof entry?.categoryName === "string" ? entry.categoryName.trim() : "")
        return { description, categoryName }
      })
      .filter((entry) => entry.description.length > 0 && entry.categoryName.length > 0)
      .slice(0, 200)

    if (cleanedEntries.length === 0) {
      return NextResponse.json({ saved: 0 }, { headers: { "Cache-Control": "no-store" } })
    }

    const categoryNames = Array.from(
      new Set(cleanedEntries.map((entry) => normalizeName(entry.categoryName).toLowerCase()))
    )

    const categoryRows = await neonQuery<CategoryRow>(
      `
        SELECT id, name
        FROM categories
        WHERE user_id = $1
          AND LOWER(name) = ANY($2::text[])
      `,
      [userId, categoryNames]
    )

    const idByNameLower = new Map<string, number>()
    categoryRows.forEach((row) => {
      idByNameLower.set(row.name.toLowerCase(), row.id)
    })

    const resolvedEntries = cleanedEntries
      .map((entry) => {
        const normalized = normalizeName(entry.categoryName).toLowerCase()
        const categoryId = idByNameLower.get(normalized) ?? null
        return categoryId ? { description: entry.description, categoryId } : null
      })
      .filter((entry): entry is { description: string; categoryId: number } => Boolean(entry))

    if (resolvedEntries.length > 0) {
      await upsertTransactionCategoryPreferences({
        userId,
        entries: resolvedEntries,
      })
    }

    return NextResponse.json(
      { saved: resolvedEntries.length },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error: any) {
    const message = String(error?.message || "")
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Please sign in to update preferences." }, { status: 401 })
    }
    console.error("[Transaction Preferences API] Error:", error)
    return NextResponse.json({ error: "Failed to store preferences." }, { status: 500 })
  }
}
