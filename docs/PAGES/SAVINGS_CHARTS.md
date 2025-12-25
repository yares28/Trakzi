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

> **Performance Optimization:** Bundle API available for server-side aggregation.

### Bundle API (Recommended)

**Endpoint:** `/api/charts/savings-bundle?filter=...`

Returns pre-aggregated data with Redis caching:
- Savings KPIs (total saved, savings rate, counts)
- Cumulative chart data with daily amounts

See [DATA_FETCHING.md](./DATA_FETCHING.md) for response format.

### Legacy Endpoint

**Endpoint:** `/api/transactions?category=Savings&all=true`

**Data Processing:** 
1. Transactions fetched and filtered to "Savings" category
2. Grouped by date (YYYY-MM-DD)
3. Daily calculations: income, expenses
4. Cumulative savings calculated
5. Moving averages (7-day, 30-day) computed client-side

## Chart Libraries Used

- **Recharts** - Area charts for accumulation visualization

