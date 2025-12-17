/**
 * Chart Card Size Configuration
 * 
 * This file controls the minimum and maximum sizes for all chart cards.
 * Edit the values below to customize how each chart can be resized.
 * 
 * GridStack uses a 12-column grid system:
 * - w: width in grid units (1-12)
 * - h: height in grid units (minimum 4)
 * 
 * Example:
 * - min-w: 6 means minimum 6 grid units wide (50% of container)
 * - max-w: 12 means maximum 12 grid units wide (100% of container)
 * - min-h: 4 means minimum 4 grid units tall
 * - max-h: 20 means maximum 20 grid units tall
 */

export interface ChartCardSizeConfig {
  minW: number  // Minimum width in grid units (1-12)
  maxW: number  // Maximum width in grid units (1-12)
  minH: number  // Minimum height in grid units (minimum 4)
  maxH: number  // Maximum height in grid units
}

export type ChartId =
  | "incomeExpensesTracking1"
  | "incomeExpensesTracking2"
  | "spendingCategoryRankings"
  | "netWorthAllocation"
  | "needsWantsBreakdown"
  | "moneyFlow"
  | "expenseBreakdown"
  | "categoryBubbleMap"
  | "householdSpendMix"
  | "financialHealthScore"
  | "spendingActivityRings"
  | "spendingStreamgraph"
  | "transactionHistory"
  | "dailyTransactionActivity"
  | "dayOfWeekSpending"
  | "allMonthsCategorySpending"
  | "singleMonthCategorySpending"
  | "dayOfWeekCategory"
  | "budgetDistribution"
  | "categoryTrend"
  | "cashFlowSankey"
  | "fridge:day-of-week-spending"
  | "fridge:time-of-day-spending"
  | "fridge:emptyVsNutritious"
  | "fridge:dailyActivity"
  | "fridge:dayOfWeekCategory"
  | "fridge:singleMonthCategory"
  | "fridge:allMonthsCategory"
  | "fridge:dayOfWeekSpending"
  | "fridge:categoryRankings"
  | "fridge:groceryVsRestaurant"
  | "fridge:transactionHistory"
  | "fridge:purchaseSizeComparison"
  | "fridge:shoppingHeatmapHoursDays"
  | "fridge:shoppingHeatmapDaysMonths"
  | "fridge:expenseBreakdown"
  | "fridge:macronutrientBreakdown"
  | "fridge:snackPercentage"
  | "fridge:netWorthAllocation"
  | "testCharts:weekendVsWeekday"
  | "testCharts:avgTransactionTrend"
  | "testCharts:spendingVelocity"
  | "testCharts:categoryDiversity"
  | "testCharts:momGrowth"
  | "testCharts:transactionHeatmap"
  | "testCharts:spendingDistribution"
  | "testCharts:incomeExpenseRatio"
  | "testCharts:rolling7DayAvg"
  | "testCharts:topMerchantsRace"
  | "testCharts:largestTransactions"
  | "testCharts:recurringVsOneTime"
  | "testCharts:hourlySpending"
  | "testCharts:cumulativeSpending"
  | "testCharts:categoryGrowth"
  | "testCharts:spendingStreak"
  | "testCharts:paydayImpact"
  | "testCharts:savingsRateTrend"
  | "testCharts:spendingScore"
  | "testCharts:smallVsLargePurchases"
  | "testCharts:categoryBubbles"
  | "testCharts:weeklyComparison"
  | "testCharts:monthlyBudgetPace"
  | "testCharts:transactionCountTrend"
  | "testCharts:quickStats"
  | "testCharts:topCategoriesPie"
  | "testCharts:seasonalSpending"
  | "testCharts:budgetBurndown"
  | "testCharts:cashFlowIndicator"
  | "testCharts:categoryRanking"
  | "testCharts:incomeSources"
  | "testCharts:expenseVelocityGauge"
  | "testCharts:spendingByMerchant"
  | "testCharts:dailyHighLow"
  | "testCharts:monthlyTrend"
  | "testCharts:weekdayRadar"
  | "testCharts:monthCompare"
  | "testCharts:needsVsWantsDonut"
  | "testCharts:budgetMilestone"
  | "testCharts:yearOverYear"
  | "testCharts:spendingByHourHeatmap"
  | "testCharts:categoryProgress"
  | "testCharts:netWorthTrend"
  | "testCharts:financialSummary"
  | "testCharts:dailyAverageByMonth"
  | "testCharts:paymentMethods"
  | "testCharts:biggestExpenseCategories"
  | "testCharts:spendingAlerts"
  | "testCharts:quarterlyComparison"
  | "testCharts:balanceHistory"
  | "testCharts:monthlyInsights"

/**
 * Default size configuration for all charts
 * Edit these values to customize min/max sizes for each chart
 */
export const CHART_CARD_SIZES: Record<ChartId, ChartCardSizeConfig> = {
  // Income & Expenses Tracking (1)
  incomeExpensesTracking1: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 6,
  },

  // Income & Expenses Tracking (2)
  incomeExpensesTracking2: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 6,
  },

  // Spending Category Rankings
  spendingCategoryRankings: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 12,
  },

  // Net Worth Allocation
  netWorthAllocation: {
    minW: 6,
    maxW: 12,
    minH: 4,
    maxH: 12,
  },
  // Needs vs Wants Breakdown (same sizing as Expense Breakdown)
  needsWantsBreakdown: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
  },

  // Money Flow
  moneyFlow: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 15,
  },

  // Expense Breakdown
  expenseBreakdown: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
  },

  // Category Bubble Map
  categoryBubbleMap: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
  },

  // Household Spend Mix
  householdSpendMix: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
  },

  // Financial Health Score
  financialHealthScore: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
  },

  // Spending Activity Rings
  spendingActivityRings: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
  },

  // Spending Streamgraph
  spendingStreamgraph: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 16,
  },

  // Transaction History
  transactionHistory: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
  },

  // Daily Transaction Activity
  dailyTransactionActivity: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 20,
  },

  // Day of Week Spending
  dayOfWeekSpending: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 10,
  },

  // All Months Category Spending
  allMonthsCategorySpending: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Single Month Category Spending
  singleMonthCategorySpending: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Day of Week Category
  dayOfWeekCategory: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Budget Distribution
  budgetDistribution: {
    minW: 6,
    maxW: 12,
    minH: 5,
    maxH: 16,
  },

  // Category Trend (for trends page)
  categoryTrend: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 6,
  },

  // Cash Flow Sankey
  cashFlowSankey: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 16,
  },

  // Fridge: Day of Week Spending
  "fridge:day-of-week-spending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Fridge: Time of Day Spending
  "fridge:time-of-day-spending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Fridge: Empty vs Nutritious Calories
  "fridge:emptyVsNutritious": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
  },

  // Fridge: Daily Activity Calendar
  "fridge:dailyActivity": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 20,
  },

  // Fridge: Day of Week Category Spending
  "fridge:dayOfWeekCategory": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Fridge: Single Month Category Spending
  "fridge:singleMonthCategory": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Fridge: All Months Category Spending
  "fridge:allMonthsCategory": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Fridge: Day of Week Spending by Category
  "fridge:dayOfWeekSpending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
  },

  // Fridge: Category Rankings
  "fridge:categoryRankings": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 12,
  },

  // Fridge: Grocery vs Restaurant
  "fridge:groceryVsRestaurant": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Fridge: Transaction History
  "fridge:transactionHistory": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 12,
  },

  // Fridge: Purchase Size Comparison
  "fridge:purchaseSizeComparison": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Fridge: Shopping Heatmap (Hours x Days)
  "fridge:shoppingHeatmapHoursDays": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
  },

  // Fridge: Shopping Heatmap (Days x Months)
  "fridge:shoppingHeatmapDaysMonths": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Fridge: Expense Breakdown
  "fridge:expenseBreakdown": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
  },

  // Fridge: Macronutrient Breakdown
  "fridge:macronutrientBreakdown": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
  },

  // Fridge: Snack Percentage
  "fridge:snackPercentage": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
  },

  // Fridge: Net Worth Allocation (TreeMap)
  "fridge:netWorthAllocation": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 25,
  },

  // Test Charts: Weekend vs Weekday
  "testCharts:weekendVsWeekday": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Average Transaction Trend
  "testCharts:avgTransactionTrend": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Spending Velocity
  "testCharts:spendingVelocity": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
  },

  // Test Charts: Category Diversity
  "testCharts:categoryDiversity": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
  },

  // Test Charts: Month-over-Month Growth
  "testCharts:momGrowth": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Transaction Heatmap
  "testCharts:transactionHeatmap": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Spending Distribution
  "testCharts:spendingDistribution": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Income Expense Ratio
  "testCharts:incomeExpenseRatio": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
  },

  // Test Charts: Rolling 7-Day Average
  "testCharts:rolling7DayAvg": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Top Merchants Race
  "testCharts:topMerchantsRace": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
  },

  // Test Charts: Largest Transactions
  "testCharts:largestTransactions": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 16,
  },

  // Test Charts: Recurring vs One-Time
  "testCharts:recurringVsOneTime": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
  },

  // Test Charts: Hourly Spending
  "testCharts:hourlySpending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Cumulative Spending
  "testCharts:cumulativeSpending": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Category Growth
  "testCharts:categoryGrowth": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
  },

  // Test Charts: Spending Streak
  "testCharts:spendingStreak": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Payday Impact
  "testCharts:paydayImpact": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Savings Rate Trend
  "testCharts:savingsRateTrend": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Spending Score
  "testCharts:spendingScore": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
  },

  // Test Charts: Small vs Large Purchases
  "testCharts:smallVsLargePurchases": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Category Bubbles
  "testCharts:categoryBubbles": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
  },

  // Test Charts: Weekly Comparison
  "testCharts:weeklyComparison": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Monthly Budget Pace
  "testCharts:monthlyBudgetPace": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 10,
  },

  // Test Charts: Transaction Count Trend
  "testCharts:transactionCountTrend": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Quick Stats
  "testCharts:quickStats": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Top Categories Pie
  "testCharts:topCategoriesPie": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
  },

  // Test Charts: Seasonal Spending
  "testCharts:seasonalSpending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Budget Burndown
  "testCharts:budgetBurndown": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Cash Flow Indicator
  "testCharts:cashFlowIndicator": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Category Ranking
  "testCharts:categoryRanking": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
  },

  // Test Charts: Income Sources
  "testCharts:incomeSources": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Expense Velocity Gauge
  "testCharts:expenseVelocityGauge": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Spending By Merchant
  "testCharts:spendingByMerchant": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Daily High Low
  "testCharts:dailyHighLow": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Monthly Trend
  "testCharts:monthlyTrend": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Weekday Radar
  "testCharts:weekdayRadar": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Month Compare
  "testCharts:monthCompare": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Needs Vs Wants Donut
  "testCharts:needsVsWantsDonut": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Budget Milestone
  "testCharts:budgetMilestone": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Year Over Year
  "testCharts:yearOverYear": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Spending By Hour Heatmap
  "testCharts:spendingByHourHeatmap": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Category Progress
  "testCharts:categoryProgress": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Net Worth Trend
  "testCharts:netWorthTrend": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Financial Summary
  "testCharts:financialSummary": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Daily Average By Month
  "testCharts:dailyAverageByMonth": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Payment Methods
  "testCharts:paymentMethods": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Biggest Expense Categories
  "testCharts:biggestExpenseCategories": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Spending Alerts
  "testCharts:spendingAlerts": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },

  // Test Charts: Quarterly Comparison
  "testCharts:quarterlyComparison": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Balance History
  "testCharts:balanceHistory": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
  },

  // Test Charts: Monthly Insights
  "testCharts:monthlyInsights": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
  },
}

/**
 * Get size configuration for a specific chart
 */
export function getChartCardSize(chartId: ChartId): ChartCardSizeConfig {
  return CHART_CARD_SIZES[chartId] || {
    minW: 6,
    maxW: 12,
    minH: 4,
    maxH: 20,
  }
}

