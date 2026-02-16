# Analytics Page Charts

This document lists all chart components used on the Analytics page.

> **IMPORTANT:** When adding, modifying, or deleting charts on this page, update this document accordingly.

---

## Charts (19 total)

| # | Chart ID | Component File | Component Name | Description |
|---|----------|----------------|----------------|-------------|
| 1 | `incomeExpensesTracking1` | `chart-area-interactive.tsx` | `ChartAreaInteractive` | Income & Expenses Cumulative Tracking (Top Chart) - Visualizes cumulative cash flow over time |
| 2 | `incomeExpensesTracking2` | `chart-area-interactive.tsx` | `ChartAreaInteractive` | Income & Expenses Cumulative Tracking (Bottom Chart) - Same visualization, different data slice |
| 3 | `spendingCategoryRankings` | `chart-category-flow.tsx` | `ChartCategoryFlow` | Spending Category Rankings - Bump chart showing category rank changes over time |
| 5 | `transactionHistory` | `chart-swarm-plot.tsx` | `ChartSwarmPlot` | Transaction History Swarm Plot - Individual transactions as dots grouped by category |
| 6 | `moneyFlow` | `chart-spending-funnel.tsx` | `ChartSpendingFunnel` | Money Flow Funnel - Shows money flow through different stages |
| 7 | `householdSpendMix` | `chart-polar-bar.tsx` | `ChartPolarBar` | Household Spend Mix - Circular stacked chart of monthly expenses by category |
| 8 | `needsWantsBreakdown` | `chart-needs-wants-pie.tsx` | `ChartNeedsWantsPie` | Needs vs Wants Breakdown - Groups spending into Essentials, Mandatory, Wants |
| 9 | `expenseBreakdown` | `chart-expenses-pie.tsx` | `ChartExpensesPie` | Expense Breakdown Pie - Distribution across spending categories |
| 10 | `netWorthAllocation` | `chart-treemap.tsx` | `ChartTreeMap` | Net Worth Allocation TreeMap - Hierarchical breakdown of spending |
| 11 | `cashFlowSankey` | `chart-sankey.tsx` | `ChartSankey` | Cash Flow Sankey Diagram - Income flow through expenses to savings |
| 12 | `spendingStreamgraph` | `chart-spending-streamgraph.tsx` | `ChartSpendingStreamgraph` | Category Streamgraph - Spending trends by category as flowing areas |
| 13 | `dailyTransactionActivity` | `chart-transaction-calendar.tsx` | `ChartTransactionCalendar` | Daily Transaction Activity - Contribution graph heatmap of daily spending |
| 14 | `categoryBubbleMap` | `chart-category-bubble.tsx` | `ChartCategoryBubble` | Category Bubble Map - Bubble chart with size/position encoding |
| 15 | `dayOfWeekSpending` | `chart-day-of-week-spending.tsx` | `ChartDayOfWeekSpending` | Day of Week Spending - Grouped bar chart by day and category |
| 16 | `allMonthsCategorySpending` | `chart-all-months-category-spending.tsx` | `ChartAllMonthsCategorySpending` | All Months Category Spending - Spending by category across all months |
| 17 | `singleMonthCategorySpending` | `chart-single-month-category-spending.tsx` | `ChartSingleMonthCategorySpending` | Single Month Category Spending - Detailed breakdown for selected month |
| 18 | `dayOfWeekCategory` | `chart-day-of-week-category.tsx` | `ChartDayOfWeekCategory` | Day of Week Category - Spending breakdown by day and category |
| 19 | `financialHealthScore` | `chart-radar.tsx` | `ChartRadar` | Financial Health Score - Radar chart of financial health metrics |
| 20 | `spendingActivityRings` | `SpendingActivityRings.tsx` | `SpendingActivityRings` | Spending Activity Rings - Concentric rings showing category progress vs limits |

---

## Mobile Sizing Configuration

Each chart has a `mobileH` property that controls its height on mobile devices (< 768px). Edit these values in `lib/chart-card-sizes.config.ts`.

| Chart ID | Desktop Height (`h`) | Mobile Height (`mobileH`) | Notes |
|----------|---------------------|---------------------------|-------|
| `incomeExpensesTracking1` | 6 | 5 | Area chart, compact on mobile |
| `incomeExpensesTracking2` | 6 | 5 | Area chart, compact on mobile |
| `spendingCategoryRankings` | 8 | 7 | Bar chart with multiple bars |
| `netWorthAllocation` | 10 | 5 | TreeMap, can be compact |
| `needsWantsBreakdown` | 10 | 6 | Pie with legend |
| `moneyFlow` | 10 | 7 | Funnel chart, needs vertical space |
| `expenseBreakdown` | 10 | 6 | Pie with legend |
| `categoryBubbleMap` | 10 | 6 | Circle packing |
| `householdSpendMix` | 10 | 6 | Polar bar chart |
| `financialHealthScore` | 10 | 6 | Radar chart |
| `spendingActivityRings` | 10 | 8 | Multiple rings + legend |
| `spendingStreamgraph` | 9 | 5 | Wide chart, compresses well |
| `transactionHistory` | 7 | 7 | Swarm plot, taller for visibility |
| `dailyTransactionActivity` | 8 | 5 | Dual 3-month calendar heatmaps (6 months YTD) |
| `dayOfWeekSpending` | 8 | 6 | Bar chart |
| `allMonthsCategorySpending` | 8 | 6 | Stacked bar |
| `singleMonthCategorySpending` | 8 | 6 | Bar chart |
| `dayOfWeekCategory` | 8 | 6 | Heatmap |
| `cashFlowSankey` | 10 | 7 | Flow diagram, needs vertical space |

### Height Unit Reference

Each grid unit = ~65px on mobile. Common configurations:

| `mobileH` | Approx. Height | Best For |
|-----------|----------------|----------|
| 4 | ~260px | Quick stats, simple indicators |
| 5 | ~325px | Area charts, line charts, heatmaps |
| 6 | ~390px | Pie charts with legend, bar charts |
| 7 | ~455px | Sankey, funnel, swarm plots |
| 8 | ~520px | Activity rings, complex visualizations |

### How to Modify

1. Open `lib/chart-card-sizes.config.ts`
2. Find the chart by ID (e.g., `transactionHistory`)
3. Change the `mobileH` value
4. Build to verify: `npm run build`

```typescript
// Example: Make transaction history taller on mobile
transactionHistory: {
  minW: 6,
  maxW: 12,
  minH: 8,
  maxH: 20,
  mobileH: 7,  // ← Adjust this value
},
```

---

## Trends Tab

The Analytics page includes a **Trends** tab (toggled via Analytics / Advanced / Trends pills). When active, a secondary **Spending / Groceries** toggle appears on the right side of the toggle bar.

| Component | File | Description |
|-----------|------|-------------|
| `AnalyticsTrendsTab` | `app/analytics/_page/components/AnalyticsTrendsTab.tsx` | Trends tab content — category trend charts in a sortable grid |
| `ChartCategoryTrend` | `components/chart-category-trend.tsx` | Individual category area chart (memoized, Recharts) |

**Data sources:**
- Spending trends: `/api/charts/trends-bundle` via `useTrendsData()`
- Grocery trends: `/api/charts/groceries-trends-bundle` via `useGroceriesTrendsBundleData()`

> **Note:** The standalone `/trends` page was removed. All trends functionality now lives in the Analytics page Trends tab.

---

## Key Files

| File | Purpose |
|------|---------|
| `app/analytics/_page/components/ChartsGrid.tsx` | Renders all analytics charts |
| `app/analytics/_page/components/AnalyticsTrendsTab.tsx` | Trends tab with category trend charts |
| `app/analytics/_page/hooks/useAnalyticsChartData.ts` | Processes bundle data for charts |
| `app/analytics/_page/constants.ts` | Chart IDs and default sizes |
| `lib/charts/aggregations.ts` | Server-side data aggregation |

---

## Features

All charts include:
- **Fullscreen mode** - Expand button for mobile viewing
- **AI Insights** - `ChartAiInsightButton` for AI-generated analysis
- **Info Popover** - `ChartInfoPopover` with chart description
- **Favorite** - `ChartFavoriteButton` to mark favorite charts
- **Drag Handle** - `GridStackCardDragHandle` for layout customization
- **Lazy Loading** - `LazyChart` wrapper for below-fold charts (performance optimization)
- **Memoization** - All charts wrapped with `React.memo`

---

## Data Source

### Bundle API (Primary)

**Endpoint:** `/api/charts/analytics-bundle?filter=...`

Returns pre-aggregated data with Redis caching (5min TTL):
- KPIs (income, expense, net savings, counts)
- Category spending breakdown
- Daily spending trends
- Monthly category data
- Day-of-week patterns + by category
- Transaction history (swarm plot)
- Needs/Wants/Essentials classification
- Cash flow (sankey diagram)
- Daily by category (streamgraph)

**Context Provider:** `<AnalyticsDataProvider>` wraps Analytics page, charts use `useAnalyticsChartData()` hook.

### Cache Key Pattern
```
analytics:{userId}:{filter}:bundle
```

### How to Verify Bundle is Working

1. Open DevTools Network Tab (F12 → Network)
2. Navigate to Analytics page
3. Look for `analytics-bundle` request - should see ONE request with all chart data
4. Individual chart APIs should NOT be called if bundle is working

---

## Chart Libraries Used

| Library | Charts Using It |
|---------|-----------------|
| **Recharts** | Area charts, line charts |
| **Nivo** | Pie, TreeMap, Polar Bar, Funnel, Sankey, Swarm Plot |
| **ECharts** | Calendar heatmap, Bubble map, Bar charts |
| **Custom SVG** | Streamgraph, Day of week charts, Activity rings |

---

## Adding a New Chart

1. Create component in `components/chart-{name}.tsx`
2. Wrap with `React.memo` and add `displayName`
3. Add chart ID to `app/analytics/_page/constants.ts`
4. Add to `ChartsGrid.tsx` render logic
5. Add data to `lib/charts/aggregations.ts` if needed
6. **Update this document with the new chart**
