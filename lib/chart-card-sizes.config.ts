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
  mobileH?: number  // Height in grid units for mobile (optional, defaults to minH)
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
  | "savingsAccumulation"
  | "fridge:day-of-week-spending"
  | "fridge:time-of-day-spending"
  | "fridge:grocerySpendTrend"
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
  // Income & Expenses Tracking (1) - Area chart, compact on mobile
  incomeExpensesTracking1: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 6,
    mobileH: 5,
  },

  // Income & Expenses Tracking (2) - Area chart, compact on mobile
  incomeExpensesTracking2: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 6,
    mobileH: 5,
  },

  // Spending Category Rankings - Bar chart with multiple bars
  spendingCategoryRankings: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 12,
    mobileH: 7,
  },

  // Net Worth Allocation - TreeMap, can be compact
  netWorthAllocation: {
    minW: 6,
    maxW: 12,
    minH: 4,
    maxH: 12,
    mobileH: 5,
  },

  // Needs vs Wants Breakdown - Pie with legend
  needsWantsBreakdown: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
    mobileH: 6,
  },

  // Money Flow - Funnel chart, needs vertical space
  moneyFlow: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 15,
    mobileH: 7,
  },

  // Expense Breakdown - Pie with legend
  expenseBreakdown: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
    mobileH: 6,
  },

  // Category Bubble Map - Circle packing, needs height
  categoryBubbleMap: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
    mobileH: 6,
  },

  // Household Spend Mix - Polar bar, needs height
  householdSpendMix: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
    mobileH: 6,
  },

  // Financial Health Score - Radar chart
  financialHealthScore: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
    mobileH: 6,
  },

  // Spending Activity Rings - Multiple rings + legend
  spendingActivityRings: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
    mobileH: 8,
  },

  // Spending Streamgraph - Wide chart, compresses well
  spendingStreamgraph: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 16,
    mobileH: 5,
  },

  // Transaction History - Swarm plot (taller on mobile for better visibility)
  transactionHistory: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
    mobileH: 7,
  },

  // Daily Transaction Activity - Dual calendar heatmap (6 months YTD, two 3-month periods)
  dailyTransactionActivity: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 20,
    mobileH: 6,
  },

  // Day of Week Spending - Bar chart
  dayOfWeekSpending: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 10,
    mobileH: 6,
  },

  // All Months Category Spending - Stacked bar
  allMonthsCategorySpending: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 6,
  },

  // Single Month Category Spending - Bar chart
  singleMonthCategorySpending: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 6,
  },

  // Day of Week Category - Heatmap
  dayOfWeekCategory: {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 6,
  },

  // Budget Distribution - Simple bars
  budgetDistribution: {
    minW: 6,
    maxW: 12,
    minH: 5,
    maxH: 16,
    mobileH: 5,
  },

  // Category Trend (for trends page) - Line chart
  categoryTrend: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 6,
    mobileH: 5,
  },

  // Cash Flow Sankey - Flow diagram, needs vertical space
  cashFlowSankey: {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 16,
    mobileH: 7,
  },

  // Savings Accumulation - Line chart
  savingsAccumulation: {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Fridge: Day of Week Spending - Bar chart
  "fridge:day-of-week-spending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 5,
  },

  // Fridge: Time of Day Spending - Bar chart
  "fridge:time-of-day-spending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 5,
  },

  // Fridge: Grocery Spend Trend - Area chart
  "fridge:grocerySpendTrend": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 6,
    mobileH: 5,
  },

  // Fridge: Empty vs Nutritious Calories - Pie chart
  "fridge:emptyVsNutritious": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
    mobileH: 6,
  },

  // Fridge: Daily Activity Calendar - Calendar heatmap
  "fridge:dailyActivity": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 20,
    mobileH: 5,
  },

  // Fridge: Day of Week Category Spending - Heatmap
  "fridge:dayOfWeekCategory": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 5,
  },

  // Fridge: Single Month Category Spending - Bar chart
  "fridge:singleMonthCategory": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 6,
  },

  // Fridge: All Months Category Spending - Stacked bar
  "fridge:allMonthsCategory": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 6,
  },

  // Fridge: Day of Week Spending by Category - Bar chart
  "fridge:dayOfWeekSpending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 16,
    mobileH: 5,
  },

  // Fridge: Category Rankings - Horizontal bar chart
  "fridge:categoryRankings": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 12,
    mobileH: 6,
  },

  // Fridge: Grocery vs Restaurant - Comparison bar
  "fridge:groceryVsRestaurant": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Fridge: Transaction History - Swarm plot
  "fridge:transactionHistory": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 12,
    mobileH: 5,
  },

  // Fridge: Purchase Size Comparison - Grouped bars
  "fridge:purchaseSizeComparison": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Fridge: Shopping Heatmap (Hours x Days) - Tall heatmap
  "fridge:shoppingHeatmapHoursDays": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
    mobileH: 6,
  },

  // Fridge: Shopping Heatmap (Days x Months) - Wide heatmap
  "fridge:shoppingHeatmapDaysMonths": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Fridge: Expense Breakdown - Pie with legend
  "fridge:expenseBreakdown": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
    mobileH: 6,
  },

  // Fridge: Macronutrient Breakdown - Pie chart
  "fridge:macronutrientBreakdown": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
    mobileH: 6,
  },

  // Fridge: Snack Percentage - Radial/arc chart
  "fridge:snackPercentage": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 20,
    mobileH: 6,
  },

  // Fridge: Net Worth Allocation (TreeMap) - TreeMap
  "fridge:netWorthAllocation": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 25,
    mobileH: 5,
  },

  // Test Charts: Weekend vs Weekday
  "testCharts:weekendVsWeekday": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Average Transaction Trend
  "testCharts:avgTransactionTrend": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Category Diversity
  "testCharts:categoryDiversity": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
    mobileH: 6,
  },

  // Test Charts: Month-over-Month Growth
  "testCharts:momGrowth": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Transaction Heatmap
  "testCharts:transactionHeatmap": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Spending Distribution
  "testCharts:spendingDistribution": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Income Expense Ratio
  "testCharts:incomeExpenseRatio": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Rolling 7-Day Average
  "testCharts:rolling7DayAvg": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Top Merchants Race
  "testCharts:topMerchantsRace": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
    mobileH: 6,
  },

  // Test Charts: Largest Transactions
  "testCharts:largestTransactions": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 16,
    mobileH: 6,
  },

  // Test Charts: Recurring vs One-Time
  "testCharts:recurringVsOneTime": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Hourly Spending
  "testCharts:hourlySpending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Cumulative Spending
  "testCharts:cumulativeSpending": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Category Growth
  "testCharts:categoryGrowth": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
    mobileH: 6,
  },

  // Test Charts: Spending Streak
  "testCharts:spendingStreak": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Payday Impact
  "testCharts:paydayImpact": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Savings Rate Trend
  "testCharts:savingsRateTrend": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Spending Score
  "testCharts:spendingScore": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Small vs Large Purchases
  "testCharts:smallVsLargePurchases": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Category Bubbles
  "testCharts:categoryBubbles": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
    mobileH: 6,
  },

  // Test Charts: Weekly Comparison
  "testCharts:weeklyComparison": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Monthly Budget Pace
  "testCharts:monthlyBudgetPace": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Transaction Count Trend
  "testCharts:transactionCountTrend": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Quick Stats
  "testCharts:quickStats": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 4,
  },

  // Test Charts: Top Categories Pie
  "testCharts:topCategoriesPie": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 12,
    mobileH: 6,
  },

  // Test Charts: Seasonal Spending
  "testCharts:seasonalSpending": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Budget Burndown
  "testCharts:budgetBurndown": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Cash Flow Indicator
  "testCharts:cashFlowIndicator": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Category Ranking
  "testCharts:categoryRanking": {
    minW: 6,
    maxW: 12,
    minH: 8,
    maxH: 14,
    mobileH: 6,
  },

  // Test Charts: Income Sources
  "testCharts:incomeSources": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Expense Velocity Gauge
  "testCharts:expenseVelocityGauge": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Spending By Merchant
  "testCharts:spendingByMerchant": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Daily High Low
  "testCharts:dailyHighLow": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Monthly Trend
  "testCharts:monthlyTrend": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Weekday Radar
  "testCharts:weekdayRadar": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 6,
  },

  // Test Charts: Month Compare
  "testCharts:monthCompare": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 5,
  },

  // Test Charts: Needs Vs Wants Donut
  "testCharts:needsVsWantsDonut": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 6,
  },

  // Test Charts: Budget Milestone
  "testCharts:budgetMilestone": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 4,
  },

  // Test Charts: Year Over Year
  "testCharts:yearOverYear": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Spending By Hour Heatmap
  "testCharts:spendingByHourHeatmap": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Category Progress
  "testCharts:categoryProgress": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Net Worth Trend
  "testCharts:netWorthTrend": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Financial Summary
  "testCharts:financialSummary": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 4,
  },

  // Test Charts: Daily Average By Month
  "testCharts:dailyAverageByMonth": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Payment Methods
  "testCharts:paymentMethods": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Biggest Expense Categories
  "testCharts:biggestExpenseCategories": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 6,
  },

  // Test Charts: Spending Alerts
  "testCharts:spendingAlerts": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 4,
  },

  // Test Charts: Quarterly Comparison
  "testCharts:quarterlyComparison": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Balance History
  "testCharts:balanceHistory": {
    minW: 6,
    maxW: 12,
    minH: 7,
    maxH: 12,
    mobileH: 5,
  },

  // Test Charts: Monthly Insights
  "testCharts:monthlyInsights": {
    minW: 6,
    maxW: 12,
    minH: 6,
    maxH: 10,
    mobileH: 4,
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
    mobileH: 5,
  }
}

