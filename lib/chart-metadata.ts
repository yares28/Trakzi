import { type ChartId } from "./chart-card-sizes.config"

export interface ChartMetadata {
  id: ChartId
  title: string
  description: string
}

export const CHART_METADATA: Record<ChartId, ChartMetadata> = {
  incomeExpensesTracking1: {
    id: "incomeExpensesTracking1",
    title: "Income & Expenses Cumulative Tracking",
    description: "Your cumulative cash flow for the last 3 months",
  },
  incomeExpensesTracking2: {
    id: "incomeExpensesTracking2",
    title: "Income & Expenses Cumulative Tracking",
    description: "Your cumulative cash flow for the last 3 months",
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
  cashFlowSankey: {
    id: "cashFlowSankey",
    title: "Cash Flow Sankey",
    description: "Follow how revenue moves from income through expenses to savings",
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
  savingsAccumulation: {
    id: "savingsAccumulation",
    title: "Savings Accumulation",
    description: "Track your cumulative savings over time",
  },
  "fridge:day-of-week-spending": {
    id: "fridge:day-of-week-spending",
    title: "Fridge: Day of Week Spending",
    description: "Grocery spending by day of week",
  },
  "fridge:time-of-day-spending": {
    id: "fridge:time-of-day-spending",
    title: "Fridge: Time of Day Spending",
    description: "Grocery spending by time of day",
  },
  "fridge:emptyVsNutritious": {
    id: "fridge:emptyVsNutritious",
    title: "Empty vs Nutritious Calories",
    description: "Breakdown of spending on nutritious vs empty calorie foods",
  },
  "fridge:dailyActivity": {
    id: "fridge:dailyActivity",
    title: "Daily Grocery Activity",
    description: "Grocery spending patterns throughout the year",
  },
  "fridge:dayOfWeekCategory": {
    id: "fridge:dayOfWeekCategory",
    title: "Day of Week Category Spending",
    description: "Compare grocery spending across categories by day of week",
  },
  "fridge:singleMonthCategory": {
    id: "fridge:singleMonthCategory",
    title: "Single Month Category Spending",
    description: "Compare grocery spending across categories for a selected month",
  },
  "fridge:allMonthsCategory": {
    id: "fridge:allMonthsCategory",
    title: "All Months Category Spending",
    description: "Grocery spending by category across all months of the year",
  },
  "fridge:dayOfWeekSpending": {
    id: "fridge:dayOfWeekSpending",
    title: "Day of Week Spending by Category",
    description: "See which categories you spend the most on each day of the week",
  },
  "fridge:categoryRankings": {
    id: "fridge:categoryRankings",
    title: "Grocery Category Rankings",
    description: "Ranks your grocery categories by spend over time",
  },
  "fridge:groceryVsRestaurant": {
    id: "fridge:groceryVsRestaurant",
    title: "Grocery vs Restaurant",
    description: "Compare spending on groceries vs eating out from transaction categories",
  },
  "fridge:transactionHistory": {
    id: "fridge:transactionHistory",
    title: "Grocery Transaction History",
    description: "Recent grocery purchases by food category as a swarm plot",
  },
  "fridge:purchaseSizeComparison": {
    id: "fridge:purchaseSizeComparison",
    title: "Purchase Size Comparison",
    description: "Distribution of grocery trips by receipt total ranges",
  },
  "fridge:shoppingHeatmapHoursDays": {
    id: "fridge:shoppingHeatmapHoursDays",
    title: "Shopping Hours Heatmap",
    description: "When you typically go shopping by hour and day of week",
  },
  "fridge:shoppingHeatmapDaysMonths": {
    id: "fridge:shoppingHeatmapDaysMonths",
    title: "Monthly Shopping Patterns",
    description: "Shopping frequency by day of week across months",
  },
  "fridge:expenseBreakdown": {
    id: "fridge:expenseBreakdown",
    title: "Expense Breakdown",
    description: "Distribution of grocery expenses across receipt categories",
  },
  "fridge:macronutrientBreakdown": {
    id: "fridge:macronutrientBreakdown",
    title: "Macronutrient Breakdown",
    description: "Grocery expenses distributed across macronutrient types",
  },
  "fridge:snackPercentage": {
    id: "fridge:snackPercentage",
    title: "Snack Percentage per Store",
    description: "Average percentage of snack spending per grocery trip by store",
  },
  "fridge:netWorthAllocation": {
    id: "fridge:netWorthAllocation",
    title: "Net Worth Allocation",
    description: "Breakdown of grocery spending by broad category, category, and items",
  },
  "testCharts:weekendVsWeekday": {
    id: "testCharts:weekendVsWeekday",
    title: "Weekend vs Weekday Spending",
    description: "Compare your spending habits between weekdays and weekends",
  },
  "testCharts:avgTransactionTrend": {
    id: "testCharts:avgTransactionTrend",
    title: "Average Transaction Size",
    description: "Track how your average transaction size changes over time",
  },
  "testCharts:spendingVelocity": {
    id: "testCharts:spendingVelocity",
    title: "Spending Velocity",
    description: "Measures how fast you're spending compared to your historical average",
  },
  "testCharts:categoryDiversity": {
    id: "testCharts:categoryDiversity",
    title: "Category Diversity",
    description: "Radar chart showing how your spending is distributed across top categories",
  },
  "testCharts:momGrowth": {
    id: "testCharts:momGrowth",
    title: "Month-over-Month Growth",
    description: "Track your spending growth rate month-over-month",
  },
  "testCharts:transactionHeatmap": {
    id: "testCharts:transactionHeatmap",
    title: "Transaction Frequency Heatmap",
    description: "Discover when you make the most transactions by day and time",
  },
  "testCharts:spendingDistribution": {
    id: "testCharts:spendingDistribution",
    title: "Spending Distribution",
    description: "Histogram showing how your transactions are distributed across spending ranges",
  },
  "testCharts:incomeExpenseRatio": {
    id: "testCharts:incomeExpenseRatio",
    title: "Income to Expense Ratio",
    description: "Shows how your income compares to your expenses",
  },
  "testCharts:rolling7DayAvg": {
    id: "testCharts:rolling7DayAvg",
    title: "Rolling 7-Day Average",
    description: "Smoothed spending trend using a 7-day rolling average",
  },
  "testCharts:topMerchantsRace": {
    id: "testCharts:topMerchantsRace",
    title: "Top 5 Merchants",
    description: "Bar race showing your top 5 merchants by total spending",
  },
  "testCharts:largestTransactions": {
    id: "testCharts:largestTransactions",
    title: "Largest Transactions",
    description: "Your top 10 biggest single expenses",
  },
  "testCharts:recurringVsOneTime": {
    id: "testCharts:recurringVsOneTime",
    title: "Recurring vs One-Time",
    description: "See how much of your spending is on subscriptions and recurring bills versus one-time purchases",
  },
  "testCharts:hourlySpending": {
    id: "testCharts:hourlySpending",
    title: "Hourly Spending Pattern",
    description: "Discover what time of day you spend the most money",
  },
  "testCharts:cumulativeSpending": {
    id: "testCharts:cumulativeSpending",
    title: "Cumulative Spending",
    description: "Watch your total spending accumulate over time",
  },
  "testCharts:categoryGrowth": {
    id: "testCharts:categoryGrowth",
    title: "Category Growth",
    description: "See which spending categories are growing or shrinking compared to last month",
  },
  "testCharts:spendingStreak": {
    id: "testCharts:spendingStreak",
    title: "Spending Streak",
    description: "Track your no-spend streaks for better financial discipline",
  },
  "testCharts:paydayImpact": {
    id: "testCharts:paydayImpact",
    title: "Payday Impact",
    description: "See how your spending changes around payday",
  },
  "testCharts:savingsRateTrend": {
    id: "testCharts:savingsRateTrend",
    title: "Savings Rate Trend",
    description: "Track your monthly savings rate over time - aim for 20% or more",
  },
  "testCharts:spendingScore": {
    id: "testCharts:spendingScore",
    title: "Spending Score",
    description: "An AI-calculated score based on your spending patterns and trends",
  },
  "testCharts:smallVsLargePurchases": {
    id: "testCharts:smallVsLargePurchases",
    title: "Purchase Size Breakdown",
    description: "See how your spending is distributed between small, medium, and large purchases",
  },
  "testCharts:categoryBubbles": {
    id: "testCharts:categoryBubbles",
    title: "Category Bubbles",
    description: "Visualize spending categories as bubbles - larger bubbles mean more spending",
  },
  "testCharts:weeklyComparison": {
    id: "testCharts:weeklyComparison",
    title: "Weekly Comparison",
    description: "Compare your spending week over week to spot patterns",
  },
  "testCharts:monthlyBudgetPace": {
    id: "testCharts:monthlyBudgetPace",
    title: "Monthly Budget Pace",
    description: "Are you on track this month? Compare your spending pace against typical",
  },
  "testCharts:transactionCountTrend": {
    id: "testCharts:transactionCountTrend",
    title: "Transaction Count Trend",
    description: "Track how many transactions you make each month",
  },
  "testCharts:quickStats": {
    id: "testCharts:quickStats",
    title: "Quick Stats",
    description: "At-a-glance metrics for your current month spending activity",
  },
  "testCharts:topCategoriesPie": {
    id: "testCharts:topCategoriesPie",
    title: "Top Categories",
    description: "Your top 5 spending categories as a pie chart",
  },
  "testCharts:seasonalSpending": {
    id: "testCharts:seasonalSpending",
    title: "Seasonal Spending",
    description: "Compare your spending across seasons - see if habits change with weather",
  },
  "testCharts:budgetBurndown": {
    id: "testCharts:budgetBurndown",
    title: "Budget Burndown",
    description: "Track how quickly you're burning through your monthly budget",
  },
  "testCharts:cashFlowIndicator": {
    id: "testCharts:cashFlowIndicator",
    title: "Cash Flow Indicator",
    description: "Visualize your income vs expenses this month",
  },
  "testCharts:categoryRanking": {
    id: "testCharts:categoryRanking",
    title: "Category Ranking",
    description: "Watch how your spending categories rank against each other over time",
  },
  "testCharts:incomeSources": {
    id: "testCharts:incomeSources",
    title: "Income Sources",
    description: "Breakdown of where your income comes from",
  },
  "testCharts:expenseVelocityGauge": {
    id: "testCharts:expenseVelocityGauge",
    title: "Expense Velocity Gauge",
    description: "How fast are you spending? This gauge shows your daily spending rate",
  },
  "testCharts:spendingByMerchant": {
    id: "testCharts:spendingByMerchant",
    title: "Spending by Merchant",
    description: "Your top merchants by total spending",
  },
  "testCharts:dailyHighLow": {
    id: "testCharts:dailyHighLow",
    title: "Daily High & Low",
    description: "Your biggest and smallest spending days at a glance",
  },
  "testCharts:monthlyTrend": {
    id: "testCharts:monthlyTrend",
    title: "Monthly Income vs Expenses",
    description: "Compare your income and expenses trend over the last 12 months",
  },
  "testCharts:weekdayRadar": {
    id: "testCharts:weekdayRadar",
    title: "Weekday Spending Radar",
    description: "See your spending patterns across different days of the week",
  },
  "testCharts:monthCompare": {
    id: "testCharts:monthCompare",
    title: "This Month vs Last",
    description: "Compare your current month's spending against last month",
  },
  "testCharts:needsVsWantsDonut": {
    id: "testCharts:needsVsWantsDonut",
    title: "Needs vs Wants",
    description: "See how much of your spending goes to necessities vs discretionary",
  },
  "testCharts:budgetMilestone": {
    id: "testCharts:budgetMilestone",
    title: "Budget Milestone",
    description: "Track your progress toward your monthly budget goal",
  },
  "testCharts:yearOverYear": {
    id: "testCharts:yearOverYear",
    title: "Year Over Year",
    description: "Compare your annual spending across years to spot long-term trends",
  },
  "testCharts:spendingByHourHeatmap": {
    id: "testCharts:spendingByHourHeatmap",
    title: "Spending Heatmap",
    description: "See when you spend most - by day and time of day",
  },
  "testCharts:categoryProgress": {
    id: "testCharts:categoryProgress",
    title: "Category Budget Progress",
    description: "How much of each category budget have you used this month",
  },
  "testCharts:netWorthTrend": {
    id: "testCharts:netWorthTrend",
    title: "Net Worth Trend",
    description: "Track your net worth over time based on account balance",
  },
  "testCharts:financialSummary": {
    id: "testCharts:financialSummary",
    title: "Financial Summary",
    description: "Quick overview of your current month's financial activity",
  },
  "testCharts:dailyAverageByMonth": {
    id: "testCharts:dailyAverageByMonth",
    title: "Daily Average by Month",
    description: "Your average daily spending for each month",
  },
  "testCharts:paymentMethods": {
    id: "testCharts:paymentMethods",
    title: "Payment Methods",
    description: "How you're paying - card, cash, transfers, and more",
  },
  "testCharts:biggestExpenseCategories": {
    id: "testCharts:biggestExpenseCategories",
    title: "Biggest Expense Categories",
    description: "Your top 5 spending categories this month",
  },
  "testCharts:spendingAlerts": {
    id: "testCharts:spendingAlerts",
    title: "Spending Alerts",
    description: "Real-time alerts about your spending patterns",
  },
  "testCharts:quarterlyComparison": {
    id: "testCharts:quarterlyComparison",
    title: "Quarterly Comparison",
    description: "Compare your spending across quarters to spot seasonal patterns",
  },
  "testCharts:balanceHistory": {
    id: "testCharts:balanceHistory",
    title: "Balance History",
    description: "Track your account balance over the last 30 days",
  },
  "testCharts:monthlyInsights": {
    id: "testCharts:monthlyInsights",
    title: "Monthly Insights",
    description: "Key statistics and insights about your spending this month",
  },
}

export function getChartMetadata(chartId: ChartId): ChartMetadata {
  return CHART_METADATA[chartId] || {
    id: chartId,
    title: chartId,
    description: "",
  }
}






































