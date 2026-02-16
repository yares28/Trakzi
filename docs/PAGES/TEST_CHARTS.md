# Test Charts Page

This document lists all chart components used on the Test Charts playground page (`/testCharts`).

> **IMPORTANT:** When adding, modifying, or deleting charts on this page, update this document accordingly.

The Test Charts page is a playground for testing and previewing chart components before promoting them to production pages.

---

## Overview

| Section | Chart Count | Description |
|---------|-------------|-------------|
| Analytics Playground | 47 | General spending analysis and trends |
| Savings & Wealth | 3 | Net worth, savings rates, and goals |
| Fridge & Groceries | 5 | Food spending and nutrition data |
| **Total** | **55** | |

---

## Analytics Playground Charts (47 total)

| # | Chart ID | Component Name | Description |
|---|----------|----------------|-------------|
| 1 | `testCharts:quickStats` | `ChartQuickStats` | Quick stats summary cards |
| 2 | `testCharts:spendingScore` | `ChartSpendingScore` | Overall spending health score |
| 3 | `testCharts:cashFlowIndicator` | `ChartCashFlowIndicator` | Cash flow positive/negative indicator |
| 4 | `testCharts:incomeExpenseRatio` | `ChartIncomeExpenseRatio` | Income vs expense ratio gauge |
| 5 | `testCharts:weekendVsWeekday` | `ChartWeekendVsWeekday` | Weekend vs weekday spending comparison |
| 6 | `testCharts:hourlySpending` | `ChartHourlySpending` | Spending by hour of day |
| 7 | `testCharts:cumulativeSpending` | `ChartCumulativeSpending` | Cumulative spending over time |
| 8 | `testCharts:budgetBurndown` | `ChartBudgetBurndown` | Budget burndown chart |
| 9 | `testCharts:monthlyBudgetPace` | `ChartMonthlyBudgetPace` | Monthly budget pacing indicator |
| 10 | `testCharts:spendingStreak` | `ChartSpendingStreak` | Spending streak tracker |
| 11 | `testCharts:topCategoriesPie` | `ChartTopCategoriesPie` | Top categories pie chart |
| 12 | `testCharts:categoryBubbles` | `ChartCategoryBubbles` | Category bubble visualization |
| 13 | `testCharts:smallVsLargePurchases` | `ChartSmallVsLargePurchases` | Small vs large purchase distribution |
| 14 | `testCharts:recurringVsOneTime` | `ChartRecurringVsOneTime` | Recurring vs one-time expenses |
| 15 | `testCharts:categoryRanking` | `ChartCategoryRanking` | Category spending ranking |
| 16 | `testCharts:categoryGrowth` | `ChartCategoryGrowth` | Category growth over time |
| 17 | `testCharts:weeklyComparison` | `ChartWeeklyComparison` | Week over week comparison |
| 18 | `testCharts:seasonalSpending` | `ChartSeasonalSpending` | Seasonal spending patterns |
| 19 | `testCharts:categoryDiversity` | `ChartCategoryDiversity` | Spending diversity across categories |
| 20 | `testCharts:momGrowth` | `ChartMoMGrowth` | Month over month growth |
| 21 | `testCharts:avgTransactionTrend` | `ChartAvgTransactionTrend` | Average transaction amount trend |
| 22 | `testCharts:transactionCountTrend` | `ChartTransactionCountTrend` | Transaction count over time |
| 23 | `testCharts:rolling7DayAvg` | `ChartRolling7DayAvg` | 7-day rolling average |
| 24 | `testCharts:transactionHeatmap` | `ChartTransactionHeatmap` | Transaction activity heatmap |
| 25 | `testCharts:paydayImpact` | `ChartPaydayImpact` | Spending around payday |
| 26 | `testCharts:topMerchantsRace` | `ChartTopMerchantsRace` | Top merchants racing bar chart |
| 27 | `testCharts:incomeSources` | `ChartIncomeSources` | Income sources breakdown |
| 28 | `testCharts:spendingDistribution` | `ChartSpendingDistribution` | Spending amount distribution |
| 29 | `testCharts:largestTransactions` | `ChartLargestTransactions` | Largest transactions list |
| 30 | `testCharts:expenseVelocityGauge` | `ChartExpenseVelocityGauge` | Expense velocity gauge |
| 31 | `testCharts:monthCompare` | `ChartMonthCompare` | Month to month comparison |
| 32 | `testCharts:dailyHighLow` | `ChartDailyHighLow` | Daily high/low spending |
| 33 | `testCharts:financialSummary` | `ChartFinancialSummary` | Overall financial summary |
| 34 | `testCharts:monthlyTrend` | `ChartMonthlyTrend` | Monthly spending trend line |
| 35 | `testCharts:weekdayRadar` | `ChartWeekdayRadar` | Weekday spending radar |
| 36 | `testCharts:spendingByHourHeatmap` | `ChartSpendingByHourHeatmap` | Spending by hour heatmap |
| 37 | `testCharts:categoryProgress` | `ChartCategoryProgress` | Category budget progress bars |
| 38 | `testCharts:needsVsWantsDonut` | `ChartNeedsVsWantsDonut` | Needs vs wants donut chart |
| 39 | `testCharts:spendingByMerchant` | `ChartSpendingByMerchant` | Spending by merchant breakdown |
| 40 | `testCharts:yearOverYear` | `ChartYearOverYear` | Year over year comparison |
| 41 | `testCharts:quarterlyComparison` | `ChartQuarterlyComparison` | Quarterly spending comparison |
| 42 | `testCharts:dailyAverageByMonth` | `ChartDailyAverageByMonth` | Daily average by month |
| 43 | `testCharts:paymentMethods` | `ChartPaymentMethods` | Payment methods breakdown |
| 44 | `testCharts:biggestExpenseCategories` | `ChartBiggestExpenseCategories` | Biggest expense categories |
| 45 | `testCharts:spendingAlerts` | `ChartSpendingAlerts` | Spending alerts and anomalies |
| 46 | `testCharts:balanceHistory` | `ChartBalanceHistory` | Account balance history |
| 47 | `testCharts:monthlyInsights` | `ChartMonthlyInsights` | Monthly insights summary |

---

## Savings & Wealth Charts (3 total)

| # | Chart ID | Component Name | Description |
|---|----------|----------------|-------------|
| 1 | `testCharts:savingsRateTrend` | `ChartSavingsRateTrend` | Savings rate percentage over time |
| 2 | `testCharts:netWorthTrend` | `ChartNetWorthTrend` | Net worth trend line |
| 3 | `testCharts:budgetMilestone` | `ChartBudgetMilestone` | Budget milestone progress |

---

## Fridge & Groceries Charts (5 total)

| # | Chart ID | Component Name | Description |
|---|----------|----------------|-------------|
| 1 | `fridge:spend-trend` | `ChartAreaInteractiveFridge` | Grocery spend trend over time |
| 2 | `fridge:category-flow` | `ChartCategoryFlowFridge` | Grocery category flow/rankings |
| 3 | `fridge:expense-breakdown` | `ChartExpenseBreakdownFridge` | Grocery expense breakdown pie |
| 4 | `fridge:macronutrient-breakdown` | `ChartMacronutrientBreakdownFridge` | Macronutrient distribution |
| 5 | `fridge:snack-percentage` | `ChartSnackPercentageFridge` | Snack percentage indicator |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/testCharts/page.tsx` | Main test charts page with all sections |
| `app/api/charts/test-charts-bundle/route.ts` | Bundle API endpoint for test charts data |
| `lib/charts/aggregations.ts` | Contains `getTestChartsBundle()` aggregation function |
| `components/test-charts/index.ts` | Barrel export for all test chart components |
| `components/test-charts/*.tsx` | Individual test chart components |
| `components/fridge/*.tsx` | Fridge chart components (shared with Fridge page) |

---

## Data Sources

The Test Charts page fetches data from a **single bundle API**:

1. **Test Charts Bundle API**: `/api/charts/test-charts-bundle?filter=...`
   - Aggregates both transactions and receipt transactions
   - Returns pre-normalized data with Redis caching (5 min TTL)
   - Used for all analytics, savings, and fridge charts
   - Replaces the previous approach of fetching from `/api/transactions` and `/api/fridge` separately

### Bundle Response Format

```json
{
  "transactions": [
    {
      "id": 1,
      "date": "2024-01-15",
      "description": "Transaction description",
      "amount": 50.00,
      "balance": 1000.00,
      "category": "Groceries"
    }
  ],
  "receiptTransactions": [
    {
      "id": 1,
      "receiptId": "uuid",
      "storeName": "Store Name",
      "receiptDate": "2024-01-15",
      "receiptTime": "14:30:00",
      "description": "Item description",
      "totalPrice": 25.50,
      "categoryName": "Food",
      "categoryColor": "#6366f1"
    }
  ],
  "hasDataInOtherPeriods": true
}
```

---

## Page Structure

```
testCharts/page.tsx
├── Analytics Section (id="analytics-section")
│   └── SortableGridProvider with 48 charts
├── Savings Section (id="savings-section")
│   └── SortableGridProvider with 3 charts
└── Fridge Section (id="fridge-section")
    └── SortableGridProvider with 5 charts
```

---

## State Management

Each section has independent state:
- `analyticsOrder` / `analyticsSizes` - Analytics section layout
- `savingsOrder` / `savingsSizes` - Savings section layout
- `fridgeOrder` / `fridgeSizes` - Fridge section layout

All persisted to localStorage with keys:
- `testCharts-analytics-order`, `testCharts-analytics-sizes`
- `testCharts-savings-order`, `testCharts-savings-sizes`
- `testCharts-fridge-order`, `testCharts-fridge-sizes`

---

## Promoting Charts to Production

When a test chart is ready for production:

1. Move component from `components/test-charts/` to `components/`
2. Wrap with `React.memo` and add `displayName`
3. Add to appropriate page's ChartsGrid
4. Add to bundle API aggregation if needed
5. Update the relevant documentation:
   - Remove from this document (TEST_CHARTS.md)
   - Add to target page document (ANALYTICS_CHARTS.md, FRIDGE_CHARTS.md, etc.)

---

## Adding a New Test Chart

1. Create component in `components/test-charts/chart-{name}.tsx`
2. Export from `components/test-charts/index.ts`
3. Import in `app/testCharts/page.tsx`
4. Add chart ID to appropriate section order array
5. Add case in `renderChart()` switch statement
6. **Update this document with the new chart**
