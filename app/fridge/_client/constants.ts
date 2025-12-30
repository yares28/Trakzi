import type { ChartId } from "@/lib/chart-card-sizes.config"

import type { FridgeChartId } from "./types"

export const FRIDGE_CHART_TO_ANALYTICS_CHART: Record<FridgeChartId, ChartId> = {
  grocerySpendTrend: "incomeExpensesTracking1",
  groceryCategoryRankings: "fridge:categoryRankings",
  groceryExpenseBreakdown: "expenseBreakdown",
  groceryMacronutrientBreakdown: "expenseBreakdown",
  grocerySnackPercentage: "expenseBreakdown",
  groceryEmptyVsNutritious: "fridge:emptyVsNutritious",
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
  "groceryExpenseBreakdown",
  "groceryMacronutrientBreakdown",
  "grocerySnackPercentage",
  "groceryEmptyVsNutritious",
  "groceryDailyActivity",
  "groceryDayOfWeekCategory",
  "grocerySingleMonthCategory",
  "groceryAllMonthsCategory",
  "groceryDayOfWeekSpending",
  "groceryTimeOfDay",
  "groceryVsRestaurant",
  "groceryTransactionHistory",
  "groceryPurchaseSizeComparison",
  "groceryShoppingHeatmapHoursDays",
  "groceryShoppingHeatmapDaysMonths",
  "groceryNetWorthAllocation",
]

export const DEFAULT_CHART_ORDER = FRIDGE_CHART_ORDER

export const DEFAULT_CHART_SIZES: Record<
  FridgeChartId,
  { w: number; h: number; x?: number; y?: number }
> = {
  grocerySpendTrend: { w: 12, h: 6, x: 0, y: 0 },
  groceryCategoryRankings: { w: 12, h: 8, x: 0, y: 6 },
  groceryExpenseBreakdown: { w: 6, h: 10, x: 0, y: 14 },
  groceryMacronutrientBreakdown: { w: 6, h: 10, x: 6, y: 14 },
  grocerySnackPercentage: { w: 6, h: 10, x: 0, y: 24 },
  groceryEmptyVsNutritious: { w: 6, h: 10, x: 6, y: 24 },
  groceryDailyActivity: { w: 12, h: 6, x: 0, y: 34 },
  groceryDayOfWeekCategory: { w: 6, h: 8, x: 0, y: 40 },
  grocerySingleMonthCategory: { w: 6, h: 8, x: 6, y: 40 },
  groceryAllMonthsCategory: { w: 12, h: 8, x: 0, y: 48 },
  groceryDayOfWeekSpending: { w: 12, h: 8, x: 0, y: 56 },
  groceryTimeOfDay: { w: 12, h: 8, x: 0, y: 64 },
  groceryVsRestaurant: { w: 6, h: 8, x: 0, y: 72 },
  groceryTransactionHistory: { w: 12, h: 9, x: 0, y: 80 },
  groceryPurchaseSizeComparison: { w: 6, h: 8, x: 6, y: 72 },
  groceryShoppingHeatmapHoursDays: { w: 6, h: 10, x: 0, y: 89 },
  groceryShoppingHeatmapDaysMonths: { w: 6, h: 8, x: 6, y: 89 },
  groceryNetWorthAllocation: { w: 12, h: 10, x: 0, y: 99 },
}

export const CHART_ORDER_STORAGE_KEY = "fridge-chart-order"
export const CHART_SIZES_STORAGE_KEY = "fridge-chart-sizes"
export const CHART_SIZES_VERSION_KEY = "fridge-chart-sizes-version"
export const DEFAULT_SIZES_VERSION = "1"
