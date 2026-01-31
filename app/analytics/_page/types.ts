import type { TxRow } from "@/lib/types/transactions"

export type ParsedRow = TxRow & { id: number }

export type AnalyticsTransaction = {
  id: number
  date: string
  description: string
  amount: number
  balance: number | null
  category: string
}

export type AnalyticsCacheEntry = {
  transactions: AnalyticsTransaction[]
  ringLimits: Record<string, number>
  fetchedAt: number
}

// Local ring types compatible with the original react-activity-rings API,
// extended with our own Neon-specific fields.
export type ActivityRingsDatum = {
  value: number
  label?: string
  color?: string
  backgroundColor?: string
  category?: string
  spent?: number
}

export type ActivityRingsData = ActivityRingsDatum[]

export type ActivityRingsConfig = {
  width: number
  height: number
  radius?: number
  ringSize?: number
}

export type AnalyticsStats = {
  totalIncome: number
  totalExpenses: number
  savingsRate: number
  spendingRate: number
  netWorth: number
  incomeChange: number
  expensesChange: number
  savingsRateChange: number
  spendingRateChange: number
  netWorthChange: number
}

export type TrendPoint = { date: string; value: number }

export type AnalyticsStatsTrends = {
  incomeTrend: TrendPoint[]
  expensesTrend: TrendPoint[]
  netWorthTrend: TrendPoint[]
  savingsRateTrend: TrendPoint[]
  spendingRateTrend: TrendPoint[]
}

export type TransactionSummary = {
  count: number
  timeSpan: string
  trend: TrendPoint[]
}
