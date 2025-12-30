import type { FavoriteChartSize } from "./types"

export const FAVORITES_ORDER_STORAGE_KEY = "home-favorites-order"
export const FAVORITE_SIZES_STORAGE_KEY = "home-favorites-chart-sizes"

export const DEFAULT_FAVORITE_SIZES: Record<string, FavoriteChartSize> = {
  incomeExpensesTracking1: { w: 12, h: 6, x: 0, y: 0 },
  incomeExpensesTracking2: { w: 12, h: 6, x: 0, y: 6 },
  spendingCategoryRankings: { w: 12, h: 8, x: 0, y: 12 },
  netWorthAllocation: { w: 12, h: 10, x: 0, y: 20 },
  moneyFlow: { w: 6, h: 10, x: 0, y: 30 },
  needsWantsBreakdown: { w: 6, h: 10, x: 6, y: 20 },
  expenseBreakdown: { w: 6, h: 10, x: 6, y: 30 },
  categoryBubbleMap: { w: 6, h: 10, x: 6, y: 40 },
  householdSpendMix: { w: 6, h: 10, x: 0, y: 40 },
  financialHealthScore: { w: 6, h: 10, x: 6, y: 30 },
  spendingActivityRings: { w: 6, h: 8, x: 0, y: 50 },
  spendingStreamgraph: { w: 12, h: 9, x: 0, y: 60 },
  transactionHistory: { w: 12, h: 9, x: 0, y: 69 },
  dailyTransactionActivity: { w: 12, h: 7, x: 0, y: 78 },
  dayOfWeekSpending: { w: 6, h: 8, x: 6, y: 86 },
  allMonthsCategorySpending: { w: 6, h: 8, x: 0, y: 94 },
  singleMonthCategorySpending: { w: 6, h: 8, x: 6, y: 102 },
  dayOfWeekCategory: { w: 6, h: 8, x: 0, y: 102 },
}
