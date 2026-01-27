# Complete Chart Card Clone Specification

> **Last Updated**: January 2025
> **Purpose**: Step-by-step guide to clone a chart card with ALL required features

This document provides **every detail** needed to create a new chart card that matches the existing Trakzi chart system perfectly.

---

## Table of Contents

1. [Quick Start Checklist](#quick-start-checklist)
2. [Required Card Components](#required-card-components)
3. [Color & Theme System](#color--theme-system)
4. [Data Fetching](#data-fetching)
5. [Complete Code Template](#complete-code-template)
6. [Chart-Specific Configurations](#chart-specific-configurations)
7. [Testing Checklist](#testing-checklist)

---

## Quick Start Checklist

Before creating a new chart, ensure you have:

- [ ] Chart ID added to `lib/chart-card-sizes.config.ts`
- [ ] Size constraints defined (minW, maxW, minH, maxH)
- [ ] Default layout position (w, h, x, y)
- [ ] Chart added to page's chart order array
- [ ] Data adapter function created

---

## Required Card Components

### 1. **Drag Handle** ✅
```tsx
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

// In CardHeader:
<GridStackCardDragHandle />
```

**Details**:
- **Position**: First element in CardHeader
- **Cursor**: Auto-changes to grab/grabbing
- **Accessibility**: Includes `role="button"`, `tabIndex={0}`, `aria-label="Drag card"`
- **Works with**: Both @dnd-kit and GridStack systems

---

### 2. **Favorite Button** ⭐
```tsx
import { ChartFavoriteButton } from "@/components/chart-favorite-button"

<ChartFavoriteButton
  chartId="yourChartId"  // Must match ChartId type
  chartTitle="Your Chart Title"
  size="md"  // Options: "sm" | "md"
/>
```

**Details**:
- **Position**: After drag handle, before title
- **Storage**: localStorage `dashboard-favorite-charts`
- **Visual**: Star icon (filled when favorited)
- **Feedback**: Toast notification on toggle

---

### 3. **Expand Button** 🔲
```tsx
import { ChartExpandButton } from "@/components/chart-expand-button"

<ChartExpandButton onClick={() => setIsFullscreen(true)} />
```

**Details**:
- **Position**: After drag handle (optional, before favorite button)
- **Only shows**: When fullscreen modal is implemented
- **Icon**: Maximize/expand icon

---

### 4. **Info Popover with Category Controls** ℹ️
```tsx
import { ChartInfoPopover, ChartInfo PopoverCategoryControls } from "@/components/chart-info-popover"

<ChartInfoPopover
  title="Chart Title"
  description="What this chart shows..."
  details={[
    "Detail point 1",
    "Detail point 2"
  ]}
  ignoredFootnote="Optional: explain what's excluded"
  categoryControls={categoryControls}  // Optional
/>
```

**Category Controls (Optional)**:
```tsx
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"

// In component:
const visibility = useChartCategoryVisibility({
  chartId: "yourChartId",
  storageScope: "analytics"  // or "trends", "fridge", etc.
})

const categoryControls = visibility.buildCategoryControls(allCategories)
```

**Details**:
- **Position**: CardAction section (right side)
- **Layout**: Vertical stack with AI button
- **Manages**: Hidden categories per chart
- **Storage**: localStorage `chart-category-visibility-{scope}`

---

### 5. **AI Insight Button** ✨
```tsx
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"

<ChartAiInsightButton
  chartId="yourChartId"
  chartTitle="Your Chart Title"
  chartDescription="Brief chart description"
  chartData={{
    // Keep this SMALL - only key metrics
    total: totalValue,
    topCategory: "Groceries",
    count: itemCount
  }}
  size="sm"  // Always "sm" in card header
/>
```

**Details**:
- **Position**: Below info popover in CardAction
- **API**: `/api/ai/chart-insight`
- **Caching**: In-memory cache to prevent duplicate calls
- **Shows**: Loading spinner, insights with sentiment analysis
- **Error handling**: "Try again" button on failure

---

### 6. **Card Header Layout Pattern** 📐

**Standard Layout**:
```tsx
<CardHeader>
  {/* LEFT CLUSTER */}
  <div className="flex items-center gap-2">
    <GridStackCardDragHandle />
    <ChartExpandButton onClick={() => setIsFullscreen(true)} /> {/* Optional */}
    <ChartFavoriteButton chartId="..." chartTitle="..." size="md" />
    <CardTitle>Chart Title</CardTitle> {/* NO description, title only */}
  </div>

  {/* RIGHT CLUSTER */}
  <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
    <div className="flex items-center gap-2 flex-col">  {/* Note: flex-col for vertical stack */}
      <ChartInfoPopover title="..." description="..." details={[...]} />
      <ChartAiInsightButton chartId="..." chartTitle="..." chartData={{...}} size="sm" />
    </div>
  </CardAction>
</CardHeader>
```

**Important**: 
- **NO CardDescription** - Title only!
- Info + AI buttons in **vertical stack** (`flex-col`)
- Responsive: vertical on mobile, horizontal on desktop

---

## Color & Theme System

### 1. **Color Palette** 🎨

```tsx
import { useColorScheme } from "@/components/color-scheme-provider"
import { useTheme } from "next-themes"

const { getPalette, colorScheme } = useColorScheme()
const { resolvedTheme } = useTheme()

// Get palette colors
const palette = getPalette()  // Returns array of colors based on user's scheme

// Color schemes available:
// - "colored" - Vibrant colors
// - "monochrome" - Grayscale
// - "gold" - Gold/brown tones
// - "blue", "green", "purple", "red", "orange"
```

**Color Assignment Pattern** (for multi-series charts):
```tsx
const chartColors = useMemo(() => {
  const palette = getPalette()
  // For dark mode compatibility, use palette as-is
  // Nivo/Recharts handle rendering appropriately
  return palette
}, [getPalette])
```

**For Pie Charts** (darker = larger values):
```tsx
const dataWithColors = useMemo(() => {
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  const sorted = [...data].sort((a, b) => b.value - a.value)
  
  // Reverse palette so darkest colors go to largest values
  const reversedPalette = [...palette].reverse().slice(0, 7)
  
  return sorted.map((item, index) => ({
    ...item,
    color: reversedPalette[index % reversedPalette.length]
  }))
}, [data, getPalette])
```

---

### 2. **Text Colors (Dark/Light Mode)** 📝

**For Recharts**:
```tsx
const isDark = resolvedTheme === "dark"
const textColor = isDark ? "#9ca3af" : "#4b5563"  // Axis labels
const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"

<CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
<XAxis stroke={textColor} style={{ fontSize: '12px', fill: textColor }} />
<YAxis stroke={textColor} style={{ fontSize: '12px', fill: textColor }} />
```

**For Nivo**:
```tsx
const isDark = resolvedTheme === "dark"
const textColor = isDark ? "#9ca3af" : "#4b5563"

theme={{
  text: { fill: textColor, fontSize: 12 },
  axis: {
    ticks: { text: { fill: textColor } },
    legend: { text: { fill: textColor } }
  },
  grid: {
    line: {
      stroke: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      strokeWidth: 1
    }
  }
}}
```

**Arc/Label Text Color** (for pie charts):
```tsx
// Determine if background is dark
const darkColors = ["#696969", "#464646", "#2F2F2F", "#252525"]
const goldDarkColors = ["#000000", "#361c1b", "#754232", "#cd894a"]

const getTextColor = (sliceColor: string, colorScheme?: string): string => {
  if (colorScheme === "gold") {
    return goldDarkColors.includes(sliceColor) ? "#ffffff" : "#000000"
  }
  return darkColors.includes(sliceColor) ? "#ffffff" : "#000000"
}

// In Nivo pie:
arcLabelsTextColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
```

---

### 3. **Custom Tooltips** 💬

> **IMPORTANT**: All charts use a unified tooltip system for consistent styling and boundary behavior.

#### Unified Tooltip Components

**For Nivo Charts (Pie, Radar, Sankey, TreeMap, etc.)**:
```tsx
import { NivoChartTooltip } from "@/components/chart-tooltip"

// Simple tooltip with title, color indicator, and value
tooltip={({ datum }) => (
  <NivoChartTooltip
    title={datum.label}
    titleColor={datum.color}
    value={formatCurrency(datum.value)}
    subValue={`${percentage.toFixed(1)}%`}  // Optional
  />
)}

// Multi-row tooltip (e.g., radar chart with multiple series)
sliceTooltip={({ index, data }) => (
  <NivoChartTooltip
    title="Category Name"
    hideTitleIndicator
    rows={data.map((item) => ({
      color: item.color,
      label: item.id,
      value: formatCurrency(item.value),
    }))}
  />
)}
```

**For Recharts Charts**:
```tsx
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// ChartTooltip automatically constrains tooltips within chart boundaries
<ChartTooltip
  cursor={false}
  content={
    <ChartTooltipContent
      labelFormatter={(value) => formatDate(value)}
      indicator="dot"
    />
  }
/>
```

#### Tooltip Boundary Behavior

**Tooltips automatically flip position** to stay within the visible viewport:

- **Portal-based rendering**: Tooltip escapes Nivo's container div via `createPortal` to `document.body`
- **Mouse position tracking**: Tracks cursor via `mousemove` listener for accurate positioning
- **Smart edge detection**: Calculates tooltip position relative to viewport bounds
- **Automatic flipping**: When approaching right/bottom edges, tooltip flips to left/top of cursor
- **No clipping**: Tooltip always stays fully visible within the viewport

**How it works** (for Nivo charts using `NivoChartTooltip`):
1. `NivoChartTooltip` uses `createPortal` to render directly to `document.body`
2. Mouse position is tracked via a global `mousemove` event listener
3. On each render, tooltip calculates its position based on:
   - Current mouse coordinates
   - Tooltip dimensions (via `getBoundingClientRect`)
   - Viewport bounds (`window.innerWidth`, `window.innerHeight`)
4. If tooltip would overflow any edge, position flips to opposite side of cursor
5. Uses `position: fixed` with calculated `left`/`top` for precise placement

**For Recharts**:
- Uses `allowEscapeViewBox={{ x: false, y: false }}` (built into `ChartTooltip`)
- Recharts handles internal positioning within the SVG viewBox

#### NivoChartTooltip Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Main tooltip title/label |
| `titleColor` | `string` | Color for title indicator dot |
| `hideTitleIndicator` | `boolean` | Hide the color dot next to title |
| `value` | `string` | Primary value (formatted) |
| `subValue` | `string` | Secondary value (percentage, date, etc.) |
| `rows` | `ChartTooltipRowProps[]` | Multiple rows for multi-series data |
| `maxWidth` | `number` | Max width before text wraps (default: 300) |
| `children` | `ReactNode` | Custom content instead of structured data |

#### Legacy Pattern (Deprecated)

The inline tooltip pattern below is **deprecated** - use `NivoChartTooltip` instead:
```tsx
// ❌ DEPRECATED - Don't use inline tooltips
tooltip={({ datum }) => (
  <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
    ...
  </div>
)}

// ✅ USE THIS INSTEAD
tooltip={({ datum }) => (
  <NivoChartTooltip
    title={datum.label}
    titleColor={datum.color}
    value={formatCurrency(datum.value)}
  />
)}
```

**Unified styling classes** (used internally by `NivoChartTooltip`):
- `bg-background` - Background (adapts to theme)
- `border-border/50` - Border color (adapts to theme)
- `text-foreground` - Primary text (adapts to theme)
- `text-foreground/80` - Secondary text (adapts to theme)
- `pointer-events-none` - Prevents tooltip flickering
- `select-none` - Prevents text selection

---

## Data Fetching

### 1. **Time Period Filters** 📅

Charts should respond to global time filters. **Do NOT create custom APIs**.

**Pattern**:
```tsx
// Page-level data fetching with filter
const { data: analyticsData } = useQuery({
  queryKey: ['analytics-bundle', filter],
  queryFn: async () => {
    const response = await fetch(`/api/analytics/bundle?filter=${filter}`)
    return response.json()
  }
})

// Pass filtered data to chart
<YourChartComponent 
  data={analyticsData.yourChartData}
  isLoading={isLoading}
/>
```

**Filter Values**:
- `all` - All time
- `year` - This year
- `month` - This month
- `week` - This week
- Custom date ranges

---

### 2. **Data Adapters** 🔄

Create adapter functions to transform API responses:

```tsx
// Type-safe adapter
type ChartAdapter<TInput, TOutput> = (
  input: TInput,
  context?: { hiddenCategories?: Set<string> }
) => TOutput

// Example for pie chart
const toPieData: ChartAdapter<Transaction[], PieSlice[]> = (transactions, ctx) => {
  const categoryTotals = new Map<string, number>()
  
  transactions.forEach(tx => {
    if (ctx?.hiddenCategories?.has(tx.category)) return
    categoryTotals.set(
      tx.category,
      (categoryTotals.get(tx.category) || 0) + Math.abs(tx.amount)
    )
  })
  
  return Array.from(categoryTotals.entries())
    .map(([category, value]) => ({
      id: category,
      label: category,
      value
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7)  // Top 7
}
```

---

## Complete Code Template

```tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"  // Or your chart library
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

interface YourChartProps {
  data?: YourDataType[]
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
}

export function YourChartComponent({ 
  data: baseData = [], 
  categoryControls, 
  isLoading = false 
}: YourChartProps) {
  // ===== REQUIRED HOOKS =====
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ===== DATA PREPARATION =====
  const sanitizedData = useMemo(() => 
    baseData.map(item => ({
      ...item,
      value: toNumericValue(item.value)
    })), 
    [baseData]
  )

  // ===== MOUNT CHECK (for Nivo/client-only libraries) =====
  useEffect(() => {
    setMounted(true)
  }, [])

  // ===== COLOR ASSIGNMENT =====
  const chartColors = useMemo(() => getPalette(), [getPalette])

  // ===== THEME-DEPENDENT COLORS =====
  const isDark = resolvedTheme === "dark"
  const textColor = isDark ? "#9ca3af" : "#4b5563"

  // ===== INFO POPOVER RENDERER =====
  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Your Chart Title"
        description="What this chart shows..."
        details={[
          "Detail 1",
          "Detail 2"
        ]}
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="yourChartId"
        chartTitle="Your Chart Title"
        chartDescription="Brief description"
        chartData={{
          // Keep minimal - only key metrics
          total: sanitizedData.reduce((sum, d) => sum + d.value, 0),
          count: sanitizedData.length
        }}
        size="sm"
      />
    </div>
  )

  // ===== CHART RENDERER =====
  const renderChart = () => (
    <ResponsivePie
      data={sanitizedData}
      margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
      colors={chartColors}
      theme={{ text: { fill: textColor, fontSize: 12 } }}
      tooltip={({ datum }) => (
        <NivoChartTooltip
          title={datum.label}
          titleColor={datum.color}
          value={formatCurrency(datum.value)}
        />
      )}
      // ... other chart-specific props
    />
  )

  // ===== LOADING STATE (pre-mount for Nivo) =====
  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="yourChartId"
              chartTitle="Your Chart Title"
              size="md"
            />
            <CardTitle>Your Chart Title</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" />
        </CardContent>
      </Card>
    )
  }

  // ===== EMPTY STATE =====
  if (!sanitizedData || sanitizedData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="yourChartId"
              chartTitle="Your Chart Title"
              size="md"
            />
            <CardTitle>Your Chart Title</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ===== MAIN RENDER =====
  return (
    <>
      {/* FULLSCREEN MODAL */}
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Your Chart Title"
        description="Chart description for fullscreen"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]" key={colorScheme}>
          {renderChart()}
        </div>
      </ChartFullscreenModal>

      {/* CARD */}
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="yourChartId"
              chartTitle="Your Chart Title"
              size="md"
            />
            <CardTitle>Your Chart Title</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
```

---

## Chart-Specific Configurations

### Recharts (Area, Bar, Line charts)

```tsx
import { 
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from "recharts"

const isDark = resolvedTheme === "dark"
const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
const textColor = isDark ? "#9ca3af" : "#4b5563"

<ResponsiveContainer width="100%" height={250}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="colorSeries1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={palette[0]} stopOpacity={0.3} />
        <stop offset="95%" stopColor={palette[0]} stopOpacity={0} />
      </linearGradient>
    </defs>
    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
    <XAxis 
      dataKey="date" 
      stroke={textColor}
      style={{ fontSize: '12px', fill: textColor }}
    />
    <YAxis 
      stroke={textColor}
      style={{ fontSize: '12px', fill: textColor }}
    />
    <Tooltip content={<CustomTooltip />} />
    <Area
      type="monotone"
      dataKey="value"
      stroke={palette[0]}
      fill="url(#colorSeries1)"
      fillOpacity={1}
    />
  </AreaChart>
</ResponsiveContainer>
```

---

### Nivo (Pie, Bar, etc.)

```tsx
import { ResponsivePie } from "@nivo/pie"
import { NivoChartTooltip } from "@/components/chart-tooltip"

const theme = {
  text: { fill: textColor, fontSize: 12 },
  grid: {
    line: {
      stroke: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      strokeWidth: 1
    }
  }
}

<ResponsivePie
  data={data}
  margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
  colors={chartColors}
  theme={theme}
  innerRadius={0.5}  // For donut
  padAngle={0.7}
  cornerRadius={3}
  activeOuterRadiusOffset={8}
  arcLabelsTextColor={(d) => getTextColor(d.color, colorScheme)}
  // Use unified tooltip component for consistency
  tooltip={({ datum }) => (
    <NivoChartTooltip
      title={datum.label}
      titleColor={datum.color}
      value={formatCurrency(datum.value)}
    />
  )}
  // ... other props
/>
```

---

## Testing Checklist

Before considering your chart complete, verify:

### Visual Tests
- [ ] **Light mode**: All text readable, colors appropriate
- [ ] **Dark mode**: All text readable, colors appropriate  
- [ ] **All color schemes**: Test colored, monochrome, gold, blue, green, purple, red, orange
- [ ] **Tooltips**: Show in both light/dark, position correctly
- [ ] **Hover states**: All interactive elements respond

### Functional Tests
- [ ] **Drag**: Card moves smoothly via drag handle
- [ ] **Resize**: Card resizes correctly (if resizable)
- [ ] **Favorite**: Toggle works, persists across reload
- [ ] **Info popover**: Opens, shows correct content
- [ ] **AI insights**: Loads insights, handles errors
- [ ] **Category controls**: Hide/show categories works (if applicable)
- [ ] **Time filters**: Chart updates with different time periods
- [ ] **Empty state**: Shows appropriate message when no data
- [ ] **Loading state**: Shows loading spinner correctly
- [ ] **Fullscreen**: Opens modal, renders chart correctly

### Responsive Tests
- [ ] **Desktop** (1920px): Full layout
- [ ] **Tablet** (768px): Responsive adjustments
- [ ] **Mobile** (375px): Stack correctly

### Performance Tests
- [ ] **No console errors**: Check browser console
- [ ] **No hydration warnings**: SSR matches client
- [ ] **Smooth animations**: No jank during interactions
- [ ] **Data updates**: Chart re-renders efficiently

---

## Size Configuration

Add to `lib/chart-card-sizes.config.ts`:

```tsx
export const CHART_CARD_SIZES = {
  yourChartId: {
    minW: 6,    // Half width minimum
    maxW: 12,   // Full width maximum
    minH: 7,    // Min height
    maxH: 20,   // Max height (20 = very tall)
  }
}

// In page default layout:
const DEFAULT_CHART_SIZES = {
  yourChartId: { w: 12, h: 10, x: 0, y: 0 }
}
```

**Height Guidelines**:
- `h: 6` - Compact (for fixed-height charts)
- `h: 8-10` - Medium (most charts)
- `h: 12-15` - Tall (complex visualizations)
- `h: 18-20` - Very tall (tables, detailed charts)

---

## Common Pitfalls

### ❌ DON'T:
- Add CardDescription (title only!)
- Create custom API endpoints (use existing bundle APIs)
- Hard-code colors (use palette)
- Forget empty/loading states
- Skip the mounted check for Nivo
- Use inline styles for theme colors

### ✅ DO:
- Use `getPalette()` for colors
- Use theme-aware classes (`bg-background`, `text-foreground`)
- Sanitize numeric data with `toNumericValue()`
- Memoize expensive calculations
- Handle both light and dark modes
- Test all color schemes
- Add proper TypeScript types

---

## Quick Reference

### Required Imports
```tsx
// Hooks
import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"

// Components
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"  // Unified tooltip for Nivo charts
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"

// Utils
import { toNumericValue } from "@/lib/utils"
```

### Standard Props Interface
```tsx
interface ChartProps {
  data?: YourDataType[]
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
}
```

---

**Last Updated**: January 2025
**Maintained by**: Trakzi Development Team
