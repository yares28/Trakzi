# Analytics Page Card-Charts (Long + Short) - Exact Clone Spec

This document is meant to be handed to an AI (or a dev) to recreate an **exact clone/copy** of the Analytics page "chart cards" system anywhere in the app, without breaking layout logic.

It covers:

- The **GridStack** grid wrapper that makes cards **draggable + resizable**
- The **exact DOM structure**, CSS, sizing math, and persistence
- The shared **card header buttons** (drag handle, favorite/star, info popover, AI insights)
- A **Long card chart** reference (Income & Expenses Tracking / Recharts area chart)
- A **Short card chart** reference (Expense Breakdown / Nivo pie chart)
- How to make the system accept **different DB data** on different pages
- How to re-implement quickly + safely

---

## 0) Glossary (Match the Analytics page)

### "Card"
The shadcn `Card` component (`components/ui/card.tsx`) rendered **inside** a GridStack item.

### "Long card" vs "Short card"
In this app, "long" means **full width** and "short" means **half width**:

- **Long card**: `w = 12` (12 columns = 100% of the grid container)
- **Short card**: `w = 6` (6 columns = 50% of the grid container)

Heights are in GridStack row units (`h`), not pixels.

### Grid units -> pixels
On the analytics page:

- `column = 12`
- `cellHeight = 70`

So the **grid-item outer height** is: `h * 70px` (before CSS adjustments).

---

## 1) Where the Analytics card-charts live (source of truth).

- Page: `app/analytics/page.tsx`
  - Chart order: `analyticsChartOrder`
  - Default layout: `DEFAULT_CHART_SIZES`
  - Allowed sizes (width snapping): `snapToAllowedSize()`
  - GridStack init + events: the `useEffect` that calls `GridStack.init()`
  - Persistence: localStorage keys `analytics-chart-sizes` + `analytics-chart-sizes-version`

- Per-chart min/max constraints: `lib/chart-card-sizes.config.ts`

- Global GridStack styling (critical): `app/globals.css` (the `.grid-stack*` rules)

- Drag handle component: `components/gridstack-card-drag-handle.tsx`

- Shared header buttons:
  - Favorite/star: `components/chart-favorite-button.tsx` + `components/favorites-provider.tsx`
  - Info popover (+ category visibility UI): `components/chart-info-popover.tsx`
  - AI insights popover: `components/chart-ai-insight-button.tsx` + API `app/api/ai/chart-insight/route.ts`
  - Category visibility persistence: `hooks/use-chart-category-visibility.ts`

---

## 2) Exact DOM structure (page -> grid -> item -> card)

### 2.1 Grid container (analytics)

The grid container is a single div with:

- `ref={gridRef}`
- class includes `grid-stack`

```tsx
<div ref={gridRef} className="grid-stack w-full px-4 lg:px-6">
  {analyticsChartOrder.map((chartId) => (
    <div
      key={chartId}
      className="grid-stack-item overflow-visible"
      data-chart-id={chartId}
      data-gs-w={initialW}
      data-gs-h={initialH}
      data-gs-x={defaultX}
      data-gs-y={defaultY}
      data-gs-min-w={minW}
      data-gs-max-w={maxW}
      data-gs-min-h={minH}
      data-gs-max-h={maxH}
    >
      <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
        {/* Chart component returns a <Card> */}
      </div>
    </div>
  ))}
</div>
```

### 2.2 Card internals (all chart components follow this pattern)

Each chart component returns:

- `<Card className="@container/card">`
- `<CardHeader>`
  - Left cluster: drag handle + favorite + title
  - Right cluster: info + AI (+ optional chart controls)
- `<CardContent>` containing the chart view (responsive)

This pattern is consistent across most chart components in `components/chart-*.tsx`.

---

## 3) Global CSS that makes the cards fit perfectly (do not skip)

### 3.1 Why it matters
Without these rules, you'll get:

- Wrong sizing (cards not filling items)
- Random scrollbars
- Resize handles in weird places
- Popovers clipped
- Janky drag/resize animations

### 3.2 Required CSS selectors
The analytics layout depends on the GridStack rules in `app/globals.css`:

- `.grid-stack { width: 100%; overflow: visible; ... }`
- `.grid-stack > .grid-stack-item { transition: ... }`
- `.grid-stack-item-content { height: 100%; width: 100%; ... }`
- `[data-slot="card"]` forced to fill the grid item
- Resize handle positioning:
  - `.grid-stack-item .ui-resizable-handle.ui-resizable-se { right: 8px; bottom: 8px; width: 20px; height: 20px; }`
  - Hide other handles: `.grid-stack-item .ui-resizable-handle:not(.ui-resizable-se) { display: none }`

### 3.3 "The actual visible card size"
Important: the CSS intentionally creates spacing by shrinking the inner content:

- `.grid-stack-item-content.overflow-visible` ends up using **margin 8px**
- and `height: calc(100% - 16px)` / `width: calc(100% - 16px)`

So the **Card's rendered box** is effectively:

- `gridItemWidth - 16px`
- `gridItemHeight - 16px`

This is what you want when cloning the design.

---

## 4) GridStack behavior (dragging + resizing + persistence)

### 4.1 GridStack options (exact)
Analytics initializes GridStack with:

- `column: 12`
- `cellHeight: 70`
- `margin: 0`
- `float: false`
- `disableOneColumnMode: true`
- `draggable.handle: ".gridstack-drag-handle"`
- `resizable.handles: "se"` (bottom-right only)

### 4.2 Dragging (how it works)

- Drag is only possible by grabbing the **drag handle button**:
  - Selector: `.gridstack-drag-handle`
  - Component: `GridStackCardDragHandle`
  - Visual: "grip" icon, cursor changes to grab/grabbing

What the user experiences:

1. Hover the handle -> cursor becomes "grab"
2. Hold + drag -> the entire card moves inside the 12-col grid
3. Other UI elements inside the card (chart hover, buttons) don't start dragging because the handle is exclusive

### 4.3 Resizing (how it works)

- Only the **bottom-right** resize corner exists.
- It's positioned visually inside the card (absolute, `right: 8px; bottom: 8px;`).
- As the user resizes, GridStack emits events:
  - `resize` -> constraints enforced live (clamping to min/max)
  - `resizestop` -> final clamping + save

### 4.4 Width "snapping" (6 vs 12)
Analytics defines:

```ts
snapToAllowedSize(w, h) => { w: 6 or 12, h: clamp(4..20) }
```

Where snapping happens:

- On grid initialization when reading saved/default sizes
- When saving sizes (change/dragstop) it saves snapped widths

Note: the page's live resize handler clamps min/max, but the **"6 or 12 only" rule is primarily enforced through saving/loading**.

### 4.5 Per-chart constraints (min/max)
Constraints come from `getChartCardSize(chartId)` in `lib/chart-card-sizes.config.ts`.

Examples:

- `incomeExpensesTracking1`: `minH = maxH = 6` (fixed height)
- `expenseBreakdown`: `minH = 7`, `maxH = 20` (vertically resizable)

### 4.6 Persistence (localStorage)
Analytics stores layout in localStorage:

- `analytics-chart-sizes` -> `Record<chartId, { w, h, x?, y? }>`
- `analytics-chart-sizes-version` -> string version

Versioning behavior:

- If the version changes, the page:
  - forces **new default `w/h`**
  - keeps the user's **saved `x/y`**
  - writes the merged result back to storage

Why this matters:

- You can ship layout updates without destroying user placements.

---

## 5) The shared "Card Header Buttons" (exact behavior + how they work)

### 5.1 Drag handle button

- Component: `components/gridstack-card-drag-handle.tsx`
- Class: `gridstack-drag-handle`
- Visual: 8x8 button area, grip icon
- A11y: `role="button"`, `tabIndex={0}`, `aria-label="Drag card"`

### 5.2 Favorite (star) button

- Component: `components/chart-favorite-button.tsx`
- Data: `chartId` is a `ChartId` from `lib/chart-card-sizes.config.ts`
- Persistence: `localStorage["dashboard-favorite-charts"]` (via `FavoritesProvider`)
- Feedback: toast via `sonner`

What it does:

- Toggles "favorited" status in a Set
- Shows filled star when active
- Intended meaning: "add/remove this chart from Dashboard favorites"

### 5.3 Info popover button (+ optional category toggles)

- Component: `components/chart-info-popover.tsx`
- Visual: info icon button
- Content:
  - Title + description
  - Bullet details
  - Optional "Hidden categories" badges
  - Optional "Manage categories" panel

Category panel behavior:

- "Manage categories" toggles a grid of category buttons
- Clicking a category calls `categoryControls.onToggle(normalizedCategory)`
- Optional "Reset" clears hidden categories via `categoryControls.onClear`

Outside click close behavior:

- It adds a `window.addEventListener("pointerdown", ..., capture=true)` while open
- Clicking outside closes it

### 5.4 AI insight button

- Component: `components/chart-ai-insight-button.tsx`
- Visual: sparkles icon button
- On open:
  - POSTs to `/api/ai/chart-insight` with `{ chartId, chartTitle, chartDescription, chartData }`
  - Caches insight results in-memory (Map) to prevent repeated calls
- Shows:
  - Loading animation
  - Error state with "Try again"
  - Insight block with sentiment + optional tips list

Server dependency:

- API route: `app/api/ai/chart-insight/route.ts`
- Requires auth (`getCurrentUserId()`)

---

## 6) Long card chart reference (exact): Income & Expenses Tracking

### 6.0 Default GridStack size + constraints (analytics defaults)

From `app/analytics/page.tsx` + `lib/chart-card-sizes.config.ts`:

- `incomeExpensesTracking1`
  - Default layout: `{ w: 12, h: 6, x: 0, y: 0 }`
  - Constraints: `{ minW: 6, maxW: 12, minH: 6, maxH: 6 }` (fixed height)
- `incomeExpensesTracking2`
  - Default layout: `{ w: 12, h: 6, x: 0, y: 6 }`
  - Constraints: `{ minW: 6, maxW: 12, minH: 6, maxH: 6 }` (fixed height)

### 6.1 Component + libraries

- Component: `components/chart-area-interactive.tsx`
- Chart library: `recharts` (`AreaChart`, `Area`, `CartesianGrid`, `XAxis`, `Tooltip`)
- Theme: `next-themes` + `useColorScheme()` palette

### 6.2 Card shell (header + actions)

Header layout (left):

- `GridStackCardDragHandle`
- `ChartFavoriteButton` with:
  - `chartId = incomeExpensesTracking1 | incomeExpensesTracking2`
  - `chartTitle = "Income & Expenses Tracking"`
- `CardTitle` text "Income & Expenses Tracking"

Header actions (right):

- `ChartInfoPopover` (explains what the chart means)
- `ChartAiInsightButton` (fetches insight)

Layout classes to match exactly:

- `CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"`
- The info+AI cluster uses a vertical stack: `flex flex-col items-center gap-2`

### 6.3 Data contract (make your adapter match this)

The chart expects:

```ts
type IncomeExpensesPoint = { date: string; desktop: number; mobile: number }
```

Semantics:

- `desktop` = Income series
- `mobile` = Expenses series (in analytics it's often cumulative/offset)

### 6.4 Graph rendering + sizing

Exact chart container sizing:

- `ChartContainer className="aspect-auto h-[250px] w-full min-w-0"`
- The chart height is fixed to `250px` (this is why the GridStack height for this card is fixed: `minH=maxH=6`)

Tooltip behavior (important to clone):

- Recharts' `<Tooltip content={...} />` is used only to detect hover
- A **custom absolute tooltip div** is rendered manually:
  - `position: absolute; pointer-events: none;`
  - Offsets from cursor: `left = x + 16`, `top = y - 16`, `transform: translate(0, -100%)`

Why it's implemented that way:

- Recharts tooltip `content` can run during render; the component uses `queueMicrotask()` to avoid React "setState during render" warnings.

Colors:

- Income is fixed to `#fe8339` (both themes)
- Expenses uses palette/dark-mode rules in the component

### 6.5 Loading/empty state

If `data.length === 0`:

- The card still renders the header/actions
- Content shows a `div.h-[250px]` with `ChartLoadingState`

---

## 7) Short card chart reference (exact): Expense Breakdown

### 7.0 Default GridStack size + constraints (analytics defaults)

From `app/analytics/page.tsx` + `lib/chart-card-sizes.config.ts`:

- `expenseBreakdown`
  - Default layout: `{ w: 6, h: 10, x: 6, y: 30 }`
  - Constraints: `{ minW: 6, maxW: 12, minH: 7, maxH: 20 }` (resizable)

### 7.1 Component + libraries

- Component: `components/chart-expenses-pie.tsx`
- Chart library: `@nivo/pie` (`ResponsivePie`)
- Theme: `next-themes` + `useColorScheme()`

### 7.2 Card shell (header + actions)

Header layout (left):

- `GridStackCardDragHandle`
- `ChartFavoriteButton`:
  - `chartId="expenseBreakdown"`
  - `chartTitle="Expense Breakdown"`
- `CardTitle` "Expense Breakdown"

Header actions (right):

- `ChartInfoPopover` explaining the pie
- `ChartAiInsightButton` with `chartData` including totals + top category

### 7.3 Data contract

```ts
type ExpenseSlice = { id: string; label: string; value: number }
```

### 7.4 Graph rendering + sizing

SSR/CSR behavior:

- Nivo uses DOM APIs; the component waits for mount:
  - `const [mounted, setMounted] = useState(false)`
  - `useEffect(() => setMounted(true), [])`
- When not mounted, it renders a placeholder card (same header) and empty content.

Exact sizing:

- CardContent includes: `flex-1 min-h-0`
- Pie wrapper div: `className="h-full w-full min-h-[250px]"` (so it scales up when the card is taller, but never below 250px)

Exact Nivo options used (clone these):

- `margin={{ top: 40, right: 80, bottom: 40, left: 80 }}`
- `innerRadius={0.5}`
- `padAngle={0.7}`
- `cornerRadius={3}`
- `activeOuterRadiusOffset={8}`
- `borderWidth={0}`
- Link labels + arc labels enabled with theme-dependent colors
- Custom tooltip showing:
  - color dot + label
  - currency value
  - percentage of total

Color assignment logic:

- Sort slices by `value desc`
- Take up to top 7
- Assign colors from the palette (excluding `#c3c3c3`), reversed so **highest values get darkest colors**
- Text color uses helper `getTextColor()` to keep labels readable.

### 7.5 Loading/empty state

- If data is empty:
  - Same header/actions
  - Content shows `ChartLoadingState` in a `min-h-[250px]` box

---

## 8) Make it fit into ANY page (without breaking logic)

### 8.1 Do this to avoid hydration/layout bugs

1. Put the GridStack implementation in a `"use client"` component.
2. On first render, output deterministic `data-gs-w/h/x/y` from defaults (no localStorage read during SSR).
3. After mount:
   - load localStorage sizes
   - init GridStack
   - call `grid.load(widgets)` to apply saved sizes
4. Destroy GridStack on unmount.

This is exactly how `app/analytics/page.tsx` works.

### 8.2 Use separate storage keys per page
If you clone the chart grid to another page (reports, savings, etc), do NOT reuse:

- `analytics-chart-sizes`
- `analytics-chart-sizes-version`

Instead:

- `yourpage-chart-sizes`
- `yourpage-chart-sizes-version`

This prevents different pages from overwriting each other's layouts.

### 8.3 Keep the CSS assumptions consistent

If you move this system into a new project or new layout:

- Ensure `app/globals.css` includes the `.grid-stack*` rules (or copy them)
- Ensure the `Card` component still sets `data-slot="card"` + `data-slot="card-content"`
  - The GridStack CSS relies on these attributes to force full-height fill.

### 8.4 Don't wrap the grid in "overflow-hidden"

Avoid placing the grid inside a parent container with:

- `overflow: hidden`
- `transform: translateZ(0)` (creates stacking context surprises)

Reason:

- GridStack uses absolute positioning and transforms.
- Chart tooltips/popovers may need to escape.

Radix popovers generally portal to `body`, but some chart-specific overlays are in-card.

---

## 9) Make the same card accept different DB data (portable chart cards)

### 9.1 Rule: the card/chart component should not depend on a specific page
To reuse in multiple pages:

- Keep chart components "dumb": accept `data`, `isLoading`, and optional controls.
- Do DB fetching + transformation at the page level (or in a shared data loader hook).

### 9.2 Use adapters (recommended pattern)

Define per-chart adapters:

- Input: your DB rows (transactions, budgets, etc)
- Output: the chart component's expected `data` shape

Example adapter contract:

```ts
type ChartAdapter<TIn, TOut> = (input: TIn, ctx?: { hidden?: Set<string> }) => TOut
```

For the Long card (area chart), adapter outputs:

- `Array<{ date; desktop; mobile }>`

For the Short card (pie chart), adapter outputs:

- `Array<{ id; label; value }>`

### 9.3 Category visibility support (optional but matches Analytics)

If you want the info popover to control visibility:

1. Create a `useChartCategoryVisibility({ chartId, storageScope })` instance
2. Pass `categoryControls={visibility.buildCategoryControls(categories)}` to the chart
3. Filter your adapter input using `visibility.hiddenCategorySet`

This matches Analytics' behavior: toggles hide categories **only for that chart**, persisted in localStorage.

### 9.4 Quick recipe: add a new chart card (easy + portable)

Use this when you want to add a new chart idea quickly while staying compatible with drag/resize/persistence:

1. Add a new `ChartId` in `lib/chart-card-sizes.config.ts` (or create a separate config for your new page).
2. Add its size constraints in `CHART_CARD_SIZES`:
   - Set fixed height charts with `minH === maxH`.
   - Set resizable charts with a larger `maxH`.
3. Add the new chart to your page:
   - Add to the chart order array (like `analyticsChartOrder`)
   - Add a default `{ w, h, x, y }` entry (like `DEFAULT_CHART_SIZES`)
4. Build a chart component that returns a `Card` and matches the header UX:

```tsx
<Card className="@container/card">
  <CardHeader>
    <div className="flex items-center gap-2">
      <GridStackCardDragHandle />
      <ChartFavoriteButton chartId="yourChartId" chartTitle="Your Title" size="md" />
      <CardTitle>Your Title</CardTitle>
    </div>
    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-col items-center gap-2">
        <ChartInfoPopover title="Your Title" description="..." details={["..."]} />
        <ChartAiInsightButton chartId="yourChartId" chartTitle="Your Title" chartData={{ /* keep it small */ }} size="sm" />
      </div>
    </CardAction>
  </CardHeader>
  <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
    <div className="h-full w-full min-h-[250px]">
      {/* your chart library goes here */}
    </div>
  </CardContent>
</Card>
```

5. Keep your data layer page-specific:
   - Fetch DB data in the page (or a shared loader hook).
   - Transform via an adapter function into the exact prop shape your chart expects.
6. Optional: If your chart should respond to resizing in real-time (like analytics' Money Flow),
   pass its current `{ w, h }` from the page into the chart and adjust the chart content based on that.
7. Avoid breaking React hook rules:
   - Do not call hooks inside a `.map()` callback that returns JSX; compute chart data with `useMemo` outside the loop and pass it in.

---

## 10) Recommendations (things you'll want to add to THIS file over time)

If you keep using this as the single "truth spec" for cloning charts, add:

1. A **table per chartId**:
   - default `{w,h,x,y}`
   - min/max from `lib/chart-card-sizes.config.ts`
   - component file + chart library
2. A "**new chart checklist**":
   - add new `ChartId`
   - add `CHART_CARD_SIZES` entry
   - add default size/position
   - add to chart order array
   - define adapter + category controls
3. A "**responsive/mobile mode**" decision:
   - currently `disableOneColumnMode: true` preserves desktop layout; document what should happen on small screens.
4. A shared `ChartCardShell` component suggestion:
   - unify header layout (drag + star + title + actions) so every chart isn't duplicating the same JSX.

---

## 11) @dnd-kit Implementation (Replaces GridStack)

As of December 2024, the drag-and-drop system has been migrated from **GridStack** to **@dnd-kit** due to reliability issues with GridStack's auto-scroll in v6+.

### 11.1 Why @dnd-kit?

- **Reliable auto-scroll**: Works correctly when dragging items near viewport edges
- **No cursor desync**: The dragged element stays in sync with the cursor during scroll
- **Simpler initialization**: No complex useEffect lifecycle management
- **React-first**: Designed for React from the ground up

### 11.2 Core Components

The implementation lives in:

- `components/sortable-grid.tsx` - Core components:
  - `SortableGridProvider` - Wraps the entire chart grid
  - `SortableGridItem` - Wraps each chart card
  - `useDragHandle` - Hook for drag handle integration

- `components/gridstack-card-drag-handle.tsx` - Compatible with both GridStack and @dnd-kit

### 11.3 SortableGridProvider Props

```tsx
interface SortableGridProviderProps {
  children: React.ReactNode
  chartOrder: string[]  // Array of chart IDs in current order
  onOrderChange: (newOrder: string[]) => void  // Called when order changes
  className?: string
}
```

Features:
- Built-in **auto-scroll** (15% from edge triggers scroll)
- Uses `closestCenter` collision detection
- Smooth drop animations

### 11.4 SortableGridItem Props

```tsx
interface SortableGridItemProps {
  id: string           // Chart ID (must match chartOrder)
  children: ReactNode  // The chart component
  w?: 6 | 12          // Width: 6 = half, 12 = full
  h?: number           // Height in grid units (70px each)
  className?: string
}
```

Features:
- **Size preservation during drag**: Cards maintain their original width/height
- Y-axis only transform (X positioning handled by flexbox)
- Provides drag handle context to children

### 11.5 Migration Pattern

**Before (GridStack):**
```tsx
// Imports
import { GridStack } from "gridstack"
import "gridstack/dist/gridstack.min.css"

// Refs
const gridRef = useRef<HTMLDivElement>(null)
const gridStackRef = useRef<GridStack | null>(null)

// Complex useEffect for initialization (~400 lines)
useEffect(() => {
  // GridStack.init(), event handlers, cleanup...
}, [dependencies])

// Render
<div ref={gridRef} className="grid-stack">
  {chartOrder.map(chartId => (
    <div className="grid-stack-item" data-gs-w={w} ...>
      <div className="grid-stack-item-content">
        <ChartComponent />
      </div>
    </div>
  ))}
</div>
```

**After (@dnd-kit):**
```tsx
// Imports
import { SortableGridProvider, SortableGridItem } from "@/components/sortable-grid"

// State for order persistence
const [chartOrder, setChartOrder] = useState<string[]>(defaultOrder)

// Load from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('chart-order-key')
  if (saved) setChartOrder(JSON.parse(saved))
}, [])

// Order change handler
const handleOrderChange = useCallback((newOrder: string[]) => {
  setChartOrder(newOrder)
  localStorage.setItem('chart-order-key', JSON.stringify(newOrder))
}, [])

// Render
<SortableGridProvider chartOrder={chartOrder} onOrderChange={handleOrderChange}>
  {chartOrder.map(chartId => (
    <SortableGridItem key={chartId} id={chartId} w={6} h={6}>
      <ChartComponent />
    </SortableGridItem>
  ))}
</SortableGridProvider>
```

### 11.6 Drag Handle Integration

The `GridStackCardDragHandle` component works with both systems:

```tsx
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

// In your card header:
<CardHeader>
  <GridStackCardDragHandle />
  <CardTitle>Chart Title</CardTitle>
</CardHeader>
```

It automatically:
- Detects if it's inside a `SortableGridItem` (via context)
- Attaches the correct drag listeners
- Shows grab/grabbing cursor
- Includes proper accessibility attributes

### 11.7 Order Persistence

Each page should persist its chart order separately:

| Page | Storage Key | Description |
|------|-------------|-------------|
| Analytics | `analytics-chart-order` | Main dashboard charts |
| Trends | `trends-category-order` | Category trend cards |
| Home | `home-favorites-order` | Favorite charts section |
| Fridge | `fridge-item-order` | Fridge items |

### 11.8 Size Preservation During Drag

The `SortableGridItem` prevents size switching when dragging different-sized cards:

```tsx
// Only Y-axis transform (flexbox handles X)
const adjustedTransform = transform ? {
  x: 0,  // Don't translate X
  y: transform.y,
  scaleX: 1,
  scaleY: 1,
} : null
```

This ensures a half-width card (w=6) doesn't visually swap sizes with a full-width card (w=12) during drag.

### 11.9 Pages Using @dnd-kit

All chart pages are now migrated to @dnd-kit:

- ✅ `/analytics` - Migrated (19 charts)
- ✅ `/trends` - Migrated (category cards with preserved user order)
- ✅ `/savings` - Migrated (single chart with full card header: drag handle, favorite, info, AI insights)
- ✅ `/fridge` - Migrated (18 grocery-specific charts)
- ✅ `/home` - Migrated (favorites section with dynamic chart order)
- ✅ `/testCharts` - Migrated (51 test charts with order persistence)
- ✅ `/test-dndkit` - Demo/test page for @dnd-kit

### 11.10 CSS Grid Layout

The @dnd-kit system uses **CSS Grid with dense auto-flow** for automatic gap filling:

```tsx
// Container - 12-column grid with dense packing
<div style={{
  gridTemplateColumns: 'repeat(12, 1fr)',
  gridAutoFlow: 'row dense',  // Fills gaps automatically
  gridAutoRows: '70px',       // Fixed row height for 2D packing
}}>

// Items use column AND row spans
<div style={{
  gridColumn: `span ${w}`,  // Width: 3-12 columns
  gridRow: `span ${h}`,     // Height: based on grid units
}}>
```

**Width Options (GridWidth type):**
| Columns | Percentage |
|---------|------------|
| 3 | 25% |
| 4 | 33% |
| 6 | 50% |
| 8 | 67% |
| 9 | 75% |
| 12 | 100% |

### 11.11 Resize Functionality

Cards support resize via a handle in the bottom-right corner:

```tsx
<SortableGridItem
  id={chartId}
  w={savedSizes[chartId]?.w ?? defaultW}
  h={savedSizes[chartId]?.h ?? defaultH}
  resizable
  minW={3} maxW={12}
  minH={4} maxH={12}
  onResize={handleChartResize}
>
```

**Animations:**
- Grid position changes: 400ms cubic-bezier(0.4, 0, 0.2, 1)
- Drag: scale(1.02) + shadow
- Resize: pulsing border + shadow

The `grid-stack-item-content` wrapper inside each item is kept for compatibility with existing chart components.

### 11.11 Order Preservation (Trends Page Example)

The trends page demonstrates how to preserve user-specified order over automatic sorting:

**Problem**: Categories are sorted by spending (most spent first) when loaded from API.
**Solution**: Only use spending order as the initial default; preserve user order after first drag.

```tsx
// Load saved order from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem('trends-category-order')
  if (saved) setCategoryOrder(JSON.parse(saved))
}, [])

// Sync with categories - PRESERVE user order if exists
useEffect(() => {
  if (categories.length > 0 && categoryOrder.length === 0) {
    // No saved order - use spending sort as initial order
    setCategoryOrder(categories)
  } else if (categories.length > 0 && categoryOrder.length > 0) {
    // User has saved order - keep it!
    const existingInOrder = categoryOrder.filter(c => categories.includes(c))
    const newCategories = categories.filter(c => !categoryOrder.includes(c))
    
    if (newCategories.length > 0 || existingInOrder.length !== categoryOrder.length) {
      // Append new categories at end, remove deleted ones
      setCategoryOrder([...existingInOrder, ...newCategories])
    }
  }
}, [categories, categoryOrder.length])
```

Key points:
- The `categoryOrder.length` dependency ensures we don't reset when categories haven't changed
- New categories are appended at the end (in spending order since that's how they come from API)
- Deleted categories are automatically removed
- User's custom order is preserved across page reloads and data refreshes

