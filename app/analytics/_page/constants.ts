export const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000

// The 9 charts below were duplicated between this main grid and the Advanced tab.
// They now live exclusively in the Advanced tab (AdvancedChartsGrid.tsx):
//   dailyAverageByMonth, momGrowth, paydayImpact, recurringVsOneTime,
//   dayOfWeekCategory, dailyTransactionActivity, seasonalSpending,
//   weekendVsWeekday, hourlySpending.
export const DEFAULT_CHART_ORDER = [
  "incomeExpensesTracking2",
  "incomeExpenseRatio",
  "expenseBreakdown",
  "monthlyBudgetPace",
  "spendingActivityRings",
  "needsWantsBreakdown",
  "yearOverYear",
  "spendingCategoryRankings",
  "netWorthAllocation",
  "financialHealthScore",
  "budgetBurndown",
  "purchaseSizeBreakdown",
  "categoryBubbleMap",
  "moneyFlow",
  "householdSpendMix",
  "transactionHistory",
  "categorySpendingByPeriod",
  "cashFlowSankey",
  "singleMonthCategorySpending",
  "spendingStreamgraph",
  "transactionCountTrend",
  "topMerchantsRace",
  "incomeSources",
  "dailySpendAllowance",
]

export const CHART_ORDER_STORAGE_KEY = "analytics-chart-order"
export const CHART_SIZES_STORAGE_KEY = "analytics-chart-sizes"
export const CHART_SIZES_VERSION_KEY = "analytics-chart-sizes-version"
// Bumped from 17 to 18: removed 9 duplicated charts from DEFAULT_CHART_ORDER (now
// Advanced-tab-only). Bumping the version invalidates any saved layouts that still
// reference those IDs so users see the clean default instead of an inconsistent grid.
export const DEFAULT_SIZES_VERSION = "18"

export const DEFAULT_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
  // Kept for compatibility — not in default order; size used only if surfaced elsewhere.
  "incomeExpensesTracking1": { w: 6, h: 6, x: 0, y: 0 },

  // Row 1: full-width
  "incomeExpensesTracking2": { w: 12, h: 6, x: 0, y: 0 },
  // Row 2 (tall right): Income to Expense Ratio | Expense Breakdown
  "incomeExpenseRatio": { w: 6, h: 7, x: 0, y: 6 },
  "expenseBreakdown": { w: 6, h: 14, x: 6, y: 6 },
  // Row 3: Monthly Budget Pace | Spending Activity Rings (h bumped 7→8, minH=8)
  "monthlyBudgetPace": { w: 6, h: 7, x: 0, y: 20 },
  "spendingActivityRings": { w: 6, h: 8, x: 6, y: 20 },
  // Row 4: Needs vs Wants (h bumped 7→8 to match Spending Activity Rings row above) | Spending comparison (yearOverYear)
  "needsWantsBreakdown": { w: 6, h: 8, x: 0, y: 28 },
  "yearOverYear": { w: 6, h: 8, x: 6, y: 28 },
  // Row 5: Daily Average by Month (left only; next full-width starts new row)
  "dailyAverageByMonth": { w: 6, h: 8, x: 0, y: 36 },
  // Full-width band
  "spendingCategoryRankings": { w: 12, h: 7, x: 0, y: 44 },
  "netWorthAllocation": { w: 12, h: 8, x: 0, y: 51 },
  // Row: Month-over-Month Growth | Payday Impact
  "momGrowth": { w: 6, h: 8, x: 0, y: 59 },
  "paydayImpact": { w: 6, h: 8, x: 6, y: 59 },
  // Row: Financial Health Score | Budget Burndown
  "financialHealthScore": { w: 6, h: 8, x: 0, y: 67 },
  "budgetBurndown": { w: 6, h: 8, x: 6, y: 67 },
  // Row: Purchase Size Breakdown | Recurring vs One-Time
  "purchaseSizeBreakdown": { w: 6, h: 7, x: 0, y: 75 },
  "recurringVsOneTime": { w: 6, h: 7, x: 6, y: 75 },
  // Row: Category Bubble Map | Money Flow
  "categoryBubbleMap": { w: 6, h: 8, x: 0, y: 82 },
  "moneyFlow": { w: 6, h: 8, x: 6, y: 82 },
  // Row: Household Spend Mix | Day of Week Category
  "householdSpendMix": { w: 6, h: 8, x: 0, y: 90 },
  "dayOfWeekCategory": { w: 6, h: 8, x: 6, y: 90 },
  // Full-width band
  "transactionHistory": { w: 12, h: 8, x: 0, y: 98 },
  "categorySpendingByPeriod": { w: 12, h: 7, x: 0, y: 106 },
  "cashFlowSankey": { w: 12, h: 8, x: 0, y: 113 },
  "dailyTransactionActivity": { w: 12, h: 7, x: 0, y: 121 },
  // Row: Single Month Category | Seasonal Spending
  "singleMonthCategorySpending": { w: 6, h: 8, x: 0, y: 128 },
  "seasonalSpending": { w: 6, h: 8, x: 6, y: 128 },
  // Full-width
  "spendingStreamgraph": { w: 12, h: 8, x: 0, y: 136 },
  // Row: Transaction Count Trend | Top 5 Merchants
  "transactionCountTrend": { w: 6, h: 8, x: 0, y: 144 },
  "topMerchantsRace": { w: 6, h: 8, x: 6, y: 144 },
  // Row: Income Sources | Weekend vs Weekday
  "incomeSources": { w: 6, h: 8, x: 0, y: 152 },
  "weekendVsWeekday": { w: 6, h: 8, x: 6, y: 152 },
  // Row: Daily Spend Allowance | Hourly Spending Pattern
  "dailySpendAllowance": { w: 6, h: 8, x: 0, y: 160 },
  "hourlySpending": { w: 6, h: 8, x: 6, y: 160 },
}

// Advanced tab chart order and default sizes
export const DEFAULT_ADVANCED_CHART_ORDER = [
  "spendingPyramid",
  "dailyAverageByMonth",
  "momGrowth",
  "paydayImpact",
  "recurringVsOneTime",
  "dayOfWeekCategory",
  "dailyTransactionActivity",
  "seasonalSpending",
  "weekendVsWeekday",
  "dailySpendAllowance",
  "hourlySpending",
]

export const DEFAULT_ADVANCED_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
  // Row 0: full-width
  "spendingPyramid": { w: 12, h: 8, x: 0, y: 0 },
  // Row 1: Daily Average by Month | Month-over-Month Growth
  "dailyAverageByMonth": { w: 6, h: 8, x: 0, y: 8 },
  "momGrowth": { w: 6, h: 8, x: 6, y: 8 },
  // Row 2: Payday Impact | Recurring vs One-Time (h=7 stays in 8-tall row)
  "paydayImpact": { w: 6, h: 8, x: 0, y: 16 },
  "recurringVsOneTime": { w: 6, h: 7, x: 6, y: 16 },
  // Row 3: Day of Week Category (left only — next chart is full-width)
  "dayOfWeekCategory": { w: 6, h: 8, x: 0, y: 24 },
  // Row 4: full-width
  "dailyTransactionActivity": { w: 12, h: 7, x: 0, y: 32 },
  // Row 5: Seasonal Spending | Weekend vs Weekday
  "seasonalSpending": { w: 6, h: 8, x: 0, y: 39 },
  "weekendVsWeekday": { w: 6, h: 8, x: 6, y: 39 },
  // Row 6: Daily Spend Allowance | Hourly Spending Pattern
  "dailySpendAllowance": { w: 6, h: 8, x: 0, y: 47 },
  "hourlySpending": { w: 6, h: 8, x: 6, y: 47 },
}

// Demo mode should always start from a fixed chart snapshot instead of inheriting
// whatever a signed-in user last saved in preferences.
export const DEMO_DEFAULT_CHART_ORDER = [
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
  "cashFlowSankey",
  "dailyTransactionActivity",
  "dayOfWeekCategory",
  "singleMonthCategorySpending",
  "spendingStreamgraph",
  "financialHealthScore",
  "incomeExpenseRatio",
  "weekendVsWeekday",
  "monthlyBudgetPace",
  "categorySpendingByPeriod",
  "budgetBurndown",
  "purchaseSizeBreakdown",
  "recurringVsOneTime",
  "seasonalSpending",
  "hourlySpending",
  "transactionCountTrend",
  "momGrowth",
  "topMerchantsRace",
  "paydayImpact",
  "incomeSources",
  "yearOverYear",
  "dailyAverageByMonth",
]

export const DEMO_DEFAULT_USER_SIZES: Record<string, { w: number; h: number }> = {
  momGrowth: { h: 8, w: 6 },
  moneyFlow: { h: 8, w: 6 },
  paydayImpact: { h: 8, w: 6 },
  yearOverYear: { h: 8, w: 6 },
  incomeSources: { h: 8, w: 6 },
  budgetBurndown: { h: 7, w: 6 },
  cashFlowSankey: { h: 8, w: 12 },
  hourlySpending: { h: 8, w: 6 },
  spendingPyramid: { h: 8, w: 6 },
  expenseBreakdown: { h: 6, w: 6 },
  seasonalSpending: { h: 8, w: 6 },
  spendingVelocity: { h: 8, w: 6 },
  topMerchantsRace: { h: 8, w: 6 },
  weekendVsWeekday: { h: 7, w: 6 },
  categoryBubbleMap: { h: 6, w: 6 },
  dayOfWeekCategory: { h: 5, w: 6 },
  dayOfWeekSpending: { h: 7, w: 6 },
  householdSpendMix: { h: 5, w: 6 },
  monthlyBudgetPace: { h: 7, w: 6 },
  incomeExpenseRatio: { h: 8, w: 6 },
  netWorthAllocation: { h: 5, w: 12 },
  recurringVsOneTime: { h: 8, w: 6 },
  transactionHistory: { h: 5, w: 12 },
  dailyAverageByMonth: { h: 8, w: 6 },
  needsWantsBreakdown: { h: 6, w: 6 },
  quarterlyComparison: { h: 8, w: 6 },
  spendingStreamgraph: { h: 5, w: 12 },
  financialHealthScore: { h: 8, w: 6 },
  spendingDistribution: { h: 8, w: 6 },
  purchaseSizeBreakdown: { h: 7, w: 6 },
  spendingActivityRings: { h: 6, w: 6 },
  transactionCountTrend: { h: 8, w: 6 },
  incomeExpensesTracking1: { h: 6, w: 12 },
  incomeExpensesTracking2: { h: 6, w: 12 },
  categorySpendingByPeriod: { h: 7, w: 12 },
  dailyTransactionActivity: { h: 5, w: 12 },
  spendingCategoryRankings: { h: 6, w: 12 },
  allMonthsCategorySpending: { h: 7, w: 6 },
  singleMonthCategorySpending: { h: 5, w: 6 },
}

export const DEMO_DEFAULT_CHART_SIZES: Record<string, { w: number; h: number; x?: number; y?: number }> = {
  moneyFlow: { h: 10, w: 6, x: 0, y: 30 },
  budgetBurndown: { h: 6, w: 6, x: 6, y: 18 },
  cashFlowSankey: { h: 10, w: 12, x: 0, y: 110 },
  expenseBreakdown: { h: 10, w: 6, x: 6, y: 30 },
  weekendVsWeekday: { h: 6, w: 6, x: 6, y: 12 },
  categoryBubbleMap: { h: 10, w: 6, x: 6, y: 40 },
  dayOfWeekCategory: { h: 9, w: 6, x: 0, y: 102 },
  dayOfWeekSpending: { h: 10, w: 6, x: 0, y: 86 },
  householdSpendMix: { h: 10, w: 6, x: 0, y: 40 },
  monthlyBudgetPace: { h: 6, w: 6, x: 0, y: 18 },
  incomeExpenseRatio: { h: 13, w: 6, x: 0, y: 12 },
  netWorthAllocation: { h: 10, w: 12, x: 0, y: 20 },
  recurringVsOneTime: { h: 6, w: 6, x: 6, y: 24 },
  transactionHistory: { h: 8, w: 12, x: 0, y: 69 },
  needsWantsBreakdown: { h: 10, w: 6, x: 6, y: 20 },
  spendingStreamgraph: { h: 9, w: 12, x: 0, y: 60 },
  financialHealthScore: { h: 10, w: 6, x: 6, y: 30 },
  purchaseSizeBreakdown: { h: 6, w: 6, x: 0, y: 24 },
  spendingActivityRings: { h: 10, w: 6, x: 0, y: 50 },
  incomeExpensesTracking1: { h: 6, w: 6, x: 0, y: 0 },
  incomeExpensesTracking2: { h: 6, w: 6, x: 0, y: 6 },
  dailyTransactionActivity: { h: 6, w: 12, x: 0, y: 78 },
  spendingCategoryRankings: { h: 8, w: 12, x: 0, y: 12 },
  allMonthsCategorySpending: { h: 10, w: 6, x: 6, y: 86 },
  singleMonthCategorySpending: { h: 9, w: 6, x: 6, y: 102 },
}
