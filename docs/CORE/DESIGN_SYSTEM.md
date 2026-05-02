# Trakzi Design System

Design language, tokens, and component patterns established across the UI polish work (Phases 1–9). Reference this before building any new UI surface.

---

## Brand Tokens

### Color

| Token | Value | Usage |
|-------|-------|-------|
| Primary orange | `oklch(0.6716 0.1368 48.513)` | Icon tints, empty state icons, chip borders |
| Deep orange | `oklch(0.6368 0.2078 25.3313)` | Error states, error toast border/bg, crash chart |
| Warm cream | `#FAF9F5` | Page background (light mode) |
| Dark bg | `#212121` | Page background (dark mode) |
| `--accent` | `oklch(0.9491 0 0)` (light) / `oklch(0.3211 0 0)` (dark) | Skeleton base color |

### Icon tint pattern
```tsx
// Never use text-muted-foreground for empty state icons — use brand orange
<Icon style={{ color: "oklch(0.6716 0.1368 48.513)" }} />
```

### Opacity scale for brand color
| Use | Opacity |
|-----|---------|
| Icon container background | `/ 0.06` |
| Error toast background | `/ 0.06` |
| Error badge background | `/ 0.06` |
| Error toast border | `/ 0.35` |
| Ambient glow (loading screens) | `/ 0.05` |
| Ambient glow (centered spinner) | `/ 0.07` |

---

## Typography

- **Body / UI**: `font-sans` (Geist Sans)
- **Monospace chips / ledger rows**: `font-mono`
- **Chip text size**: `text-[10px]`
- **Empty state title**: `text-base font-semibold` or `text-lg font-semibold`
- **Empty state description**: `text-sm text-muted-foreground`

---

## Motion

| Token | Value |
|-------|-------|
| Ease | `cubic-bezier(0.2, 0, 0, 1)` (`--ease-silk`) |
| Page enter | `animate-in fade-in slide-in-from-bottom-4 duration-500` |
| Card/state enter | `animate-in fade-in slide-in-from-bottom-2 duration-500` |
| Simple fade | `animate-in fade-in duration-500` |
| Staggered cards | `animationDelay: ${i * 80}ms` + `animationFillMode: "both"` |

---

## Empty State Pattern

Every empty state in the app uses the same visual structure. Do not deviate.

```tsx
<div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
  {/* Icon container */}
  <div className="relative">
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-[oklch(0.6716_0.1368_48.513/0.06)]">
      <Icon className="h-9 w-9" style={{ color: "oklch(0.6716 0.1368 48.513)" }} />
    </div>
    {/* Ledger chip — copy is context-specific, always in CAPS · CAPS format */}
    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
      CONTEXT · STATUS
    </div>
  </div>

  {/* Text */}
  <div className="mt-1">
    <h3 className="text-base font-semibold">Human-readable title</h3>
    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1.5">
      Supporting description.
    </p>
  </div>

  {/* Optional CTA */}
  <Button variant="outline" size="sm">Action</Button>
</div>
```

### Chip copy conventions

| Context | Chip |
|---------|------|
| No transactions | `TXN · NIL` |
| No transfers | `TXN · NIL` |
| No favorites/charts | `PORTFOLIO · EMPTY` |
| No countries | `MARKETS · OFFLINE` |
| No assets/items | `ASSETS · NIL` |
| Analytics/Fridge/Savings empty | `TXN · NIL` |

**Rule**: Two words, uppercase, separated by ` · ` (space-middot-space), always in `font-mono text-[10px]`.

---

## Loading / Skeleton Pattern

### Base Skeleton
`components/ui/skeleton.tsx` — renders `[data-slot="skeleton"]` which gets the shimmer sweep from `globals.css`.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

<Skeleton className="h-4 w-32" />
```

### Shimmer stagger (for grids)
Pass `--skeleton-delay` as a CSS custom property to offset shimmer start time:
```tsx
<Skeleton
  className="h-5 w-24"
  style={{ "--skeleton-delay": `${i * 80}ms` } as React.CSSProperties}
/>
```
Each card wrapper also gets a staggered fade-in:
```tsx
<Card
  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
  className="animate-in fade-in duration-300"
>
```

### SVG chart skeletons
Wrap `<ChartSkeleton>` in a `.shimmer-wrap` div — the sweep overlays the SVG shapes.
SVG elements inside `.shimmer-wrap` have their `animate-pulse` suppressed by CSS automatically.

### Loading screen glow
Every `loading.tsx` page gets a fixed radial glow as the first child:
```tsx
<div
  className="pointer-events-none fixed inset-0"
  style={{
    background: "radial-gradient(ellipse 60% 40% at 50% 20%, oklch(0.6716 0.1368 48.513 / 0.05) 0%, transparent 70%)",
  }}
/>
```
For centered spinners (`app/loading.tsx`) use `at 50% 50%` and `/ 0.07` opacity.

---

## Toast Pattern

Toasts are styled via `toastOptions.classNames` in `components/ui/sonner.tsx`.

| Type | Border | Background |
|------|--------|------------|
| Error | `oklch(0.6368 0.2078 25.3313 / 0.35)` | `oklch(0.6368 0.2078 25.3313 / 0.06)` |
| Success | `green-200` / `green-800/40` dark | `green-50/70` / `green-950/30` dark |
| Warning | `amber-200` / `amber-800/40` dark | `amber-50/70` / `amber-950/30` dark |
| Info | `blue-200` / `blue-800/40` dark | `blue-50/70` / `blue-950/30` dark |

All toasts use `rounded-xl` (`--border-radius: 12px`).

---

## Error Pages

Three files handle different failure levels. All share the same warm/brand aesthetic.

### `app/not-found.tsx` — 404 page
**Visual concept**: A declined bank receipt.
- Perforated top/bottom edges: 32 small rounded divs in a flex row
- Giant `404` in brand orange (`oklch(0.6716 0.1368 48.513)`)
- Rotated "DECLINED" stamp
- Ledger rows: ROUTE / STATUS CODE / CATEGORY / BALANCE OWED
- Random hex TXN ID in the footer: `TXN-{hex}`
- Triggered by: unmatched routes, `notFound()` calls in server components

### `app/error.tsx` — Runtime error boundary
**Visual concept**: A crashing market chart.
- SVG line chart that draws in via `stroke-dashoffset` animation
- "▼ 100.00% vs expected uptime" subline
- Collapsible `<details>` for error message + digest
- "Try again" → calls `reset()`, "Back to home" → `<Link href="/home">`
- Triggered by: thrown errors inside the app shell (not root layout)

### `app/global-error.tsx` — Root layout crash
**Visual concept**: A collapsing bar chart with system-down badge.
- **Fully self-contained** — zero imports from the app, inline `<style>`, own `<html>/<body>`
- Bar chart: 12 bars animate from their heights down to 4px with staggered delays
- Pulsing "System error" badge with `@keyframes pulse` on `::before` dot
- `@media (prefers-color-scheme: dark)` handles dark mode (next-themes unavailable at this level)
- Hardcoded tokens: `#C6613F` (light orange), `#E5AA7F` (dark orange), `#FAF9F5` (cream bg)
- Triggered by: crashes inside the root layout itself

### To trigger error pages during development
```bash
# 404 — navigate to any non-existent route
http://localhost:3000/this-does-not-exist

# error.tsx — temporarily throw in any page component
throw new Error("test")

# global-error.tsx — temporarily throw in app/layout.tsx
```

---

## Global CSS Additions (`app/globals.css`)

These rules were added as part of the UI polish and must not be removed:

```css
/* Shimmer overlay for SVG chart skeletons */
.shimmer-wrap { ... }
.shimmer-wrap::before { ... animation: skeleton-shimmer ... }
.shimmer-wrap .animate-pulse { animation: none; } /* suppress inner pulse */

/* Base skeleton shimmer */
[data-slot="skeleton"] { background-color: var(--accent); }
[data-slot="skeleton"]::before {
  animation: skeleton-shimmer 1.8s ease-in-out infinite;
  animation-delay: var(--skeleton-delay, 0ms); /* stagger support */
}

@keyframes skeleton-shimmer { 100% { transform: translateX(200%); } }
```

---

## Anti-Patterns

| ❌ Don't | ✅ Do Instead |
|---------|-------------|
| `bg-muted animate-pulse` raw divs | `<Skeleton>` component |
| `text-muted-foreground` on empty state icons | Brand orange via inline style |
| `rounded-full` icon container | `rounded-2xl border-dashed` container |
| Generic "No data yet" copy | Financially-flavored copy + ledger chip |
| `@media (prefers-color-scheme: dark)` in app components | `.dark` class selector (next-themes uses class strategy) |
| `var(--color-accent)` | `var(--accent)` (the `--color-*` mapping has a double-dash bug) |
| Missing `animationFillMode: "both"` on staggered cards | Always pair `animationDelay` with `animationFillMode: "both"` |
