# Fridge Page Charts

This document lists all chart components used on the Fridge (Grocery/Receipt) page.

> **IMPORTANT:** When adding, modifying, or deleting charts on this page, update this document accordingly.

---

## Charts (18 total)

| # | Chart ID | Component File | Component Name | Description |
|---|----------|----------------|----------------|-------------|
| 1 | `grocerySpendTrend` | `chart-area-interactive-fridge.tsx` | `ChartAreaInteractiveFridge` | Grocery Spend Trend - Daily grocery totals over time |
| 2 | `groceryCategoryRankings` | `chart-category-flow-fridge.tsx` | `ChartCategoryFlowFridge` | Category Rankings - Bump chart showing category rank changes |
| 3 | `groceryExpenseBreakdown` | `chart-expense-breakdown-fridge.tsx` | `ChartExpenseBreakdownFridge` | Expense Breakdown Pie - Distribution across receipt categories |
| 4 | `groceryMacronutrientBreakdown` | `chart-macronutrient-breakdown-fridge.tsx` | `ChartMacronutrientBreakdownFridge` | Macronutrient Breakdown - Protein/carbs/fats distribution |
| 5 | `grocerySnackPercentage` | `chart-snack-percentage-fridge.tsx` | `ChartSnackPercentageFridge` | Snack Percentage - Percentage of purchases classified as snacks |
| 6 | `groceryEmptyVsNutritious` | `chart-empty-vs-nutritious-fridge.tsx` | `ChartEmptyVsNutritiousFridge` | Empty vs Nutritious Foods - Empty calories vs nutritious comparison |
| 7 | `groceryDailyActivity` | `chart-daily-activity-fridge.tsx` | `ChartDailyActivityFridge` | Daily Shopping Activity - Shopping frequency and spend per day |
| 8 | `groceryDayOfWeekCategory` | `chart-day-of-week-category-fridge.tsx` | `ChartDayOfWeekCategoryFridge` | Day of Week Category - Spending by category for each day |
| 9 | `grocerySingleMonthCategory` | `chart-single-month-category-fridge.tsx` | `ChartSingleMonthCategoryFridge` | Single Month Category - Detailed breakdown for selected month |
| 10 | `groceryAllMonthsCategory` | `chart-all-months-category-fridge.tsx` | `ChartAllMonthsCategoryFridge` | All Months Category - Category spending across all months |
| 11 | `groceryDayOfWeekSpending` | `chart-day-of-week-spending-category-fridge.tsx` | `ChartDayOfWeekSpendingCategoryFridge` | Day of Week Spending - Grouped view by day and category |
| 12 | `groceryTimeOfDay` | `chart-time-of-day-shopping-fridge.tsx` | `ChartTimeOfDayShoppingFridge` | Time of Day Shopping - Shopping activity by hour |
| 13 | `groceryVsRestaurant` | `chart-grocery-vs-restaurant-fridge.tsx` | `ChartGroceryVsRestaurantFridge` | Grocery vs Restaurant - Home food vs eating out comparison |
| 14 | `groceryTransactionHistory` | `chart-transaction-history-fridge.tsx` | `ChartTransactionHistoryFridge` | Transaction History - Swarm plot of receipt line items |
| 15 | `groceryPurchaseSizeComparison` | `chart-purchase-size-comparison-fridge.tsx` | `ChartPurchaseSizeComparisonFridge` | Purchase Size Comparison - Small vs large purchase patterns |
| 16 | `groceryShoppingHeatmapHoursDays` | `chart-shopping-heatmap-hours-days-fridge.tsx` | `ChartShoppingHeatmapHoursDaysFridge` | Shopping Heatmap (Hours/Days) - Activity by hour and day of week |
| 17 | `groceryShoppingHeatmapDaysMonths` | `chart-shopping-heatmap-days-months-fridge.tsx` | `ChartShoppingHeatmapDaysMonthsFridge` | Shopping Heatmap (Days/Months) - Activity by day and month |
| 18 | `groceryNetWorthAllocation` | `chart-treemap-fridge.tsx` | `ChartTreeMapFridge` | Net Worth Allocation - TreeMap of grocery spending by category |

---

## Additional Fridge Components (not in ChartsGrid)

These chart components exist but are not currently rendered in the main Fridge ChartsGrid:

| Component File | Component Name | Description |
|----------------|----------------|-------------|
| `chart-expenses-pie-fridge.tsx` | `ChartExpensesPieFridge` | Alternative pie chart for expenses |
| `chart-polar-bar-fridge.tsx` | `ChartPolarBarFridge` | Polar bar chart for store spending |
| `chart-day-of-week-spending-fridge.tsx` | `ChartDayOfWeekSpendingFridge` | Day of week spending (simpler version) |
| `chart-day-of-week-shopping-fridge.tsx` | `ChartDayOfWeekShoppingFridge` | Day of week shopping frequency |
| `chart-time-of-day-spending-fridge.tsx` | `ChartTimeOfDaySpendingFridge` | Time of day spending amounts |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/fridge/_client/components/ChartsGrid.tsx` | Renders all fridge charts |
| `app/fridge/_client/hooks/useFridgeChartData.ts` | Processes bundle data for charts |
| `app/fridge/_client/constants.ts` | Chart IDs and default sizes |
| `app/fridge/_client/types.ts` | TypeScript types including `FridgeChartId` |
| `lib/charts/fridge-aggregations.ts` | Server-side data aggregation |
| `components/fridge/` | All fridge-specific chart components |

---

## Features

All charts include:
- **Fullscreen mode** - Expand button for mobile viewing
- **AI Insights** - `ChartAiInsightButton` for AI-generated analysis
- **Info Popover** - `ChartInfoPopover` with chart description
- **Favorite** - `ChartFavoriteButton` to mark favorite charts
- **Drag Handle** - For layout customization
- **Lazy Loading** - `LazyChart` wrapper for all charts
- **Memoization** - All charts wrapped with `React.memo`

---

## Data Source

### Bundle API (Primary)

**Endpoint:** `/api/charts/fridge-bundle?filter=...`

Returns pre-aggregated data with Redis caching (5min TTL):
- Fridge KPIs (total spent, shopping trips, stores)
- Category spending with broad types
- Daily spending trends
- Store spending breakdown
- Macronutrient breakdown
- Hourly activity data
- Heatmap data (hour/day and day/month)
- Monthly categories data
- Day of week category data

**Context Provider:** Data passed via `useFridgeChartData()` hook.

### Cache Key Pattern
```
fridge:{userId}:{filter}:bundle
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `receipt_transactions` | Individual line items from receipts |
| `receipts` | Receipt metadata (store_name, total_amount, status) |
| `receipt_categories` | Category definitions |
| `receipt_category_types` | Category type definitions (Snack, Nutritious, etc.) |

---

## Chart Libraries Used

| Library | Charts Using It |
|---------|-----------------|
| **Recharts** | Area charts |
| **Nivo** | Pie, TreeMap, Polar Bar, Area Bump |
| **ECharts** | Heatmaps, Bar charts, Swarm plots |
| **Custom SVG** | Various custom visualizations |

---

## Adding a New Chart

1. Create component in `components/fridge/chart-{name}-fridge.tsx`
2. Wrap with `React.memo` and add `displayName`
3. Add chart ID to `app/fridge/_client/constants.ts`
4. Add to `FridgeChartId` type in `app/fridge/_client/types.ts`
5. Add to `ChartsGrid.tsx` render logic (both `chartTitles` and `renderChart`)
6. Add data to `lib/charts/fridge-aggregations.ts` if needed
7. **Update this document with the new chart**
