# Fridge Page Charts

This document lists all chart components used on the Fridge (Grocery) page.

---

## Charts (23 total)

| # | Component File | Description |
|---|----------------|-------------|
| 1 | `chart-area-interactive-fridge.tsx` | Grocery Spend Trend |
| 2 | `chart-category-flow-fridge.tsx` | Grocery Category Rankings |
| 3 | `chart-expense-breakdown-fridge.tsx` | Expense Breakdown Pie |
| 4 | `chart-macronutrient-breakdown-fridge.tsx` | Macronutrient Breakdown |
| 5 | `chart-snack-percentage-fridge.tsx` | Snack Percentage |
| 6 | `chart-empty-vs-nutritious-fridge.tsx` | Empty vs Nutritious Foods |
| 7 | `chart-daily-activity-fridge.tsx` | Daily Shopping Activity |
| 8 | `chart-day-of-week-category-fridge.tsx` | Day of Week Category |
| 9 | `chart-single-month-category-fridge.tsx` | Single Month Category |
| 10 | `chart-all-months-category-fridge.tsx` | All Months Category |
| 11 | `chart-day-of-week-spending-category-fridge.tsx` | Day of Week Spending by Category |
| 12 | `chart-time-of-day-shopping-fridge.tsx` | Time of Day Shopping |
| 13 | `chart-grocery-vs-restaurant-fridge.tsx` | Grocery vs Restaurant |
| 14 | `chart-transaction-history-fridge.tsx` | Transaction History |
| 15 | `chart-purchase-size-comparison-fridge.tsx` | Purchase Size Comparison |
| 16 | `chart-shopping-heatmap-hours-days-fridge.tsx` | Shopping Heatmap (Hours vs Days) |
| 17 | `chart-shopping-heatmap-days-months-fridge.tsx` | Shopping Heatmap (Days vs Months) |
| 18 | `chart-treemap-fridge.tsx` | Grocery TreeMap |
| 19 | `chart-day-of-week-spending-fridge.tsx` | Day of Week Spending |
| 20 | `chart-day-of-week-shopping-fridge.tsx` | Day of Week Shopping |
| 21 | `chart-time-of-day-spending-fridge.tsx` | Time of Day Spending |
| 22 | `chart-expenses-pie-fridge.tsx` | Expenses Pie Chart |
| 23 | `chart-polar-bar-fridge.tsx` | Polar Bar Chart |

---

## Features

All charts include:
- **Fullscreen mode** - Expand button for mobile viewing
- **AI Insights** - ChartAiInsightButton for AI-generated analysis
- **Info Popover** - ChartInfoPopover with chart description
- **Favorite** - ChartFavoriteButton to mark favorite charts
- **Drag Handle** - For layout customization

## Data Source

Fridge charts use receipt transaction data from uploaded grocery receipts, with categories assigned via AI or manual selection.

## Chart Libraries Used

- **Recharts** - Area charts
- **Nivo** - Pie, TreeMap, Polar Bar
- **ECharts** - Heatmaps, Bar charts
- **Custom SVG** - Various custom visualizations
