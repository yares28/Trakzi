# Chart Tiering Plan: Basic vs Advanced

> **Status:** AWAITING APPROVAL
> **Complexity:** MEDIUM
> **Estimated Files Changed:** ~12
> **Database Changes:** NONE

---

## Requirements Restatement

1. Separate charts into **Basic** (free tier) and **Advanced** (paid tiers)
2. **Analytics tab** = Basic charts only (all users)
3. **Advanced tab** = Advanced charts only (Basic/Pro/Max plans)
4. **Free users** cannot access the Advanced tab — show upgrade prompt
5. **Paying users** (Basic, Pro, Max — `advancedChartsEnabled: true`) see both tabs
6. Apply to **both** Analytics and Fridge pages
7. Initially only 2 charts are "advanced":
   - Analytics: `spendingCategoryRankings` (Spending Category Rankings)
   - Fridge: `groceryNetWorthAllocation` (Grocery Allocation TreeMap)
8. **No database changes** — use existing `advancedChartsEnabled` flag in `lib/plan-limits.ts`
9. Must be **scalable** for 1000+ users

---

## Why No Database Changes Are Needed

The existing infrastructure already supports this feature:

| What exists | Where | How it helps |
|-------------|-------|-------------|
| `advancedChartsEnabled` boolean | `lib/plan-limits.ts` | Already `false` for free, `true` for basic/pro/max |
| `checkFeatureAccess()` | `lib/feature-access.ts` | Server-side gating helper |
| `isFeatureEnabled()` | `lib/plan-limits.ts` | Checks any plan limit feature |
| `/api/subscription/status` | `app/api/subscription/status/route.ts` | Returns full `limits` object including `advancedChartsEnabled` |
| Plan types: free/basic/pro/max | `lib/subscriptions.ts` | Plan hierarchy |

Chart tier assignment (which charts are basic vs advanced) is a **UI configuration** — it belongs in code, not in the database. The tiers don't change per-user, they're product decisions. Storing them in the DB would add complexity with zero benefit.

---

## Architecture Decision: Where Tier Data Lives

**Decision: Static config file (`lib/chart-tiers.ts`)**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| DB table `chart_tiers` | Dynamic, admin-editable | Overkill, extra query, no admin UI | **No** |
| Column on existing table | — | No chart table exists | **No** |
| Config file in code | Zero latency, type-safe, simple deploys | Needs redeploy to change | **Yes** |
| Feature flags (PostHog) | A/B testable | Complexity, external dependency | **No** |

**Reasoning:** Chart tiers are a product decision that change rarely (new charts added ~monthly). A typed config file gives compile-time safety, zero latency, and zero DB overhead. If dynamic admin control is ever needed, we can add it later.

---

## Implementation Phases

### Phase 1: Chart Tier Config (`lib/chart-tiers.ts`)

Create a single source of truth for which charts are basic vs advanced.

```typescript
// lib/chart-tiers.ts

export type ChartTier = "basic" | "advanced"

// ─── Analytics Charts ───────────────────────────────────
// Only list ADVANCED charts. Everything else is basic by default.
const ADVANCED_ANALYTICS_CHARTS: readonly string[] = [
  "spendingCategoryRankings",
] as const

// ─── Fridge Charts ──────────────────────────────────────
const ADVANCED_FRIDGE_CHARTS: readonly string[] = [
  "groceryNetWorthAllocation",
] as const

// ─── Helpers ────────────────────────────────────────────
export function getChartTier(chartId: string, page: "analytics" | "fridge"): ChartTier {
  const advancedSet = page === "analytics"
    ? ADVANCED_ANALYTICS_CHARTS
    : ADVANCED_FRIDGE_CHARTS
  return advancedSet.includes(chartId) ? "advanced" : "basic"
}

export function filterChartsByTier<T extends string>(
  chartIds: T[],
  tier: ChartTier,
  page: "analytics" | "fridge"
): T[] {
  return chartIds.filter(id => getChartTier(id, page) === tier)
}

export function getAdvancedAnalyticsCharts(): readonly string[] {
  return ADVANCED_ANALYTICS_CHARTS
}

export function getAdvancedFridgeCharts(): readonly string[] {
  return ADVANCED_FRIDGE_CHARTS
}
```

**Why this design:**
- Default = basic (opt-in to advanced) — adding new charts won't accidentally be locked
- Separate analytics/fridge lists — charts can be basic on one page and advanced on another
- Pure functions, no side effects — easy to test
- `readonly` arrays — immutable at compile time

**Files:** `lib/chart-tiers.ts` (NEW)

---

### Phase 2: Client-Side Plan Access Hook (`hooks/use-plan-access.ts`)

Currently, 7+ components each directly `fetch('/api/subscription/status')` with no caching. Create a centralized React Query hook.

```typescript
// hooks/use-plan-access.ts

import { useQuery } from "@tanstack/react-query"
import type { PlanLimits } from "@/lib/plan-limits"
import type { PlanType } from "@/lib/subscriptions"

interface PlanAccessData {
  plan: PlanType
  limits: PlanLimits
}

export function usePlanAccess() {
  const { data, isLoading } = useQuery<PlanAccessData>({
    queryKey: ["plan-access"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/status")
      if (!res.ok) throw new Error("Failed to fetch plan")
      const json = await res.json()
      return { plan: json.plan, limits: json.limits }
    },
    staleTime: 5 * 60 * 1000,    // 5 min — matches Redis cache TTL
    gcTime: 10 * 60 * 1000,      // 10 min garbage collection
    refetchOnWindowFocus: false,  // Don't spam on tab switches
  })

  return {
    plan: data?.plan ?? "free",
    limits: data?.limits ?? null,
    advancedChartsEnabled: data?.limits?.advancedChartsEnabled ?? false,
    isLoading,
  }
}
```

**Why React Query:**
- Already used for bundle data — consistent pattern
- Auto-deduplication: 10 components calling `usePlanAccess()` = 1 network request
- `staleTime: 5min` prevents re-fetching on every tab switch
- Scalable for 1000+ users (each user makes 1 request, cached client-side)

**Files:** `hooks/use-plan-access.ts` (NEW)

---

### Phase 3: Filter Charts in Constants

Modify the constants files to export filtered chart lists.

#### 3a. Analytics Constants (`app/analytics/_page/constants.ts`)

```diff
+ import { filterChartsByTier } from "@/lib/chart-tiers"
+
  export const DEFAULT_CHART_ORDER = [ /* ... all 19 charts ... */ ]

+ export const BASIC_CHART_ORDER = filterChartsByTier(DEFAULT_CHART_ORDER, "basic", "analytics")
+ export const ADVANCED_CHART_ORDER = filterChartsByTier(DEFAULT_CHART_ORDER, "advanced", "analytics")
```

#### 3b. Fridge Constants (`app/fridge/_client/constants.ts`)

```diff
+ import { filterChartsByTier } from "@/lib/chart-tiers"
+
  export const FRIDGE_CHART_ORDER: FridgeChartId[] = [ /* ... all 17 charts ... */ ]

+ export const BASIC_FRIDGE_CHART_ORDER = filterChartsByTier(FRIDGE_CHART_ORDER, "basic", "fridge")
+ export const ADVANCED_FRIDGE_CHART_ORDER = filterChartsByTier(FRIDGE_CHART_ORDER, "advanced", "fridge")
```

**Files:**
- `app/analytics/_page/constants.ts` (EDIT)
- `app/fridge/_client/constants.ts` (EDIT)

---

### Phase 4: Gate the Advanced Tab

#### 4a. Analytics Page (`app/analytics/_page/AnalyticsPage.tsx`)

Changes:
1. Import `usePlanAccess` hook
2. When free user clicks "Advanced" tab → show upgrade prompt instead of charts
3. When paying user clicks "Advanced" tab → render `ChartsGrid` with advanced charts only
4. Basic tab renders `ChartsGrid` with basic charts only (filter out advanced)

```diff
+ import { usePlanAccess } from "@/hooks/use-plan-access"
+ import { BASIC_CHART_ORDER, ADVANCED_CHART_ORDER } from "./constants"
+ import { AdvancedUpgradePrompt } from "@/components/advanced-upgrade-prompt"

  export default function AnalyticsPage() {
+   const { advancedChartsEnabled, plan } = usePlanAccess()
    // ...

    // Advanced tab button — add lock icon for free users
    <button onClick={() => handleViewModeChange("advanced")}>
+     {!advancedChartsEnabled && <Lock className="h-3.5 w-3.5" />}
      Advanced
    </button>

    // Advanced tab content:
    {viewMode === "advanced" && (
-     <section>/* placeholder */</section>
+     advancedChartsEnabled
+       ? <ChartsGrid chartOrder={ADVANCED_CHART_ORDER} /* ...props */ />
+       : <AdvancedUpgradePrompt currentPlan={plan} />
    )}

    // Basic tab — filter to basic charts only
    {viewMode === "analytics" && (
      <ChartsGrid
-       analyticsChartOrder={chartLayout.analyticsChartOrder}
+       analyticsChartOrder={chartLayout.analyticsChartOrder.filter(
+         id => !ADVANCED_CHART_ORDER.includes(id)
+       )}
        /* ...rest of props */
      />
    )}
```

#### 4b. Fridge Page (`app/fridge/_client/FridgePageClient.tsx`)

Same pattern as Analytics:

```diff
+ import { usePlanAccess } from "@/hooks/use-plan-access"
+ import { BASIC_FRIDGE_CHART_ORDER, ADVANCED_FRIDGE_CHART_ORDER } from "./constants"
+ import { AdvancedUpgradePrompt } from "@/components/advanced-upgrade-prompt"

  export function FridgePageClient() {
+   const { advancedChartsEnabled, plan } = usePlanAccess()

    // Advanced tab content:
    {viewMode === "advanced" && (
-     <section>/* placeholder */</section>
+     advancedChartsEnabled
+       ? <ChartsGrid chartOrder={ADVANCED_FRIDGE_CHART_ORDER} /* ...props */ />
+       : <AdvancedUpgradePrompt currentPlan={plan} />
    )}

    // Basic tab — filter to basic charts only
    {viewMode === "fridge" && (
      <ChartsGrid
-       chartOrder={chartOrder}
+       chartOrder={chartOrder.filter(
+         id => !ADVANCED_FRIDGE_CHART_ORDER.includes(id)
+       )}
        /* ...rest of props */
      />
    )}
```

**Files:**
- `app/analytics/_page/AnalyticsPage.tsx` (EDIT)
- `app/fridge/_client/FridgePageClient.tsx` (EDIT)

---

### Phase 5: Upgrade Prompt Component

Create a reusable upgrade prompt for the locked Advanced tab.

```typescript
// components/advanced-upgrade-prompt.tsx

"use client"

import { Lock, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SubscriptionDialog } from "@/components/subscription-dialog/SubscriptionDialog"
import { useState } from "react"
import type { PlanType } from "@/lib/subscriptions"

interface Props {
  currentPlan: PlanType
}

export function AdvancedUpgradePrompt({ currentPlan }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false)

  return (
    <>
      <section>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Advanced Charts</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Unlock deeper insights with advanced analytics charts.
              Upgrade to Basic, Pro, or Max to access this tab.
            </p>
            <Button onClick={() => setShowUpgrade(true)} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </section>

      <SubscriptionDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
      />
    </>
  )
}
```

**Files:** `components/advanced-upgrade-prompt.tsx` (NEW)

---

### Phase 6: Chart Layout Hook Adjustments

The `useChartLayout` hooks in both pages store user's chart order in localStorage. When a chart moves from basic to advanced, it should be filtered out of the stored order.

#### 6a. Analytics `useChartLayout`

Add filtering logic so stored orders respect tier boundaries:

```diff
  // In useChartLayout.ts
+ import { getChartTier } from "@/lib/chart-tiers"

  // When loading saved order from localStorage:
  const savedOrder = localStorage.getItem(CHART_ORDER_STORAGE_KEY)
  // Filter: only include charts that belong to the current tier
+ const filteredOrder = parsed.filter(id => getChartTier(id, "analytics") === tier)
```

#### 6b. Fridge `useChartLayout`

Same pattern — filter stored order by tier.

**Files:**
- `app/analytics/_page/hooks/useChartLayout.ts` (EDIT — minor)
- `app/fridge/_client/hooks/useChartLayout.ts` (EDIT — minor)

---

### Phase 7: Update Documentation

#### 7a. Analytics Charts Doc (`docs/PAGES/ANALYTICS_CHARTS.md`)

Add a **Tier** column to the charts table:

```markdown
## Charts (19 total — 18 Basic, 1 Advanced)

| # | Chart ID | Component File | Component Name | Tier | Description |
|---|----------|----------------|----------------|------|-------------|
| 1 | `incomeExpensesTracking1` | ... | ... | Basic | ... |
| 2 | `incomeExpensesTracking2` | ... | ... | Basic | ... |
| 3 | `spendingCategoryRankings` | ... | ... | **Advanced** | ... |
| 4 | `transactionHistory` | ... | ... | Basic | ... |
| ... (all remaining = Basic) |
```

Add a new section:

```markdown
## Chart Tiers

Charts are divided into **Basic** (free tier) and **Advanced** (paid tiers).

| Tier | Access | Tab |
|------|--------|-----|
| Basic | All users | Analytics |
| Advanced | Basic, Pro, Max plans | Advanced |

Tier assignments are defined in `lib/chart-tiers.ts`.
When adding a new chart, specify its tier in that file.
```

#### 7b. Fridge Charts Doc (`docs/PAGES/FRIDGE_CHARTS.md`)

Same pattern — add Tier column:

```markdown
## Charts (17 total — 16 Basic, 1 Advanced)

| # | Chart ID | ... | Tier | Description |
|---|----------|-----|------|-------------|
| ... | `groceryNetWorthAllocation` | ... | **Advanced** | ... |
```

#### 7c. Update "Adding a New Chart" Checklist

In both docs, update the checklist:

```markdown
## Adding a New Chart

1. Create component in `components/chart-{name}.tsx`
2. Wrap with `React.memo` and add `displayName`
3. Add chart ID to constants file
4. **Assign tier in `lib/chart-tiers.ts`** ← NEW STEP
5. Add to ChartsGrid render logic
6. Add data to aggregation file if needed
7. **Update this document with the new chart (include Tier column)**
```

**Files:**
- `docs/PAGES/ANALYTICS_CHARTS.md` (EDIT)
- `docs/PAGES/FRIDGE_CHARTS.md` (EDIT)

---

## File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `lib/chart-tiers.ts` | **NEW** | Chart tier config (single source of truth) |
| `hooks/use-plan-access.ts` | **NEW** | React Query hook for plan/limits |
| `components/advanced-upgrade-prompt.tsx` | **NEW** | Upgrade prompt for locked Advanced tab |
| `app/analytics/_page/constants.ts` | EDIT | Export filtered chart order arrays |
| `app/fridge/_client/constants.ts` | EDIT | Export filtered chart order arrays |
| `app/analytics/_page/AnalyticsPage.tsx` | EDIT | Gate Advanced tab, filter basic tab |
| `app/fridge/_client/FridgePageClient.tsx` | EDIT | Gate Advanced tab, filter basic tab |
| `app/analytics/_page/hooks/useChartLayout.ts` | EDIT | Filter stored order by tier |
| `app/fridge/_client/hooks/useChartLayout.ts` | EDIT | Filter stored order by tier |
| `docs/PAGES/ANALYTICS_CHARTS.md` | EDIT | Add Tier column + tier section |
| `docs/PAGES/FRIDGE_CHARTS.md` | EDIT | Add Tier column + tier section |
| `CLAUDE.md` | EDIT | Add chart tier to "Adding a New Chart" checklist |

---

## Scalability Analysis

| Concern | How It Scales |
|---------|---------------|
| 1000+ concurrent users | Tier check is **client-side only** — zero DB queries for tier logic |
| Plan lookup | `usePlanAccess()` uses React Query with 5min `staleTime` — 1 request per session |
| Adding new charts | Add 1 line to `ADVANCED_*_CHARTS` array in `lib/chart-tiers.ts` |
| Moving chart between tiers | Change 1 line in config, redeploy |
| Bundle API performance | No change — all chart data still comes from single bundle (no per-tier API) |
| Server-side security | Not needed — advanced charts show different visualizations of the same data, not secret data. The gate is UX-only. |

**Note on server-side gating:** The bundle API returns ALL chart data regardless of tier. This is intentional — the data itself isn't sensitive (it's the user's own financial data). The tier gate is a UX feature, not a security boundary. If server-side gating is ever needed (e.g., to reduce payload), add a `tier` param to the bundle API.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| User's saved chart order includes advanced chart | LOW | Phase 6 filters stored order by tier |
| Free user deep-links to `?tab=advanced` | LOW | Tab state is in-memory (`useState`), not URL — no deep-linking possible |
| Plan status stale after upgrade | LOW | React Query invalidation on subscription change |
| Chart sizes config mismatch | LOW | Both tiers use same `CHART_CARD_SIZES` config |

---

## Possible Future Upgrades (Ask Me)

These are NOT part of this plan but could be added:

1. **Blurred preview** — Show advanced charts blurred/grayed with a lock overlay (teaser effect) instead of hiding completely
2. **Per-chart lock** — Lock individual advanced charts inline in the grid rather than a separate tab
3. **Server-side tier gating** — Filter bundle API response by tier to reduce payload for free users
4. **Admin dashboard** — UI to reassign chart tiers without code deploys
5. **A/B testing** — Use PostHog feature flags to test which charts drive conversions when gated

---

## Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
  config    hook    constants   pages    component  layout    docs
```

Phases 1-3 are foundational (no UI change). Phases 4-5 are the visible feature. Phase 6-7 are cleanup and docs.

---

**WAITING FOR CONFIRMATION**: Proceed with this plan? Reply with:
- **yes** — implement as described
- **modify: [changes]** — adjust specific phases
- **question: [...]** — ask about any phase
