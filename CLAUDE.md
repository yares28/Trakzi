# CLAUDE.md

Context file for Claude Code AI assistant. Auto-loaded at conversation start.

## Priority Order

**All changes must satisfy (in order):**
1. **Security** — No vulnerabilities, data leaks, or unauthorized access
2. **Scalability** — Queries, components, APIs must handle 100K+ rows/users
3. **UX** — Responsive, fluid, no bugs or layout shifts

> [!CAUTION]
> Push back on any solution that is inefficient or won't scale. Propose alternatives.

## Quick Reference

### Commands
```bash
npm run dev       # Dev server (localhost:3000)
npm run build     # Production build — ALWAYS run before completing tasks
npm run lint      # ESLint
npm test          # Jest tests
```

### Key Files
| Purpose | Location |
|---------|----------|
| DB queries | `lib/neonClient.ts` → `neonQuery()`, `neonInsert()` |
| Auth | `lib/auth.ts` → `getCurrentUserId()` |
| Subscriptions | `lib/subscriptions.ts` |
| Types | `lib/types/` or `types/` |
| API routes | `app/api/` |
| Tests | `__tests__/` (mirrors source structure) |
| Schema docs | `docs/CORE/NEON_DATABASE.md` |

### Terminology
- **Trakzi / Folio** = Product names (same app)
- **Fridge** = Receipt/grocery tracking section
- **Statement** = Imported bank CSV file
- **Bundle API** = Aggregated chart endpoints (e.g., `home-bundle`, `fridge-bundle`)

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS v4** + shadcn/ui
- **Neon Postgres** via `@neondatabase/serverless` (raw SQL, no Prisma)
- **Clerk** auth → synced to Neon `users` table
- **Stripe** subscriptions → webhooks at `/api/webhook/stripe`
- **Upstash Redis** → caching, rate limiting
- **PostHog** → analytics

### Three-System Identity
```
Clerk userId (primary) ←→ Neon users.user_id ←→ Stripe customer.metadata.userId
```
Neon is source of truth for subscription status.

## Patterns

### Database Access
```typescript
import { neonQuery } from '@/lib/neonClient'
// ALWAYS include user_id filter
const rows = await neonQuery<T>('SELECT * FROM table WHERE user_id = $1', [userId])
```

### API Authentication
```typescript
import { getCurrentUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getCurrentUserId() // Throws 401 if not authenticated
  // Use userId in ALL queries
}
```

### Page Structure
```
app/
  [page]/
    page.tsx           # Route entry
    _page/             # Page-specific components, hooks, utils
```

## Chart Bundles & Caching (IMPORTANT)

Every page loads chart data via a **single bundle API** that aggregates all charts and caches with **Upstash Redis**.

### Bundle Routes by Page

| Page | Bundle API | Aggregation File | Cache Prefix |
|------|------------|------------------|--------------|
| Home | `/api/charts/home-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `home` |
| Analytics | `/api/charts/analytics-bundle` | `lib/charts/aggregations.ts` | `analytics` |
| Fridge | `/api/charts/fridge-bundle` | `lib/charts/fridge-aggregations.ts` | `fridge` |
| Analytics (Trends tab) | `/api/charts/trends-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `trends` |
| Savings | `/api/charts/savings-bundle` | `lib/charts/home-trends-savings-aggregations.ts` | `savings` |
| Data Library | `/api/charts/data-library-bundle` | — | `data-library` |

### When Adding or Updating Charts

> [!IMPORTANT]
> **Always bundle chart data and cache it.** Never fetch chart data with individual API calls.

1. **Add chart data to the aggregation file** (e.g., `lib/charts/aggregations.ts`)
2. **Include it in the bundle's Summary type** (e.g., `AnalyticsSummary`)
3. **Return it from the bundle function** (e.g., `getAnalyticsBundle()`)
4. **Cache is automatic** via `getCachedOrCompute()`

### Cache Pattern
```typescript
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'

// In bundle route:
const cacheKey = buildCacheKey('analytics', userId, filter, 'bundle')
const data = await getCachedOrCompute<AnalyticsSummary>(
    cacheKey,
    () => getAnalyticsBundle(userId, filter),
    CACHE_TTL.analytics  // 5 minutes
)
```

### Cache Invalidation
When data changes (upload, edit, delete), invalidate the relevant cache:
```typescript
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'

// After mutation:
await invalidateUserCachePrefix(userId, 'analytics')
await invalidateUserCachePrefix(userId, 'home')
```

### Cache TTLs (`lib/cache/upstash.ts`)
- `analytics` / `fridge`: 5 minutes
- `categories`: 30 minutes
- `short`: 1 minute

## Chart Documentation (MANDATORY)

> [!IMPORTANT]
> **When adding, modifying, or deleting charts, you MUST update the corresponding documentation file.**

### Chart Documentation Files

| Page | Documentation File |
|------|-------------------|
| Analytics | `docs/PAGES/ANALYTICS_CHARTS.md` |
| Fridge | `docs/PAGES/FRIDGE_CHARTS.md` |
| Savings | `docs/PAGES/SAVINGS_CHARTS.md` |
| Test Charts | `docs/PAGES/TEST_CHARTS.md` |

### When to Update Documentation

1. **Adding a new chart**: Add entry to the charts table with Chart ID, Component File, Component Name, Description
2. **Modifying a chart**: Update the description or component name if changed
3. **Deleting a chart**: Remove the entry from the table and update the total count
4. **Moving a chart between pages**: Remove from source doc, add to destination doc

### Required Information Per Chart

```markdown
| # | Chart ID | Component File | Component Name | Description |
|---|----------|----------------|----------------|-------------|
| X | `chartId` | `chart-name.tsx` | `ChartName` | Brief description |
```

### Chart Component Checklist

When creating a new chart:
- [ ] Wrap with `React.memo`
- [ ] Add `displayName` property
- [ ] Add to ChartsGrid render logic
- [ ] Add to bundle API if server-side data needed
- [ ] **Update documentation file**

## Chart Component Performance (CRITICAL)

Every chart component **MUST** follow these performance patterns to prevent sluggish page loads and interactions.

### Required for ALL Chart Components

1. **Wrap with `React.memo`** — Prevents re-renders when parent updates but props unchanged
```typescript
import { memo } from "react"

export const ChartMyChart = memo(function ChartMyChart({ data, isLoading }: Props) {
  // Component implementation
})

ChartMyChart.displayName = "ChartMyChart"
```

2. **Use `LazyChart` for below-fold charts** — Defers rendering until near viewport
```typescript
import { LazyChart } from "@/components/lazy-chart"

// In ChartsGrid:
<LazyChart title="My Chart Title" height={250}>
  <ChartMyChart data={data} />
</LazyChart>
```

3. **Memoize expensive computations** — Use `useMemo` for data transformations
```typescript
const processedData = useMemo(() =>
  expensiveTransform(rawData),
  [rawData]
)
```

### Key Performance Files
| File | Purpose |
|------|---------|
| `components/lazy-chart.tsx` | IntersectionObserver wrapper for deferred chart rendering |
| `components/chart-visibility-provider.tsx` | Centralized context for chart category visibility (replaces per-chart localStorage reads) |
| `lib/chart-resize-context.tsx` | Debounces chart resize during window resize (100ms pause) |
| `hooks/use-debounced-resize.ts` | Reusable hook for debounced resize event handling |
| `components/ui/sidebar.tsx` | GPU-accelerated sidebar animations (uses `transform` instead of `width`/`margin`) |

### Chart Grids by Page
| Page | Grid File | Has LazyChart |
|------|-----------|----------------|
| Analytics | `app/analytics/_page/components/ChartsGrid.tsx` | ✅ Yes |
| Home | `app/home/_page/components/ChartsGrid.tsx` | ❌ Needs adding |
| Fridge | `app/fridge/_client/components/ChartsGrid.tsx` | ❌ Needs adding |

### Performance Anti-Patterns — AVOID

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Export chart without `memo()` | Always wrap exports with `memo()` |
| Render heavy charts immediately | Wrap below-fold charts with `LazyChart` |
| Transition `width`/`margin`/`left`/`right` CSS | Use GPU-composited `transform: translateX()` or `scaleX()` |
| Multiple `localStorage.getItem()` per chart | Use `ChartVisibilityProvider` context |
| Inline data transforms in JSX | Use `useMemo` with proper dependencies |
| Add resize listener without debounce | Use `useDebouncedResize` hook (100-250ms delay) |

## Security Checklist

Before any change, verify:

- [ ] All queries filter by `user_id = $1`
- [ ] User input validated before DB operations
- [ ] API routes call `getCurrentUserId()` or explicitly handle public access
- [ ] No sensitive data in client code or logs
- [ ] Stripe webhooks verify signature
- [ ] File uploads validate type + size

## Verification

### Build Test (Required)
```bash
npm run build  # Must pass with no errors
```

### Security Review
- [ ] No SQL injection (parameterized queries only)
- [ ] No XSS (sanitize user input in UI)
- [ ] No auth bypass (data endpoints protected)
- [ ] No data leaks (user A can't see user B's data)
- [ ] Rate limiting on public endpoints (Upstash)

### Scalability Review
- [ ] Queries efficient at 100K rows (use EXPLAIN if unsure)
- [ ] No N+1 query problems
- [ ] Caching considered for expensive operations
- [ ] No unnecessary re-renders

## Anti-Patterns — AVOID

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Use `any` type | Create proper types in `lib/types/` |
| Create custom UI from scratch | Use existing shadcn components |
| Hard-code secrets | Use environment variables |
| Skip `user_id` filter | Always scope queries by user |
| Write queries without parameterization | Use `$1, $2` placeholders |
| Large, unfocused diffs | Keep changes small and targeted |
| Ignore build failures | Fix all errors before completing |
| Over-engineer | Keep solutions simple; only do what's asked |
| Fetch chart data individually | Add to bundle API + use Redis cache |
| Skip cache invalidation after mutations | Call `invalidateUserCachePrefix()` |

## Deployment

| Environment | Domain | Purpose |
|-------------|--------|---------|
| Staging | `dev.trakzi.com` | All changes deploy here first |
| Production | `trakzi.com` | Only after staging validation |

## Testing

```bash
npm test                              # All tests
npm test -- --watch                   # Watch mode
npm test -- path/to/file.test.ts      # Single file
```

**Guidelines:**
- New features → happy-path + edge-case tests
- Bug fixes → regression test
- Tests mirror source: `__tests__/lib/parsing/parseCsvToRows.test.ts`

## Data Flow

```
CSV/PDF Upload → lib/parsing/ → lib/ai/ (categorization) → Neon DB → lib/charts/ → UI
```

```
Receipt Image → lib/receipts/ocr/ → lib/receipts/parsers/ → Categorization → Neon DB
```

## When Unsure

1. Check `docs/CORE/` for architecture decisions
2. Search existing patterns: `grep -r "pattern" lib/`
3. Ask for clarification rather than assume
