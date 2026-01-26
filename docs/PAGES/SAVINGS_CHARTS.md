# Savings Page Charts

This document lists all chart components used on the Savings page.

> **IMPORTANT:** When adding, modifying, or deleting charts on this page, update this document accordingly.

---

## Charts (1 total)

| # | Chart ID | Component File | Component Name | Description |
|---|----------|----------------|----------------|-------------|
| 1 | `savingsAccumulation` | `chart-savings-accumulation.tsx` | `ChartSavingsAccumulation` | Savings Accumulation Over Time - Cumulative savings with daily aggregates and moving averages |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/savings/page.tsx` | Main savings page (contains all logic inline) |
| `components/chart-savings-accumulation.tsx` | Savings accumulation chart component |
| `lib/charts/home-trends-savings-aggregations.ts` | Shared aggregation for home/trends/savings |

---

## Features

All charts include:
- **Fullscreen mode** - Expand button for mobile viewing
- **AI Insights** - `ChartAiInsightButton` for AI-generated analysis
- **Info Popover** - `ChartInfoPopover` with chart description
- **Favorite** - `ChartFavoriteButton` to mark favorite charts
- **Drag Handle** - For layout customization
- **Memoization** - Wrapped with `React.memo`

---

## Data Source

### Bundle API (Primary)

**Endpoint:** `/api/charts/savings-bundle?filter=...`

Returns pre-aggregated data with Redis caching:
- Savings KPIs (total saved, savings rate, counts)
- Cumulative chart data with daily amounts

### Cache Key Pattern
```
savings:{userId}:{filter}:bundle
```

### Legacy Data Flow

The savings page also supports direct transaction fetching:

1. Fetch from `/api/transactions?category=Savings&all=true`
2. Group transactions by date (YYYY-MM-DD)
3. Calculate daily: income (positive), expenses (negative)
4. Calculate cumulative savings
5. Compute moving averages (7-day, 30-day)

---

## Chart Data Format

```typescript
interface SavingsChartData {
  date: string      // YYYY-MM-DD
  income: number    // Positive transactions for the day
  expenses: number  // Negative transactions (absolute value)
  savings: number   // Cumulative savings
  ma7?: number      // 7-day moving average (optional)
  ma30?: number     // 30-day moving average (optional)
}
```

---

## Chart Libraries Used

| Library | Charts Using It |
|---------|-----------------|
| **Recharts** | Area charts for accumulation visualization |

---

## Planned Future Charts

The following charts may be added in future updates:

| Chart Name | Description |
|------------|-------------|
| Savings Rate Trend | Track savings rate percentage over time |
| Savings Goal Progress | Progress bars toward savings goals |
| Savings by Category | Breakdown of savings allocation |
| Monthly Savings Comparison | Compare savings across months |
| Emergency Fund Tracker | Progress toward emergency fund target |

---

## Adding a New Chart

1. Create component in `components/chart-{name}.tsx`
2. Wrap with `React.memo` and add `displayName`
3. Add chart ID to `DEFAULT_SAVINGS_ORDER` in `app/savings/page.tsx`
4. Add to render logic in `app/savings/page.tsx`
5. Add data to `lib/charts/home-trends-savings-aggregations.ts` if needed
6. **Update this document with the new chart**
