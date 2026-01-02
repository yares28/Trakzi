import { NextResponse } from "next/server"

import { neonQuery } from "@/lib/neonClient"
import { getCurrentUserId } from "@/lib/auth"
import { getDateRange } from "@/app/api/transactions/route"

type FinancialAggregateRow = {
  year: number
  income: number | string | null
  expenses: number | string | null
}

type FinancialRadarDatum = Record<string, string | number>

type FinancialHealthYearSummary = {
  year: number
  income: number
  expenses: number
  savings: number
}

type FinancialHealthResponse = {
  data: FinancialRadarDatum[]
  years: FinancialHealthYearSummary[]
}

const CAPABILITIES = ["Income", "Expenses"] as const
const MAX_YEARS = 3

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const numeric = typeof value === "string" ? parseFloat(value) : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

const selectYears = (
  availableYears: number[],
  aggregateMap: Record<number, { income: number; expenses: number }>
) => {
  const nowYear = new Date().getFullYear()
  const preferred = [nowYear, nowYear - 1, nowYear - 2]
  const selected: number[] = []

  preferred.forEach(year => {
    if (aggregateMap[year] && !selected.includes(year)) {
      selected.push(year)
    }
  })

  for (const year of availableYears) {
    if (selected.length >= MAX_YEARS) break
    if (!selected.includes(year)) {
      selected.push(year)
    }
  }

  if (selected.length === 0 && availableYears.length > 0) {
    selected.push(availableYears[0])
  }

  return selected.slice(0, MAX_YEARS).sort((a, b) => b - a)
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId()
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter")
    const { startDate, endDate } = getDateRange(filter)

    let query = `
        SELECT 
          EXTRACT(YEAR FROM tx_date)::int AS year,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
          SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS expenses
        FROM transactions
        WHERE user_id = $1
    `
    const params: (string | number)[] = [userId]
    if (startDate && endDate) {
      query += ` AND tx_date >= $2 AND tx_date <= $3`
      params.push(startDate, endDate)
    }
    query += ` GROUP BY year ORDER BY year DESC`

    const aggregates = await neonQuery<FinancialAggregateRow>(query, params)

    const aggregateMap = aggregates.reduce<Record<number, { income: number; expenses: number }>>(
      (acc, row) => {
        if (!row?.year) return acc
        acc[row.year] = {
          income: toNumber(row.income),
          expenses: toNumber(row.expenses),
        }
        return acc
      },
      {}
    )

    const availableYears = Object.keys(aggregateMap)
      .map(year => Number(year))
      .filter(year => Number.isFinite(year))
      .sort((a, b) => b - a)

    if (availableYears.length === 0) {
      return NextResponse.json<FinancialHealthResponse>({ data: [], years: [] })
    }

    const selectedYears = selectYears(availableYears, aggregateMap)

    const hasAnyData = selectedYears.some(year => {
      const entry = aggregateMap[year]
      return entry && (entry.income !== 0 || entry.expenses !== 0)
    })

    if (!hasAnyData) {
      return NextResponse.json<FinancialHealthResponse>({ data: [], years: [] })
    }

    const data: FinancialRadarDatum[] = CAPABILITIES.map(capability => {
      const row: FinancialRadarDatum = { capability }
      selectedYears.forEach(year => {
        const entry = aggregateMap[year] || { income: 0, expenses: 0 }
        let value = 0
        if (capability === "Income") {
          value = entry.income
        } else if (capability === "Expenses") {
          value = entry.expenses
        } else {
          value = Math.max(0, entry.income - entry.expenses)
        }
        row[year.toString()] = value
      })
      return row
    })

    let catQuery = `
        SELECT 
          EXTRACT(YEAR FROM tx_date)::int AS year,
          COALESCE(NULLIF(TRIM(c.name), ''), 'Other') AS category,
          SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) AS total_expense
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
          AND amount < 0
    `
    const catParams: (string | number)[] = [userId]
    if (startDate && endDate) {
      catQuery += ` AND tx_date >= $2 AND tx_date <= $3`
      catParams.push(startDate, endDate)
    }
    catQuery += ` GROUP BY year, category`

    const categoryExpenses = await neonQuery<{
      year: number
      category: string | null
      total_expense: number | string | null
    }>(catQuery, catParams)

    const categoryTotals = new Map<string, number>()
    const categoryYearMap = new Map<string, Map<number, number>>()

    categoryExpenses.forEach(row => {
      if (!row?.category || !row?.year) return
      const category = row.category
      const amount = toNumber(row.total_expense)
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)
      if (!categoryYearMap.has(category)) {
        categoryYearMap.set(category, new Map())
      }
      categoryYearMap.get(category)!.set(row.year, amount)
    })

    // Return all categories sorted by total expense (for toggling)
    // Frontend will default to showing top 7
    const allCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)

    allCategories.forEach(category => {
      const row: FinancialRadarDatum = { capability: category }
      selectedYears.forEach(year => {
        const yearValue = categoryYearMap.get(category)?.get(year) || 0
        row[year.toString()] = yearValue
      })
      data.push(row)
    })

    const years: FinancialHealthYearSummary[] = selectedYears.map(year => {
      const entry = aggregateMap[year] || { income: 0, expenses: 0 }
      return {
        year,
        income: entry.income,
        expenses: entry.expenses,
        savings: Math.max(0, entry.income - entry.expenses),
      }
    })

    return NextResponse.json<FinancialHealthResponse>({ data, years })
  } catch (error) {
    console.error("[Financial Health API] Error:", error)
    return NextResponse.json(
      { error: "Failed to load financial health data" },
      { status: 500 }
    )
  }
}

