import { type ChartId } from "./chart-card-sizes.config"

export interface ChartMetadata {
  id: ChartId
  title: string
  description: string
}

export const CHART_METADATA: Record<ChartId, ChartMetadata> = {
  incomeExpensesTracking1: {
    id: "incomeExpensesTracking1",
    title: "Income & Expenses Tracking",
    description: "Your cash flow for the last 3 months",
  },
  incomeExpensesTracking2: {
    id: "incomeExpensesTracking2",
    title: "Income & Expenses Tracking",
    description: "Your cash flow for the last 3 months",
  },
  spendingCategoryRankings: {
    id: "spendingCategoryRankings",
    title: "Spending Category Rankings",
    description: "Track how your spending priorities shift over time",
  },
  netWorthAllocation: {
    id: "netWorthAllocation",
    title: "Net Worth Allocation",
    description: "Breakdown of your total assets",
  },
  needsWantsBreakdown: {
    id: "needsWantsBreakdown",
    title: "Needs vs Wants Breakdown",
    description: "Distribution of your expenses between needs and wants",
  },
  moneyFlow: {
    id: "moneyFlow",
    title: "Money Flow",
    description: "Visualize how your income flows through expenses to savings",
  },
  expenseBreakdown: {
    id: "expenseBreakdown",
    title: "Expense Breakdown",
    description: "Distribution of your monthly expenses across categories",
  },
  categoryBubbleMap: {
    id: "categoryBubbleMap",
    title: "Category Bubble Map",
    description: "Visual representation of spending by category",
  },
  householdSpendMix: {
    id: "householdSpendMix",
    title: "Household Spend Mix",
    description: "Track monthly expenses across key categories",
  },
  financialHealthScore: {
    id: "financialHealthScore",
    title: "Financial Health Score",
    description: "Overall assessment of your financial health",
  },
  spendingActivityRings: {
    id: "spendingActivityRings",
    title: "Spending Activity Rings",
    description: "Top spending categories from your Neon transactions",
  },
  spendingStreamgraph: {
    id: "spendingStreamgraph",
    title: "Spending Streamgraph",
    description: "Visualize spending patterns over time",
  },
  transactionHistory: {
    id: "transactionHistory",
    title: "Transaction History",
    description: "Detailed view of all your transactions",
  },
  dailyTransactionActivity: {
    id: "dailyTransactionActivity",
    title: "Daily Transaction Activity",
    description: "Track your daily transaction patterns",
  },
  dayOfWeekSpending: {
    id: "dayOfWeekSpending",
    title: "Day of Week Spending",
    description: "See which days of the week you spend the most",
  },
  allMonthsCategorySpending: {
    id: "allMonthsCategorySpending",
    title: "All Months Category Spending",
    description: "Category spending across all months",
  },
  singleMonthCategorySpending: {
    id: "singleMonthCategorySpending",
    title: "Single Month Category Spending",
    description: "Category spending for a specific month",
  },
  dayOfWeekCategory: {
    id: "dayOfWeekCategory",
    title: "Day of Week Category",
    description: "Category spending by day of week",
  },
  budgetDistribution: {
    id: "budgetDistribution",
    title: "Budget Distribution",
    description: "How your budget is allocated across categories",
  },
  categoryTrend: {
    id: "categoryTrend",
    title: "Category Trend",
    description: "Trend analysis for specific categories",
  },
}

export function getChartMetadata(chartId: ChartId): ChartMetadata {
  return CHART_METADATA[chartId] || {
    id: chartId,
    title: chartId,
    description: "",
  }
}
















