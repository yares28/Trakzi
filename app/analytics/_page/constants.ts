export const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000

export const DEFAULT_CHART_ORDER = [
  "incomeExpensesTracking1",
  "incomeExpensesTracking2",
  "spendingScore",
  "cashFlowIndicator",
  "incomeExpenseRatio",
  "weekendVsWeekday",
  "monthlyBudgetPace",
  "budgetBurndown",
  "purchaseSizeBreakdown",
  "recurringVsOneTime",
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
export const DEFAULT_SIZES_VERSION = "12"

export const DEFAULT_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
  "incomeExpensesTracking1": { w: 6, h: 6, x: 0, y: 0 },
  "incomeExpensesTracking2": { w: 6, h: 6, x: 6, y: 0 },
  "spendingScore": { w: 6, h: 6, x: 0, y: 6 },
  "cashFlowIndicator": { w: 6, h: 6, x: 6, y: 6 },
  "incomeExpenseRatio": { w: 6, h: 6, x: 0, y: 12 },
  "weekendVsWeekday": { w: 6, h: 6, x: 6, y: 12 },
  "monthlyBudgetPace": { w: 6, h: 6, x: 0, y: 18 },
  "budgetBurndown": { w: 6, h: 6, x: 6, y: 18 },
  "purchaseSizeBreakdown": { w: 6, h: 6, x: 0, y: 24 },
  "recurringVsOneTime": { w: 6, h: 6, x: 6, y: 24 },
  "needsWantsBreakdown": { w: 6, h: 10, x: 0, y: 30 },
  "expenseBreakdown": { w: 6, h: 10, x: 6, y: 30 },
  "spendingCategoryRankings": { w: 12, h: 8, x: 0, y: 40 },
  "netWorthAllocation": { w: 12, h: 10, x: 0, y: 48 },
  "spendingActivityRings": { w: 6, h: 10, x: 0, y: 58 },
  "categoryBubbleMap": { w: 6, h: 10, x: 6, y: 58 },
  "moneyFlow": { w: 6, h: 10, x: 0, y: 68 },
  "householdSpendMix": { w: 6, h: 10, x: 6, y: 68 },
  "transactionHistory": { w: 12, h: 8, x: 0, y: 78 },
  "dayOfWeekSpending": { w: 6, h: 10, x: 0, y: 86 },
  "allMonthsCategorySpending": { w: 6, h: 10, x: 6, y: 86 },
  "cashFlowSankey": { w: 12, h: 10, x: 0, y: 96 },
  "dailyTransactionActivity": { w: 12, h: 6, x: 0, y: 106 },
  "dayOfWeekCategory": { w: 6, h: 9, x: 0, y: 112 },
  "singleMonthCategorySpending": { w: 6, h: 9, x: 6, y: 112 },
  "spendingStreamgraph": { w: 12, h: 9, x: 0, y: 121 },
  "financialHealthScore": { w: 6, h: 10, x: 0, y: 130 },
}

// Advanced tab chart order and default sizes
export const DEFAULT_ADVANCED_CHART_ORDER = [
  "spendingPyramid",
]

export const DEFAULT_ADVANCED_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
  "spendingPyramid": { w: 6, h: 8, x: 0, y: 0 },
}
