export const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000

export const DEFAULT_CHART_ORDER = [
  "incomeExpensesTracking1",
  "incomeExpensesTracking2",
  "spendingCategoryRankings",
  "netWorthAllocation",
  "moneyFlow",
  "needsWantsBreakdown",
  "expenseBreakdown",
  "categoryBubbleMap",
  "householdSpendMix",
  "financialHealthScore",
  "spendingActivityRings",
  "spendingStreamgraph",
  "transactionHistory",
  "dailyTransactionActivity",
  "dayOfWeekSpending",
  "allMonthsCategorySpending",
  "singleMonthCategorySpending",
  "dayOfWeekCategory",
  "cashFlowSankey",
]

export const CHART_ORDER_STORAGE_KEY = "analytics-chart-order"
export const CHART_SIZES_STORAGE_KEY = "analytics-chart-sizes"
export const CHART_SIZES_VERSION_KEY = "analytics-chart-sizes-version"
export const DEFAULT_SIZES_VERSION = "10"

export const DEFAULT_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
  "incomeExpensesTracking1": { w: 12, h: 6, x: 0, y: 0 },
  "incomeExpensesTracking2": { w: 12, h: 6, x: 0, y: 6 },
  "spendingCategoryRankings": { w: 12, h: 8, x: 0, y: 20 },
  "netWorthAllocation": { w: 12, h: 10, x: 0, y: 28 },
  "moneyFlow": { w: 6, h: 10, x: 0, y: 38 },
  "needsWantsBreakdown": { w: 6, h: 10, x: 6, y: 28 },
  "expenseBreakdown": { w: 6, h: 10, x: 6, y: 38 },
  "categoryBubbleMap": { w: 6, h: 10, x: 6, y: 48 },
  "householdSpendMix": { w: 6, h: 10, x: 0, y: 48 },
  "financialHealthScore": { w: 6, h: 10, x: 6, y: 38 },
  "spendingActivityRings": { w: 6, h: 10, x: 0, y: 58 },
  "spendingStreamgraph": { w: 12, h: 9, x: 0, y: 68 },
  "transactionHistory": { w: 12, h: 7, x: 0, y: 77 },
  "dailyTransactionActivity": { w: 12, h: 7, x: 0, y: 86 },
  "dayOfWeekSpending": { w: 6, h: 8, x: 6, y: 94 },
  "allMonthsCategorySpending": { w: 6, h: 8, x: 0, y: 102 },
  "singleMonthCategorySpending": { w: 6, h: 8, x: 6, y: 110 },
  "dayOfWeekCategory": { w: 6, h: 8, x: 0, y: 110 },
  "cashFlowSankey": { w: 12, h: 10, x: 0, y: 118 },
}
