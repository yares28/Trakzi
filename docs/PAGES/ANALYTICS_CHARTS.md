# Analytics Page Charts

This document lists all chart components used on the Analytics page.

---

## Charts (17 total)

| # | Chart ID | Component File | Description |
|---|----------|----------------|-------------|
| 1 | incomeExpensesTracking1 | `chart-area-interactive.tsx` | Income & Expenses Tracking |
| 2 | incomeExpensesTracking2 | `chart-area-interactive.tsx` | Income & Expenses Tracking (duplicate) |
| 3 | spendingCategoryRankings | `chart-category-flow.tsx` | Spending Category Rankings |
| 4 | transactionHistory | `chart-swarm-plot.tsx` | Transaction History Swarm Plot |
| 5 | moneyFlow | `chart-spending-funnel.tsx` | Money Flow Funnel |
| 6 | householdSpendMix | `chart-polar-bar.tsx` | Household Spend Mix Polar Bar |
| 7 | needsWantsBreakdown | `chart-needs-wants-pie.tsx` | Needs vs Wants Breakdown |
| 8 | expenseBreakdown | `chart-expenses-pie.tsx` | Expense Breakdown Pie |
| 9 | netWorthAllocation | `chart-treemap.tsx` | Net Worth Allocation TreeMap |
| 10 | cashFlowSankey | `chart-sankey.tsx` | Cash Flow Sankey Diagram |
| 11 | spendingStreamgraph | `chart-spending-streamgraph.tsx` | Category Streamgraph |
| 12 | dailyTransactionActivity | `chart-transaction-calendar.tsx` | Daily Transaction Calendar Heatmap |
| 13 | categoryBubbleMap | `chart-category-bubble.tsx` | Category Bubble Map |
| 14 | dayOfWeekSpending | `chart-day-of-week-spending.tsx` | Day of Week Spending |
| 15 | allMonthsCategorySpending | `chart-all-months-category-spending.tsx` | All Months Category Spending |
| 16 | singleMonthCategorySpending | `chart-single-month-category-spending.tsx` | Single Month Category Spending |
| 17 | dayOfWeekCategory | `chart-day-of-week-category.tsx` | Day of Week Category |

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
