# Budget Charts

Charts rendered on the Budgets tab of the Savings page (`app/savings/page.tsx`, viewMode `"budgets"`).

## Charts

| # | Chart ID | Component File | Component Name | Description |
|---|----------|----------------|----------------|-------------|
| 1 | `budgetVsSpendTrend` | `components/budgets/chart-budget-vs-spend-trend.tsx` | `ChartBudgetVsSpendTrend` | Grouped bar chart showing total monthly spend vs total monthly cap across all budgeted categories for the selected filter window |

**Total charts: 1**

## Data Source

All chart data comes from `/api/charts/budgets-bundle` (cached in Redis under prefix `budgets`, TTL 5 min).
Aggregation logic lives in `lib/charts/budgets-aggregations.ts`.
