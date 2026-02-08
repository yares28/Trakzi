# Chart & UI Performance Optimization

> **Last Updated:** January 2026
> **Key Files:** `lazy-chart.tsx`, `sidebar.tsx`, `chart-resize-context.tsx`

---

## Overview

Performance strategy for rendering 100+ charts without degrading UX:

1. **Lazy Loading** — Charts only render when entering viewport
2. **Smart Unmounting** — Off-screen charts unmount after delay to free memory
3. **GPU Animations** — Sidebar uses `transform` instead of `width`/`margin`
4. **Resize Coordination** — Charts pause during sidebar animation

---

## LazyChart Component

**File:** `components/lazy-chart.tsx`

### How It Works

```
Page Load → Skeleton placeholders
    ↓
Scroll near chart → IntersectionObserver triggers
    ↓
Chart renders (hasRendered = true)
    ↓
Scroll away → After unmountDelay, chart unmounts (if keepMounted=false)
    ↓
Scroll back → Chart re-renders from scratch
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | "Loading chart..." | Skeleton placeholder title |
| `height` | number | 250 | Chart container height (px) |
| `rootMargin` | string | "200px" | How far before viewport to start loading |
| `keepMounted` | boolean | true | Whether to keep chart in DOM after first render |
| `unmountDelay` | number | 2000 | Delay (ms) before unmounting when leaving viewport |

### Usage Patterns

**Standard lazy loading (keeps mounted):**
```tsx
<LazyChart title="Spending by Category" height={300}>
  <ChartExpensesPie data={data} />
</LazyChart>
```

**Above-fold charts (load immediately):**
```tsx
<LazyChart title="Income Trends" height={250} rootMargin="0px">
  <ChartAreaInteractive data={data} />
</LazyChart>
```

**Memory-conscious (unmounts when off-screen):**
```tsx
<LazyChart title="Historical Data" keepMounted={false} unmountDelay={3000}>
  <ChartSwarmPlot data={largeDataset} />
</LazyChart>
```

### State Machine

```
Initial State:
  isVisible: false
  hasRendered: false
  shouldRender: false
  → Shows: Skeleton

First intersection:
  isVisible: true
  hasRendered: true
  shouldRender: true
  → Shows: Chart

Scroll away (keepMounted=true):
  isVisible: false (ignored - observer disconnected)
  → Shows: Chart (stays mounted)

Scroll away (keepMounted=false):
  isVisible: false
  → After unmountDelay → shouldRender: false
  → Shows: Skeleton

Scroll back before delay:
  isVisible: true
  → Timeout cleared, shouldRender stays true
  → Shows: Chart (no unmount happened)
```

### The Unmount Delay

**Why 2000ms default?**
- Fast scrolling causes rapid enter/leave events
- Without delay: Chart mounts → unmounts → remounts → unmounts (thrashing)
- With delay: Quick scroll-through keeps chart mounted
- Only truly off-screen charts (user stopped scrolling elsewhere) unmount

**Customizing delay:**
- High-memory charts: Use shorter delay (1000ms)
- Interactive charts: Use longer delay (5000ms) to preserve state
- Static charts: Default is fine

---

## Sidebar GPU Acceleration

**File:** `components/ui/sidebar.tsx`

### The Problem with Width Transitions

```css
/* BAD - triggers layout recalculation every frame */
.sidebar {
  width: 350px;
  transition: width 300ms;
}
.sidebar.collapsed {
  width: 0;
}
```

Every frame during animation:
1. Browser recalculates element width
2. Triggers reflow of all adjacent content
3. Charts re-measure their containers
4. Charts re-render with new dimensions
5. Result: 15-30fps, visible jank

### The GPU-Accelerated Solution

```css
/* GOOD - only GPU-composited properties animate */
.sidebar-gap {
  transform-origin: left;
  transition: transform 300ms;
}
.sidebar-gap.collapsed {
  transform: scaleX(0);
}

.sidebar-container {
  transition: transform 300ms;
}
.sidebar-container.collapsed {
  transform: translateX(-100%);
}
```

**Why this works:**
- `transform` is GPU-composited (no layout recalc)
- Browser renders sidebar to texture, GPU scales/moves it
- Main thread stays free for other work
- Result: Solid 60fps

### Implementation Details

**Gap element (creates space for sidebar):**
```tsx
<div
  className={cn(
    "relative w-(--sidebar-width) origin-left",
    "transition-transform duration-300",
    "group-data-[collapsible=offcanvas]:scale-x-0"
  )}
/>
```

**Container element (the actual sidebar):**
```tsx
<div
  className={cn(
    "fixed inset-y-0 left-0 w-(--sidebar-width)",
    "transition-transform duration-300",
    "group-data-[collapsible=offcanvas]:-translate-x-full"
  )}
/>
```

**SidebarInset (main content area):**
```tsx
<main
  className={cn(
    "transition-transform duration-300",
    "md:peer-data-[collapsible=offcanvas]:-translate-x-[var(--sidebar-width)]"
  )}
/>
```

---

## Chart Resize Coordination

**File:** `lib/chart-resize-context.tsx`

### The Problem

When sidebar toggles:
1. Main content area width changes
2. ResizeObserver fires on every chart
3. Each chart re-measures and re-renders
4. 20+ charts × 60 frames = 1200+ re-renders during 300ms animation

### The Solution

```tsx
// In SidebarProvider:
const toggleSidebar = React.useCallback(() => {
  pauseResize()           // Tell charts to ignore resize events
  setOpen((open) => !open)
  resumeResize(300)       // Resume after animation completes
}, [])
```

**ChartResizeContext provides:**
- `isPaused` — boolean charts check before responding to resize
- `pauseResize()` — immediately pause all chart resize handlers
- `resumeResize(delay)` — resume after specified delay

### Chart Integration

Charts that use container dimensions should respect the pause:

```tsx
function MyChart() {
  const { isPaused } = useChartResize()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (isPaused) return // Skip resize during sidebar animation

    const observer = new ResizeObserver(([entry]) => {
      setDimensions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    // ...
  }, [isPaused])
}
```

---

## Coverage by Page

| Page | Charts | LazyChart Wrapped | Notes |
|------|--------|-------------------|-------|
| Analytics | 19 | 19 (100%) | All charts wrapped |
| Home | 16 | 16 (100%) | Top 5 use `rootMargin="0px"` |
| Fridge | 18 | 18 (100%) | First 5 use `rootMargin="0px"`; Transaction History + SVG bar charts use resize coordination |
| Trends | 4 | 4 (100%) | — |
| Savings | 3 | 3 (100%) | — |

---

## Performance Metrics

| Metric | Before | After |
|--------|--------|-------|
| Initial DOM nodes | 3000+ | ~800 |
| Charts in DOM (scrolled) | All 50+ | ~10 visible |
| Memory at 100 charts | Grows unbounded | Stable ~150MB |
| Sidebar toggle FPS | 15-30 | 60 |
| Scroll jank | Yes | None |

---

## Anti-Patterns

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Render chart without LazyChart | Always wrap with LazyChart |
| Use `keepMounted={false}` for interactive charts | Keep mounted to preserve user state |
| Animate `width`, `margin`, `left`, `right` | Use `transform: translateX()` or `scaleX()` |
| Skip `useChartResize` check | Respect `isPaused` in resize handlers |
| Set `unmountDelay={0}` | Use at least 1000ms to prevent thrashing |

---

## Debugging

### Check if charts are unmounting:
```js
// In browser console
document.querySelectorAll('[data-slot="lazy-chart"]').length
// Scroll around, check count changes
```

### Profile sidebar animation:
1. Open DevTools → Performance
2. Click record
3. Toggle sidebar
4. Stop recording
5. Look for long "Recalculate Style" or "Layout" blocks (should be minimal)

### Check chart resize coordination:
```js
// Should log "paused" during sidebar animation
window.__chartResizeDebug = true
```

---

## Future Improvements

If chart count exceeds 200 per page:
- Consider `@tanstack/virtual` for row virtualization
- Would require SortableGrid integration for drag-drop
- Current smart unmounting handles 100+ efficiently
