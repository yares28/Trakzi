// lib/types/budgets.ts

export interface BudgetCategoryRow {
  categoryId: number
  name: string
  /** Either a category-N token, a legacy hex string, or null. Resolve via lib/colors/category-color.ts */
  color: string | null
  monthlyCap: number | null
  /** One entry per calendar month that had spend in the filter window */
  monthlySpends: { month: string; amount: number }[]
  avgMonthly: number
  totalSpent: number
  /** avgMonthly - monthlyCap (negative = under budget) */
  overByMonthly: number
  /** Count of months where spend exceeded monthlyCap */
  overBudgetMonths: number
  status: 'under' | 'warning' | 'over' | 'unset'
}

export interface BudgetsSummary {
  /** Approximate months in the filter window (float, e.g. 3.0 for last3months) */
  monthsElapsed: number
  /** Per-month totals for the trend chart */
  monthlyTotals: { month: string; cap: number; spent: number }[]
  /** Categories that have a budget set */
  categories: BudgetCategoryRow[]
  /** Top-5 unbudgeted categories by avg monthly spend */
  suggestions: BudgetCategoryRow[]
}
