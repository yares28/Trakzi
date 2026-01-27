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
| 4 | `transactionHistory` | `chart-swarm-plot.tsx` | `ChartSwarmPlot` | Transaction History Swarm Plot - Individual transactions as dots grouped by category |
| 5 | `moneyFlow` | `chart-spending-funnel.tsx` | `ChartSpendingFunnel` | Money Flow Funnel - Shows money flow through different stages |
| 6 | `householdSpendMix` | `chart-polar-bar.tsx` | `ChartPolarBar` | Household Spend Mix - Circular stacked chart of monthly expenses by category |
| 7 | `needsWantsBreakdown` | `chart-needs-wants-pie.tsx` | `ChartNeedsWantsPie` | Needs vs Wants Breakdown - Groups spending into Essentials, Mandatory, Wants |
| 8 | `expenseBreakdown` | `chart-expenses-pie.tsx` | `ChartExpensesPie` | Expense Breakdown Pie - Distribution across spending categories |
| 9 | `netWorthAllocation` | `chart-treemap.tsx` | `ChartTreeMap` | Net Worth Allocation TreeMap - Hierarchical breakdown of spending |
| 10 | `cashFlowSankey` | `chart-sankey.tsx` | `ChartSankey` | Cash Flow Sankey Diagram - Income flow through expenses to savings |
| 11 | `spendingStreamgraph` | `chart-spending-streamgraph.tsx` | `ChartSpendingStreamgraph` | Category Streamgraph - Spending trends by category as flowing areas |
| 12 | `dailyTransactionActivity` | `chart-transaction-calendar.tsx` | `ChartTransactionCalendar` | Daily Transaction Calendar - Heatmap showing activity intensity per day |
| 13 | `categoryBubbleMap` | `chart-category-bubble.tsx` | `ChartCategoryBubble` | Category Bubble Map - Bubble chart with size/position encoding |
| 14 | `dayOfWeekSpending` | `chart-day-of-week-spending.tsx` | `ChartDayOfWeekSpending` | Day of Week Spending - Grouped bar chart by day and category |
| 15 | `allMonthsCategorySpending` | `chart-all-months-category-spending.tsx` | `ChartAllMonthsCategorySpending` | All Months Category Spending - Spending by category across all months |
| 16 | `singleMonthCategorySpending` | `chart-single-month-category-spending.tsx` | `ChartSingleMonthCategorySpending` | Single Month Category Spending - Detailed breakdown for selected month |
| 17 | `dayOfWeekCategory` | `chart-day-of-week-category.tsx` | `ChartDayOfWeekCategory` | Day of Week Category - Spending breakdown by day and category |
| 18 | `financialHealthScore` | `chart-radar.tsx` | `ChartRadar` | Financial Health Score - Radar chart of financial health metrics |
| 19 | `spendingActivityRings` | `SpendingActivityRings.tsx` | `SpendingActivityRings` | Spending Activity Rings - Concentric rings showing category progress vs limits |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/analytics/_page/components/ChartsGrid.tsx` | Renders all analytics charts |
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
