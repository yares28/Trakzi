# Income & Expenses — "Net" Weekly Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "Net" pill button to the "Income & Expenses" chart (`incomeExpensesTracking2`) that renders a single area chart with weekly X-axis granularity showing `income − expenses` per week, with a dynamic Y-axis that properly handles negative-dominant datasets.

**Architecture:** A pure utility function (`lib/charts/weekly-net.ts`) computes the weekly net values from raw transactions. The hook (`useAnalyticsChartData.ts`) calls this function inside a `useMemo` and returns `weeklyNetDiffData`. The component (`chart-area-interactive.tsx`) receives it as an optional `netData` prop and adds a "Net" pill button that renders a separate `AreaChart` branch with `YAxis domain={['auto','auto']}` and a `ReferenceLine y={0}`.

**Tech Stack:** TypeScript, React 19, Recharts (`AreaChart`, `Area`, `YAxis`, `ReferenceLine`, `CartesianGrid`, `XAxis`, `Tooltip`), Jest + jsdom

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/charts/weekly-net.ts` | **Create** | Pure functions: `getIsoWeekStart`, `computeWeeklyNet` |
| `__tests__/lib/weekly-net.test.ts` | **Create** | Unit tests for the above |
| `app/analytics/_page/hooks/useAnalyticsChartData.ts` | **Modify** | Add `weeklyNetDiffData` memo + export |
| `components/chart-area-interactive.tsx` | **Modify** | Add `netData` prop, `"net"` view mode, Net chart |
| `app/analytics/_page/components/ChartsGrid.tsx` | **Modify** | Pass `netData={weeklyNetDiffData}` |

---

## Task 1: Pure weekly-net utility + tests

**Files:**
- Create: `lib/charts/weekly-net.ts`
- Create: `__tests__/lib/weekly-net.test.ts`

- [ ] **Step 1: Create the utility file**

```typescript
// lib/charts/weekly-net.ts

/**
 * Returns the ISO Monday (week start) for a given date string "YYYY-MM-DD".
 * ISO week: Monday = day 1, Sunday = day 7.
 */
export function getIsoWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  const day = d.getDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const diff = day === 0 ? -6 : 1 - day // shift back to Monday
  d.setDate(d.getDate() + diff)
  // Return as YYYY-MM-DD in local time
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export interface WeeklyNetPoint {
  /** Monday of the week, formatted YYYY-MM-DD */
  date: string
  /** Sum of all transaction amounts for that week (income positive, expenses negative) */
  net: number
}

/**
 * Groups transactions by ISO week and returns net (income − expenses) per week.
 * Respects the same category visibility as the Basic view.
 */
export function computeWeeklyNet(
  transactions: Array<{ date: string; amount: number; category?: string | null }>,
  hiddenCategorySet: Set<string>,
  normalizeCategoryName: (cat: string) => string,
): WeeklyNetPoint[] {
  const filtered =
    hiddenCategorySet.size === 0
      ? transactions
      : transactions.filter((tx) => {
          const cat = normalizeCategoryName(tx.category ?? "")
          return !hiddenCategorySet.has(cat)
        })

  const weekMap = new Map<string, number>()
  for (const tx of filtered) {
    const weekStart = getIsoWeekStart(tx.date.split("T")[0])
    weekMap.set(weekStart, (weekMap.get(weekStart) ?? 0) + tx.amount)
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, net]) => ({ date, net: Math.round(net * 100) / 100 }))
}
```

- [ ] **Step 2: Write the tests**

```typescript
// __tests__/lib/weekly-net.test.ts
import { computeWeeklyNet, getIsoWeekStart } from "@/lib/charts/weekly-net"

const noop = (s: string) => s.toLowerCase()

describe("getIsoWeekStart", () => {
  it("returns the same Monday for a Monday input", () => {
    expect(getIsoWeekStart("2024-01-08")).toBe("2024-01-08")
  })

  it("returns the previous Monday for a Sunday input", () => {
    expect(getIsoWeekStart("2024-01-07")).toBe("2024-01-01")
  })

  it("returns the correct Monday for a mid-week Wednesday", () => {
    expect(getIsoWeekStart("2024-01-10")).toBe("2024-01-08")
  })

  it("returns the correct Monday for a Saturday", () => {
    expect(getIsoWeekStart("2024-01-13")).toBe("2024-01-08")
  })
})

describe("computeWeeklyNet", () => {
  it("returns empty array for empty transactions", () => {
    expect(computeWeeklyNet([], new Set(), noop)).toEqual([])
  })

  it("sums net per week across multiple days", () => {
    const txs = [
      { date: "2024-01-08", amount: 1000 }, // Mon week 1
      { date: "2024-01-09", amount: -200 }, // Tue week 1
      { date: "2024-01-15", amount: -300 }, // Mon week 2
    ]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result).toEqual([
      { date: "2024-01-08", net: 800 },
      { date: "2024-01-15", net: -300 },
    ])
  })

  it("handles negative-dominant weeks (expenses > income)", () => {
    const txs = [
      { date: "2024-01-08", amount: -500 },
      { date: "2024-01-08", amount: -300 },
      { date: "2024-01-08", amount: 100 },
    ]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result).toEqual([{ date: "2024-01-08", net: -700 }])
  })

  it("filters out hidden categories", () => {
    const txs = [
      { date: "2024-01-08", amount: 1000, category: "Income" },
      { date: "2024-01-08", amount: -200, category: "Rent" },
    ]
    const result = computeWeeklyNet(txs, new Set(["rent"]), noop)
    expect(result).toEqual([{ date: "2024-01-08", net: 1000 }])
  })

  it("returns results sorted ascending by week date", () => {
    const txs = [
      { date: "2024-01-22", amount: 50 }, // later week
      { date: "2024-01-08", amount: 100 }, // earlier week
    ]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result[0].date).toBe("2024-01-08")
    expect(result[1].date).toBe("2024-01-22")
  })

  it("rounds net to 2 decimal places", () => {
    const txs = [{ date: "2024-01-08", amount: 0.1 }, { date: "2024-01-08", amount: 0.2 }]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result[0].net).toBe(0.3)
  })

  it("groups Sunday transactions into previous Monday's week", () => {
    const txs = [
      { date: "2024-01-07", amount: 400 }, // Sunday → week of 2024-01-01
      { date: "2024-01-08", amount: 200 }, // Monday → new week 2024-01-08
    ]
    const result = computeWeeklyNet(txs, new Set(), noop)
    expect(result).toEqual([
      { date: "2024-01-01", net: 400 },
      { date: "2024-01-08", net: 200 },
    ])
  })
})
```

- [ ] **Step 3: Run the tests — expect them to pass**

```bash
npm test -- __tests__/lib/weekly-net.test.ts --no-coverage
```

Expected: all 10 tests pass. Fix any failures before proceeding.

- [ ] **Step 4: Commit**

```bash
git add lib/charts/weekly-net.ts __tests__/lib/weekly-net.test.ts
git commit -m "feat: add computeWeeklyNet pure utility with tests"
```

---

## Task 2: Add `weeklyNetDiffData` to the analytics hook

**Files:**
- Modify: `app/analytics/_page/hooks/useAnalyticsChartData.ts`

- [ ] **Step 1: Add the import at the top of the hook file**

Find the existing imports block (around line 1–30). Add:

```typescript
import { computeWeeklyNet, type WeeklyNetPoint } from "@/lib/charts/weekly-net"
```

- [ ] **Step 2: Add the `weeklyNetDiffData` memo**

Find `incomeExpenseCumulativeData` (ends around line 1438). Directly after its closing `}, [...]` line, insert:

```typescript
  /** Weekly net (income − expenses) for the Net tab of the Income & Expenses chart. */
  const weeklyNetDiffData = useMemo((): WeeklyNetPoint[] => {
    if (!rawTransactions || rawTransactions.length === 0) return []
    return computeWeeklyNet(
      rawTransactions,
      incomeExpenseVisibility.hiddenCategorySet,
      normalizeCategoryName,
    )
  }, [rawTransactions, incomeExpenseVisibility.hiddenCategorySet, normalizeCategoryName, dateFilter])
```

- [ ] **Step 3: Add `weeklyNetDiffData` to the hook's return object**

Find the `return {` block (around line 1646). Add `weeklyNetDiffData,` alongside the existing `incomeExpenseCumulativeData` entry:

```typescript
    incomeExpenseCumulativeData,
    weeklyNetDiffData,
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add app/analytics/_page/hooks/useAnalyticsChartData.ts
git commit -m "feat: compute weeklyNetDiffData in analytics hook"
```

---

## Task 3: Update `ChartAreaInteractive` — props, view mode, and Net chart

**Files:**
- Modify: `components/chart-area-interactive.tsx`

This is the largest task. Work through it in sub-steps.

### 3a — Recharts imports

- [ ] **Step 1: Add `YAxis` and `ReferenceLine` to the recharts import**

Find (line 5–12):
```typescript
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  Tooltip,
  TooltipProps,
} from "recharts";
```

Replace with:
```typescript
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  TooltipProps,
} from "recharts";
```

### 3b — Props interface

- [ ] **Step 2: Add `netData` prop to `ChartAreaInteractiveProps`**

Find (line 43–65):
```typescript
interface ChartAreaInteractiveProps {
  data?: Array<{
    date: string;
    desktop: number;
    mobile: number;
  }>;
  /**
   * When set, shows a Basic / Cumulative segmented control (same cumulative rules as the dedicated cumulative chart).
   * Series respects the same category visibility as `data`.
   */
  cumulativeData?: Array<{
    date: string;
    desktop: number;
    mobile: number;
  }>;
  categoryControls?: ChartInfoPopoverCategoryControls;
  chartId?: ChartId;
  /** Custom title for the chart card. Defaults to "Income & Expenses Cumulative Tracking" */
  title?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}
```

Replace with:
```typescript
interface ChartAreaInteractiveProps {
  data?: Array<{
    date: string;
    desktop: number;
    mobile: number;
  }>;
  /**
   * When set, shows a Basic / Cumulative segmented control (same cumulative rules as the dedicated cumulative chart).
   * Series respects the same category visibility as `data`.
   */
  cumulativeData?: Array<{
    date: string;
    desktop: number;
    mobile: number;
  }>;
  /**
   * When set, adds a "Net" pill button showing weekly net cash flow (income − expenses).
   * One data point per week (Monday = week start).
   */
  netData?: Array<{
    date: string;
    net: number;
  }>;
  categoryControls?: ChartInfoPopoverCategoryControls;
  chartId?: ChartId;
  /** Custom title for the chart card. Defaults to "Income & Expenses Cumulative Tracking" */
  title?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}
```

### 3c — View mode type and destructuring

- [ ] **Step 3: Expand the view mode type**

Find (line 181):
```typescript
type IncomeAreaViewMode = "basic" | "cumulative";
```

Replace with:
```typescript
type IncomeAreaViewMode = "basic" | "cumulative" | "net";
```

- [ ] **Step 4: Add `netData` to function signature destructuring**

Find (line 183–192):
```typescript
export const ChartAreaInteractive = memo(function ChartAreaInteractive({
  data = [],
  cumulativeData,
  categoryControls,
  chartId = "incomeExpensesTracking1",
  title = DEFAULT_CHART_TITLE,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartAreaInteractiveProps) {
```

Replace with:
```typescript
export const ChartAreaInteractive = memo(function ChartAreaInteractive({
  data = [],
  cumulativeData,
  netData,
  categoryControls,
  chartId = "incomeExpensesTracking1",
  title = DEFAULT_CHART_TITLE,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartAreaInteractiveProps) {
```

### 3d — Tooltip state extension

- [ ] **Step 5: Extend the tooltip state type to hold `net`**

Find (line 196–200):
```typescript
  const [tooltip, setTooltip] = useState<{
    date: string;
    income: number;
    expenses: number;
  } | null>(null);
```

Replace with:
```typescript
  const [tooltip, setTooltip] = useState<{
    date: string;
    income: number;
    expenses: number;
    net?: number;
  } | null>(null);
```

### 3e — Net color

- [ ] **Step 6: Derive `netColor` from the palette**

Find the block where `expensesColor` and `incomeColor` are computed (around line 235–237):
```typescript
  const expensesColor = palette[1] || palette[0];
  const incomeColor =
    palette[palette.length - 2] || palette[palette.length - 1] || palette[0];
```

Add `netColor` immediately after:
```typescript
  const expensesColor = palette[1] || palette[0];
  const incomeColor =
    palette[palette.length - 2] || palette[palette.length - 1] || palette[0];
  const netColor = palette[Math.floor(palette.length / 2)] || palette[0];
```

### 3f — Net chart config

- [ ] **Step 7: Add net chart config alongside the existing `chartConfig`**

Find the closing of `chartConfig` (around line 258):
```typescript
  } satisfies ChartConfig;
```

After that line, add:
```typescript
  const netChartConfig = {
    net: {
      label: "Net",
      theme: {
        light: netColor,
        dark: netColor,
      },
    },
  } satisfies ChartConfig;
```

### 3g — View switcher and empty state

- [ ] **Step 8: Update `showViewSwitcher` to include `netData`**

Find (line 264):
```typescript
  const showViewSwitcher = cumulativeData !== undefined;
```

Replace with:
```typescript
  const showViewSwitcher = cumulativeData !== undefined || netData !== undefined;
```

- [ ] **Step 9: Add `hasNetData` and update `shouldShowEmptyCard`**

Find (line 265–266):
```typescript
  const hasBasicData = data.length > 0;
  const hasCumulativeData = (cumulativeData?.length ?? 0) > 0;
```

Replace with:
```typescript
  const hasBasicData = data.length > 0;
  const hasCumulativeData = (cumulativeData?.length ?? 0) > 0;
  const hasNetData = (netData?.length ?? 0) > 0;
```

Find (line 273–276):
```typescript
  const shouldShowEmptyCard =
    isLoading ||
    (!showViewSwitcher && (!data || data.length === 0)) ||
    (showViewSwitcher && !hasBasicData && !hasCumulativeData);
```

Replace with:
```typescript
  const shouldShowEmptyCard =
    isLoading ||
    (!showViewSwitcher && (!data || data.length === 0)) ||
    (showViewSwitcher && !hasBasicData && !hasCumulativeData && !hasNetData);
```

### 3h — Pill switcher: add "Net" button

- [ ] **Step 10: Add the "Net" button to the view mode switcher**

Find the pill switcher block (line 278–300):
```typescript
  const viewModeSwitcherControl =
    showViewSwitcher && (hasBasicData || hasCumulativeData) ? (
      <div
        className="flex shrink-0 items-center justify-start text-center rounded-full bg-muted p-px text-xs leading-tight"
        role="group"
        aria-label="Income and expenses view mode"
      >
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "basic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setViewMode("basic")}
        >
          Basic
        </button>
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "cumulative" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setViewMode("cumulative")}
        >
          Cumulative
        </button>
      </div>
    ) : null;
```

Replace with:
```typescript
  const viewModeSwitcherControl =
    showViewSwitcher && (hasBasicData || hasCumulativeData || hasNetData) ? (
      <div
        className="flex shrink-0 items-center justify-start text-center rounded-full bg-muted p-px text-xs leading-tight"
        role="group"
        aria-label="Income and expenses view mode"
      >
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "basic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setViewMode("basic")}
        >
          Basic
        </button>
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "cumulative" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setViewMode("cumulative")}
        >
          Cumulative
        </button>
        {netData !== undefined && (
          <button
            type="button"
            className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "net" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setViewMode("net")}
          >
            Net
          </button>
        )}
      </div>
    ) : null;
```

### 3i — Net chart in the Card view

- [ ] **Step 11: Replace the card's inner chart div with a net/basic-cumulative branch**

Find the chart container in the Card (around line 546–670). It currently starts with:
```typescript
            <div ref={chartContainerRef} className="h-full">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-full w-full min-w-0"
              >
                <AreaChart data={chartData}>
```

And ends just before the closing `</div>` of the `ref={containerRef}` block. Replace the inner `<div ref={chartContainerRef}>` block entirely with:

```typescript
            <div ref={chartContainerRef} className="h-full">
              {viewMode === "net" ? (
                <ChartContainer
                  config={netChartConfig}
                  className="aspect-auto h-full w-full min-w-0"
                >
                  <AreaChart data={useRealData ? (netData ?? []) : []}>
                    <defs>
                      <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={netColor} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={netColor} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke={gridStrokeColor}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value) =>
                        formatDateForDisplay(String(value), "en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      width={68}
                      tickFormatter={(v: number) => {
                        const abs = Math.abs(v)
                        const sign = v < 0 ? "-" : ""
                        if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
                        return `${sign}$${abs.toFixed(0)}`
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke={gridStrokeColor}
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                    <Tooltip
                      cursor={false}
                      content={(props: TooltipProps<number, string>) => {
                        const { active, payload, coordinate } = props
                        if (!active || !payload || !payload.length || !coordinate) {
                          queueMicrotask(() => {
                            setTooltip(null)
                            setTooltipPosition(null)
                          })
                          return null
                        }
                        const d = payload[0].payload
                        const date = d.date
                        const net = d.net ?? 0
                        if (containerRef.current && coordinate) {
                          const rect = containerRef.current.getBoundingClientRect()
                          const basePosition = mousePositionRef.current ?? {
                            x: rect.left + (coordinate.x ?? 0),
                            y: rect.top + (coordinate.y ?? 0),
                          }
                          queueMicrotask(() => {
                            setTooltipPosition(basePosition)
                            setTooltip({ date, income: 0, expenses: 0, net })
                          })
                        }
                        return null
                      }}
                    />
                    <Area
                      dataKey="net"
                      type="natural"
                      fill="url(#fillNet)"
                      stroke={netColor}
                      strokeWidth={1}
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-full w-full min-w-0"
                >
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="fillDesktop"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-desktop)"
                          stopOpacity={1.0}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-desktop)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-mobile)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-mobile)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke={gridStrokeColor}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value) => {
                        return formatDateForDisplay(String(value), "en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }}
                    />
                    <Tooltip
                      cursor={false}
                      content={(props: TooltipProps<number, string>) => {
                        const { active, payload, coordinate } = props

                        if (
                          !active ||
                          !payload ||
                          !payload.length ||
                          !coordinate
                        ) {
                          queueMicrotask(() => {
                            setTooltip(null)
                            setTooltipPosition(null)
                          })
                          return null
                        }

                        const data = payload[0].payload
                        const date = data.date
                        const income = data.desktop || 0
                        const expenses = data.mobile || 0

                        if (containerRef.current && coordinate) {
                          const rect = containerRef.current.getBoundingClientRect()
                          const basePosition = mousePositionRef.current ?? {
                            x: rect.left + (coordinate.x ?? 0),
                            y: rect.top + (coordinate.y ?? 0),
                          }
                          queueMicrotask(() => {
                            setTooltipPosition(basePosition)
                            setTooltip({ date, income, expenses })
                          })
                        }

                        return null
                      }}
                    />
                    <Area
                      dataKey="desktop"
                      type="natural"
                      fill="url(#fillDesktop)"
                      stroke={incomeBorderColor}
                      strokeWidth={1}
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Area
                      dataKey="mobile"
                      type="natural"
                      fill="url(#fillMobile)"
                      stroke={expensesBorderColor}
                      strokeWidth={1}
                      isAnimationActive={true}
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </div>
```

### 3j — Tooltip portal: add Net row

- [ ] **Step 12: Update the portal tooltip to show Net value when in net mode**

Find the portal tooltip content (around line 710–742). The existing content div shows date, Income row, and Expenses row. Replace the inner content with a branch that checks for `tooltip.net`:

```typescript
                  <div className="font-medium text-foreground mb-2 whitespace-nowrap">
                    {formatDateForDisplay(tooltip.date, "en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {tooltip.net !== undefined ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-border/50"
                        style={{ backgroundColor: netColor, borderColor: netColor }}
                      />
                      <span className="text-foreground/80">Net:</span>
                      <span className="font-mono text-[0.7rem] text-foreground font-medium">
                        {tooltip.net >= 0 ? "+" : ""}
                        {valueFormatter.format(tooltip.net)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-border/50"
                          style={{
                            backgroundColor: incomeBorderColor,
                            borderColor: incomeBorderColor,
                          }}
                        />
                        <span className="text-foreground/80">Income:</span>
                        <span className="font-mono text-[0.7rem] text-foreground font-medium">
                          {valueFormatter.format(tooltip.income)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-border/50"
                          style={{
                            backgroundColor: expensesBorderColor,
                            borderColor: expensesBorderColor,
                          }}
                        />
                        <span className="text-foreground/80">Expenses:</span>
                        <span className="font-mono text-[0.7rem] text-foreground font-medium">
                          {valueFormatter.format(tooltip.expenses)}
                        </span>
                      </div>
                    </>
                  )}
```

### 3k — Net chart in the Fullscreen modal

- [ ] **Step 13: Add the Net chart branch inside `ChartFullscreenModal`**

Find the fullscreen chart (around line 441–507). It currently has `<ChartContainer config={chartConfig} ...><AreaChart data={filteredData}>...`. Replace the `<ChartContainer>` block inside the fullscreen with a branch:

```typescript
              {viewMode === "net" ? (
                <ChartContainer config={netChartConfig} className="h-full w-full">
                  <AreaChart data={useRealData ? (netData ?? []) : []}>
                    <defs>
                      <linearGradient id="fillNetFS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={netColor} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={netColor} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke={gridStrokeColor}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value) =>
                        formatDateForDisplay(String(value), "en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      width={68}
                      tickFormatter={(v: number) => {
                        const abs = Math.abs(v)
                        const sign = v < 0 ? "-" : ""
                        if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
                        return `${sign}$${abs.toFixed(0)}`
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke={gridStrokeColor}
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                    <Area
                      dataKey="net"
                      type="natural"
                      fill="url(#fillNetFS)"
                      stroke={netColor}
                      strokeWidth={1}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart data={filteredData}>
                    <defs>
                      <linearGradient id="fillDesktopFS" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-desktop)"
                          stopOpacity={1.0}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-desktop)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient id="fillMobileFS" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-mobile)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-mobile)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke={gridStrokeColor}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value) =>
                        formatDateForDisplay(String(value), "en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <Area
                      dataKey="desktop"
                      type="natural"
                      fill="url(#fillDesktopFS)"
                      stroke={incomeBorderColor}
                      strokeWidth={1}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Area
                      dataKey="mobile"
                      type="natural"
                      fill="url(#fillMobileFS)"
                      stroke={expensesBorderColor}
                      strokeWidth={1}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
```

- [ ] **Step 14: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 15: Commit**

```bash
git add components/chart-area-interactive.tsx
git commit -m "feat: add Net weekly view to ChartAreaInteractive"
```

---

## Task 4: Wire `weeklyNetDiffData` in `ChartsGrid.tsx`

**Files:**
- Modify: `app/analytics/_page/components/ChartsGrid.tsx`

- [ ] **Step 1: Destructure `weeklyNetDiffData` from the hook props**

Find the destructuring block (around line 155–170 inside the component). The existing line reads:
```typescript
    incomeExpenseCumulativeData,
```

Add `weeklyNetDiffData` immediately after:
```typescript
    incomeExpenseCumulativeData,
    weeklyNetDiffData,
```

- [ ] **Step 2: Pass `netData` to `ChartAreaInteractive` for `incomeExpensesTracking2`**

Find (around line 562–574):
```typescript
                    <ChartAreaInteractive
                      chartId="incomeExpensesTracking2"
                      title="Income & Expenses"
                      categoryControls={incomeExpenseControls}
                      isLoading={chartIsLoading}
                      data={incomeExpenseChart.data}
                      cumulativeData={incomeExpenseCumulativeData}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
```

Replace with:
```typescript
                    <ChartAreaInteractive
                      chartId="incomeExpensesTracking2"
                      title="Income & Expenses"
                      categoryControls={incomeExpenseControls}
                      isLoading={chartIsLoading}
                      data={incomeExpenseChart.data}
                      cumulativeData={incomeExpenseCumulativeData}
                      netData={weeklyNetDiffData}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Run the full test suite**

```bash
npm test -- --no-coverage 2>&1 | tail -20
```

Expected: existing tests pass (the stale `chart-area-interactive.test.tsx` tests may already be failing — do not fix them if they were already broken before this PR; verify by checking `git stash && npm test` first if unsure).

- [ ] **Step 5: Run the production build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build completes with no errors.

- [ ] **Step 6: Final commit**

```bash
git add app/analytics/_page/components/ChartsGrid.tsx
git commit -m "feat: wire weeklyNetDiffData into Income & Expenses chart"
```

---

## Verification Checklist

After all tasks are done, manually verify in the browser (`npm run dev`):

- [ ] "Income & Expenses" chart shows **three** pill buttons: Basic | Cumulative | Net
- [ ] Basic and Cumulative views look and behave exactly as before (no regression)
- [ ] Clicking **Net** shows a single-line area chart with weekly X-axis labels (e.g., "Jan 6")
- [ ] Hovering shows a tooltip with "Net: +$X" or "Net: -$X"
- [ ] If a week has more expenses than income, the line dips below zero
- [ ] The Y-axis adjusts dynamically — negative-dominant datasets don't clip at zero
- [ ] The zero reference line is visible as a dashed horizontal rule
- [ ] Fullscreen modal also switches to the Net chart when Net is selected
- [ ] `incomeExpensesTracking1` ("Income & Expenses Cumulative") is unaffected — still shows only Basic (no Cumulative or Net buttons since no `cumulativeData`/`netData` passed)
