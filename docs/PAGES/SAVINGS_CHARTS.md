# Savings Page Charts

This document lists all chart components used on the Savings page.

---

## Charts (1 total - more planned for future)

| # | Chart ID | Component File | Description | Data Fetching & Calculation |
|---|----------|----------------|-------------|------------------------------|
| 1 | savingsAccumulation | `chart-savings-accumulation.tsx` | Savings Accumulation Over Time - Tracks cumulative savings over time with daily aggregates and optional moving averages | **Fetched from:** `/api/transactions` filtered by "Savings" category (with optional date filter). **Calculated:** Transactions filtered to "Savings" category only. Grouped by date (`YYYY-MM-DD`). Daily aggregates: `income` = sum of positive amounts, `expenses` = sum of negative amounts (absolute values). Cumulative savings calculated: `savings = previousSavings + income - expenses`. Moving averages (7-day and 30-day) calculated from savings values. Data formatted as `{ date, income, expenses, savings, ma7?, ma30? }[]`, sorted chronologically. Supports time range filtering (7d, 30d, 90d) |

---

## Planned Future Charts

The following charts may be added in future updates:

- **Savings Rate Trend** - `chart-savings-rate-trend.tsx` (exists in test-charts)
- **Savings Goal Progress** - Track progress toward savings goals
- **Savings by Category** - Breakdown of savings allocation
- **Monthly Savings Comparison** - Compare savings across months
- **Emergency Fund Tracker** - Progress toward emergency fund target

---

## Features

All charts include:
- **Fullscreen mode** - Expand button for mobile viewing
- **AI Insights** - ChartAiInsightButton for AI-generated analysis
- **Info Popover** - ChartInfoPopover with chart description
- **Favorite** - ChartFavoriteButton to mark favorite charts
- **Drag Handle** - For layout customization

## Data Source

Savings charts filter transactions by the "Savings" category, showing:
- Cumulative savings over time
- Daily savings deposits/withdrawals
- Income vs expenses within savings context

**Primary endpoint:** `/api/transactions?category=Savings&limit=100` (paginated with optional date filter)

**Data Processing:** 
1. Transactions fetched from `/api/transactions` endpoint with pagination (max 100 per request)
2. Server-side filtering: transactions where `category === "Savings"`
3. Grouping by date: transactions aggregated by `date` field (YYYY-MM-DD format)
4. Daily calculations:
   - `income` = sum of positive transaction amounts for the day
   - `expenses` = sum of absolute values of negative transaction amounts for the day
5. Cumulative savings: running total calculated as `previousSavings + income - expenses`
6. Moving averages: 7-day and 30-day moving averages calculated from savings values (optional, toggleable)

**Time Range Filtering:** Chart supports filtering to last 7 days, 30 days, or 90 days. Filtering applied at the API level via the `filter` parameter.

## Chart Libraries Used

- **Recharts** - Area charts for accumulation visualization
