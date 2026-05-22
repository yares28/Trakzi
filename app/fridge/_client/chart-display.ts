import type { FridgeChartId } from "./types"

export type FridgeChartDisplay = {
  title: string
  description: string
}

/** Titles + info-popover copy for Fridge grid charts (keyed by FridgeChartId). */
export const FRIDGE_CHART_DISPLAY: Record<FridgeChartId, FridgeChartDisplay> = {
  grocerySpendTrend: {
    title: "Grocery trend",
    description:
      "Daily grocery spend from receipt line items. Area shows how your food purchases add up over the selected period.",
  },
  groceryCategoryRankings: {
    title: "Category ranks",
    description:
      "Bump chart: how grocery category rankings move month to month. Rising lines mean that category is taking a larger share of spend.",
  },
  groceryNetWorthAllocation: {
    title: "Category map",
    description:
      "Treemap of grocery spend by category. Larger blocks are higher totals for the filter you have selected.",
  },
  groceryExpenseBreakdown: {
    title: "Food breakdown",
    description:
      "A switchable breakdown card for grocery categories, macronutrient types, and spending mix. The spending view keeps its store filter and score for the selected stores.",
  },
  groceryDailyActivity: {
    title: "Daily activity",
    description:
      "Calendar-style view of how often or how much you shop on each day. Darker cells mean more grocery activity that day.",
  },
  groceryMacronutrientBreakdown: {
    title: "Macros",
    description:
      "Estimated protein, carbs, and fats from receipt items that include nutrition data. Useful for seeing the mix of what you buy.",
  },
  grocerySnackPercentage: {
    title: "Snack share",
    description:
      "What fraction of grocery spend is tagged as snacks versus other types (e.g. nutritious or general). Based on your receipt categories.",
  },
  groceryDayOfWeekCategory: {
    title: "Weekday categories",
    description:
      "Pick a weekday; bars show which grocery categories you spent the most in on that day across the selected range.",
  },
  grocerySingleMonthCategory: {
    title: "One month",
    description:
      "Category totals for a single calendar month you select. Compare bar lengths to see where that month’s grocery money went.",
  },
  groceryAllMonthsCategory: {
    title: "Months × categories",
    description:
      "Stacked bars across months: each segment is a category. See seasonal shifts and whether a category is growing over time.",
  },
  groceryDayOfWeekSpending: {
    title: "Week × category",
    description:
      "Grouped bars by day of week, split by category. Shows both which days you shop and what you buy on those days.",
  },
  groceryTimeOfDay: {
    title: "Shopping hours",
    description:
      "When during the day your grocery trips (receipt timestamps) happen. Helps spot habits like morning runs vs late-night shops.",
  },
  groceryVsRestaurant: {
    title: "Grocery vs dining",
    description:
      "Compare spend on groceries (receipts) to eating out, using the same date filter. See the balance between home food and restaurants.",
  },
  groceryTransactionHistory: {
    title: "Receipt lines",
    description:
      "Each point is a receipt line item: amount, time, and food category. Filter categories from the top-right control.",
  },
  groceryPurchaseSizeComparison: {
    title: "Basket sizes",
    description:
      "Small vs large purchase patterns on receipts (e.g. quick trips vs stock-up trips) so you can see how trip size behaves over time.",
  },
  groceryShoppingHeatmapHoursDays: {
    title: "Hour × weekday",
    description:
      "Heatmap of grocery activity by hour of day and day of week. Find your typical shopping windows.",
  },
  groceryShoppingHeatmapDaysMonths: {
    title: "Day × month",
    description:
      "Heatmap of grocery activity by calendar day and month. Highlights busy days of the month or seasonal clusters.",
  },
}

export function getFridgeChartDisplay(id: FridgeChartId): FridgeChartDisplay {
  return FRIDGE_CHART_DISPLAY[id]
}
