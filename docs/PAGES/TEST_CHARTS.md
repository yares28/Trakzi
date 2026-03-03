# Test Charts Page

This document lists all chart components used on the Test Charts playground page (`/testCharts`).

> **IMPORTANT:** When adding, modifying, or deleting charts on this page, update this document accordingly.

The Test Charts page is a playground for testing and previewing chart components before promoting them to production pages.

---

## Overview

| Section | Chart Count | Description |
|---------|-------------|-------------|
| Analytics Playground | 20 | General spending analysis and trends |
| Savings & Wealth | 3 | Net worth, savings rates, and goals |
| Fridge & Groceries | 5 | Food spending and nutrition data |
| **Total** | **28** | |

---

## Analytics Playground Charts (20 total)

| # | Chart ID | Component Name | Description |
|---|----------|----------------|-------------|
| 1 | `testCharts:hourlySpending` | `ChartHourlySpending` | Spending by hour of day |
| 2 | `testCharts:categoryBubbles` | `ChartCategoryBubbles` | Category bubble visualization |
| 3 | `testCharts:categoryRanking` | `ChartCategoryRanking` | Category spending ranking |
| 4 | `testCharts:seasonalSpending` | `ChartSeasonalSpending` | Seasonal spending patterns |
| 5 | `testCharts:momGrowth` | `ChartMoMGrowth` | Month over month growth |
| 6 | `testCharts:transactionCountTrend` | `ChartTransactionCountTrend` | Transaction count over time |
| 7 | `testCharts:paydayImpact` | `ChartPaydayImpact` | Spending around payday |
| 8 | `testCharts:topMerchantsRace` | `ChartTopMerchantsRace` | Top merchants racing bar chart |
| 9 | `testCharts:incomeSources` | `ChartIncomeSources` | Income sources breakdown |
| 10 | `testCharts:spendingDistribution` | `ChartSpendingDistribution` | Spending amount distribution |
| 11 | `testCharts:largestTransactions` | `ChartLargestTransactions` | Largest transactions list |
| 12 | `testCharts:monthCompare` | `ChartMonthCompare` | Month to month comparison |
| 13 | `testCharts:dailyHighLow` | `ChartDailyHighLow` | Daily high/low spending |
| 14 | `testCharts:monthlyTrend` | `ChartMonthlyTrend` | Monthly spending trend line |
| 15 | `testCharts:weekdayRadar` | `ChartWeekdayRadar` | Weekday spending radar |
| 16 | `testCharts:spendingByMerchant` | `ChartSpendingByMerchant` | Spending by merchant breakdown |
| 17 | `testCharts:yearOverYear` | `ChartYearOverYear` | Year over year comparison |
| 18 | `testCharts:quarterlyComparison` | `ChartQuarterlyComparison` | Quarterly spending comparison |
| 19 | `testCharts:dailyAverageByMonth` | `ChartDailyAverageByMonth` | Daily average by month |
| 20 | `testCharts:biggestExpenseCategories` | `ChartBiggestExpenseCategories` | Biggest expense categories |

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
