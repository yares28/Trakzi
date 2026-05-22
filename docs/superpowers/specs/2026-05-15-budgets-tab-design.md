# Budgets Tab — Design Spec

**Date:** 2026-05-15  
**Status:** Approved — moving to implementation

---

## Context

The Savings page (`app/savings/page.tsx`) has five view-mode chips: Savings / Net Worth / Debt / Calculator / Goals. The Goals feature remains intact. A sixth chip — **Budgets** — is added alongside it.

Infrastructure already exists: `category_budgets` table (scope `'analytics'`, one monthly cap per user+category), `/api/budgets` route (GET/POST/DELETE). Analytics charts already consume these as reference lines. The new Budgets tab is the first dedicated management UI for this data.

---

## Decisions

| Question | Decision |
|----------|----------|
| Coexistence with Goals | Budgets is a new 6th chip; Goals stay untouched |
| Primary metric | Average monthly spend vs monthly cap (B); period-normalized total (A) and months-over count (C) as secondary |
| UX pattern | Inline ✏️ for existing caps; sheet modal for new budget creation |
| Category coverage | Budgeted categories first, then top 5 unbudgeted spenders as suggestions, then "+ Add custom" tile |
| Top SectionCards | Unchanged (shared across all tabs) |
| Data fetching | New `/api/charts/budgets-bundle` endpoint, Redis cache prefix `budgets`, TTL 5 min |

---

## Surface

Add `"budgets"` to `SavingsViewMode` union. The chip strip becomes:

```
Savings | Net Worth | Debt | Calculator | Goals | Budgets
```

`SectionCards` renders identically for the Budgets tab. The budgets panel renders below.

---

## Panel Layout

1. **Summary header** — three pill stats: *Total Cap*, *Total Spent*, *Over By* (colored red/green).
2. **Spend vs Budget Trend chart** (`ChartBudgetVsSpendTrend`) — grouped bar chart, one group per month in the filter window. Total spend (bar) vs total cap (reference line). Wrapped in `LazyChart`, `React.memo`.
3. **Budget card grid** — one `BudgetCard` per category, ordered:
   - Budgeted categories (alphabetical by name)
   - Up to 5 suggested unbudgeted categories (by avg monthly spend descending)
   - "+ Add custom category" tile
4. **Empty state** — when no budgets and no spend data: "Set your first budget" CTA.

---

## BudgetCard Anatomy

```
┌─────────────────────────────────────────────────┐
│  Groceries                          $300/mo  ✏️ │  ← title + inline-editable cap
│                                                 │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░│   │  ← progress bar (avg/cap)
│  $350/mo avg  •  17% over                       │  ← headline (B)
│                                                 │
│  $1,050 spent / $900 cap  •  3 mo              │  ← secondary (A)
│  Over in 2 of 3 months  · · ●                   │  ← secondary (C) + dot row
└─────────────────────────────────────────────────┘
```

- **Progress bar color**: green < 80%, yellow 80–100%, red > 100% of monthly cap.
- **Inline ✏️**: clicking the cap value turns it into a number input. Enter = save via PATCH `/api/budgets`, Esc = cancel. Optimistic update.
- **Dot row**: one dot per calendar month in the filter window. Red = over cap, green = under, gray = no spend.
- **Monthly dots cap**: if filter spans > 12 months, show at most 12 dots (oldest omitted, labeled "…").
- **Suggested tile** (unbudgeted): same card shape, no progress bar, shows avg monthly spend and "Tap to set a budget" CTA. Opens `BudgetSheet`.
- **`+ Add custom category` tile**: always last; opens `BudgetSheet` with no defaults.

---

## BudgetSheet

Sheet/dialog for creating a new budget. Fields:
1. **Category** — `<Select>` populated from all user categories (from `/api/categories`) with a "Create new" option.
2. **Monthly cap** — number input. Below it: "You've averaged $X/mo here over the current filter period" (from bundle data). Pre-filled for suggested tiles.
3. **Save** — POST `/api/budgets`, then invalidate `budgets`/`analytics`/`home` caches, refresh bundle.

---

## Data Flow

```
Client (BudgetsPanel)
  → useBudgetsBundleData(filter)          hook in hooks/use-dashboard-data.ts
    → GET /api/charts/budgets-bundle?filter=…
      → getCachedOrCompute('budgets', userId, filter, 'bundle')
        → getBudgetsBundle(userId, filter)  lib/charts/budgets-aggregations.ts
          SQL:
            SELECT c.id, c.name, c.color,
                   cb.budget AS monthly_cap,
                   DATE_TRUNC('month', t.tx_date) AS month,
                   SUM(ABS(t.amount)) AS month_spend
            FROM categories c
            LEFT JOIN category_budgets cb ON cb.category_id = c.id AND cb.user_id = c.user_id AND cb.scope = 'analytics'
            LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = c.user_id
                                     AND t.tx_date BETWEEN $startDate AND $endDate
                                     AND t.amount < 0
            WHERE c.user_id = $userId
            GROUP BY c.id, c.name, c.color, cb.budget, month
            ORDER BY c.name, month
```

Returns `BudgetsSummary`:
```typescript
interface BudgetsSummary {
  monthsElapsed: number                 // float, e.g. 3.0 for last3months
  monthlyTotals: { month: string; cap: number; spent: number }[]
  categories: BudgetCategoryRow[]       // budgeted
  suggestions: BudgetCategoryRow[]      // top-5 unbudgeted by avg spend
}

interface BudgetCategoryRow {
  categoryId: number
  name: string
  color: string
  monthlyCap: number | null
  monthlySpends: { month: string; amount: number }[]
  avgMonthly: number
  totalSpent: number
  overByMonthly: number      // avgMonthly - monthlyCap (negative = under)
  overBudgetMonths: number   // count of months where spend > cap
  status: 'under' | 'warning' | 'over' | 'unset'
}
```

---

## Cache Invalidation

Add `await invalidateUserCachePrefix(userId, 'budgets')` alongside existing invalidation calls in:
- `app/api/transactions/route.ts` (POST, PUT, DELETE)
- `app/api/budgets/route.ts` (POST, DELETE) — already modifies budget data
- `app/api/upload/route.ts` or statement-upload path (when transactions are bulk-inserted)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `monthsElapsed < 0.1` (1-day custom range) | Headline shows "Insufficient data — pick a longer range" |
| `monthlyCap === 0` or unset | Render as suggestion tile, not a budget card |
| Uncategorized transactions | Excluded from all budget calculations |
| Refunds / positive amounts | Excluded (`amount < 0` filter in SQL) |
| > 12 months in filter window | Dot row shows 12 most-recent dots, prefix "…" |

---

## New Files

| File | Purpose |
|------|---------|
| `lib/types/budgets.ts` | `BudgetsSummary`, `BudgetCategoryRow` types |
| `lib/charts/budgets-aggregations.ts` | `getBudgetsBundle()` SQL aggregator |
| `app/api/charts/budgets-bundle/route.ts` | Cached GET handler |
| `components/budgets/BudgetsPanel.tsx` | Top-level panel: summary + chart + grid |
| `components/budgets/BudgetCard.tsx` | Single category card with inline edit |
| `components/budgets/BudgetSheet.tsx` | Create/edit modal |
| `components/budgets/chart-budget-vs-spend-trend.tsx` | Grouped bar + reference line chart |

---

## Edited Files

| File | Change |
|------|--------|
| `app/savings/page.tsx` | Add `"budgets"` to `SavingsViewMode`, add chip, add panel branch |
| `hooks/use-dashboard-data.ts` | Add `useBudgetsBundleData()` hook |
| `app/api/budgets/route.ts` | Invalidate `budgets` cache on POST/DELETE |
| `app/api/transactions/route.ts` | Invalidate `budgets` cache on mutations |
| `docs/PAGES/BUDGET_CHARTS.md` | Chart documentation (new file) |

---

## Testing

- `__tests__/lib/charts/budgets-aggregations.test.ts` — period normalization, partial-month math, top-N suggestions, zero-spend, refund exclusion.
- `__tests__/app/api/charts/budgets-bundle.test.ts` — auth, shape, cache key.
- Component tests: inline edit commit/cancel, sheet validation, empty state, suggestion ranking.

---

## Out of Scope

- Budget notifications / alerts (can be added later).
- Shared budgets across users.
- Budget history / versioning.
- Import/export of budget data.
