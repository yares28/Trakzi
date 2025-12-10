import { NextResponse } from "next/server"

import { getCurrentUserId } from "@/lib/auth"
import { neonQuery } from "@/lib/neonClient"

type TransactionRow = {
  id: number
  tx_date: string | Date
  description: string
  amount: string | number
  category_name: string | null
  category_color: string | null
  raw_csv_row: string | null
}

type TransactionHistoryPoint = {
  id: string
  group: string
  price: number
  volume: number
  category?: string
  color?: string | null
  date?: string
  description?: string
}

const RECENT_EXPENSES_QUERY = `
  SELECT 
    t.id,
    t.tx_date,
    t.description,
    t.amount,
    t.raw_csv_row,
    c.name AS category_name,
    c.color AS category_color
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = $1
    AND t.amount < 0
  ORDER BY t.tx_date DESC
  LIMIT 250
`

const CATEGORY_GROUPS: Record<string, string[]> = {
  Essentials: [
    "Groceries",
    "Rent",
    "Mortgage",
    "Utilities",
    "Insurance",
    "Taxes",
    "Healthcare",
    "Health",
    "Medical",
  ],
  Lifestyle: [
    "Shopping",
    "Travel",
    "Entertainment",
    "Restaurants",
    "Bars",
    "Subscriptions",
    "Services",
    "Education",
    "Personal",
    "Leisure",
  ],
  Transport: [
    "Transport",
    "Transportation",
    "Fuel",
    "Gas",
    "Car",
    "Ride",
    "Transit",
    "Commute",
  ],
  Financial: [
    "Transfers",
    "Transfer",
    "Fees",
    "Banking",
    "Savings",
    "Investments",
    "Loan",
    "Debt",
    "Mortgage",
  ],
}

const CATEGORY_DEFAULT_GROUP = "Essentials"

function resolveGroup(categoryName: string): string {
  const normalized = categoryName.toLowerCase()
  for (const [group, categories] of Object.entries(CATEGORY_GROUPS)) {
    if (
      categories.some((cat) => normalized.includes(cat.toLowerCase()))
    ) {
      return group
    }
  }
  return CATEGORY_DEFAULT_GROUP
}

function coerceDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().split("T")[0]
  }
  if (typeof value === "string") {
    return value.split("T")[0]
  }
  return new Date(value).toISOString().split("T")[0]
}

function coerceNumber(value: string | number): number {
  if (typeof value === "number") return value
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function computeVolume(amount: number): number {
  const min = 4
  const max = 20
  if (!Number.isFinite(amount) || amount <= 0) {
    return min
  }
  const scaled = Math.round(amount / 50)
  return Math.max(min, Math.min(max, scaled))
}

function parseCategoryFromRaw(raw: string | null): string | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.category === "string") {
      return parsed.category
    }
  } catch {
    // ignore parse errors
  }
  return null
}

export const GET = async () => {
  try {
    let userId: string
    try {
      userId = await getCurrentUserId()
    } catch (authError: any) {
      console.error("[TransactionHistory API] Auth error:", authError?.message)
      return NextResponse.json(
        { error: "Authentication required. Please sign in to access transaction history." },
        { status: 401 }
      )
    }
    const rows = await neonQuery<TransactionRow>(RECENT_EXPENSES_QUERY, [userId])

    const payload: TransactionHistoryPoint[] = rows.map((row, index) => {
      const normalizedAmount = Math.abs(coerceNumber(row.amount))
      const rawCategory = row.category_name || parseCategoryFromRaw(row.raw_csv_row) || "Other"
      const group = resolveGroup(rawCategory)

      return {
        id: row.id ? `tx-${row.id}` : `tx-${index}`,
        group,
        price: normalizedAmount,
        volume: computeVolume(normalizedAmount),
        category: rawCategory,
        color: row.category_color,
        date: coerceDate(row.tx_date),
        description: row.description,
      }
    })

    return NextResponse.json(payload)
  } catch (error: any) {
    console.error("[TransactionHistory API] Error:", error)
    return NextResponse.json(
      { error: "Failed to load transaction history" },
      { status: error?.status ?? 500 }
    )
  }
}


