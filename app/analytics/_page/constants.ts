export const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000

export const DEFAULT_CHART_ORDER = [
  "incomeExpensesTracking1",
  "incomeExpensesTracking2",
  "needsWantsBreakdown",
  "expenseBreakdown",
  "spendingCategoryRankings",
  "netWorthAllocation",
  "spendingActivityRings",
  "categoryBubbleMap",
  "moneyFlow",
  "householdSpendMix",
  "transactionHistory",
  "dayOfWeekSpending",
  "allMonthsCategorySpending",
  "cashFlowSankey",
  "dailyTransactionActivity",
  "dayOfWeekCategory",
  "singleMonthCategorySpending",
  "spendingStreamgraph",
  "financialHealthScore",
]

export const CHART_ORDER_STORAGE_KEY = "analytics-chart-order"
export const CHART_SIZES_STORAGE_KEY = "analytics-chart-sizes"
export const CHART_SIZES_VERSION_KEY = "analytics-chart-sizes-version"
export const DEFAULT_SIZES_VERSION = "11"

export const DEFAULT_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
  "incomeExpensesTracking1": { w: 6, h: 6, x: 0, y: 0 },
  "incomeExpensesTracking2": { w: 6, h: 6, x: 6, y: 0 },
  "needsWantsBreakdown": { w: 6, h: 10, x: 0, y: 6 },
  "expenseBreakdown": { w: 6, h: 10, x: 6, y: 6 },
  "spendingCategoryRankings": { w: 12, h: 8, x: 0, y: 16 },
  "netWorthAllocation": { w: 12, h: 10, x: 0, y: 24 },
  "spendingActivityRings": { w: 6, h: 10, x: 0, y: 34 },
  "categoryBubbleMap": { w: 6, h: 10, x: 6, y: 34 },
  "moneyFlow": { w: 6, h: 10, x: 0, y: 44 },
  "householdSpendMix": { w: 6, h: 10, x: 6, y: 44 },
  "transactionHistory": { w: 12, h: 8, x: 0, y: 54 },
  "dayOfWeekSpending": { w: 6, h: 10, x: 0, y: 62 },
  "allMonthsCategorySpending": { w: 6, h: 10, x: 6, y: 62 },
  "cashFlowSankey": { w: 12, h: 10, x: 0, y: 72 },
  "dailyTransactionActivity": { w: 12, h: 6, x: 0, y: 82 },
  "dayOfWeekCategory": { w: 6, h: 9, x: 0, y: 88 },
  "singleMonthCategorySpending": { w: 6, h: 9, x: 6, y: 88 },
  "spendingStreamgraph": { w: 12, h: 9, x: 0, y: 97 },
  "financialHealthScore": { w: 6, h: 10, x: 0, y: 106 },
}

// Advanced tab chart order and default sizes
export const DEFAULT_ADVANCED_CHART_ORDER = [
  "spendingPyramid",
]

export const DEFAULT_ADVANCED_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
  "spendingPyramid": { w: 6, h: 8, x: 0, y: 0 },
}
