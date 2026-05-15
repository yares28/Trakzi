import { neonQuery } from '@/lib/neonClient'
import { getPeriodDaysFromFilter } from '@/lib/date-filter'
import type { BudgetCategoryRow, BudgetsSummary } from '@/lib/types/budgets'

type RawBudgetRow = {
  category_id: string
  name: string
  color: string | null
  monthly_cap: string | null
  month: string | null
  month_spend: string | null
}

export function computeMonthsElapsed(filter: string | null | undefined): number {
  const days = getPeriodDaysFromFilter(filter)
  if (!days) return 0
  return days / 30.4375
}

function computeStatus(avgMonthly: number, monthlyCap: number | null): BudgetCategoryRow['status'] {
  if (monthlyCap === null) return 'unset'
  const ratio = avgMonthly / monthlyCap
  if (ratio > 1) return 'over'
  if (ratio >= 0.8) return 'warning'
  return 'under'
}

export function buildBudgetRows(
  rawRows: RawBudgetRow[],
  monthsElapsed: number
): { categories: BudgetCategoryRow[]; suggestions: BudgetCategoryRow[] } {
  const grouped = new Map<number, RawBudgetRow[]>()
  for (const row of rawRows) {
    const id = Number(row.category_id)
    if (!grouped.has(id)) grouped.set(id, [])
    grouped.get(id)!.push(row)
  }

  const categories: BudgetCategoryRow[] = []
  const suggestions: BudgetCategoryRow[] = []

  for (const [, rows] of grouped) {
    const first = rows[0]
    const monthlyCap = first.monthly_cap !== null ? parseFloat(first.monthly_cap) : null
    const monthlySpends = rows
      .filter((r) => r.month !== null && r.month_spend !== null)
      .map((r) => ({ month: r.month!, amount: parseFloat(r.month_spend!) }))
    const totalSpent = monthlySpends.reduce((sum, s) => sum + s.amount, 0)
    const safeMonths = monthsElapsed > 0 ? monthsElapsed : 1
    const avgMonthly = totalSpent / safeMonths
    const overBudgetMonths = monthlyCap !== null
      ? monthlySpends.filter((s) => s.amount > monthlyCap).length
      : 0
    const overByMonthly = monthlyCap !== null ? avgMonthly - monthlyCap : 0

    const row: BudgetCategoryRow = {
      categoryId: Number(first.category_id),
      name: first.name,
      color: first.color ?? '#6366f1',
      monthlyCap,
      monthlySpends,
      avgMonthly,
      totalSpent,
      overByMonthly,
      overBudgetMonths,
      status: computeStatus(avgMonthly, monthlyCap),
    }

    if (monthlyCap !== null) {
      categories.push(row)
    } else if (avgMonthly > 0) {
      suggestions.push(row)
    }
  }

  categories.sort((a, b) => a.name.localeCompare(b.name))
  suggestions.sort((a, b) => b.avgMonthly - a.avgMonthly)
  return { categories, suggestions: suggestions.slice(0, 5) }
}

export async function getBudgetsBundle(
  userId: string,
  filter: string | null
): Promise<BudgetsSummary> {
  const { getDateRange } = await import('@/app/api/transactions/route')
  const { startDate, endDate } = getDateRange(filter)
  const monthsElapsed = computeMonthsElapsed(filter)

  const rawRows = await neonQuery<RawBudgetRow>(
    `
    SELECT
      c.id::text AS category_id,
      c.name,
      COALESCE(c.color, '#6366f1') AS color,
      cb.budget::text AS monthly_cap,
      TO_CHAR(DATE_TRUNC('month', t.tx_date), 'YYYY-MM-DD') AS month,
      SUM(ABS(t.amount))::text AS month_spend
    FROM categories c
    LEFT JOIN category_budgets cb
      ON cb.category_id = c.id
      AND cb.user_id = $1
      AND cb.scope = 'analytics'
    LEFT JOIN transactions t
      ON t.category_id = c.id
      AND t.user_id = $1
      AND t.amount < 0
      AND ($2::date IS NULL OR t.tx_date >= $2::date)
      AND ($3::date IS NULL OR t.tx_date <= $3::date)
    WHERE c.user_id = $1
      AND c.name IS NOT NULL
    GROUP BY c.id, c.name, c.color, cb.budget, DATE_TRUNC('month', t.tx_date)
    HAVING cb.budget IS NOT NULL OR SUM(ABS(t.amount)) > 0
    ORDER BY c.name, month NULLS LAST
    `,
    [userId, startDate, endDate]
  )

  const { categories, suggestions } = buildBudgetRows(rawRows, monthsElapsed)

  const monthTotalsMap = new Map<string, { cap: number; spent: number }>()
  for (const cat of categories) {
    const cap = cat.monthlyCap ?? 0
    for (const spend of cat.monthlySpends) {
      const entry = monthTotalsMap.get(spend.month) ?? { cap: 0, spent: 0 }
      entry.cap += cap
      entry.spent += spend.amount
      monthTotalsMap.set(spend.month, entry)
    }
  }

  const monthlyTotals = Array.from(monthTotalsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { cap, spent }]) => ({ month, cap, spent }))

  return { monthsElapsed, monthlyTotals, categories, suggestions }
}
