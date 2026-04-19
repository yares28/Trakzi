# Income & Expenses — "Net" Weekly View

**Date:** 2026-03-31
**Scope:** `incomeExpensesTracking2` chart ("Income & Expenses") only
**Status:** Approved

---

## Summary

Add a third pill button ("Net") to the existing Basic / Cumulative switcher on the "Income & Expenses" chart. The Net view renders a single-line area chart with weekly granularity on the X axis, showing `income − expenses` per week. Negative weeks (expenses > income) dip below zero; the Y axis is fully dynamic so the range always fits the data.

---

## Data

**Source:** Same filtered `rawTransactions` as the Basic view (respects the same category visibility toggle).

**Computation (`useAnalyticsChartData.ts`):**
- Add `weeklyNetDiffData` memoized alongside the existing `incomeExpenseCumulativeData`
- Group transactions by ISO week (Monday = week start, key = `"YYYY-MM-DD"` of that Monday)
- Per week: `net = Σ income − Σ |expenses|` (income = `amount > 0`, expenses = `amount < 0`)
- Output shape: `{ date: string, net: number }[]`, sorted ascending by date

**Wiring:**
- Pass `netData={weeklyNetDiffData}` to the `ChartAreaInteractive` component for `incomeExpensesTracking2` in `ChartsGrid.tsx`

---

## Component (`chart-area-interactive.tsx`)

### Props
Add one optional prop:
```ts
netData?: Array<{ date: string; net: number }>
```

### View Mode
```ts
type IncomeAreaViewMode = "basic" | "cumulative" | "net"
```
The pill switcher gains a third "Net" button. It only renders when `netData !== undefined`.

### Net Chart
- `AreaChart` with a single `Area dataKey="net"` — same animation, gradient, and stroke style as Basic
- Color: mid-palette color (index `Math.floor(palette.length / 2)`)
- `YAxis` with `domain={['auto', 'auto']}` — dynamic range, no zero-lock
- `ReferenceLine y={0}` — thin dashed line for orientation without anchoring the axis
- X-axis tick formatter: week-start date formatted as `"Jan 6"` (same `formatDateForDisplay` helper)
- Tooltip (portal system): shows week-start date + `Net: ±$X` using the existing `formatCurrency` util

### Isolation guarantee
The `"basic"` and `"cumulative"` branches are untouched. The new `"net"` branch is additive only — a separate conditional renders when `viewMode === "net"`.

---

## Empty / Loading States
- If `netData` is undefined or empty and `viewMode === "net"`, render `ChartLoadingState` with message "No data for this view"
- `shouldShowEmptyCard` guard updated to include `netData` check when all three datasets are empty

---

## Fullscreen Modal
The Net view renders inside `ChartFullscreenModal` using the same pattern as Basic/Cumulative (inline chart, no portal tooltip).

---

## Non-Goals
- No change to `incomeExpensesTracking1`
- No server-side bundle change — `weeklyNetDiffData` is computed client-side from `rawTransactions` (same as cumulative data)
- No new chart ID, no docs table entry (same component, same chart ID)

---

## Files Changed

| File | Change |
|------|--------|
| `app/analytics/_page/hooks/useAnalyticsChartData.ts` | Add `weeklyNetDiffData` memo |
| `app/analytics/_page/components/ChartsGrid.tsx` | Pass `netData` prop |
| `components/chart-area-interactive.tsx` | Add `netData` prop, `"net"` view mode, Net chart branch |
