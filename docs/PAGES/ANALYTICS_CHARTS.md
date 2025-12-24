# Analytics Page Charts

This document lists all chart components used on the Analytics page.

---

## Charts (17 total)

| # | Chart ID | Component File | Description | Data Fetching & Calculation |
|---|----------|----------------|-------------|------------------------------|
| 1 | incomeExpensesTracking1 | `chart-area-interactive.tsx` | Income & Expenses Tracking - Visualizes cash flow over time with income and cumulative expenses | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions grouped by date. Income = sum of positive amounts per day. Expenses = cumulative sum of negative amounts, reduced by income (when income > 0, expenses decrease). Data passed as `{ date, desktop: income, mobile: expenses }[]` |
| 2 | incomeExpensesTracking2 | `chart-area-interactive.tsx` | Income & Expenses Tracking (duplicate) - Same as chart #1 | Same as chart #1 |
| 3 | spendingCategoryRankings | `chart-category-flow.tsx` | Spending Category Rankings - Tracks how spending categories rank relative to each other over time | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions grouped by month and category. Each category's percentage of total monthly spend is calculated. Rankings determined by sorting categories by percentage per month. Data formatted as area bump chart format with `{ id: category, data: [{ x: month, y: percentage }] }[]` |
| 4 | transactionHistory | `chart-swarm-plot.tsx` | Transaction History Swarm Plot - Visualizes individual transactions as dots grouped by category | **Fetched from:** `/api/charts/transaction-history`. **Calculated:** Each transaction becomes a data point with `{ id, group: category, price: amount, volume: computedVolume, category, color, date, description }`. Volume calculated from transaction amount. Categories resolved from transaction category or parsed from raw CSV row |
| 5 | moneyFlow | `chart-spending-funnel.tsx` | Money Flow Funnel - Shows money flow through different stages | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions aggregated by category and flow stage. Funnel stages calculated from transaction amounts and categories |
| 6 | householdSpendMix | `chart-polar-bar.tsx` | Household Spend Mix Polar Bar - Circular stacked chart showing monthly expenses across top categories | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions grouped by month and category. Monthly totals calculated per category. Top 5 categories selected. Data formatted as `{ month, category1: amount, category2: amount, ... }[]` |
| 7 | needsWantsBreakdown | `chart-needs-wants-pie.tsx` | Needs vs Wants Breakdown - Groups spending into Essentials, Mandatory, and Wants | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions filtered to expenses only (negative amounts). Categories mapped to Needs/Wants classification: Essentials (groceries, housing, utilities, transport), Mandatory (insurance, taxes), Wants (shopping, entertainment, travel). Totals calculated per classification |
| 8 | expenseBreakdown | `chart-expenses-pie.tsx` | Expense Breakdown Pie - Shows how total expenses are distributed across spending categories | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions filtered to expenses only (negative amounts). Grouped by category, summing absolute values. Income entries and zero-dollar adjustments excluded. Data formatted as `{ id: category, label: category, value: totalAmount }[]`, sorted by value descending |
| 9 | netWorthAllocation | `chart-treemap.tsx` | Net Worth Allocation TreeMap - Breakdown of total assets by category with nested transaction details | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions grouped by category. TreeMap structure: root → categories → individual transactions. Each node contains `{ name, loc: amount, fullDescription }`. Only expense-driven categories included. Data formatted as nested tree structure |
| 10 | cashFlowSankey | `chart-sankey.tsx` | Cash Flow Sankey Diagram - Shows how income flows through expense categories to savings | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions separated into income sources (positive) and expense categories (negative). Links created from income → expenses → savings/surplus. Smaller categories aggregated into "Other" for readability. Data formatted as `{ nodes: [{ id, label }], links: [{ source, target, value }] }` |
| 11 | spendingStreamgraph | `chart-spending-streamgraph.tsx` | Category Streamgraph - Shows spending trends by category over time as flowing areas | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions grouped by date and category. Cumulative spending calculated per category over time. Stacked area visualization with smooth curves. Data formatted for streamgraph with time series per category |
| 12 | dailyTransactionActivity | `chart-transaction-calendar.tsx` | Daily Transaction Calendar Heatmap - Calendar view showing transaction activity intensity per day | **Fetched from:** `/api/transactions/daily` (with optional date filter). **Calculated:** Transactions grouped by day. Daily totals calculated as `{ day: YYYY-MM-DD, value: totalAmount }[]`. Heatmap intensity based on transaction count or total amount per day. Uses ECharts calendar heatmap |
| 13 | categoryBubbleMap | `chart-category-bubble.tsx` | Category Bubble Map - Bubble chart showing category spending with size and position encoding | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions grouped by category. Bubble size = total spending per category. Position may encode additional dimensions (time, relationship). Data formatted as `{ category, value: amount, x?, y?, size }[]` |
| 14 | dayOfWeekSpending | `chart-day-of-week-spending.tsx` | Day of Week Spending - Grouped bar chart showing spending by category for each day of week | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions filtered to expenses only. Grouped by day of week (Monday=0, Sunday=6) and category. Daily totals calculated per category. Custom SVG grouped bar chart with transparent total bars behind category bars. Data formatted as `{ day: 0-6, dayName, category, amount }[]` |
| 15 | allMonthsCategorySpending | `chart-all-months-category-spending.tsx` | All Months Category Spending - Shows spending by category across all months | **Fetched from:** `/api/analytics/monthly-category-duplicate?months=1,2,3,4,5,6,7,8,9,10,11,12` (with optional date filter). **Calculated:** Transactions grouped by month and category. Monthly totals calculated per category. Data formatted as `{ data: Record<month, Array<{ category, month, total }>>, availableMonths: number[] }` |
| 16 | singleMonthCategorySpending | `chart-single-month-category-spending.tsx` | Single Month Category Spending - Detailed breakdown for a selected month | **Fetched from:** `/api/transactions` (with optional date filter). **Calculated:** Transactions filtered to selected month. Grouped by category, summing amounts. Data formatted as `{ category, amount }[]` for the selected month |
| 17 | dayOfWeekCategory | `chart-day-of-week-category.tsx` | Day of Week Category - Spending breakdown by day of week and category | **Fetched from:** `/api/analytics/day-of-week-category` (with optional date filter). **Calculated:** Transactions filtered to expenses only. Grouped by day of week (0-6) and category. Totals calculated per day-category combination. Data formatted as `{ data: Array<{ category, dayOfWeek, total }>, availableDays: number[] }` |

---

## Features

All charts include:
- **Fullscreen mode** - Expand button for mobile viewing
- **AI Insights** - ChartAiInsightButton for AI-generated analysis
- **Info Popover** - ChartInfoPopover with chart description
- **Favorite** - ChartFavoriteButton to mark favorite charts
- **Drag Handle** - GridStackCardDragHandle for layout customization

## Chart Libraries Used

- **Recharts** - Area charts, line charts
- **Nivo** - Pie, TreeMap, Polar Bar, Funnel, Sankey, Swarm Plot
- **ECharts** - Calendar heatmap, Bubble map, Bar charts
- **Custom SVG** - Streamgraph, Day of week charts

## Data Source Overview

### Aggregated Endpoints (Preferred for Charts)
For better performance and scalability, charts should use these pre-aggregated endpoints:
- **`/api/charts/summary-stats`** - Pre-calculated totals, changes, and trends for SectionCards
- **`/api/charts/income-expenses`** - Daily income/expense totals for area charts
- **`/api/charts/category-totals`** - Spending by category with daily breakdown

### Transaction Endpoints (For Data Tables)
- **`/api/transactions`** - Paginated transactions (max 100 per page) for data tables
  - Use `?page=1&limit=50` for pagination
  - Use `?filter=last30days` for date filtering
  - Returns `{ data: [...], pagination: {...} }` format

### Specialized Chart Endpoints
- `/api/charts/transaction-history` - Formatted transaction history for swarm plots
- `/api/transactions/daily` - Daily aggregated transaction data
- `/api/analytics/monthly-category-duplicate` - Monthly category spending batch data
- `/api/analytics/day-of-week-category` - Day of week category breakdowns
- `/api/financial-health` - Financial health metrics and year summaries
- `/api/categories` - Available spending categories

**Data Processing:** SectionCards now use the aggregated `/api/charts/summary-stats` endpoint for pre-calculated stats. Other charts still perform client-side calculations but should migrate to aggregated endpoints for better scalability.
