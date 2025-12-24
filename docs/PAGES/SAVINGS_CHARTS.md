# Savings Page Charts

This document lists all chart components used on the Savings page.

---

## Charts (1 total - more planned for future)

| # | Chart ID | Component File | Description |
|---|----------|----------------|-------------|
| 1 | savingsAccumulation | `chart-savings-accumulation.tsx` | Savings Accumulation Over Time |

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

## Chart Libraries Used

- **Recharts** - Area charts for accumulation visualization
