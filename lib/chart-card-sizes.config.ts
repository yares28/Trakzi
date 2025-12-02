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

