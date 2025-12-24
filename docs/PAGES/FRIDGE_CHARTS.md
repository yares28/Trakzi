# Fridge Page Charts

This document lists all chart components used on the Fridge (Grocery) page.

---

## Charts (23 total)

| # | Component File | Description | Data Fetching & Calculation |
|---|----------------|-------------|------------------------------|
| 1 | `chart-area-interactive-fridge.tsx` | Grocery Spend Trend - Daily grocery totals across selected time period | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by `receiptDate`. Daily totals calculated as sum of `totalPrice` per day. Data formatted as `{ date: YYYY-MM-DD, spend: totalAmount }[]`, sorted chronologically |
| 2 | `chart-category-flow-fridge.tsx` | Grocery Category Rankings - Tracks how grocery categories rank over time periods | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by time period (week/month) and `categoryName`. Category rankings calculated per period based on total spending. Data formatted as area bump chart: `{ id: category, data: [{ x: period, y: rank }] }[]` |
| 3 | `chart-expense-breakdown-fridge.tsx` | Expense Breakdown Pie - Distribution of grocery expenses across receipt categories | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by `categoryName`. Totals calculated as sum of `totalPrice` per category. Data formatted as `{ id: category, label: category, value: totalAmount }[]`, sorted by value descending |
| 4 | `chart-macronutrient-breakdown-fridge.tsx` | Macronutrient Breakdown - Shows macronutrient distribution from food purchases | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions analyzed for macronutrient data (if available). Grouped by macronutrient type (protein, carbs, fats). Totals calculated per macronutrient |
| 5 | `chart-snack-percentage-fridge.tsx` | Snack Percentage - Percentage of purchases classified as snacks | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions filtered by snack category or item classification. Snack percentage = (snack total / total purchases) × 100 |
| 6 | `chart-empty-vs-nutritious-fridge.tsx` | Empty vs Nutritious Foods - Comparison of empty calories vs nutritious food purchases | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions classified as "empty calories" or "nutritious" based on category/item metadata. Totals calculated for each classification |
| 7 | `chart-daily-activity-fridge.tsx` | Daily Shopping Activity - Shows shopping frequency and activity per day | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by `receiptDate`. Activity metrics calculated: transaction count, unique stores, total spend per day. Data formatted as `{ date, activity: count, stores: count, spend: amount }[]` |
| 8 | `chart-day-of-week-category-fridge.tsx` | Day of Week Category - Spending by category for each day of week | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by day of week (derived from `receiptDate`) and `categoryName`. Totals calculated per day-category combination. Data formatted as `{ dayOfWeek: 0-6, category, amount }[]` |
| 9 | `chart-single-month-category-fridge.tsx` | Single Month Category - Detailed category breakdown for selected month | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions filtered to selected month. Grouped by `categoryName`, summing `totalPrice`. Data formatted as `{ category, amount }[]` for selected month |
| 10 | `chart-all-months-category-fridge.tsx` | All Months Category - Category spending across all months | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by month (extracted from `receiptDate`) and `categoryName`. Monthly totals calculated per category. Data formatted as `{ month, category, amount }[]` |
| 11 | `chart-day-of-week-spending-category-fridge.tsx` | Day of Week Spending by Category - Grouped view of spending by day and category | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by day of week and `categoryName`. Totals calculated per day-category. Similar to chart #8 but with different visualization (grouped bars) |
| 12 | `chart-time-of-day-shopping-fridge.tsx` | Time of Day Shopping - Shopping activity by time of day | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by `receiptTime` (hour extracted). Activity metrics calculated per hour: transaction count, total spend, average transaction size. Data formatted as `{ hour: 0-23, count, spend, avg }[]` |
| 13 | `chart-grocery-vs-restaurant-fridge.tsx` | Grocery vs Restaurant - Comparison of grocery store vs restaurant spending | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions classified by `storeName` or category as "Grocery" or "Restaurant". Totals calculated for each type. May also use transaction category classification |
| 14 | `chart-transaction-history-fridge.tsx` | Transaction History - Swarm plot of individual receipt line items | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Each receipt transaction becomes a data point. Volume calculated from `quantity` (affects dot size). Data formatted as `{ id, group: category, price: totalPrice, volume, category, color, date: receiptDate, description, storeName }[]` |
| 15 | `chart-purchase-size-comparison-fridge.tsx` | Purchase Size Comparison - Compares small vs large purchase patterns | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions classified by purchase size (based on `totalPrice` or `receipt_total_amount`). Thresholds determine small/large. Totals and counts calculated per size category |
| 16 | `chart-shopping-heatmap-hours-days-fridge.tsx` | Shopping Heatmap (Hours vs Days) - Heatmap showing shopping activity by hour and day | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by day of week and hour (from `receiptTime`). Activity intensity calculated per hour-day combination. Uses ECharts heatmap with hours (0-23) × days (Mon-Sun) |
| 17 | `chart-shopping-heatmap-days-months-fridge.tsx` | Shopping Heatmap (Days vs Months) - Heatmap showing shopping activity by day and month | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by month and day of month (from `receiptDate`). Activity intensity calculated per day-month combination. Uses ECharts heatmap with days (1-31) × months |
| 18 | `chart-treemap-fridge.tsx` | Grocery TreeMap - Hierarchical view of grocery spending by category | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by `categoryName`. TreeMap structure: root → categories → individual items. Each node contains `{ name, loc: totalPrice }`. Data formatted as nested tree structure |
| 19 | `chart-day-of-week-spending-fridge.tsx` | Day of Week Spending - Total spending per day of week | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by day of week (from `receiptDate`). Totals calculated per day. Data formatted as `{ dayOfWeek: 0-6, dayName, total }[]` |
| 20 | `chart-day-of-week-shopping-fridge.tsx` | Day of Week Shopping - Shopping frequency per day of week | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by day of week. Shopping frequency calculated as count of unique shopping trips per day. May also show average transaction size per day |
| 21 | `chart-time-of-day-spending-fridge.tsx` | Time of Day Spending - Spending amounts by time of day | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by hour (from `receiptTime`). Total spending calculated per hour. Data formatted as `{ hour: 0-23, spend: totalAmount }[]` |
| 22 | `chart-expenses-pie-fridge.tsx` | Expenses Pie Chart - Pie chart of grocery expenses by category | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by `categoryName`. Totals calculated as sum of `totalPrice` per category. Similar to chart #3 but with different visualization style. Data formatted as `{ id: category, label: category, value: totalAmount }[]` |
| 23 | `chart-polar-bar-fridge.tsx` | Polar Bar Chart - Circular bar chart of grocery spending | **Fetched from:** `/api/fridge?limit=5000` (with optional date filter). **Calculated:** Receipt transactions grouped by time period (month/week) and `categoryName`. Monthly totals calculated per category. Data formatted as `{ month, category1: amount, category2: amount, ... }[]` for polar bar visualization |

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

**Primary endpoint:** `/api/fridge?limit=5000` (with optional date filter via `?filter=` parameter)

**Database tables:**
- `receipt_transactions` - Individual line items from receipts (description, quantity, price_per_unit, total_price, category_id, receipt_date, receipt_time)
- `receipts` - Receipt metadata (store_name, total_amount, receipt_date, status)
- `receipt_categories` - Category definitions (name, color)
- `receipt_category_types` - Category type definitions (name, color)

**Data Processing:** Receipt transactions are fetched via SQL JOIN across these tables. Client-side calculations (grouping, summing, filtering) performed using React `useMemo` hooks. Date filters applied at API level, with additional client-side filtering for category visibility controls.

## Chart Libraries Used

- **Recharts** - Area charts
- **Nivo** - Pie, TreeMap, Polar Bar
- **ECharts** - Heatmaps, Bar charts
- **Custom SVG** - Various custom visualizations
