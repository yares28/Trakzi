import type { ChartId } from "@/lib/chart-card-sizes.config"

import type { FridgeChartId } from "./types"

export const FRIDGE_CHART_TO_ANALYTICS_CHART: Record<FridgeChartId, ChartId> = {
  grocerySpendTrend: "incomeExpensesTracking1",
  groceryCategoryRankings: "fridge:categoryRankings",
  groceryExpenseBreakdown: "expenseBreakdown",
  groceryMacronutrientBreakdown: "expenseBreakdown",
  grocerySnackPercentage: "expenseBreakdown",
  groceryDailyActivity: "fridge:dailyActivity",
  groceryDayOfWeekCategory: "fridge:dayOfWeekCategory",
  grocerySingleMonthCategory: "fridge:singleMonthCategory",
  groceryAllMonthsCategory: "fridge:allMonthsCategory",
  groceryDayOfWeekSpending: "fridge:dayOfWeekSpending",
  groceryTimeOfDay: "fridge:time-of-day-spending",
  groceryVsRestaurant: "fridge:groceryVsRestaurant",
  groceryTransactionHistory: "fridge:transactionHistory",
  groceryPurchaseSizeComparison: "fridge:purchaseSizeComparison",
  groceryShoppingHeatmapHoursDays: "fridge:shoppingHeatmapHoursDays",
  groceryShoppingHeatmapDaysMonths: "fridge:shoppingHeatmapDaysMonths",
  groceryNetWorthAllocation: "netWorthAllocation",
}

export const FRIDGE_CHART_ORDER: FridgeChartId[] = [
  "grocerySpendTrend",
  "groceryCategoryRankings",
  "groceryNetWorthAllocation",
  "groceryExpenseBreakdown",
  "groceryDailyActivity",
  "groceryMacronutrientBreakdown",
  "grocerySnackPercentage",
  "groceryDayOfWeekCategory",
  "grocerySingleMonthCategory",
  "groceryTimeOfDay",
  "groceryAllMonthsCategory",
  "groceryDayOfWeekSpending",
  "groceryVsRestaurant",
  "groceryTransactionHistory",
  "groceryPurchaseSizeComparison",
  "groceryShoppingHeatmapHoursDays",
  "groceryShoppingHeatmapDaysMonths",
]

export const DEFAULT_CHART_ORDER = FRIDGE_CHART_ORDER

export const DEFAULT_CHART_SIZES: Record<
  FridgeChartId,
  { w: number; h: number; x?: number; y?: number }
> = {
  grocerySpendTrend: { w: 6, h: 6, x: 0, y: 0 },
  groceryCategoryRankings: { w: 6, h: 6, x: 6, y: 0 },
  groceryNetWorthAllocation: { w: 12, h: 10, x: 0, y: 6 },
  groceryExpenseBreakdown: { w: 6, h: 11, x: 0, y: 16 },
  groceryDailyActivity: { w: 12, h: 7, x: 0, y: 27 },
  groceryMacronutrientBreakdown: { w: 6, h: 11, x: 6, y: 16 },
  grocerySnackPercentage: { w: 6, h: 10, x: 0, y: 34 },
  groceryDayOfWeekCategory: { w: 6, h: 10, x: 0, y: 44 },
  grocerySingleMonthCategory: { w: 6, h: 9, x: 6, y: 44 },
  groceryTimeOfDay: { w: 6, h: 9, x: 0, y: 54 },
  groceryAllMonthsCategory: { w: 6, h: 9, x: 6, y: 54 },
  groceryDayOfWeekSpending: { w: 6, h: 9, x: 0, y: 63 },
  groceryVsRestaurant: { w: 6, h: 9, x: 0, y: 72 },
  groceryTransactionHistory: { w: 12, h: 9, x: 0, y: 81 },
  groceryPurchaseSizeComparison: { w: 6, h: 9, x: 6, y: 72 },
  groceryShoppingHeatmapHoursDays: { w: 6, h: 10, x: 0, y: 90 },
  groceryShoppingHeatmapDaysMonths: { w: 6, h: 10, x: 6, y: 90 },
}

export const CHART_ORDER_STORAGE_KEY = "fridge-chart-order"
export const CHART_SIZES_STORAGE_KEY = "fridge-chart-sizes"
export const CHART_SIZES_VERSION_KEY = "fridge-chart-sizes-version"
export const DEFAULT_SIZES_VERSION = "2"
