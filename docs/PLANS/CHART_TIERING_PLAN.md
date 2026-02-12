# Combined Plan: Chart Tiering + Pockets Database Integration

> **Status:** AWAITING APPROVAL
> **Complexity:** HIGH (Pockets) + MEDIUM (Chart Tiering)
> **Estimated Files Changed:** ~30
> **Database Changes:** YES (2 new tables, 3 new default categories)

---

# PART 1: Chart Tiering — Basic vs Advanced

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

## Chart Tiering — File Change Summary

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

## Chart Tiering — Scalability Analysis

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

## Chart Tiering — Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| User's saved chart order includes advanced chart | LOW | Phase 6 filters stored order by tier |
| Free user deep-links to `?tab=advanced` | LOW | Tab state is in-memory (`useState`), not URL — no deep-linking possible |
| Plan status stale after upgrade | LOW | React Query invalidation on subscription change |
| Chart sizes config mismatch | LOW | Both tiers use same `CHART_CARD_SIZES` config |

---

## Chart Tiering — Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
  config    hook    constants   pages    component  layout    docs
```

Phases 1-3 are foundational (no UI change). Phases 4-5 are the visible feature. Phase 6-7 are cleanup and docs.

---
---
---

# PART 2: Pockets Database Integration

> **Complexity:** HIGH
> **Estimated Files Changed:** ~20
> **Database Changes:** 2 new tables + 3 new default categories

---

## Requirements Restatement

1. **Garage tab** (Vehicles): Save vehicle info + financing to DB. Track maintenance/certificate/insurance reminder dates. Link transactions by category:
   - Fuel → "Fuel" category
   - Maintenance → "Car Maintenance" category
   - Insurance → "Insurance" + "Taxes & Fees" categories
   - Certificate → "Car Certificate" category (**NEW default category**)
   - Financing → "Car Loan" category (**NEW default category**)
   - Parking → "Parking/Tolls" category

2. **Property tab**: Save property info + mortgage calculation data to DB. Link transactions by category:
   - **Owned**: Mortgage → "Mortgage", Maintenance → "Home Maintenance", Insurance → "Insurance", Taxes → "Taxes & Fees"
   - **Rented**: Rent → "Rent", Utilities → "Utilities", Deposit → "Deposit" (**NEW default category**), Fees → "Taxes & Fees"

3. **Other tab**: General-purpose pocket. User names it, links any transactions, shows total spent.

4. **Travel tab**: Already in DB — no schema changes needed. Only fix: stats cards must use DB data, never mock data.

5. **All tabs**: User selects transactions → links them to a pocket. Each pocket shows "Total Invested" = sum of all linked expenses. Save which transactions belong to which pocket.

6. **Mock data strategy**: Show mock items until user creates their first real pocket in that tab, then mocks disappear. Mocks never count toward stats.
   - Travel: 3 mock countries
   - Garage: 1 mock vehicle
   - Property: 2 mock (1 owned, 1 rented)
   - Other: 1 mock item

7. **Stats cards**: Always from DB (never mock data). Zero values when no real data exists.

8. **Database changes**: Applied manually via Neon dashboard (DDL provided below).

---

## Architecture Decision: Unified Pockets Table with JSONB

### Why Not Separate Tables Per Pocket Type?

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Separate `vehicles`, `properties`, `other_pockets` tables | Typed columns, easy validation | 3 tables, 3 APIs, repeated patterns, harder to extend | **No** |
| Unified `pockets` table with `type` + JSONB `metadata` | 1 table, 1 API, flexible, extensible | Metadata not type-enforced at DB level | **Yes** |
| Extend `country_instances` to handle all types | Reuse existing table | Would break existing travel API, poor separation | **No** |

**Decision: Unified `pockets` table + `pocket_transactions` junction table**

**Reasoning:**
- **Lightweight**: 2 new tables total (vs 4+ with separate tables)
- **Scalable**: Single index on `(user_id, type)` covers all queries
- **Flexible**: JSONB metadata holds vehicle specs, mortgage data, or nothing (for "other")
- **Type-safe at app level**: TypeScript discriminated unions enforce shape per type
- **Consistent**: Same API pattern for all pocket types
- **Future-proof**: Adding a new pocket type (e.g., "collectibles") = add a type string, no schema migration

### Why Keep Travel Separate?

The existing `country_instances` table + `transactions.country_instance_id` FK pattern is already production-tested and works well. Migrating it into the unified table would:
- Break existing API routes
- Require migrating existing linked transactions
- Add risk with zero benefit

**Decision: Leave travel as-is.** New pocket types use the new tables.

---

## Database Schema

### Table 1: `pockets`

Stores all pocket items (vehicles, properties, other items) in a single table.

```sql
-- ═══════════════════════════════════════════════════════
-- PREREQUISITE: Create trigger function if it doesn't exist
-- (Other tables like subscriptions, user_preferences also use this)
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════
-- TABLE: pockets
-- Purpose: Unified storage for vehicles, properties, and other pocket items
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pockets (
    id              SERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,                      -- 'vehicle' | 'property' | 'other'
    name            TEXT NOT NULL,                      -- Display name (e.g., "My Toyota", "Main Apartment")
    metadata        JSONB NOT NULL DEFAULT '{}',        -- Type-specific data (see schemas below)
    svg_path        TEXT,                               -- Icon/image path (e.g., "/vehicles/suv.svg")
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pockets_user ON pockets(user_id);
CREATE INDEX IF NOT EXISTS idx_pockets_user_type ON pockets(user_id, type);

-- ─── Trigger ────────────────────────────────────────────
CREATE TRIGGER update_pockets_updated_at
    BEFORE UPDATE ON pockets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ─── Constraint ─────────────────────────────────────────
-- Prevent duplicate names per user per type
ALTER TABLE pockets ADD CONSTRAINT pockets_user_type_name_unique
    UNIQUE (user_id, type, name);
```

### Table 2: `pocket_transactions`

Junction table linking transactions to pockets with a `tab` discriminator.

```sql
-- ═══════════════════════════════════════════════════════
-- TABLE: pocket_transactions
-- Purpose: Links transactions to pockets with tab classification
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pocket_transactions (
    id              SERIAL PRIMARY KEY,
    pocket_id       INTEGER NOT NULL REFERENCES pockets(id) ON DELETE CASCADE,
    transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- denormalized for fast queries
    tab             TEXT NOT NULL,   -- Sub-section: 'fuel', 'maintenance', 'insurance', 'certificate',
                                     -- 'financing', 'parking', 'mortgage', 'taxes', 'rent', 'utilities',
                                     -- 'deposit', 'fees', 'general'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Each transaction can only be linked once per pocket
    UNIQUE (pocket_id, transaction_id)
);

-- ─── Indexes ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pocket_tx_pocket ON pocket_transactions(pocket_id);
CREATE INDEX IF NOT EXISTS idx_pocket_tx_user ON pocket_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pocket_tx_transaction ON pocket_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pocket_tx_pocket_tab ON pocket_transactions(pocket_id, tab);

-- ─── Covering index for bundle aggregation ──────────────
-- Speeds up the main aggregation query: GROUP BY pocket_id, tab with SUM(amount)
CREATE INDEX IF NOT EXISTS idx_pocket_tx_user_agg ON pocket_transactions(user_id, pocket_id, tab);
```

### New Default Categories (3)

Add to the existing 41 default categories:

```sql
-- ═══════════════════════════════════════════════════════
-- NEW DEFAULT CATEGORIES
-- Replace 'YOUR_USER_ID' with your actual Clerk user_id.
-- To find it: SELECT id FROM users LIMIT 5;
-- For new users: already handled by seedDefaultCategories() in code.
-- ═══════════════════════════════════════════════════════

INSERT INTO categories (user_id, name, color, icon, is_default)
VALUES
    ('YOUR_USER_ID', 'Car Certificate', '#f59e0b', 'file-check', true),
    ('YOUR_USER_ID', 'Car Loan', '#ef4444', 'car', true),
    ('YOUR_USER_ID', 'Deposit', '#8b5cf6', 'landmark', true)
ON CONFLICT (user_id, name) DO NOTHING;
```

**Total after addition: 44 default categories.**

---

## JSONB Metadata Schemas (TypeScript enforced)

The `metadata` column stores type-specific data. Shape is enforced at the TypeScript level, not in the DB.

### Vehicle Metadata

```typescript
interface VehicleMetadata {
    brand: string
    vehicleType: "Car" | "SUV" | "Truck" | "Van" | "Motorcycle" | "Other"
    year: number
    priceBought: number
    licensePlate?: string
    fuelType?: "Gasoline" | "Diesel" | "Electric" | "Hybrid" | "LPG"
    tankSizeL?: number
    // Reminder dates (ISO strings, e.g., "2026-06-15")
    nextMaintenanceDate?: string    // When next service is due
    certificateEndDate?: string     // When MOT/inspection expires
    insuranceRenewalDate?: string   // When insurance policy renews
    // Financing (optional — only if user has a loan)
    financing?: {
        upfrontPaid: number
        annualInterestRate: number
        loanRemaining: number
    }
}
```

### Property Metadata (Owned)

```typescript
interface OwnedPropertyMetadata {
    propertyType: "owned"
    estimatedValue: number
    mortgage?: {
        originalAmount: number     // Original loan amount
        interestRate: number       // Annual interest rate (%)
        loanYears: number          // Total loan term in years
        yearsPaid: number          // Years already paid
    }
}
```

### Property Metadata (Rented)

```typescript
interface RentedPropertyMetadata {
    propertyType: "rented"
    monthlyRent?: number           // Monthly rent amount (for reference)
}
```

### Other Pocket Metadata

```typescript
interface OtherPocketMetadata {
    // Empty — "other" pockets only need a name + linked transactions
}
```

---

## Category → Tab Mapping

When the user opens a tab on a pocket card, the system fetches transactions from specific categories to offer for linking.

### Vehicle Tabs

| Tab | Category Name(s) | Notes |
|-----|------------------|-------|
| `fuel` | "Fuel" | Gas station transactions |
| `maintenance` | "Car Maintenance" | Service, repairs, parts |
| `insurance` | "Insurance", "Taxes & Fees" | Vehicle insurance premiums |
| `certificate` | "Car Certificate" | **NEW** — MOT, inspection fees |
| `financing` | "Car Loan" | **NEW** — Monthly loan payments |
| `parking` | "Parking/Tolls" | Parking meters, highway tolls |

### Owned Property Tabs

| Tab | Category Name(s) | Notes |
|-----|------------------|-------|
| `mortgage` | "Mortgage" | Monthly mortgage payments |
| `maintenance` | "Home Maintenance" | Repairs, renovations |
| `insurance` | "Insurance" | Home insurance premiums |
| `taxes` | "Taxes & Fees" | Property taxes, council tax |

### Rented Property Tabs

| Tab | Category Name(s) | Notes |
|-----|------------------|-------|
| `rent` | "Rent" | Monthly rent payments |
| `utilities` | "Utilities" | Electric, gas, water, internet |
| `deposit` | "Deposit" | **NEW** — Security deposit |
| `fees` | "Taxes & Fees" | Agency fees, admin charges |

### Other Pocket Tabs

| Tab | Category Name(s) | Notes |
|-----|------------------|-------|
| `general` | *ALL categories* | User picks any transaction |

---

## API Design

### New API Routes

All routes follow existing patterns: `getCurrentUserId()` auth, `neonQuery()` for DB, parameterized queries.

#### `GET /api/pockets/items`

Returns all pockets for the authenticated user with aggregated totals.

```typescript
// Response
{
  items: Array<{
    id: number
    type: "vehicle" | "property" | "other"
    name: string
    metadata: VehicleMetadata | OwnedPropertyMetadata | RentedPropertyMetadata | OtherPocketMetadata
    svg_path: string | null
    created_at: string
    // Aggregated from pocket_transactions
    totals: Record<string, number>   // { fuel: 1200, maintenance: 450, ... }
    totalInvested: number            // Sum of all tab totals
    transactionCount: number         // Total linked transactions
  }>
}
```

**SQL Strategy** (2 queries, both indexed):

```sql
-- Query 1: Get all pockets
SELECT id, type, name, metadata, svg_path, created_at
FROM pockets WHERE user_id = $1
ORDER BY type, created_at DESC;

-- Query 2: Get aggregated totals per pocket per tab
SELECT
    pt.pocket_id,
    pt.tab,
    COUNT(*) as tx_count,
    COALESCE(SUM(ABS(t.amount)), 0) as total
FROM pocket_transactions pt
JOIN transactions t ON t.id = pt.transaction_id
WHERE pt.user_id = $1
GROUP BY pt.pocket_id, pt.tab;
```

Then combine in JS: merge totals into pocket items. **Two lightweight indexed queries, no N+1.**

#### `POST /api/pockets/items`

Creates a new pocket.

```typescript
// Request body
{
  type: "vehicle" | "property" | "other"
  name: string
  metadata: object     // Type-specific metadata
  svg_path?: string
}

// Response
{ item: PocketItem }
```

Invalidates: `pockets` cache prefix.

#### `PATCH /api/pockets/items?id=123`

Updates pocket metadata (name, metadata fields, svg_path).

```typescript
// Request body (partial update)
{
  name?: string
  metadata?: object       // Merged with existing metadata
  svg_path?: string
}
```

Invalidates: `pockets` cache prefix.

#### `DELETE /api/pockets/items?id=123`

Deletes a pocket. Linked transactions are automatically unlinked via `ON DELETE CASCADE` on `pocket_transactions`.

Invalidates: `pockets` cache prefix.

#### `POST /api/pockets/item-links`

Links transactions to a pocket under a specific tab.

```typescript
// Request body
{
  pocket_id: number
  tab: string              // e.g., "fuel", "mortgage", "general"
  transaction_ids: number[]
}

// Response
{ linked: number, requested: number }
```

**Validation:**
- Pocket must belong to authenticated user
- Transaction IDs must belong to authenticated user
- Uses `ON CONFLICT DO NOTHING` to handle re-linking gracefully

Invalidates: `pockets` cache prefix.

#### `DELETE /api/pockets/item-links`

Unlinks transactions from a pocket.

```typescript
// Request body
{
  pocket_id: number
  transaction_ids: number[]
}
```

Invalidates: `pockets` cache prefix.

#### `GET /api/pockets/item-transactions?pocket_id=123&tab=fuel`

Returns transactions linked to a specific pocket tab.

```typescript
// Response
{
  pocket_id: number
  tab: string
  transactions: Array<{
    id: number
    tx_date: string
    description: string
    amount: number
    category_name: string | null
  }>
  total: number
}
```

**SQL:**
```sql
SELECT t.id, t.tx_date, t.description, t.amount, c.name as category_name
FROM pocket_transactions pt
JOIN transactions t ON t.id = pt.transaction_id
LEFT JOIN categories c ON c.id = t.category_id
WHERE pt.pocket_id = $1 AND pt.user_id = $2 AND pt.tab = $3
ORDER BY t.tx_date DESC
LIMIT 500;
```

#### `GET /api/pockets/item-unlinked?pocket_id=123&tab=fuel&search=shell`

Returns transactions matching the tab's category filter that are NOT already linked to this pocket.

```typescript
// Response
{
  transactions: Array<{
    id: number
    tx_date: string
    description: string
    amount: number
    category_name: string | null
  }>
  total: number
}
```

**SQL (for vehicle fuel tab):**
```sql
SELECT t.id, t.tx_date, t.description, t.amount, c.name as category_name
FROM transactions t
LEFT JOIN categories c ON c.id = t.category_id
WHERE t.user_id = $1
  AND c.name IN ('Fuel')                               -- Category filter for this tab
  AND t.id NOT IN (                                     -- Exclude already linked
      SELECT transaction_id FROM pocket_transactions
      WHERE pocket_id = $2
  )
  AND ($3::text IS NULL OR t.description ILIKE '%' || $3 || '%')  -- Optional search
ORDER BY t.tx_date DESC
LIMIT 200;
```

For "other" pockets (`tab = 'general'`), skip the category filter — show ALL categories.

---

## Bundle API Extension

### Updated `pockets-bundle` Response

Extend the existing `/api/charts/pockets-bundle` to return all pocket types.

```typescript
interface PocketsBundleResponse {
    // Existing (travel)
    countries: CountryData[]

    // New (garage, property, other)
    vehicles: PocketItemWithTotals[]
    properties: PocketItemWithTotals[]
    otherPockets: PocketItemWithTotals[]

    // Stats per tab (all from DB, never mock)
    stats: {
        travel: {
            totalCountries: number
            totalSpentAbroad: number
            topCountry: { name: string; value: number } | null
        }
        garage: {
            totalVehicles: number
            totalInvested: number         // Sum of all vehicle expenses
            topVehicle: { name: string; value: number } | null
        }
        property: {
            totalProperties: number
            totalValue: number            // Sum of estimatedValue from metadata
            totalEquity: number           // Computed from mortgage data
            topProperty: { name: string; value: number } | null
        }
        other: {
            totalItems: number
            totalSpent: number
            topItem: { name: string; value: number } | null
        }
    }
}

interface PocketItemWithTotals {
    id: number
    type: string
    name: string
    metadata: object
    svg_path: string | null
    totals: Record<string, number>    // { fuel: 1200, maintenance: 450 }
    totalInvested: number
    transactionCount: number
}
```

### Aggregation Function

Add to `lib/charts/pockets-aggregations.ts`:

```typescript
export async function getPocketsBundle(userId: string): Promise<PocketsBundleResponse> {
    // 1. Get travel data (existing)
    const countries = await getCountrySpending(userId)

    // 2. Get all pockets
    const pockets = await neonQuery<PocketRow>(
        'SELECT id, type, name, metadata, svg_path, created_at FROM pockets WHERE user_id = $1 ORDER BY type, created_at DESC',
        [userId]
    )

    // 3. Get aggregated totals (single query for all pockets)
    const totals = await neonQuery<TotalRow>(
        `SELECT pt.pocket_id, pt.tab, COUNT(*) as tx_count, COALESCE(SUM(ABS(t.amount)), 0) as total
         FROM pocket_transactions pt
         JOIN transactions t ON t.id = pt.transaction_id
         WHERE pt.user_id = $1
         GROUP BY pt.pocket_id, pt.tab`,
        [userId]
    )

    // 4. Merge totals into pockets (in-memory, O(n))
    const enriched = mergeTotalsIntoPockets(pockets, totals)

    // 5. Split by type
    const vehicles = enriched.filter(p => p.type === 'vehicle')
    const properties = enriched.filter(p => p.type === 'property')
    const otherPockets = enriched.filter(p => p.type === 'other')

    // 6. Compute stats (pure functions, no DB)
    return {
        countries,
        vehicles,
        properties,
        otherPockets,
        stats: {
            travel: computePocketsStats(countries),
            garage: computeGarageStats(vehicles),
            property: computePropertyStats(properties),
            other: computeOtherStats(otherPockets),
        }
    }
}
```

**Performance**: 3 SQL queries total (countries + pockets + totals), all indexed on `user_id`. The merge is O(n) in-memory. Cached with Redis for 5 minutes.

---

## Mock Data Strategy

### Rules

1. Mock data is **client-side only** — never stored in DB, never returned by APIs
2. Mocks are shown **only when the user has zero real pockets** in that tab
3. When user creates their first real pocket → mocks disappear **permanently for that tab**
4. Mocks **never count toward stats** — stats cards show zeros when no real data
5. Mock items are **not interactive** — no flip, no linking, no delete (just visual)

### Mock Counts Per Tab

| Tab | Mock Count | Mock Items |
|-----|-----------|------------|
| Travel | 3 | Brazil, China, Indonesia (existing) |
| Garage | 1 | "Demo Vehicle" — a sample car |
| Property | 2 | "Demo House" (owned) + "Demo Apartment" (rented) |
| Other | 1 | "Demo Item" — a sample collectible |

### Implementation

```typescript
// In WorldMapPage.tsx — for each tab:
const showMockVehicles = vehicles.length === 0
const showMockProperties = properties.length === 0
const showMockOther = otherPockets.length === 0

// Render:
{showMockVehicles ? <MockVehicleCards /> : <VehicleCardsGrid vehicles={vehicles} />}
```

Mock components render with a subtle visual distinction (e.g., lower opacity, dashed border) to signal they're placeholder data. Each mock card has a CTA button: "Add your first vehicle" / "Add your first property".

---

## "Total Invested" Calculation

Each pocket card displays a **Total Invested** figure = total money spent on that asset.

### Vehicle

```
Total Invested = priceBought + fuelTotal + maintenanceTotal + insuranceTotal
               + certificateTotal + financingTotal + parkingTotal
```

- `priceBought` comes from `metadata.priceBought`
- All `*Total` values come from `totals` in the bundle response (aggregated from `pocket_transactions`)

### Owned Property

```
Total Invested = mortgageTotal + maintenanceTotal + insuranceTotal + taxesTotal
```

- Mortgage payments already linked as transactions
- `metadata.mortgage` stores the loan terms for % ownership calculation

### Rented Property

```
Total Invested = rentTotal + utilitiesTotal + depositTotal + feesTotal
```

### Other

```
Total Invested = generalTotal
```

- Sum of all linked transactions regardless of category

---

## Type Definitions

### New/Updated Types (`lib/types/pockets.ts`)

```typescript
// ─── Pocket Types ───────────────────────────────────────

export type PocketType = "vehicle" | "property" | "other"

export type VehicleTab = "fuel" | "maintenance" | "insurance" | "certificate" | "financing" | "parking"
export type OwnedPropertyTab = "mortgage" | "maintenance" | "insurance" | "taxes"
export type RentedPropertyTab = "rent" | "utilities" | "deposit" | "fees"
export type OtherTab = "general"
export type PocketTab = VehicleTab | OwnedPropertyTab | RentedPropertyTab | OtherTab

// ─── Pocket Item (from DB) ──────────────────────────────

export interface PocketItem {
    id: number
    user_id: string
    type: PocketType
    name: string
    metadata: VehicleMetadata | OwnedPropertyMetadata | RentedPropertyMetadata | OtherPocketMetadata
    svg_path: string | null
    created_at: string
    updated_at: string
}

export interface PocketItemWithTotals extends Omit<PocketItem, 'user_id' | 'updated_at'> {
    totals: Record<string, number>      // { fuel: 1200, maintenance: 450 }
    totalInvested: number
    transactionCount: number
}

// ─── Vehicle Metadata ───────────────────────────────────

export interface VehicleMetadata {
    brand: string
    vehicleType: VehicleTypeOption
    year: number
    priceBought: number
    licensePlate?: string
    fuelType?: "Gasoline" | "Diesel" | "Electric" | "Hybrid" | "LPG"
    tankSizeL?: number
    nextMaintenanceDate?: string       // ISO date
    certificateEndDate?: string        // ISO date
    insuranceRenewalDate?: string      // ISO date
    financing?: {
        upfrontPaid: number
        annualInterestRate: number
        loanRemaining: number
    }
}

// ─── Property Metadata ──────────────────────────────────

export interface OwnedPropertyMetadata {
    propertyType: "owned"
    estimatedValue: number
    mortgage?: {
        originalAmount: number
        interestRate: number
        loanYears: number
        yearsPaid: number
    }
}

export interface RentedPropertyMetadata {
    propertyType: "rented"
    monthlyRent?: number
}

// ─── Other Metadata ─────────────────────────────────────

export interface OtherPocketMetadata {
    // Intentionally empty — name is sufficient
}

// ─── Category Mapping Config ────────────────────────────

export const POCKET_TAB_CATEGORIES: Record<string, string[]> = {
    // Vehicle tabs
    fuel: ["Fuel"],
    maintenance_vehicle: ["Car Maintenance"],
    insurance_vehicle: ["Insurance", "Taxes & Fees"],
    certificate: ["Car Certificate"],
    financing: ["Car Loan"],
    parking: ["Parking/Tolls"],
    // Owned property tabs
    mortgage: ["Mortgage"],
    maintenance_property: ["Home Maintenance"],
    insurance_property: ["Insurance"],
    taxes: ["Taxes & Fees"],
    // Rented property tabs
    rent: ["Rent"],
    utilities: ["Utilities"],
    deposit: ["Deposit"],
    fees: ["Taxes & Fees"],
    // Other
    general: [],  // Empty = all categories (no filter)
}
```

---

## Implementation Phases

### Phase 8: Database Tables (Manual — Neon Dashboard)

**Action**: User runs the DDL from the "Database Schema" section above in the Neon dashboard.

**Tables created:**
1. `pockets` — with indexes + trigger + unique constraint
2. `pocket_transactions` — with indexes + unique constraint

**Categories added (per existing user):**
1. "Car Certificate"
2. "Car Loan"
3. "Deposit"

---

### Phase 9: Update Default Category Seeding

Update `lib/categories.ts` and `lib/user-sync.ts` to include the 3 new categories for new user sign-ups.

**Files:**
- `lib/categories.ts` (EDIT — add 3 categories to `DEFAULT_CATEGORIES`)
- `lib/user-sync.ts` (EDIT — add colors for new categories to `CATEGORY_COLORS`)

---

### Phase 10: Type Definitions

Update `lib/types/pockets.ts` with the new types from the "Type Definitions" section above.

- Remove old `VehicleData` interface (replaced by `PocketItemWithTotals` + `VehicleMetadata`)
- Add `PocketType`, `PocketTab`, metadata interfaces
- Add `POCKET_TAB_CATEGORIES` mapping

**Files:**
- `lib/types/pockets.ts` (EDIT — major rewrite)

---

### Phase 11: Pocket CRUD API Routes

Create new API routes following existing patterns.

| Route | Method | File |
|-------|--------|------|
| `/api/pockets/items` | GET | `app/api/pockets/items/route.ts` (NEW) |
| `/api/pockets/items` | POST | Same file |
| `/api/pockets/items` | PATCH | Same file |
| `/api/pockets/items` | DELETE | Same file |

**Files:**
- `app/api/pockets/items/route.ts` (NEW)

---

### Phase 12: Transaction Linking API Routes

Create linking/unlinking routes.

| Route | Method | File |
|-------|--------|------|
| `/api/pockets/item-links` | POST | `app/api/pockets/item-links/route.ts` (NEW) |
| `/api/pockets/item-links` | DELETE | Same file |
| `/api/pockets/item-transactions` | GET | `app/api/pockets/item-transactions/route.ts` (NEW) |
| `/api/pockets/item-unlinked` | GET | `app/api/pockets/item-unlinked/route.ts` (NEW) |

**Files:**
- `app/api/pockets/item-links/route.ts` (NEW)
- `app/api/pockets/item-transactions/route.ts` (NEW)
- `app/api/pockets/item-unlinked/route.ts` (NEW)

---

### Phase 13: Extend Pockets Bundle

Update the aggregation and bundle route to include all pocket types.

**Files:**
- `lib/charts/pockets-aggregations.ts` (EDIT — add pocket aggregation)
- `app/api/charts/pockets-bundle/route.ts` (EDIT — return extended response)

---

### Phase 14: Update WorldMapPage

Replace local state (`useState<VehicleData[]>`) with data from the bundle API.

**Changes:**
1. Remove local `vehicles`/`properties` state — get from bundle response
2. Remove mock data from being part of "real" data
3. Show mock cards only when `bundle.vehicles.length === 0`
4. Stats cards always read from `bundle.stats.*` (never mock)
5. CRUD operations call the new API routes → mutate SWR to refresh
6. Add/Edit/Delete dialogs now persist to DB instead of local state

**Files:**
- `app/pockets/_page/WorldMapPage.tsx` (EDIT — major)

---

### Phase 15: Update Vehicle Components

Wire vehicle cards to use DB data instead of local state.

**Changes:**
1. `VehicleCardsGrid`: Receives `PocketItemWithTotals[]` instead of `VehicleData[]`
2. `VehicleCard`: Reads `metadata` JSONB for specs, `totals` for tab amounts
3. `VehicleDetailContent`: Calls `/api/pockets/item-unlinked` for available transactions, `/api/pockets/item-links` for linking
4. `VehicleFinancingContent`: Updates `metadata.financing` via PATCH `/api/pockets/items`
5. `AddVehicleDialog`: Calls POST `/api/pockets/items` with `type: "vehicle"`
6. Add reminder date fields (nextMaintenanceDate, certificateEndDate, insuranceRenewalDate)

**Files:**
- `app/pockets/_page/components/VehicleCardsGrid.tsx` (EDIT)
- `app/pockets/_page/components/VehicleCardBackFace.tsx` (EDIT)
- `app/pockets/_page/components/VehicleDetailContent.tsx` (EDIT)
- `app/pockets/_page/components/AddVehicleDialog.tsx` (EDIT)

---

### Phase 16: Update Property Components

Wire property cards to use DB data.

**Changes:**
1. `PropertyCardsGrid`: Receives `PocketItemWithTotals[]` split by `metadata.propertyType`
2. `PropertyMortgageContent`: Link mortgage transactions via API, update mortgage metadata via PATCH
3. Other property tabs: Same linking pattern as vehicle tabs
4. `AddPropertyDialog`: Calls POST `/api/pockets/items` with `type: "property"`

**Files:**
- `app/pockets/_page/components/PropertyCardsGrid.tsx` (EDIT)
- `app/pockets/_page/components/PropertyMortgageContent.tsx` (EDIT)
- `app/pockets/_page/components/AddPropertyButton.tsx` (EDIT)
- `app/pockets/_page/components/AddPropertyDialog.tsx` (EDIT)

---

### Phase 17: Implement Other Tab

Create the "Other" pocket type — simplest implementation.

**Changes:**
1. Create `OtherCardsGrid` component (or update placeholder)
2. Card shows: name, total spent, transaction count
3. Back face has single "Transactions" tab showing all linked transactions
4. `AddOtherDialog`: Simple form with just a name field
5. Transaction linking shows ALL categories (no filter)

**Files:**
- `app/pockets/_page/components/OtherCardsGrid.tsx` (EDIT or NEW)
- `app/pockets/_page/components/AddOtherDialog.tsx` (NEW)

---

### Phase 18: Cache Invalidation

Ensure all mutations invalidate the right caches.

```typescript
// After ANY pocket CRUD or linking operation:
await invalidateUserCachePrefix(userId, 'pockets')
```

**Update invalidation map in `CLAUDE.md`:**

| After... | Invalidate |
|----------|------------|
| Pocket create/update/delete | `pockets` |
| Pocket transaction link/unlink | `pockets` |

---

### Phase 19: Update Documentation

**Files:**
- `docs/CORE/NEON_DATABASE.md` (EDIT — add pockets + pocket_transactions tables)
- `CLAUDE.md` (EDIT — add pocket routes to API reference)

---

## Pockets — File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| **Database (manual)** | | |
| Neon Dashboard | CREATE | `pockets` table + indexes |
| Neon Dashboard | CREATE | `pocket_transactions` table + indexes |
| Neon Dashboard | INSERT | 3 new default categories per user |
| **Types** | | |
| `lib/types/pockets.ts` | EDIT | New pocket types, metadata interfaces |
| **Categories** | | |
| `lib/categories.ts` | EDIT | Add 3 new default categories |
| `lib/user-sync.ts` | EDIT | Add colors for new categories |
| **API Routes** | | |
| `app/api/pockets/items/route.ts` | **NEW** | Pocket CRUD |
| `app/api/pockets/item-links/route.ts` | **NEW** | Link/unlink transactions |
| `app/api/pockets/item-transactions/route.ts` | **NEW** | Get linked transactions |
| `app/api/pockets/item-unlinked/route.ts` | **NEW** | Get available transactions |
| **Bundle** | | |
| `lib/charts/pockets-aggregations.ts` | EDIT | Add pocket aggregation queries |
| `app/api/charts/pockets-bundle/route.ts` | EDIT | Return extended bundle |
| **Components** | | |
| `app/pockets/_page/WorldMapPage.tsx` | EDIT | Use bundle data, remove local state |
| `app/pockets/_page/components/VehicleCardsGrid.tsx` | EDIT | Use DB data |
| `app/pockets/_page/components/VehicleCardBackFace.tsx` | EDIT | Use DB data |
| `app/pockets/_page/components/VehicleDetailContent.tsx` | EDIT | API linking |
| `app/pockets/_page/components/AddVehicleDialog.tsx` | EDIT | API create |
| `app/pockets/_page/components/PropertyCardsGrid.tsx` | EDIT | Use DB data |
| `app/pockets/_page/components/PropertyMortgageContent.tsx` | EDIT | API linking |
| `app/pockets/_page/components/AddPropertyButton.tsx` | EDIT | Route to API |
| `app/pockets/_page/components/AddPropertyDialog.tsx` | EDIT | API create |
| `app/pockets/_page/components/OtherCardsGrid.tsx` | EDIT | Implement |
| `app/pockets/_page/components/AddOtherDialog.tsx` | **NEW** | Other pocket dialog |
| **Docs** | | |
| `docs/CORE/NEON_DATABASE.md` | EDIT | Add new tables |
| `CLAUDE.md` | EDIT | Add new routes |

---

## Pockets — Scalability Analysis

| Concern | How It Scales |
|---------|---------------|
| 1000+ users | All queries indexed on `user_id` — constant time per user |
| Many pockets per user | `idx_pockets_user_type` composite index — fast filtered lookups |
| Many linked transactions | `idx_pocket_tx_user_agg` covering index — aggregation in ~1ms |
| Bundle API | Single Redis-cached response — 3 SQL queries max regardless of pocket count |
| Junction table growth | `UNIQUE(pocket_id, transaction_id)` prevents duplicates, ON DELETE CASCADE auto-cleans |
| JSONB metadata | No schema migration needed for new fields — just add to TypeScript type |
| Category lookup for tab | Category name `IN (...)` with existing `idx_categories_user_name` index |

### Query Performance Estimates (at 100K transactions)

| Query | Estimated Time | Why |
|-------|---------------|-----|
| Get all pockets for user | <1ms | Index scan on `user_id` (typically <50 rows) |
| Get aggregated totals | <5ms | Index scan + hash aggregate on junction table |
| Get unlinked transactions by category | <10ms | Index scan on `user_id` + category filter (covering index) |
| Link 10 transactions | <2ms | 10 INSERT with ON CONFLICT |
| Full bundle response | <15ms | 3 queries + in-memory merge |

---

## Pockets — Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| JSONB metadata schema drift | MEDIUM | TypeScript discriminated unions enforce shape at app level; Zod validation in API routes |
| Transaction linked to multiple pockets | LOW | Allowed by design — a fuel transaction CAN belong to 2 vehicles (user's choice) |
| Orphaned pocket_transactions | NONE | ON DELETE CASCADE on both FKs handles cleanup |
| Missing new categories for existing users | MEDIUM | Provide migration SQL; `ON CONFLICT DO NOTHING` is safe to re-run |
| Bundle response too large | LOW | Typical user has <20 pockets; JSONB metadata is small (<1KB per pocket) |
| Mock data confusion | LOW | Visual distinction (dashed border, opacity) + "Add your first..." CTA |

---

## Pockets — Security Checklist

- [x] All queries filter by `user_id = $1`
- [x] Pocket ownership verified before link/unlink (`WHERE pocket_id = $1 AND user_id = $2`)
- [x] Transaction ownership verified before linking (`WHERE id = ANY($1) AND user_id = $2`)
- [x] Parameterized queries throughout (no string interpolation)
- [x] `getCurrentUserId()` on every route
- [x] No cross-user data leakage (junction table denormalizes `user_id`)
- [x] ON DELETE CASCADE prevents orphaned data

---

## Combined Execution Order

```
═══ CHART TIERING ═══════════════════════════════════════════
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
  config    hook    constants   pages    component  layout    docs

═══ POCKETS DATABASE ════════════════════════════════════════
Phase 8 → Phase 9 → Phase 10 → Phase 11 → Phase 12 → Phase 13
  DDL     categories   types     CRUD API    links API  bundle

Phase 14 → Phase 15 → Phase 16 → Phase 17 → Phase 18 → Phase 19
  page     vehicles   properties   other     cache      docs
```

**Dependencies:**
- Phase 8 (DDL) must be done first (manual in Neon dashboard)
- Phases 9-10 can run in parallel
- Phases 11-12 depend on Phase 10 (types)
- Phase 13 depends on Phases 11-12
- Phases 14-17 depend on Phase 13 (bundle)
- Phase 18-19 depend on all prior phases

---

## Possible Future Upgrades (Not in This Plan)

1. **Reminders**: Push notifications for maintenance/certificate/insurance dates
2. **Receipt linking**: Link receipt_transactions (fridge items) to pockets
3. **Pocket analytics**: Charts showing spending trends per vehicle/property over time
4. **Pocket sharing**: Share a pocket view with family members
5. **Import vehicle data**: VIN decoder API to auto-fill vehicle specs
6. **Property valuation**: External API for estimated property value tracking
7. **Migrate travel to unified table**: Move `country_instances` into `pockets` table for consistency

---

**WAITING FOR CONFIRMATION**: Proceed with this plan? Reply with:
- **yes** — implement as described (starting with Chart Tiering, then Pockets)
- **modify: [changes]** — adjust specific phases
- **question: [...]** — ask about any phase
- **pockets only** — skip chart tiering, implement pockets only
- **tiering only** — skip pockets, implement chart tiering only
