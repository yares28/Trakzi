import type { TxRow } from "@/lib/types/transactions"

export type ParsedRow = TxRow & { id: number }

export type HomeTransaction = {
  id: number
  date: string
  description: string
  simplifiedDescription?: string | null
  amount: number
  balance: number | null
  category: string
}

export type TrendPoint = {
  date: string
  value: number
}

export type StatsSummary = {
  totalIncome: number
  totalExpenses: number
  savingsRate: number
  netWorth: number
  incomeChange: number
  expensesChange: number
  savingsRateChange: number
  netWorthChange: number
}

export type StatsTrends = {
  incomeTrend: TrendPoint[]
  expensesTrend: TrendPoint[]
  netWorthTrend: TrendPoint[]
}

export type TransactionSummary = {
  count: number
  timeSpan: string
  trend: TrendPoint[]
}

export type FavoriteChartSize = {
  w: number
  h: number
  x?: number
  y?: number
}

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

export type SpendingActivityRingsProps = {
  data: ActivityRingsData
  config: ActivityRingsConfig
  theme: "light" | "dark"
  ringLimits?: Record<string, number>
  getDefaultLimit?: () => number
}
