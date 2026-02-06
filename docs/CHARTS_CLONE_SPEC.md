# Chart Card Clone Specification

> **Last Updated**: February 2025
> **Reference Chart**: `ChartTreeMap` — "Net Worth Allocation" (`components/chart-treemap.tsx`)
> **Purpose**: Definitive source of truth for creating any new chart card that is identical in structure, API integration, theming, interactivity, and performance to every other chart in Trakzi.

---

## Table of Contents

1. [Golden Rules](#1-golden-rules)
2. [Pre-Creation Checklist](#2-pre-creation-checklist)
3. [Step 1 — Imports & Boilerplate](#3-step-1--imports--boilerplate)
4. [Step 2 — React.memo Wrapper (CRITICAL)](#4-step-2--reactmemo-wrapper-critical)
5. [Step 3 — Props Interface](#5-step-3--props-interface)
6. [Step 4 — Hooks Initialization](#6-step-4--hooks-initialization)
7. [Step 5 — Color Palette (NO Mock Colors)](#7-step-5--color-palette-no-mock-colors)
8. [Step 6 — Data Sanitization with useMemo](#8-step-6--data-sanitization-with-usememo)
9. [Step 7 — Currency Formatting (NO Hard-Coded Symbols)](#9-step-7--currency-formatting-no-hard-coded-symbols)
10. [Step 8 — Tooltip System](#10-step-8--tooltip-system)
11. [Step 9 — Card Header Layout (Buttons)](#11-step-9--card-header-layout-buttons)
12. [Step 10 — Drag Handle](#12-step-10--drag-handle)
13. [Step 11 — Expand Button + Fullscreen Modal](#13-step-11--expand-button--fullscreen-modal)
14. [Step 12 — Favorite Button](#14-step-12--favorite-button)
15. [Step 13 — Info Popover + Category Controls](#15-step-13--info-popover--category-controls)
16. [Step 14 — AI Insight Button](#16-step-14--ai-insight-button)
17. [Step 15 — "Add" / Custom Action Buttons](#17-step-15--add--custom-action-buttons)
18. [Step 16 — Loading & Empty States](#18-step-16--loading--empty-states)
19. [Step 17 — Chart Rendering (renderChart)](#19-step-17--chart-rendering-renderchart)
20. [Step 18 — Main Return (Three-State Render)](#20-step-18--main-return-three-state-render)
21. [Step 19 — API Connection (NO Mock Data)](#21-step-19--api-connection-no-mock-data)
22. [Step 20 — Time Period Filter Integration](#22-step-20--time-period-filter-integration)
23. [Step 21 — Grid Registration (Drag, Drop & Resize)](#23-step-21--grid-registration-drag-drop--resize)
24. [Step 22 — ChartsGrid Integration](#24-step-22--chartsgrid-integration)
25. [Step 23 — Cache Invalidation](#25-step-23--cache-invalidation)
26. [Complete Template (Copy-Paste Ready)](#26-complete-template-copy-paste-ready)
27. [Library-Specific Configurations](#27-library-specific-configurations)
28. [Testing Checklist](#28-testing-checklist)
29. [Anti-Patterns](#29-anti-patterns)

---

## 1. Golden Rules

These rules are **non-negotiable**. Every chart must satisfy all of them.

| # | Rule | Why |
|---|------|-----|
| 1 | **`React.memo` wrapper + `displayName`** | Prevents parent re-renders from cascading into expensive chart redraws |
| 2 | **NO mock data** — data always flows from bundle API | Charts must reflect real user data; never hard-code sample arrays |
| 3 | **NO mock colors** — always use `getPalette()` from `useColorScheme()` | User-selected palette must be honored; 12 palettes exist |
| 4 | **NO hard-coded currency symbols** — always use `formatCurrency()` | Supports USD ($), EUR (€), GBP (£) with locale-correct formatting |
| 5 | **Time period filter integration** — charts respond to the global date filter | Data comes pre-filtered from bundle; chart should never re-filter |
| 6 | **Portal-based tooltips** — use `NivoChartTooltip` or `ChartTooltip` | Prevents clipping, viewport-aware positioning |
| 7 | **Drag handle + resize support** — every card in the grid is draggable and resizable | Requires `GridStackCardDragHandle` and size registration |
| 8 | **All 5 action buttons** — Drag, Expand, Favorite, Info, AI Insight | Consistent UX across every chart card |
| 9 | **`useMemo` for all data transforms** — never transform in JSX | Performance: prevents recalculation on every render cycle |
| 10 | **`overflow-hidden` is BANNED on Card/CardContent** | Clips Nivo tooltips rendered via portal — already removed from Card component |

---

## 2. Pre-Creation Checklist

Before writing a single line of component code:

- [ ] **Chart ID** defined — add to `ChartId` type in `lib/chart-card-sizes.config.ts`
- [ ] **Size constraints** defined — add `CHART_CARD_SIZES[yourChartId]` entry
- [ ] **Aggregation function** written — add SQL query to the relevant `lib/charts/*.ts` file
- [ ] **Bundle type** updated — add the new data field to the page's `*Summary` type
- [ ] **Bundle function** updated — add the aggregation call to the page's `get*Bundle()` Promise.all
- [ ] **Chart order** registered — add chart ID to the page's chart order array
- [ ] **Documentation** entry added — update the relevant `docs/PAGES/*_CHARTS.md` file

---

## 3. Step 1 — Imports & Boilerplate

Every chart component starts with these exact imports. Copy this block, then add your chart library import.

```tsx
"use client"

import { useMemo, useState, memo } from "react"
import { useTheme } from "next-themes"
// ↓ YOUR CHART LIBRARY — pick ONE per chart
// import { ResponsivePie } from "@nivo/pie"
// import { ResponsiveTreeMap } from "@nivo/treemap"
// import { ResponsiveRadar } from "@nivo/radar"
// import { AreaChart, Area, CartesianGrid, XAxis } from "recharts"

import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartInfoPopover, type ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
```

> **Note**: Only import the chart library you need. Don't import both Nivo and Recharts.

---

## 4. Step 2 — React.memo Wrapper (CRITICAL)

**Every chart MUST be wrapped in `React.memo` and MUST set `displayName`.**

This is the single most important performance pattern. Without it, every parent state change (filter change, sidebar toggle, scroll event) triggers a full chart re-render.

```tsx
export const ChartYourChart = memo(function ChartYourChart({
  data = [],
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartYourChartProps) {
  // ... component body
})

ChartYourChart.displayName = "ChartYourChart"
```

**Rules:**
- The named function inside `memo()` **must** match the exported variable name
- `displayName` is set **after** the component declaration, outside the `memo()` call
- **Never** use arrow functions inside `memo()` — named functions give better stack traces

---

## 5. Step 3 — Props Interface

All chart components receive a standardized props shape. Extend if your chart needs extra data.

```tsx
interface ChartYourChartProps {
  /** Pre-computed data from bundle API — NEVER mock this */
  data?: YourDataType[]
  /** Category visibility controls from useChartCategoryVisibility hook */
  categoryControls?: ChartInfoPopoverCategoryControls
  /** True while bundle API is fetching */
  isLoading?: boolean
  /** Custom empty-state title (optional override) */
  emptyTitle?: string
  /** Custom empty-state description (optional override) */
  emptyDescription?: string
}
```

**Standard props every chart accepts:**

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `data` | `YourDataType[]` | `[]` | Pre-computed bundle data — never mock |
| `categoryControls` | `ChartInfoPopoverCategoryControls` | `undefined` | Hide/show categories in the info popover |
| `isLoading` | `boolean` | `false` | Shows skeleton while bundle is fetching |
| `emptyTitle` | `string` | `"No data yet .."` | Title when data array is empty |
| `emptyDescription` | `string` | `"Import your bank statements..."` | Description when data array is empty |

---

## 6. Step 4 — Hooks Initialization

These hooks must be called **at the top** of every chart component, in this order:

```tsx
// 1. Color palette (user-selected scheme)
const { getPalette, colorScheme } = useColorScheme()

// 2. Currency formatting (user-selected currency)
const { formatCurrency } = useCurrency()

// 3. Theme (dark/light mode)
const { resolvedTheme } = useTheme()

// 4. Fullscreen state
const [isFullscreen, setIsFullscreen] = useState(false)

// 5. Derived theme values
const isDark = resolvedTheme === "dark"
```

**Why this order matters:** React hooks must be called in consistent order. Palette and currency are the most commonly used in `useMemo` dependencies, so declaring them first keeps dependency arrays clean.

---

## 7. Step 5 — Color Palette (NO Mock Colors)

> **NEVER hard-code hex colors like `["#ff6384", "#36a2eb"]`.**
> **ALWAYS derive colors from `getPalette()`.**

### How the Palette System Works

The app has **12 user-selectable color palettes** (sunset, dark, colored, gold, aqua, dull, dry, greens, chrome, beach, jolly, gothic). Each returns an array of 11 colors ordered **darkest → lightest**, plus a neutral gray `#c3c3c3`.

```tsx
const chartColors = useMemo(() => {
  const palette = getPalette()

  // For dark mode: reverse so lighter colors come first (better visibility)
  if (isDark) {
    return [...palette].reverse()
  }

  // For "dark" color scheme in light mode: shift to lighter colors
  return colorScheme === "dark" ? palette.slice(4) : palette
}, [getPalette, isDark, colorScheme])
```

### Color Assignment by Chart Type

**Pie / Donut charts** — Darker colors = larger values:
```tsx
const dataWithColors = useMemo(() => {
  const palette = getPalette().filter(c => c !== "#c3c3c3") // Remove neutral gray
  const sorted = [...sanitizedData].sort((a, b) => b.value - a.value)
  const reversed = [...palette].reverse().slice(0, sorted.length)
  return sorted.map((item, i) => ({
    ...item,
    color: reversed[i % reversed.length],
  }))
}, [sanitizedData, getPalette, colorScheme])
```

**Bar / Area / Line charts** — Sequential palette assignment:
```tsx
const chartColors = useMemo(() => getPalette(), [getPalette])
// Pass as `colors` prop to Nivo, or assign per-series in Recharts
```

**TreeMap / Heatmap** — Pass full palette directly:
```tsx
<ResponsiveTreeMap colors={chartColors} />
```

### Text Color on Dark Backgrounds (Pie Arc Labels)

```tsx
const labelColor = isDark ? "#ffffff" : "#000000"

// For pie charts with per-slice label colors:
const darkColors = ["#696969", "#464646", "#2F2F2F", "#252525"]
const goldDarkColors = ["#000000", "#361c1b", "#754232", "#cd894a"]

const getTextColor = (sliceColor: string, scheme?: string): string => {
  if (scheme === "gold") return goldDarkColors.includes(sliceColor) ? "#fff" : "#000"
  return darkColors.includes(sliceColor) ? "#fff" : "#000"
}
```

---

## 8. Step 6 — Data Sanitization with useMemo

**Every data prop must be sanitized before rendering.** Raw API data may contain strings where numbers are expected, null values, or missing fields.

```tsx
const sanitizedData = useMemo(() => {
  if (!data?.length) return []

  return data.map(item => ({
    ...item,
    value: toNumericValue(item.value), // Converts "123.45" → 123.45, null → 0
    name: item.name?.trim() || "Other",
  }))
}, [data])
```

**`toNumericValue()`** is from `@/lib/utils` — it safely converts any input to a number, defaulting to `0` for non-numeric values.

### For Nested Data (TreeMap, Sankey):

```tsx
const sanitizedData = useMemo(() => {
  if (!data?.children?.length) return { name: "", children: [] }

  return {
    name: data.name || "",
    children: data.children.map(child => ({
      name: child.name,
      children: child.children?.map(grandchild => ({
        name: grandchild.name,
        loc: toNumericValue(grandchild.loc),
        fullDescription: grandchild.fullDescription,
      })) || [],
    })),
  }
}, [data])
```

---

## 9. Step 7 — Currency Formatting (NO Hard-Coded Symbols)

> **NEVER write `$${value}` or `€${value}`.** Always use `formatCurrency()`.

```tsx
const { formatCurrency } = useCurrency()

// In tooltips, labels, legends:
formatCurrency(1234.56)
// → "$1,234.56" (USD, en-US)
// → "1.234,56€" (EUR, de-DE)
// → "£1,234.56" (GBP, en-GB)

// With options:
formatCurrency(1234.56, { minimumFractionDigits: 0 })
// → "$1,235"
```

### Supported Currencies

| Code | Symbol | Position | Locale |
|------|--------|----------|--------|
| USD | $ | Before | en-US |
| EUR | € | After | de-DE |
| GBP | £ | Before | en-GB |

The user selects their currency in settings. It persists in `localStorage` under key `selected-currency` and broadcasts changes via a `currencyChanged` custom event.

---

## 10. Step 8 — Tooltip System

> **NEVER use inline `<div>` tooltips.** Always use the unified tooltip system.

### For Nivo Charts (Pie, TreeMap, Radar, Sankey, etc.)

Use `NivoChartTooltip` — it renders via **`createPortal` to `document.body`**, tracks mouse position, and flips when hitting viewport edges.

```tsx
import { NivoChartTooltip } from "@/components/chart-tooltip"

// Simple tooltip (title + value):
tooltip={({ node }) => (
  <NivoChartTooltip
    title={node.data.name}
    titleColor={node.color}
    value={formatCurrency(node.value)}
    subValue={`${((node.value / total) * 100).toFixed(1)}%`}  // Optional
    maxWidth={300}
  />
)}

// Multi-row tooltip (radar, stacked):
sliceTooltip={({ index, data }) => (
  <NivoChartTooltip
    title={index}
    hideTitleIndicator
    rows={data.map(item => ({
      color: item.color,
      label: item.id,
      value: formatCurrency(item.value),
    }))}
  />
)}
```

### For Recharts Charts (Area, Bar, Line)

Use the shadcn `ChartTooltip` component:

```tsx
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

<ChartTooltip
  cursor={false}
  content={
    <ChartTooltipContent
      labelFormatter={(value) =>
        formatDateForDisplay(String(value), "en-US", { month: "short", day: "numeric" })
      }
      indicator="dot"
    />
  }
/>
```

### NivoChartTooltip Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Main label text |
| `titleColor` | `string` | — | Color dot next to title |
| `hideTitleIndicator` | `boolean` | `false` | Remove the color dot |
| `value` | `string` | — | Primary formatted value |
| `subValue` | `string` | — | Secondary value (percentage, date) |
| `rows` | `ChartTooltipRowProps[]` | — | Multiple data rows |
| `maxWidth` | `number` | `300` | Max width before wrapping |
| `children` | `ReactNode` | — | Fully custom tooltip content |

### Tooltip Anti-Pattern

```tsx
// ❌ BANNED — inline div tooltip
tooltip={({ datum }) => (
  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-lg">
    {datum.label}: {datum.value}
  </div>
)}

// ✅ CORRECT — unified NivoChartTooltip
tooltip={({ datum }) => (
  <NivoChartTooltip
    title={datum.label}
    titleColor={datum.color}
    value={formatCurrency(datum.value)}
  />
)}
```

### Why Portals?

Nivo renders tooltips inside the chart's SVG/canvas container. Without portal rendering, tooltips get clipped by parent elements. The `NivoChartTooltip` component uses `createPortal(tooltip, document.body)` with `position: fixed` and calculates whether the tooltip would overflow any viewport edge, flipping to the opposite side of the cursor if needed.

---

## 11. Step 9 — Card Header Layout (Buttons)

Every chart card has an identical header structure with **two clusters**: a left cluster (drag + expand + favorite + title) and a right cluster (info + AI insight).

```tsx
<CardHeader>
  {/* ← LEFT CLUSTER: interactive elements + title */}
  <div className="flex items-center gap-2">
    <GridStackCardDragHandle />                              {/* 1. Drag handle */}
    <ChartExpandButton onClick={() => setIsFullscreen(true)} /> {/* 2. Expand (mobile) */}
    <ChartFavoriteButton                                     {/* 3. Favorite star */}
      chartId="yourChartId"
      chartTitle="Your Chart Title"
      size="md"
    />
    <CardTitle>Your Chart Title</CardTitle>                   {/* 4. Title ONLY — NO CardDescription */}
  </div>

  {/* → RIGHT CLUSTER: info + AI insight stacked vertically */}
  <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
    {renderInfoTrigger()}                                    {/* 5. Info + 6. AI Insight */}
  </CardAction>
</CardHeader>
```

**Key rules:**
- **NO `CardDescription`** — only `CardTitle`
- Left cluster uses `flex items-center gap-2`
- Right cluster uses `flex flex-col` to stack info and AI vertically on desktop
- The `renderInfoTrigger()` pattern is explained in Steps 13-14 below

---

## 12. Step 10 — Drag Handle

```tsx
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
```

**Position**: Always the **first element** inside the left cluster `<div>`.

**What it does:**
- Renders a 6-dot grip icon (⠿)
- Cursor auto-changes: `grab` → `grabbing` during drag
- Compatible with both `@dnd-kit` and legacy GridStack systems
- Hidden on mobile viewports
- Includes accessibility: `role="button"`, `tabIndex={0}`, `aria-label="Drag card"`

**No configuration needed** — it hooks into the grid context automatically.

---

## 13. Step 11 — Expand Button + Fullscreen Modal

The expand button appears on **mobile only** and opens a fullscreen landscape modal.

### Expand Button

```tsx
import { ChartExpandButton } from "@/components/chart-expand-button"

// In CardHeader left cluster, after drag handle:
<ChartExpandButton onClick={() => setIsFullscreen(true)} />
```

- Shows maximize icon (`IconArrowsMaximize`)
- Hidden on desktop (`md:hidden`)
- Only renders when the chart has a fullscreen modal wired up

### Fullscreen Modal

```tsx
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

const [isFullscreen, setIsFullscreen] = useState(false)

// In the return, BEFORE the Card:
<ChartFullscreenModal
  isOpen={isFullscreen}
  onClose={() => setIsFullscreen(false)}
  title="Your Chart Title"
  description="Brief chart description"
  headerActions={renderInfoTrigger(true)}   // Pass true for fullscreen variant
  filterControl={/* optional time period selector */}
>
  <div className="h-full w-full min-h-[400px]">
    {renderChart()}
  </div>
</ChartFullscreenModal>
```

**Features:**
- Framer Motion slide-up animation
- Attempts to lock screen to landscape orientation (mobile)
- Body scroll lock while open
- Escape key closes
- `headerActions` slot renders the info + AI buttons in fullscreen header
- `filterControl` slot renders an optional time period selector

---

## 14. Step 12 — Favorite Button

```tsx
import { ChartFavoriteButton } from "@/components/chart-favorite-button"

// In CardHeader left cluster, after expand button:
<ChartFavoriteButton
  chartId="yourChartId"       // Must match ChartId type
  chartTitle="Your Chart Title"
  size="md"                    // "sm" | "md" | "lg"
/>
```

**What it does:**
- Renders a star icon (outline when off, filled orange `#E78A53` when on)
- Toggles the chart in/out of the user's home dashboard "favorites" collection
- Persists to `localStorage` under key `home-favorite-charts`
- Shows a toast notification on toggle ("Added to favorites" / "Removed from favorites")
- Uses `FavoritesProvider` context with `Set<ChartId>` for O(1) lookups

**Size reference:**

| Size | Class | Use case |
|------|-------|----------|
| `sm` | `h-7 w-7` | Inside tight spaces |
| `md` | `h-8 w-8` | Standard card header (default) |
| `lg` | `h-9 w-9` | Large standalone buttons |

---

## 15. Step 13 — Info Popover + Category Controls

The info popover is a combined info button and category visibility control.

### The renderInfoTrigger Pattern

**Every chart must define this function** — it renders both the info and AI buttons, and adapts layout for normal vs. fullscreen contexts.

```tsx
const renderInfoTrigger = (forFullscreen = false) => (
  <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
    <ChartInfoPopover
      title="Your Chart Title"
      description="What this chart shows in one sentence"
      details={[
        "Detail point 1 — how to read the chart",
        "Detail point 2 — what interactions are available",
      ]}
      ignoredFootnote="Optional: explain what data is excluded"  // Optional
      categoryControls={categoryControls}                         // Optional
    />
    <ChartAiInsightButton
      chartId="yourChartId"
      chartTitle="Your Chart Title"
      chartDescription="Brief description"
      chartData={{
        // Keep SMALL — only key metrics for the AI prompt
        categories: sanitizedData.map(d => d.name),
        totalCategories: sanitizedData.length,
      }}
      size="sm"
    />
  </div>
)
```

**Layout rules:**
- `forFullscreen = false` (default): `hidden md:flex flex-col` — hidden on mobile, vertical stack on desktop
- `forFullscreen = true`: plain `flex` — always visible in fullscreen header

### ChartInfoPopover Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Popover header title |
| `description` | `string` | Yes | One-sentence explanation |
| `details` | `string[]` | No | Bullet points on how to read/use the chart |
| `ignoredFootnote` | `string` | No | Note about excluded data |
| `categoryControls` | `ChartInfoPopoverCategoryControls` | No | Category show/hide toggles |
| `groupingControls` | `{ options, defaultValue }` | No | Grouping mode selector |
| `extraContent` | `ReactNode` | No | Custom content at bottom |

### Adding Category Controls (Optional)

If your chart has categories that users can toggle:

```tsx
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"

// Inside the component:
const visibility = useChartCategoryVisibility({
  chartId: "yourChartId",
  storageScope: "analytics",  // or "fridge", "trends", "savings"
})

// Get all category names from your data
const allCategories = sanitizedData.map(d => d.name)

// Build the controls object
const categoryControls = visibility.buildCategoryControls(allCategories)

// Filter data based on hidden categories
const visibleData = useMemo(
  () => sanitizedData.filter(d => !visibility.hiddenCategories.has(d.name)),
  [sanitizedData, visibility.hiddenCategories]
)
```

**Storage**: Hidden categories persist in `localStorage` under key `{storageScope}:chartHiddenCategories:{chartId}`.

---

## 16. Step 14 — AI Insight Button

```tsx
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"

<ChartAiInsightButton
  chartId="yourChartId"
  chartTitle="Your Chart Title"
  chartDescription="Brief description of what this chart shows"
  chartData={{
    // KEEP THIS SMALL — this gets sent to the AI API
    total: totalValue,
    topCategory: "Groceries",
    count: sanitizedData.length,
  }}
  size="sm"  // Always "sm" in card headers
/>
```

**How it works:**
1. User clicks the sparkles icon (✨) → popover opens
2. On first open, checks `localStorage` for cached insight (key: `ai_insight_v1_{chartId}_{sha256Hash}`)
3. If cache miss, calls `POST /api/ai/chart-insight` with chart metadata + data
4. Returns: `{ insight: string, sentiment: "positive"|"neutral"|"negative"|"warning", tips?: string[] }`
5. Caches result in `localStorage` keyed by SHA-256 hash of chartData
6. Displays insight with sentiment-colored container (green/blue/amber/red)
7. On error, shows "Try again" button

**Sentiment colors:**

| Sentiment | Border | Background | Icon |
|-----------|--------|------------|------|
| positive | green-200 | green-50/50 | ✅ checkmark |
| neutral | blue-200 | blue-50/50 | 💡 lightbulb |
| warning | amber-200 | amber-50/50 | ⚠️ triangle |
| negative | red-200 | red-50/50 | ⚠️ triangle (red) |

---

## 17. Step 15 — "Add" / Custom Action Buttons

Some charts have extra action buttons beyond the standard 5. Examples:

- **NeedsWantsCategoryEditor** button on the Needs vs Wants chart
- **Month selector** dropdown on single-month charts
- **View toggle** (grid/list) on transaction history

### Where to Place Custom Buttons

```tsx
<CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
  {/* Custom action buttons go BEFORE the info trigger */}
  <YourCustomButton />

  {/* Standard info + AI cluster */}
  {renderInfoTrigger()}
</CardAction>
```

**Rules:**
- Custom buttons go in the `CardAction` area, before `renderInfoTrigger()`
- Use shadcn `<Button variant="outline" size="sm">` for consistency
- If the button modifies data, ensure cache invalidation (see Step 23)

---

## 18. Step 16 — Loading & Empty States

Every chart must handle three rendering states.

### ChartLoadingState Component

```tsx
import { ChartLoadingState } from "@/components/chart-loading-state"

<ChartLoadingState
  isLoading={isLoading}
  skeletonType="bar"          // "bar" | "pie" | "line" | "grid" | "area"
  emptyTitle={emptyTitle}     // Custom or default "No data yet .."
  emptyDescription={emptyDescription}
  emptyIcon="chart"           // "chart" | "upload" | "receipt" | "info"
  maxLoadingTime={15000}      // Timeout before showing empty state
/>
```

**Skeleton types** match chart types:
- `"bar"` — vertical bars shimmer
- `"pie"` — circle shimmer
- `"line"` — wave line shimmer
- `"grid"` — grid of rectangles shimmer (for TreeMap)
- `"area"` — filled area shimmer

### The Three States

```
1. EMPTY DATA (no data + not loading) → Show ChartLoadingState with empty state
2. LOADING (isLoading = true)         → Show ChartLoadingState with skeleton
3. HAS DATA                           → Render the actual chart
```

---

## 19. Step 17 — Chart Rendering (renderChart)

Extract the chart visualization into a `renderChart()` function so it can be reused in both the normal card and the fullscreen modal.

```tsx
const renderChart = () => (
  <ResponsiveTreeMap
    data={sanitizedData}
    colors={chartColors}
    identity="name"
    value="loc"
    margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
    labelSkipSize={12}
    labelTextColor={labelColor}
    borderColor={{ from: "color", modifiers: [["darker", 0.1]] }}
    tooltip={({ node }) => (
      <NivoChartTooltip
        title={node.data.name}
        titleColor={node.color}
        value={formatCurrency(node.value)}
        maxWidth={300}
      />
    )}
  />
)
```

**Why a separate function?** The same chart renders in:
1. The normal `CardContent` (250px height)
2. The `ChartFullscreenModal` (400px+ height)

Both call `renderChart()` with different container sizes. The `Responsive*` Nivo components auto-adapt.

---

## 20. Step 18 — Main Return (Three-State Render)

The complete render pattern. **Every chart follows this exact structure.**

```tsx
// STATE 1: Empty data
if (!sanitizedData?.length) {
  return (
    <Card className="@container/card col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartExpandButton onClick={() => setIsFullscreen(true)} />
          <ChartFavoriteButton chartId="yourChartId" chartTitle="Your Chart Title" size="md" />
          <CardTitle>Your Chart Title</CardTitle>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        <ChartLoadingState
          isLoading={isLoading}
          skeletonType="bar"
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </CardContent>
    </Card>
  )
}

// STATE 2: Has data — render fullscreen modal + card
return (
  <>
    <ChartFullscreenModal
      isOpen={isFullscreen}
      onClose={() => setIsFullscreen(false)}
      title="Your Chart Title"
      description="Brief description"
      headerActions={renderInfoTrigger(true)}
    >
      <div className="h-full w-full min-h-[400px]">
        {renderChart()}
      </div>
    </ChartFullscreenModal>

    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartExpandButton onClick={() => setIsFullscreen(true)} />
          <ChartFavoriteButton chartId="yourChartId" chartTitle="Your Chart Title" size="md" />
          <CardTitle>Your Chart Title</CardTitle>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        <div className="h-full w-full">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  </>
)
```

**Note**: The card header is **identical** in both empty and data states. This prevents layout shift when data arrives.

---

## 21. Step 19 — API Connection (NO Mock Data)

> **Charts NEVER fetch their own data.** Data flows through the bundle API system.

### Data Flow

```
User loads page
  → useBundleData() hook fires (React Query)
  → GET /api/charts/{page}-bundle?filter=last30days
  → Bundle route handler:
      1. getCurrentUserIdOrNull()              — auth check
      2. buildCacheKey(prefix, userId, filter)  — cache key
      3. getCachedOrCompute(key, computeFn)     — Redis cache layer
      4. getPageBundle(userId, filter)           — runs all aggregations in parallel
  → Returns JSON with all chart data for the page
  → ChartsGrid passes each chart's slice to the chart component
```

### Adding Your Chart's Data to the Bundle

**Step A — Write the aggregation function** in the relevant `lib/charts/*.ts`:

```tsx
// lib/charts/aggregations.ts
export async function getYourChartData(
  userId: string,
  filter?: { startDate: string; endDate: string } | null
): Promise<YourDataType[]> {
  const dateClause = filter
    ? `AND t.date >= $2 AND t.date <= $3`
    : ""
  const params = filter
    ? [userId, filter.startDate, filter.endDate]
    : [userId]

  const rows = await neonQuery<YourDataType>(
    `SELECT category as name, SUM(amount) as value
     FROM transactions t
     WHERE t.user_id = $1 ${dateClause}
     GROUP BY category
     ORDER BY value DESC`,
    params
  )
  return rows
}
```

**Step B — Add to the bundle function:**

```tsx
// In getAnalyticsBundle() or relevant bundle:
export async function getAnalyticsBundle(userId: string, filter?: ...): Promise<AnalyticsSummary> {
  const [
    kpis,
    categorySpending,
    yourChartData,       // ← ADD HERE
    // ... other aggregations
  ] = await Promise.all([
    getKPIs(userId, filter),
    getCategorySpending(userId, filter),
    getYourChartData(userId, filter),  // ← ADD HERE
    // ... other calls
  ])

  return {
    kpis,
    categorySpending,
    yourChartData,        // ← ADD HERE
    // ...
  }
}
```

**Step C — Update the Summary type:**

```tsx
export interface AnalyticsSummary {
  kpis: KPIData
  categorySpending: CategorySpending[]
  yourChartData: YourDataType[]   // ← ADD HERE
  // ...
}
```

### Bundle Routes by Page

| Page | Bundle API Route | Aggregation File | Cache Prefix |
|------|-----------------|-----------------|--------------|
| Home | `/api/charts/home-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `home` |
| Analytics | `/api/charts/analytics-bundle` | `lib/charts/aggregations.ts` | `analytics` |
| Fridge | `/api/charts/fridge-bundle` | `lib/charts/fridge-aggregations.ts` | `fridge` |
| Trends | `/api/charts/trends-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `trends` |
| Savings | `/api/charts/savings-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `savings` |

---

## 22. Step 20 — Time Period Filter Integration

Charts receive **pre-filtered data** from the bundle API. The filter is applied at the SQL level, not in the component.

### How the Filter Flows

```
DateFilterProvider (context)
  → useDateFilter() hook → returns current filter string
  → useBundleData() hook → appends ?filter=... to API call
  → Bundle route → calls getDateRange(filter) → returns { startDate, endDate }
  → Aggregation functions → append WHERE date >= $2 AND date <= $3
  → Returns filtered data
  → Chart component receives already-filtered data via props
```

### Available Filter Values

| Filter Value | Meaning |
|-------------|---------|
| `last7days` | Past 7 days |
| `last30days` | Past 30 days |
| `last3months` | Past 3 months |
| `last6months` | Past 6 months |
| `lastyear` | Past 12 months |
| `ytd` | Year-to-date (Jan 1 → today) |
| `2024`, `2023`, etc. | Full calendar year |
| `null` | All time (no date filter) |

### What the Chart Component Does

**Nothing.** The chart receives `data` that is already filtered. The chart does NOT:
- Store or read the current filter
- Call any API
- Re-filter the data

The only exception: if you want to show the current period label in the chart title or tooltip, use `useDateFilter()`:

```tsx
import { useDateFilter } from "@/components/date-filter-provider"
const { filter } = useDateFilter()
```

---

## 23. Step 21 — Grid Registration (Drag, Drop & Resize)

Every chart must be registered in the grid system for drag-and-drop and resize to work.

### Step A — Add ChartId to the Type Union

File: `lib/chart-card-sizes.config.ts`

```tsx
export type ChartId =
  | "incomeExpensesTracking1"
  | "yourChartId"              // ← ADD HERE
  // ...
```

### Step B — Define Size Constraints

Same file, add to `CHART_CARD_SIZES`:

```tsx
export const CHART_CARD_SIZES: Record<ChartId, ChartCardSizeConfig> = {
  // ...
  yourChartId: {
    minW: 6,    // 50% width minimum (6 of 12 columns)
    maxW: 12,   // 100% width maximum
    minH: 7,    // Minimum height units
    maxH: 20,   // Maximum height units
  },
}
```

### Size Guidelines

| Chart Type | Recommended minH | Recommended maxH | Notes |
|-----------|-----------------|-----------------|-------|
| Compact (KPIs, scores) | 6 | 6-10 | Fixed or small range |
| Standard (bar, area, line) | 6-7 | 10-16 | Medium flexibility |
| Tall (pie with legends, radar) | 7-8 | 20 | Needs vertical space for labels |
| Very tall (tables, calendar) | 8 | 20-25 | Maximum flexibility |
| TreeMap, heatmap | 4-8 | 12-25 | Works at many sizes |

### Grid System Reference

- **12-column grid** — all widths are fractions of 12
- `minW: 6` = 50% minimum width, `minW: 12` = always full width
- Row height: **70px** per unit (`CELL_HEIGHT` constant in `sortable-grid.tsx`)
- Resize handle appears at bottom-right corner of each card
- Drag uses `MouseSensor` (5px activation) + `TouchSensor` (150ms delay)
- Collision detection: `closestCenter` strategy
- During drag: card has `opacity: 0.96`, `zIndex: 1000`
- GPU-accelerated transforms: `transform: translate3d()` — no layout reflows

---

## 24. Step 22 — ChartsGrid Integration

After your component is built and registered, add it to the page's ChartsGrid.

### Example: Adding to Analytics ChartsGrid

File: `app/analytics/_page/components/ChartsGrid.tsx`

```tsx
import { ChartYourChart } from "@/components/chart-your-chart"

// Inside ChartsGrid component, in the chart order array:
const chartOrder = [
  "incomeExpensesTracking1",
  "expenseBreakdown",
  "yourChartId",              // ← ADD HERE
  // ...
]

// In the render switch/map:
case "yourChartId":
  return (
    <LazyChart title="Your Chart Title" height={250}>
      <ChartYourChart
        data={bundleData?.yourChartData}
        categoryControls={categoryControls}
        isLoading={bundleLoading}
      />
    </LazyChart>
  )
```

### LazyChart Wrapper

For below-fold charts, wrap with `LazyChart` to defer rendering until near the viewport:

```tsx
import { LazyChart } from "@/components/lazy-chart"

<LazyChart title="Your Chart Title" height={250}>
  <ChartYourChart data={...} isLoading={...} />
</LazyChart>
```

- Uses `IntersectionObserver` with `rootMargin: "200px"` (loads 200px before entering viewport)
- Shows a skeleton with drag handle and title while deferred
- `keepMounted` option prevents re-rendering on scroll-out (default: true)

---

## 25. Step 23 — Cache Invalidation

When user data changes (upload, edit, delete), the relevant cache must be invalidated so charts show fresh data.

```tsx
import { invalidateUserCachePrefix } from "@/lib/cache/upstash"

// After a mutation (e.g., CSV upload, transaction delete):
await invalidateUserCachePrefix(userId, "analytics")
await invalidateUserCachePrefix(userId, "home")
// Add all prefixes that might be affected
```

### Cache TTLs

| Prefix | TTL | Notes |
|--------|-----|-------|
| `analytics` | 5 minutes | Main analytics bundle |
| `fridge` | 5 minutes | Receipt/grocery bundle |
| `home` | 5 minutes | Home dashboard bundle |
| `trends` | 5 minutes | Trends page bundle |
| `savings` | 5 minutes | Savings page bundle |
| `categories` | 30 minutes | Category list (changes rarely) |
| `short` | 1 minute | Rapidly changing data |

### Cache Key Structure

```
user:{userId}:{prefix}:{filter}:bundle
```

Example: `user:usr_abc123:analytics:last30days:bundle`

---

## 26. Complete Template (Copy-Paste Ready)

This is the full template for a new chart. Replace all `YourChart` / `yourChartId` occurrences.

```tsx
"use client"

import { useMemo, useState, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"  // ← Replace with your chart library
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartInfoPopover, type ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

// ─── Types ────────────────────────────────────────────────────────────────────

interface YourDataType {
  id: string
  label: string
  value: number
}

interface ChartYourChartProps {
  data?: YourDataType[]
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ChartYourChart = memo(function ChartYourChart({
  data: baseData = [],
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartYourChartProps) {
  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { getPalette, colorScheme } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isDark = resolvedTheme === "dark"

  // ── Colors (from user palette — NEVER hard-code) ──────────────────────────
  const chartColors = useMemo(() => {
    const palette = getPalette()
    if (isDark) return [...palette].reverse()
    return colorScheme === "dark" ? palette.slice(4) : palette
  }, [getPalette, isDark, colorScheme])

  const textColor = isDark ? "#9ca3af" : "#4b5563"

  // ── Data Sanitization ─────────────────────────────────────────────────────
  const sanitizedData = useMemo(() => {
    if (!baseData?.length) return []
    return baseData.map(item => ({
      ...item,
      value: toNumericValue(item.value),
      label: item.label?.trim() || "Other",
    }))
  }, [baseData])

  // ── Info + AI Trigger ─────────────────────────────────────────────────────
  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title="Your Chart Title"
        description="What this chart shows — one sentence."
        details={[
          "Detail 1: How to read this chart.",
          "Detail 2: What interactions are available.",
        ]}
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="yourChartId"
        chartTitle="Your Chart Title"
        chartDescription="Brief description"
        chartData={{
          categories: sanitizedData.map(d => d.label),
          totalCategories: sanitizedData.length,
        }}
        size="sm"
      />
    </div>
  )

  // ── Chart Renderer (reused in card + fullscreen) ──────────────────────────
  const renderChart = () => (
    <ResponsivePie
      data={sanitizedData}
      margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
      colors={chartColors}
      innerRadius={0.5}
      padAngle={0.7}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      theme={{ text: { fill: textColor, fontSize: 12 } }}
      tooltip={({ datum }) => (
        <NivoChartTooltip
          title={datum.label as string}
          titleColor={datum.color}
          value={formatCurrency(datum.value)}
        />
      )}
    />
  )

  // ── Empty / Loading State ─────────────────────────────────────────────────
  if (!sanitizedData.length) {
    return (
      <Card className="@container/card col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="yourChartId" chartTitle="Your Chart Title" size="md" />
            <CardTitle>Your Chart Title</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading={isLoading}
            skeletonType="pie"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Your Chart Title"
        description="Brief description for fullscreen header"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]">
          {renderChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="yourChartId" chartTitle="Your Chart Title" size="md" />
            <CardTitle>Your Chart Title</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <div className="h-full w-full">
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartYourChart.displayName = "ChartYourChart"
```

---

## 27. Library-Specific Configurations

### Nivo Charts (Pie, TreeMap, Radar, Sankey, CirclePacking)

```tsx
// Common Nivo theme object (dark/light aware)
const nivoTheme = useMemo(() => ({
  text: { fill: textColor, fontSize: 12 },
  axis: {
    ticks: { text: { fill: textColor } },
    legend: { text: { fill: textColor } },
  },
  grid: {
    line: {
      stroke: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      strokeWidth: 1,
    },
  },
}), [textColor, isDark])
```

**Key Nivo props:**
- `colors={chartColors}` — always from palette
- `theme={nivoTheme}` — dark/light aware
- `tooltip` — always `NivoChartTooltip`
- `margin` — `{ top: 10-40, right: 10-80, bottom: 10-40, left: 10-80 }` (adjust per chart)

### Recharts Charts (Area, Bar, Line)

```tsx
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartConfig: ChartConfig = {
  series1: { label: "Expenses", color: chartColors[0] },
  series2: { label: "Income", color: chartColors[5] },
}

<ChartContainer config={chartConfig} className="h-full w-full">
  <AreaChart data={sanitizedData}>
    <defs>
      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={chartColors[0]} stopOpacity={1.0} />
        <stop offset="95%" stopColor={chartColors[0]} stopOpacity={0.1} />
      </linearGradient>
    </defs>
    <CartesianGrid vertical={false} stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
    <XAxis
      dataKey="date"
      tickLine={false}
      axisLine={false}
      style={{ fontSize: "12px", fill: textColor }}
    />
    <ChartTooltip
      cursor={false}
      content={<ChartTooltipContent indicator="dot" />}
    />
    <Area
      type="monotone"
      dataKey="value"
      stroke={chartColors[0]}
      fill="url(#grad1)"
      fillOpacity={1}
    />
  </AreaChart>
</ChartContainer>
```

### ECharts Charts (Heatmap, Calendar)

ECharts renders its own canvas-based tooltips — no portal needed. Use `echarts-for-react` or raw `useEffect` with `echarts.init()`.

---

## 28. Testing Checklist

### Before Marking Complete

#### Visual

- [ ] Light mode — all text readable, colors from palette
- [ ] Dark mode — all text readable, reversed palette if needed
- [ ] All 12 color schemes tested (sunset, dark, colored, gold, aqua, dull, dry, greens, chrome, beach, jolly, gothic)
- [ ] Tooltips visible at all chart edges (no clipping)
- [ ] Empty state renders cleanly
- [ ] Loading skeleton matches chart type
- [ ] Fullscreen modal renders chart correctly

#### Functional

- [ ] Drag handle moves card in grid
- [ ] Resize handle resizes card within min/max constraints
- [ ] Favorite toggle persists across page reload
- [ ] Info popover opens with correct title + description + details
- [ ] Category controls toggle visibility (if applicable)
- [ ] AI insight loads, caches, shows sentiment
- [ ] Time filter changes trigger data refresh (via bundle)
- [ ] Currency changes format all values correctly (test USD → EUR → GBP)
- [ ] `React.memo` verified: parent re-render does NOT re-render chart (use React DevTools Profiler)

#### Responsive

- [ ] Desktop (1920px): full grid layout, all buttons visible
- [ ] Tablet (768px): responsive adjustments
- [ ] Mobile (375px): expand button visible, info/AI hidden, fullscreen works

#### Performance

- [ ] No console errors or warnings
- [ ] `displayName` set (shows in React DevTools)
- [ ] All `useMemo` dependencies correct (no missing deps)
- [ ] No unnecessary re-renders (verify with Profiler)
- [ ] Data sanitized with `toNumericValue()` — no NaN in chart
- [ ] `npm run build` passes with no errors

---

## 29. Anti-Patterns

| # | ❌ Don't | ✅ Do Instead |
|---|----------|---------------|
| 1 | Hard-code colors `["#ff6384", "#36a2eb"]` | Use `getPalette()` from `useColorScheme()` |
| 2 | Write `$${amount}` or `€${amount}` | Use `formatCurrency(amount)` |
| 3 | Fetch data in the chart component | Receive `data` prop from bundle via ChartsGrid |
| 4 | Create a new API endpoint per chart | Add to existing bundle aggregation |
| 5 | Use inline `<div>` tooltips | Use `NivoChartTooltip` or `ChartTooltip` |
| 6 | Export without `memo()` | Always wrap with `memo(function Name(...))` |
| 7 | Skip `displayName` | Always set `Component.displayName = "Component"` |
| 8 | Add `overflow-hidden` to Card | Leave Card overflow visible for tooltips |
| 9 | Add `CardDescription` | Title only — description goes in `ChartInfoPopover` |
| 10 | Transform data inside JSX | Use `useMemo` with proper dependencies |
| 11 | Forget the drag handle | Always include `GridStackCardDragHandle` as first element |
| 12 | Hard-code date filters in SQL | Use the `filter` parameter passed through the bundle |
| 13 | Skip loading/empty states | Always handle all three render states |
| 14 | Use `useEffect` to fetch data | Data comes from bundle → React Query → props |
| 15 | Mock data in development | Always use real bundle data; test with real DB |

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/chart-card-sizes.config.ts` | ChartId type + size constraints |
| `lib/charts/aggregations.ts` | Analytics page SQL aggregations |
| `lib/charts/home-trends-savings-aggregations.ts` | Home/Trends/Savings SQL aggregations |
| `lib/charts/fridge-aggregations.ts` | Fridge page SQL aggregations |
| `lib/cache/upstash.ts` | Redis cache: `getCachedOrCompute`, `buildCacheKey`, `invalidateUserCachePrefix` |
| `lib/date-filter.ts` | Date filter validation + normalization |
| `components/color-scheme-provider.tsx` | 12 color palettes, `useColorScheme()` |
| `components/currency-provider.tsx` | Currency formatting, `useCurrency()` |
| `components/chart-tooltip.tsx` | Portal-based tooltip: `NivoChartTooltip`, `ChartTooltipRow` |
| `components/chart-loading-state.tsx` | Loading skeletons + empty states |
| `components/chart-favorite-button.tsx` | Star toggle with localStorage |
| `components/chart-ai-insight-button.tsx` | AI insight popover with caching |
| `components/chart-info-popover.tsx` | Info + category controls popover |
| `components/chart-expand-button.tsx` | Mobile fullscreen trigger |
| `components/chart-fullscreen-modal.tsx` | Fullscreen modal with orientation lock |
| `components/gridstack-card-drag-handle.tsx` | Drag handle (6-dot grip icon) |
| `components/lazy-chart.tsx` | IntersectionObserver deferred rendering |
| `components/chart-visibility-provider.tsx` | Centralized category visibility context |
| `components/sortable-grid.tsx` | @dnd-kit grid provider with resize |
| `lib/chart-resize-context.tsx` | Debounced resize (prevents chart thrashing) |
| `hooks/use-chart-category-visibility.ts` | Per-chart category hide/show hook |
| `hooks/use-dashboard-data.ts` | Bundle fetch hooks (React Query) |

---

**Last Updated**: February 2025
**Maintained by**: Trakzi Development Team
