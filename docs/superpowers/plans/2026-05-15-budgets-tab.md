# Budgets Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 6th "Budgets" chip to the Savings page that lets users set monthly caps per category and see how they're tracking against them across any date filter.

**Architecture:** New `budgets-bundle` API aggregates per-category monthly spend from Neon (LEFT JOIN category_budgets), caches in Redis under prefix `budgets`, and is consumed by a new `BudgetsPanel` component. Inline edit on existing cards uses the existing `/api/budgets` POST (upsert) endpoint. A `BudgetSheet` modal handles creation. Goals tab is untouched.

**Tech Stack:** Next.js App Router, Neon Postgres (raw SQL via `neonQuery`), Upstash Redis (`getCachedOrCompute`), TanStack Query (`useQuery`), Recharts, shadcn/ui (Sheet, Progress, Card, Select, Input, Button), `React.memo`, `LazyChart`.

---

## File Map

**New files:**
- `lib/types/budgets.ts` — `BudgetsSummary`, `BudgetCategoryRow` types
- `lib/charts/budgets-aggregations.ts` — `getBudgetsBundle()` SQL aggregator
- `app/api/charts/budgets-bundle/route.ts` — cached GET bundle endpoint
- `components/budgets/BudgetsPanel.tsx` — panel: summary + chart + grid
- `components/budgets/BudgetCard.tsx` — single category card with inline edit
- `components/budgets/BudgetSheet.tsx` — create-budget modal sheet
- `components/budgets/chart-budget-vs-spend-trend.tsx` — grouped bar chart
- `docs/PAGES/BUDGET_CHARTS.md` — chart documentation

**Modified files:**
- `lib/cache/upstash.ts` — add `'budgets'` to `CACHE_PREFIX` and `CACHE_TTL`
- `hooks/use-dashboard-data.ts` — add `BudgetsBundleData` type + `fetchBudgetsBundle()` + `useBudgetsBundleData()` hook
- `app/api/budgets/route.ts` — add cache invalidation on POST/DELETE
- `app/api/transactions/route.ts` — add `budgets` to the cache-invalidation list on POST/PUT/DELETE
- `app/savings/page.tsx` — add `"budgets"` to `SavingsViewMode`, add chip button, add panel branch

---

## Task 1: Define TypeScript types

**Files:**
- Create: `lib/types/budgets.ts`

- [ ] **Step 1: Create the types file**

```typescript
// lib/types/budgets.ts

export interface BudgetCategoryRow {
  categoryId: number
  name: string
  color: string
  monthlyCap: number | null
  /** One entry per calendar month that had spend in the filter window */
  monthlySpends: { month: string; amount: number }[]
  avgMonthly: number
  totalSpent: number
  /** avgMonthly - monthlyCap (negative = under budget) */
  overByMonthly: number
  /** Count of months where spend exceeded monthlyCap */
  overBudgetMonths: number
  status: 'under' | 'warning' | 'over' | 'unset'
}

export interface BudgetsSummary {
  /** Approximate months in the filter window (float, e.g. 3.0 for last3months) */
  monthsElapsed: number
  /** Per-month totals for the trend chart */
  monthlyTotals: { month: string; cap: number; spent: number }[]
  /** Categories that have a budget set */
  categories: BudgetCategoryRow[]
  /** Top-5 unbudgeted categories by avg monthly spend */
  suggestions: BudgetCategoryRow[]
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/budgets.ts
git commit -m "feat: add BudgetsSummary and BudgetCategoryRow types"
```

---

## Task 2: Register `budgets` cache prefix and TTL

**Files:**
- Modify: `lib/cache/upstash.ts`

- [ ] **Step 1: Add `budgets` to `CACHE_PREFIX`**

In `lib/cache/upstash.ts`, find the `CACHE_PREFIX` object and add the entry:

```typescript
const CACHE_PREFIX = {
    analytics: 'analytics',
    fridge: 'fridge',
    home: 'home',
    trends: 'trends',
    savings: 'savings',
    categories: 'categories',
    'data-library': 'data-library',
    'test-charts': 'test-charts',
    'pockets': 'pockets',
    'groceries-trends': 'groceries-trends',
    'friends': 'friends',
    'room': 'room',
    'financial-health': 'financial-health',
    'accounts': 'accounts',
    'budgets': 'budgets',   // ← ADD THIS LINE
} as const
```

- [ ] **Step 2: Add `budgets` TTL**

In `CACHE_TTL`, add:

```typescript
const CACHE_TTL = {
    analytics: 30 * 60,
    fridge: 30 * 60,
    'pockets': 5 * 60,
    categories: 30 * 60,
    short: 60,
    friends: 2 * 60,
    room: 2 * 60,
    'financial-health': 5 * 60,
    'accounts': 5 * 60,
    'budgets': 5 * 60,    // ← ADD THIS LINE
} as const
```

- [ ] **Step 3: Commit**

```bash
git add lib/cache/upstash.ts
git commit -m "feat: register budgets cache prefix and TTL"
```

---

## Task 3: Write the aggregation function

**Files:**
- Create: `lib/charts/budgets-aggregations.ts`
- Test: `__tests__/lib/charts/budgets-aggregations.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `__tests__/lib/charts/budgets-aggregations.test.ts`:

```typescript
// __tests__/lib/charts/budgets-aggregations.test.ts
import { computeMonthsElapsed, buildBudgetRows } from '@/lib/charts/budgets-aggregations'

describe('computeMonthsElapsed', () => {
  it('returns 1.0 for last30days', () => {
    expect(computeMonthsElapsed('last30days')).toBeCloseTo(0.986, 1)
  })

  it('returns ~3 for last3months', () => {
    expect(computeMonthsElapsed('last3months')).toBeCloseTo(2.99, 1)
  })

  it('returns ~6 for last6months', () => {
    expect(computeMonthsElapsed('last6months')).toBeCloseTo(5.98, 1)
  })

  it('returns 0 for null', () => {
    expect(computeMonthsElapsed(null)).toBe(0)
  })

  it('returns positive value for custom range', () => {
    expect(computeMonthsElapsed('custom:2025-01-01:2025-03-31')).toBeGreaterThan(2.5)
  })
})

describe('buildBudgetRows', () => {
  const rawRows = [
    { category_id: 1, name: 'Groceries', color: '#10b981', monthly_cap: '300', month: '2025-01-01', month_spend: '350' },
    { category_id: 1, name: 'Groceries', color: '#10b981', monthly_cap: '300', month: '2025-02-01', month_spend: '250' },
    { category_id: 2, name: 'Dining',    color: '#f97316', monthly_cap: null,   month: '2025-01-01', month_spend: '120' },
  ]

  const monthsElapsed = 3

  it('separates budgeted categories from suggestions', () => {
    const { categories, suggestions } = buildBudgetRows(rawRows, monthsElapsed)
    expect(categories).toHaveLength(1)
    expect(categories[0].name).toBe('Groceries')
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].name).toBe('Dining')
  })

  it('computes correct avgMonthly for Groceries', () => {
    const { categories } = buildBudgetRows(rawRows, monthsElapsed)
    // totalSpent = 350 + 250 = 600, avgMonthly = 600 / 3 = 200
    expect(categories[0].avgMonthly).toBeCloseTo(200, 1)
  })

  it('computes overByMonthly correctly', () => {
    const { categories } = buildBudgetRows(rawRows, monthsElapsed)
    // avgMonthly 200 - cap 300 = -100 (under budget)
    expect(categories[0].overByMonthly).toBeCloseTo(-100, 1)
  })

  it('counts months over budget correctly', () => {
    const { categories } = buildBudgetRows(rawRows, monthsElapsed)
    // Jan: 350 > 300 (over), Feb: 250 < 300 (under) → 1 over month
    expect(categories[0].overBudgetMonths).toBe(1)
  })

  it('assigns status "warning" when avgMonthly is 80-100% of cap', () => {
    const rows = [
      { category_id: 3, name: 'Transport', color: '#6366f1', monthly_cap: '200', month: '2025-01-01', month_spend: '170' },
    ]
    const { categories } = buildBudgetRows(rows, 1)
    expect(categories[0].status).toBe('warning')
  })

  it('assigns status "over" when avgMonthly exceeds cap', () => {
    const rows = [
      { category_id: 3, name: 'Transport', color: '#6366f1', monthly_cap: '200', month: '2025-01-01', month_spend: '250' },
    ]
    const { categories } = buildBudgetRows(rows, 1)
    expect(categories[0].status).toBe('over')
  })

  it('excludes suggestions with zero spend', () => {
    const rows = [
      { category_id: 4, name: 'Empty', color: '#aaa', monthly_cap: null, month: null, month_spend: null },
    ]
    const { suggestions } = buildBudgetRows(rows, 3)
    expect(suggestions).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
npm test -- __tests__/lib/charts/budgets-aggregations.test.ts
```

Expected: FAIL — `computeMonthsElapsed` and `buildBudgetRows` not defined.

- [ ] **Step 3: Create the aggregation file**

Create `lib/charts/budgets-aggregations.ts`:

```typescript
// lib/charts/budgets-aggregations.ts
import { neonQuery } from '@/lib/neonClient'
import { getDateRange } from '@/app/api/transactions/route'
import { getPeriodDaysFromFilter } from '@/lib/date-filter'
import type { BudgetCategoryRow, BudgetsSummary } from '@/lib/types/budgets'

type RawBudgetRow = {
  category_id: string
  name: string
  color: string | null
  monthly_cap: string | null
  month: string | null
  month_spend: string | null
}

/** Approximate number of calendar months in the filter window. */
export function computeMonthsElapsed(filter: string | null | undefined): number {
  const days = getPeriodDaysFromFilter(filter)
  if (!days) return 0
  return days / 30.4375
}

/** Determine budget status from average monthly spend vs cap. */
function computeStatus(avgMonthly: number, monthlyCap: number | null): BudgetCategoryRow['status'] {
  if (monthlyCap === null) return 'unset'
  const ratio = avgMonthly / monthlyCap
  if (ratio > 1) return 'over'
  if (ratio >= 0.8) return 'warning'
  return 'under'
}

/**
 * Transform raw DB rows into BudgetCategoryRow arrays.
 * Exported for unit testing.
 */
export function buildBudgetRows(
  rawRows: RawBudgetRow[],
  monthsElapsed: number
): { categories: BudgetCategoryRow[]; suggestions: BudgetCategoryRow[] } {
  // Group rows by category_id
  const grouped = new Map<number, RawBudgetRow[]>()
  for (const row of rawRows) {
    const id = Number(row.category_id)
    if (!grouped.has(id)) grouped.set(id, [])
    grouped.get(id)!.push(row)
  }

  const categories: BudgetCategoryRow[] = []
  const suggestions: BudgetCategoryRow[] = []

  for (const [, rows] of grouped) {
    const first = rows[0]
    const monthlyCap = first.monthly_cap !== null ? parseFloat(first.monthly_cap) : null

    // Collect monthly spends (skip NULL month rows — mean no transactions in period)
    const monthlySpends = rows
      .filter((r) => r.month !== null && r.month_spend !== null)
      .map((r) => ({ month: r.month!, amount: parseFloat(r.month_spend!) }))

    const totalSpent = monthlySpends.reduce((sum, s) => sum + s.amount, 0)
    const safeMonths = monthsElapsed > 0 ? monthsElapsed : 1
    const avgMonthly = totalSpent / safeMonths

    const overBudgetMonths = monthlyCap !== null
      ? monthlySpends.filter((s) => s.amount > monthlyCap).length
      : 0

    const overByMonthly = monthlyCap !== null ? avgMonthly - monthlyCap : 0

    const row: BudgetCategoryRow = {
      categoryId: Number(first.category_id),
      name: first.name,
      color: first.color ?? '#6366f1',
      monthlyCap,
      monthlySpends,
      avgMonthly,
      totalSpent,
      overByMonthly,
      overBudgetMonths,
      status: computeStatus(avgMonthly, monthlyCap),
    }

    if (monthlyCap !== null) {
      categories.push(row)
    } else if (avgMonthly > 0) {
      suggestions.push(row)
    }
  }

  categories.sort((a, b) => a.name.localeCompare(b.name))
  suggestions.sort((a, b) => b.avgMonthly - a.avgMonthly)

  return {
    categories,
    suggestions: suggestions.slice(0, 5),
  }
}

/** Main bundle aggregator — called by the API route. */
export async function getBudgetsBundle(
  userId: string,
  filter: string | null
): Promise<BudgetsSummary> {
  const { startDate, endDate } = getDateRange(filter)
  const monthsElapsed = computeMonthsElapsed(filter)

  const rawRows = await neonQuery<RawBudgetRow>(
    `
    SELECT
      c.id::text AS category_id,
      c.name,
      COALESCE(c.color, '#6366f1') AS color,
      cb.budget::text AS monthly_cap,
      TO_CHAR(DATE_TRUNC('month', t.tx_date), 'YYYY-MM-DD') AS month,
      SUM(ABS(t.amount))::text AS month_spend
    FROM categories c
    LEFT JOIN category_budgets cb
      ON cb.category_id = c.id
      AND cb.user_id = $1
      AND cb.scope = 'analytics'
    LEFT JOIN transactions t
      ON t.category_id = c.id
      AND t.user_id = $1
      AND t.amount < 0
      AND ($2::date IS NULL OR t.tx_date >= $2::date)
      AND ($3::date IS NULL OR t.tx_date <= $3::date)
    WHERE c.user_id = $1
      AND c.name IS NOT NULL
    GROUP BY c.id, c.name, c.color, cb.budget, DATE_TRUNC('month', t.tx_date)
    HAVING cb.budget IS NOT NULL OR SUM(ABS(t.amount)) > 0
    ORDER BY c.name, month NULLS LAST
    `,
    [userId, startDate, endDate]
  )

  const { categories, suggestions } = buildBudgetRows(rawRows, monthsElapsed)

  // Build monthly totals for the trend chart
  const monthTotalsMap = new Map<string, { cap: number; spent: number }>()
  for (const cat of categories) {
    const cap = cat.monthlyCap ?? 0
    for (const spend of cat.monthlySpends) {
      const entry = monthTotalsMap.get(spend.month) ?? { cap: 0, spent: 0 }
      entry.cap += cap
      entry.spent += spend.amount
      monthTotalsMap.set(spend.month, entry)
    }
  }

  const monthlyTotals = Array.from(monthTotalsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { cap, spent }]) => ({ month, cap, spent }))

  return { monthsElapsed, monthlyTotals, categories, suggestions }
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test -- __tests__/lib/charts/budgets-aggregations.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/charts/budgets-aggregations.ts __tests__/lib/charts/budgets-aggregations.test.ts
git commit -m "feat: add budgets bundle aggregation function with tests"
```

---

## Task 4: Create the bundle API route

**Files:**
- Create: `app/api/charts/budgets-bundle/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/charts/budgets-bundle/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getBudgetsBundle } from '@/lib/charts/budgets-aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter'

export const GET = async (request: Request) => {
  try {
    const userId = await getCurrentUserId()

    const rateLimitResult = await checkRateLimit(userId, 'bundle')
    if (rateLimitResult.limited) {
      return createRateLimitResponse(rateLimitResult.resetIn)
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    const cacheKey = buildCacheKey('budgets', userId, filter, 'bundle')

    const data = await getCachedOrCompute(
      cacheKey,
      () => getBudgetsBundle(userId, filter),
      CACHE_TTL['budgets']
    )

    return NextResponse.json(data)
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status
    if (status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[budgets-bundle] GET error:', error)
    return NextResponse.json({ error: 'Failed to load budgets bundle' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify the route responds (start dev server and curl)**

```bash
npm run dev &
curl -s http://localhost:3000/api/charts/budgets-bundle | head -c 200
```

Expected: JSON with shape `{ monthsElapsed, monthlyTotals, categories, suggestions }` (or 401 if not authenticated — both are correct).

Kill the dev server after checking: `kill %1`

- [ ] **Step 3: Commit**

```bash
git add app/api/charts/budgets-bundle/route.ts
git commit -m "feat: add budgets-bundle API route with Redis caching"
```

---

## Task 5: Add cache invalidation to budget and transaction mutations

**Files:**
- Modify: `app/api/budgets/route.ts`
- Modify: `app/api/transactions/route.ts`

- [ ] **Step 1: Add budgets cache invalidation to `app/api/budgets/route.ts`**

In `app/api/budgets/route.ts`, add the import at the top if not already there:

```typescript
import { invalidateUserCachePrefix } from '@/lib/cache/upstash'
```

In the `POST` handler, after `return NextResponse.json({ success: true }, { status: 200 })` is prepared but before returning, add (fire-and-forget):

```typescript
    // Invalidate budgets cache so the panel reflects the new/updated budget
    invalidateUserCachePrefix(userId, 'budgets').catch((err) => {
      console.error('[Budgets API] Cache invalidation error:', err)
    })

    return NextResponse.json({ success: true }, { status: 200 })
```

Do the same in the `DELETE` handler.

- [ ] **Step 2: Add `budgets` invalidation to `app/api/transactions/route.ts`**

In the POST handler of `app/api/transactions/route.ts`, find the block where `invalidateUserCachePrefix(userId, 'analytics')` is called (around line 465) and add:

```typescript
        invalidateUserCachePrefix(userId, 'budgets').catch((err) => {
            console.error('[Transactions API] Budgets cache invalidation error:', err)
        })
```

Do the same for the PUT and DELETE handlers in that file (look for other `invalidateUserCachePrefix` call sites).

- [ ] **Step 3: Commit**

```bash
git add app/api/budgets/route.ts app/api/transactions/route.ts
git commit -m "feat: invalidate budgets cache on budget and transaction mutations"
```

---

## Task 6: Add the data hook

**Files:**
- Modify: `hooks/use-dashboard-data.ts`

- [ ] **Step 1: Add `BudgetsBundleData` type to the types section**

In `hooks/use-dashboard-data.ts`, after the `SavingsBundleData` interface (around line 172), add:

```typescript
// Budgets Bundle Types
export interface BudgetsBundleData {
  monthsElapsed: number
  monthlyTotals: Array<{ month: string; cap: number; spent: number }>
  categories: Array<{
    categoryId: number
    name: string
    color: string
    monthlyCap: number | null
    monthlySpends: Array<{ month: string; amount: number }>
    avgMonthly: number
    totalSpent: number
    overByMonthly: number
    overBudgetMonths: number
    status: 'under' | 'warning' | 'over' | 'unset'
  }>
  suggestions: Array<{
    categoryId: number
    name: string
    color: string
    monthlyCap: number | null
    monthlySpends: Array<{ month: string; amount: number }>
    avgMonthly: number
    totalSpent: number
    overByMonthly: number
    overBudgetMonths: number
    status: 'under' | 'warning' | 'over' | 'unset'
  }>
}
```

- [ ] **Step 2: Add `fetchBudgetsBundle` fetcher function**

In the "BUNDLE API FETCHERS" section (after `fetchSavingsBundle`), add:

```typescript
async function fetchBudgetsBundle(filter: string | null): Promise<BudgetsBundleData> {
    const url = filter
        ? `/api/charts/budgets-bundle?filter=${encodeURIComponent(filter)}`
        : `/api/charts/budgets-bundle`

    const response = await demoFetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch budgets bundle: ${response.statusText}`)
    }
    return response.json()
}
```

- [ ] **Step 3: Add `useBudgetsBundleData` hook**

In the "BUNDLE HOOKS" section (after `useSavingsBundleData`), add:

```typescript
/**
 * Budgets tab bundle — per-category monthly spend vs cap, with Redis caching.
 */
export function useBudgetsBundleData() {
    const { userId } = useAuth()
    const { filter, isReady } = useDateFilter()
    const { isDemoMode } = useDemoMode()

    return useQuery({
        queryKey: ["budgets-bundle", isDemoMode ? "demo" : (userId ?? ""), filter],
        queryFn: () => fetchBudgetsBundle(filter),
        enabled: (isDemoMode || !!userId) && isReady,
        refetchOnMount: true,
        placeholderData: keepPreviousData,
    })
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/use-dashboard-data.ts
git commit -m "feat: add useBudgetsBundleData hook"
```

---

## Task 7: Build `BudgetSheet` (create/edit modal)

**Files:**
- Create: `components/budgets/BudgetSheet.tsx`

- [ ] **Step 1: Create the sheet component**

```typescript
// components/budgets/BudgetSheet.tsx
"use client"

import { memo, useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCurrency } from "@/components/currency-provider"
import { toast } from "sonner"

interface Category {
  id: number
  name: string
  color: string | null
}

interface BudgetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill category and cap (e.g., from a suggestion card) */
  defaultCategoryName?: string
  defaultCap?: number
  /** Average monthly spend for the selected category in the current filter */
  avgMonthly?: number
  onSaved: () => void
}

export const BudgetSheet = memo(function BudgetSheet({
  open,
  onOpenChange,
  defaultCategoryName,
  defaultCap,
  avgMonthly,
  onSaved,
}: BudgetSheetProps) {
  const { formatCurrency } = useCurrency()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryName, setCategoryName] = useState(defaultCategoryName ?? "")
  const [cap, setCap] = useState(defaultCap !== undefined ? String(defaultCap) : "")
  const [saving, setSaving] = useState(false)

  // Reset form when defaults change (e.g., different suggestion opens the sheet)
  useEffect(() => {
    setCategoryName(defaultCategoryName ?? "")
    setCap(defaultCap !== undefined ? String(defaultCap) : "")
  }, [defaultCategoryName, defaultCap, open])

  // Fetch user categories when sheet opens
  useEffect(() => {
    if (!open) return
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
  }, [open])

  async function handleSave() {
    const trimmed = categoryName.trim()
    const amount = parseFloat(cap)
    if (!trimmed) return toast.error("Please select a category")
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Please enter a valid budget amount")

    setSaving(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName: trimmed, budget: amount }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Failed to save budget")
        return
      }
      toast.success(`Budget set for ${trimmed}`)
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error("Network error — could not save budget")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Set monthly budget</SheetTitle>
          <SheetDescription>
            Choose a category and set the maximum you want to spend per month.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 py-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-category">Category</Label>
            <Select value={categoryName} onValueChange={setCategoryName}>
              <SelectTrigger id="budget-category">
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-cap">Monthly cap</Label>
            <Input
              id="budget-cap"
              type="number"
              min={0}
              step={1}
              placeholder="e.g. 300"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
            />
            {avgMonthly !== undefined && avgMonthly > 0 && (
              <p className="text-xs text-muted-foreground">
                You&apos;ve averaged {formatCurrency(avgMonthly)}/mo here over the current period.
              </p>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save budget"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
})

BudgetSheet.displayName = "BudgetSheet"
```

- [ ] **Step 2: Commit**

```bash
git add components/budgets/BudgetSheet.tsx
git commit -m "feat: add BudgetSheet modal for creating budgets"
```

---

## Task 8: Build `BudgetCard`

**Files:**
- Create: `components/budgets/BudgetCard.tsx`

- [ ] **Step 1: Create the card component**

```typescript
// components/budgets/BudgetCard.tsx
"use client"

import { memo, useRef, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { toast } from "sonner"
import type { BudgetCategoryRow } from "@/lib/types/budgets"
import { Pencil } from "lucide-react"

const MAX_DOTS = 12

interface BudgetCardProps {
  row: BudgetCategoryRow
  monthsElapsed: number
  onBudgetSaved: () => void
}

export const BudgetCard = memo(function BudgetCard({ row, monthsElapsed, onBudgetSaved }: BudgetCardProps) {
  const { formatCurrency } = useCurrency()
  const [editing, setEditing] = useState(false)
  const [capInput, setCapInput] = useState(String(row.monthlyCap ?? ""))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const progressPct = row.monthlyCap
    ? Math.min(150, (row.avgMonthly / row.monthlyCap) * 100)
    : 0

  const progressColor =
    row.status === 'over' ? 'bg-red-500' :
    row.status === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'

  const overPct =
    row.monthlyCap && row.monthlyCap > 0
      ? Math.abs(row.overByMonthly / row.monthlyCap) * 100
      : 0

  // Dot row — show at most MAX_DOTS months, newest last
  const dots = row.monthlySpends.slice(-MAX_DOTS)
  const showEllipsis = row.monthlySpends.length > MAX_DOTS

  async function handleSaveCap() {
    const amount = parseFloat(capInput)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid amount")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName: row.name, budget: amount }),
      })
      if (!res.ok) {
        toast.error("Failed to update budget")
        return
      }
      onBudgetSaved()
      setEditing(false)
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSaveCap()
    if (e.key === "Escape") {
      setCapInput(String(row.monthlyCap ?? ""))
      setEditing(false)
    }
  }

  const periodCap = row.monthlyCap !== null ? row.monthlyCap * monthsElapsed : null

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 px-5 py-4 shadow-sm flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate" style={{ color: row.color }}>
          {row.name}
        </span>
        {editing ? (
          <div className="flex items-center gap-1 shrink-0">
            <Input
              ref={inputRef}
              type="number"
              min={0}
              step={1}
              value={capInput}
              onChange={(e) => setCapInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 w-24 text-right text-sm"
              autoFocus
            />
            <span className="text-xs text-muted-foreground">/mo</span>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleSaveCap} disabled={saving}>
              {saving ? "…" : "Save"}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onClick={() => { setCapInput(String(row.monthlyCap ?? "")); setEditing(true) }}
          >
            {row.monthlyCap !== null ? `${formatCurrency(row.monthlyCap)}/mo` : "Set budget"}
            <Pencil className="size-3" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {row.monthlyCap !== null && (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", progressColor)}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      )}

      {/* Headline metric (B) */}
      <p className="text-sm">
        <span className="font-semibold">{formatCurrency(row.avgMonthly)}/mo avg</span>
        {row.monthlyCap !== null && (
          <span className={cn("ml-2 text-xs", row.status === 'over' ? 'text-red-500' : row.status === 'warning' ? 'text-yellow-600' : 'text-emerald-600')}>
            {row.overByMonthly > 0 ? `+${overPct.toFixed(0)}% over` : `${(100 - progressPct).toFixed(0)}% under`}
          </span>
        )}
      </p>

      {/* Secondary metrics (A + C) */}
      {row.monthlyCap !== null && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span>
            {formatCurrency(row.totalSpent)} spent
            {periodCap !== null && ` / ${formatCurrency(periodCap)} cap`}
            {" "}• {monthsElapsed.toFixed(0)} mo
          </span>
          {row.monthlySpends.length > 0 && (
            <div className="flex items-center gap-1">
              <span>Over in {row.overBudgetMonths} of {row.monthlySpends.length} months</span>
              {showEllipsis && <span className="opacity-50">…</span>}
              {dots.map((s, i) => {
                const isOver = row.monthlyCap !== null && s.amount > row.monthlyCap
                return (
                  <span
                    key={i}
                    className={cn(
                      "inline-block size-2 rounded-full",
                      s.amount === 0 ? "bg-muted" : isOver ? "bg-red-500" : "bg-emerald-500"
                    )}
                    title={`${s.month}: ${formatCurrency(s.amount)}`}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

BudgetCard.displayName = "BudgetCard"
```

- [ ] **Step 2: Commit**

```bash
git add components/budgets/BudgetCard.tsx
git commit -m "feat: add BudgetCard with inline edit, progress bar, and dot row"
```

---

## Task 9: Build `ChartBudgetVsSpendTrend`

**Files:**
- Create: `components/budgets/chart-budget-vs-spend-trend.tsx`

- [ ] **Step 1: Create the chart**

```typescript
// components/budgets/chart-budget-vs-spend-trend.tsx
"use client"

import { memo, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { useCurrency } from "@/components/currency-provider"
import { useTheme } from "next-themes"

interface MonthlyTotal {
  month: string
  cap: number
  spent: number
}

interface ChartBudgetVsSpendTrendProps {
  data: MonthlyTotal[]
}

export const ChartBudgetVsSpendTrend = memo(function ChartBudgetVsSpendTrend({
  data,
}: ChartBudgetVsSpendTrendProps) {
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: d.month.slice(0, 7), // YYYY-MM
      })),
    [data]
  )

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"

  if (data.length === 0) return null

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
          <Tooltip
            formatter={(value: number, name: string) => [formatCurrency(value), name === "spent" ? "Spent" : "Cap"]}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="spent" name="spent" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cap" name="cap" fill="transparent" stroke="#10b981" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

ChartBudgetVsSpendTrend.displayName = "ChartBudgetVsSpendTrend"
```

- [ ] **Step 2: Commit**

```bash
git add components/budgets/chart-budget-vs-spend-trend.tsx
git commit -m "feat: add ChartBudgetVsSpendTrend grouped bar chart"
```

---

## Task 10: Build `BudgetsPanel`

**Files:**
- Create: `components/budgets/BudgetsPanel.tsx`

- [ ] **Step 1: Create the panel**

```typescript
// components/budgets/BudgetsPanel.tsx
"use client"

import { memo, useState, useCallback } from "react"
import { useBudgetsBundleData } from "@/hooks/use-dashboard-data"
import { BudgetCard } from "@/components/budgets/BudgetCard"
import { BudgetSheet } from "@/components/budgets/BudgetSheet"
import { ChartBudgetVsSpendTrend } from "@/components/budgets/chart-budget-vs-spend-trend"
import { LazyChart } from "@/components/lazy-chart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrency } from "@/components/currency-provider"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BudgetCategoryRow } from "@/lib/types/budgets"

export const BudgetsPanel = memo(function BudgetsPanel() {
  const { data, isLoading, refetch } = useBudgetsBundleData()
  const { formatCurrency } = useCurrency()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetDefaults, setSheetDefaults] = useState<{
    categoryName?: string
    cap?: number
    avgMonthly?: number
  }>({})

  const openSheet = useCallback((defaults: typeof sheetDefaults = {}) => {
    setSheetDefaults(defaults)
    setSheetOpen(true)
  }, [])

  const handleSaved = useCallback(() => {
    void refetch()
  }, [refetch])

  // Summary pill stats
  const totalCap = data
    ? data.categories.reduce((s, c) => s + (c.monthlyCap ?? 0) * data.monthsElapsed, 0)
    : 0
  const totalSpent = data
    ? data.categories.reduce((s, c) => s + c.totalSpent, 0)
    : 0
  const overBy = totalSpent - totalCap

  const isEmpty = !isLoading && data && data.categories.length === 0 && data.suggestions.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Summary pills */}
      {!isLoading && data && data.categories.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Pill label="Total cap" value={formatCurrency(totalCap)} />
          <Pill label="Total spent" value={formatCurrency(totalSpent)} />
          <Pill
            label="Over by"
            value={overBy > 0 ? `+${formatCurrency(overBy)}` : formatCurrency(overBy)}
            className={overBy > 0 ? "border-red-400/40 text-red-500" : "border-emerald-400/40 text-emerald-600"}
          />
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Trend chart */}
      {!isLoading && data && data.monthlyTotals.length > 1 && (
        <LazyChart title="Spend vs Budget" height={192}>
          <ChartBudgetVsSpendTrend data={data.monthlyTotals} />
        </LazyChart>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/15 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No budgets set yet. Start by capping your biggest spending categories.</p>
          <Button onClick={() => openSheet()} size="sm" className="rounded-full">
            <Plus className="mr-1 size-4" /> Set your first budget
          </Button>
        </div>
      )}

      {/* Budget cards — budgeted categories */}
      {!isLoading && data && data.categories.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.categories.map((row) => (
            <BudgetCard
              key={row.categoryId}
              row={row}
              monthsElapsed={data.monthsElapsed}
              onBudgetSaved={handleSaved}
            />
          ))}
        </div>
      )}

      {/* Suggestions — unbudgeted top spenders */}
      {!isLoading && data && data.suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60">Suggested</p>
          {data.suggestions.map((row) => (
            <SuggestionTile key={row.categoryId} row={row} onAdd={openSheet} formatCurrency={formatCurrency} />
          ))}
        </div>
      )}

      {/* Add custom category */}
      {!isLoading && (
        <button
          type="button"
          onClick={() => openSheet()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/40 bg-muted/10 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/20 transition-colors"
        >
          <Plus className="size-4" /> Add category budget
        </button>
      )}

      <BudgetSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultCategoryName={sheetDefaults.categoryName}
        defaultCap={sheetDefaults.cap}
        avgMonthly={sheetDefaults.avgMonthly}
        onSaved={handleSaved}
      />
    </div>
  )
})

BudgetsPanel.displayName = "BudgetsPanel"

// ── Internal sub-components ────────────────────────────────────────────

function Pill({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-full border border-border/60 bg-card/80 px-4 py-1.5 text-sm shadow-sm", className)}>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function SuggestionTile({
  row,
  onAdd,
  formatCurrency,
}: {
  row: BudgetCategoryRow
  onAdd: (defaults: { categoryName: string; avgMonthly: number }) => void
  formatCurrency: (v: number) => string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/40 bg-muted/10 px-5 py-3">
      <div>
        <p className="text-sm font-medium" style={{ color: row.color }}>{row.name}</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(row.avgMonthly)}/mo avg — no budget set</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full shrink-0 text-xs"
        onClick={() => onAdd({ categoryName: row.name, avgMonthly: row.avgMonthly })}
      >
        Set budget
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/budgets/BudgetsPanel.tsx
git commit -m "feat: add BudgetsPanel with summary pills, chart, cards, suggestions, and add tile"
```

---

## Task 11: Wire everything into `app/savings/page.tsx`

**Files:**
- Modify: `app/savings/page.tsx`

- [ ] **Step 1: Add `"budgets"` to the `SavingsViewMode` type**

Find line 43 in `app/savings/page.tsx`:

```typescript
type SavingsViewMode = "savings" | "netWorth" | "debt" | "calculator" | "goals"
```

Change to:

```typescript
type SavingsViewMode = "savings" | "netWorth" | "debt" | "calculator" | "goals" | "budgets"
```

- [ ] **Step 2: Update the `localStorage` validation in `useEffect`**

Find the `useEffect` that loads saved view mode (around line 81):

```typescript
if (saved === "savings" || saved === "netWorth" || saved === "debt" || saved === "calculator" || saved === "goals") {
```

Change to:

```typescript
if (saved === "savings" || saved === "netWorth" || saved === "debt" || saved === "calculator" || saved === "goals" || saved === "budgets") {
```

- [ ] **Step 3: Add the import for `BudgetsPanel`**

At the top of the file, with the other imports:

```typescript
import { BudgetsPanel } from "@/components/budgets/BudgetsPanel"
```

- [ ] **Step 4: Add the "Budgets" chip button**

Find the Goals chip button (around line 706–715):

```tsx
<button
  type="button"
  onClick={() => handleViewModeChange("goals")}
  className={cn(
    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
    viewMode === "goals"
      ? "bg-background text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground"
  )}
>
  Goals
</button>
```

After that closing `</button>`, add:

```tsx
<button
  type="button"
  onClick={() => handleViewModeChange("budgets")}
  className={cn(
    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
    viewMode === "budgets"
      ? "bg-background text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground"
  )}
>
  Budgets
</button>
```

- [ ] **Step 5: Add the `BudgetsPanel` render branch**

Find the Goals panel render branch (the `viewMode === "goals"` section that starts around line 895). After its closing `}` add:

```tsx
{viewMode === "budgets" && (
  <section className="px-4 lg:px-6">
    <BudgetsPanel />
  </section>
)}
```

- [ ] **Step 6: Commit**

```bash
git add app/savings/page.tsx
git commit -m "feat: add Budgets chip and panel to savings page"
```

---

## Task 12: Write chart documentation

**Files:**
- Create: `docs/PAGES/BUDGET_CHARTS.md`

- [ ] **Step 1: Create the doc**

```markdown
# Budget Charts

Charts rendered on the Budgets tab of the Savings page (`app/savings/page.tsx`, viewMode `"budgets"`).

## Charts

| # | Chart ID | Component File | Component Name | Description |
|---|----------|----------------|----------------|-------------|
| 1 | `budgetVsSpendTrend` | `components/budgets/chart-budget-vs-spend-trend.tsx` | `ChartBudgetVsSpendTrend` | Grouped bar chart showing total monthly spend vs total monthly cap across all budgeted categories for the selected filter window |

**Total charts: 1**

## Data Source

All chart data comes from `/api/charts/budgets-bundle` (cached in Redis under prefix `budgets`, TTL 5 min).
Aggregation logic lives in `lib/charts/budgets-aggregations.ts`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/PAGES/BUDGET_CHARTS.md
git commit -m "docs: add BUDGET_CHARTS documentation"
```

---

## Task 13: Build verification

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: All tests pass, no regressions.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors and no ESLint errors.

- [ ] **Step 3: Smoke-test in the browser**

Start the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000/savings`. Confirm:

1. A sixth chip "Budgets" appears in the tab strip.
2. Clicking it shows the `BudgetsPanel`.
3. If no budgets are set, the empty state CTA appears.
4. Clicking "Set your first budget" opens `BudgetSheet`. Select a category, enter an amount, click Save → toast success, panel refreshes.
5. The saved category appears as a `BudgetCard`.
6. Clicking the cap value in the card enables inline edit. Change it, press Enter → card updates.
7. Switch the date filter at the top of the page → the bundle refetches and stats update.
8. Navigate away and back — the Budgets tab remains selected (localStorage persistence).

---

## Self-Review Notes

- **Spec coverage check:** All 7 sections covered (Surface ✓, Panel Layout ✓, BudgetCard Anatomy ✓, BudgetSheet ✓, Data Flow ✓, Cache Invalidation ✓, Edge Cases ✓).
- **`monthsElapsed < 0.1` edge case:** `BudgetCard` always shows data; the "Insufficient data" message described in the spec should be added to `BudgetsPanel` above the card grid when `data.monthsElapsed < 0.1`. Add this to `BudgetsPanel` Task 10:
  ```tsx
  {data.monthsElapsed < 0.1 && (
    <p className="text-sm text-muted-foreground text-center">Insufficient data — pick a longer date range.</p>
  )}
  ```
  Add this snippet inside `BudgetsPanel` below the trend chart and above the cards grid.
- **Type consistency:** `BudgetCategoryRow` from `lib/types/budgets.ts` is used in `BudgetCard`, `BudgetsPanel`, and inlined identically in `BudgetsBundleData` in the hook. These will diverge if the type changes — consider importing from `lib/types/budgets.ts` in the hook instead of inlining.
