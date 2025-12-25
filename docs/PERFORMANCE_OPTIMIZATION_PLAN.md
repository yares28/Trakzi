# Performance Optimization Plan for 10,000+ Users

> **Created:** December 25, 2024  
> **Status:** Draft - Pending Review

---

## Current Architecture Analysis

Based on the [PROJECT_DEEP_DIVE.md](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/docs/CORE/PROJECT_DEEP_DIVE.md) and [NEON_DATABASE.md](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/docs/CORE/NEON_DATABASE.md):

### ✅ Already Implemented

| Feature | Implementation | Status |
|---------|----------------|--------|
| Client Query Caching | TanStack Query (`staleTime: 2min`) | ✅ Working |
| Request Deduplication | `lib/request-deduplication.ts` | ✅ Working |
| Connection Pooling | Neon `-pooler` suffix | ✅ Enabled |
| Covering Indexes | `idx_transactions_user_date_desc_covering` | ✅ Exists |
| Pagination | `/api/transactions?page=1&limit=50` | ✅ Working |
| Rate Limiting | In-memory (`lib/security/rate-limiter.ts`) | ⚠️ Basic |

### ❌ Current Bottlenecks

| Issue | Impact | Evidence |
|-------|--------|----------|
| **Fetching ALL raw transactions** | High CPU, large payload | Analytics uses `all=true`, Fridge uses `limit=5000` |
| **Client-side aggregation** | Slow chart rendering | All `useMemo()` transforms happen in browser |
| **8 parallel API calls** | Connection exhaustion | Analytics `Promise.all()` with 8 endpoints |
| **No server-side caching** | Every request hits DB | Neon charged per query |
| **Binary files in DB** | Slow `user_files` queries | 5.8MB index size for file storage |

---

## Optimization Phases

### Phase 1: Server-Side Aggregation (Highest Impact)

**Problem:** Currently fetching 400+ raw transactions and computing chart data client-side.

**Solution:** Pre-compute chart data on the server.

#### New API Structure

```
/api/charts/analytics-summary      → KPIs, totals, ratios
/api/charts/spending-by-category   → Pie chart data
/api/charts/spending-by-time       → Area/line chart data
/api/charts/heatmap-data          → Calendar heatmap
/api/charts/fridge-summary        → Fridge KPIs + category breakdown
```

#### Example Transformation

**Before (Analytics Page):**
```typescript
// Client fetches 400 transactions
const txData = await fetch('/api/transactions?all=true')
// Client computes 20 different chart datasets
const pieData = useMemo(() => computePieData(txData), [txData])
const lineData = useMemo(() => computeLineData(txData), [txData])
// ... 18 more useMemo hooks
```

**After:**
```typescript
// Server returns pre-computed chart data
const { kpis, pieData, lineData } = await fetch('/api/charts/analytics-summary')
// No client-side computation needed
```

#### Implementation Files

| File | Changes |
|------|---------|
| [NEW] `app/api/charts/analytics-summary/route.ts` | Aggregation endpoint |
| [NEW] `app/api/charts/fridge-summary/route.ts` | Fridge aggregation |
| [NEW] `lib/charts/compute-chart-data.ts` | Shared computation functions |
| [MODIFY] `app/analytics/page.tsx` | Consume pre-computed data |
| [MODIFY] `app/fridge/fridge-page-client.tsx` | Consume pre-computed data |

#### SQL Aggregation Examples

```sql
-- Category spending (instead of client-side reduce)
SELECT c.name AS category, SUM(t.amount) AS total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1 AND t.tx_date >= $2 AND t.tx_date <= $3
GROUP BY c.name
ORDER BY total DESC;

-- Daily totals (instead of client-side groupBy)
SELECT tx_date::text AS date, SUM(amount) AS total
FROM transactions
WHERE user_id = $1 AND tx_date >= $2
GROUP BY tx_date
ORDER BY tx_date;

-- Monthly breakdown (instead of N+1 queries)
SELECT 
    EXTRACT(MONTH FROM tx_date)::int AS month,
    c.name AS category,
    SUM(amount) AS total
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE t.user_id = $1
GROUP BY month, c.name;
```

#### Payload Size Reduction

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Transactions payload | ~120KB (400 rows) | N/A | 100% |
| Analytics summary | N/A | ~5KB (aggregated) | - |
| **Total payload** | 120KB | 5KB | **96%** |

---

### Phase 2: Redis Caching Layer (Upstash)

**Problem:** Every request hits Neon database, even for identical queries.

**Solution:** Add Upstash Redis caching for expensive aggregations.

#### Cache Key Strategy

```
user:{userId}:analytics:{filter}:{endpoint}
user:{userId}:fridge-summary:{filter}
```

#### Cache TTL Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Analytics summary | 5 min | Changes infrequently |
| Chart data | 5 min | Same |
| Categories list | 30 min | Rarely changes |
| Recent transactions | 1 min | More dynamic |

#### Invalidation Strategy

Invalidate on:
- POST `/api/transactions` (new transaction)
- POST `/api/receipts/upload` (new receipt) 
- PUT `/api/transactions/[id]` (update)
- DELETE `/api/transactions/[id]` (delete)

#### Implementation

```typescript
// lib/cache/upstash.ts
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function getCached<T>(key: string): Promise<T | null> {
    return redis.get(key)
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await redis.setex(key, ttlSeconds, value)
}

export async function invalidateUserCache(userId: string): Promise<void> {
    const keys = await redis.keys(`user:${userId}:*`)
    if (keys.length) await redis.del(...keys)
}
```

#### Cost Estimate (Upstash)

| Tier | Price | Requests/day |
|------|-------|--------------|
| Free | $0 | 10,000 |
| Pay-as-you-go | $0.2/100K | Per request |

For 10,000 users with 50 requests/user/day = 500K requests/day = **~$1/day**

---

### Phase 3: Lazy Loading Charts

**Problem:** All 30+ charts load simultaneously on Analytics page.

**Solution:** Load above-the-fold charts first, defer others.

#### Implementation

```typescript
// components/lazy-chart.tsx
import { useInView } from 'react-intersection-observer'

export function LazyChart({ chartId, children }) {
    const { ref, inView } = useInView({
        triggerOnce: true,
        rootMargin: '200px', // Load 200px before visible
    })
    
    return (
        <div ref={ref}>
            {inView ? children : <ChartSkeleton />}
        </div>
    )
}
```

#### Priority Loading

| Priority | Charts | Load Strategy |
|----------|--------|---------------|
| P0 | KPI cards, main area chart | Immediate |
| P1 | First 6 visible charts | After P0 complete |
| P2 | Below-fold charts | IntersectionObserver |
| P3 | Rarely used charts | User scroll |

---

### Phase 4: Database Optimizations

#### New Indexes for Aggregation Queries

```sql
-- Fast category aggregation
CREATE INDEX idx_transactions_user_category_date 
ON transactions(user_id, category_id, tx_date);

-- Fast monthly grouping
CREATE INDEX idx_transactions_user_month 
ON transactions(user_id, EXTRACT(MONTH FROM tx_date));

-- Fridge queries
CREATE INDEX idx_receipt_transactions_covering
ON receipt_transactions(user_id, receipt_date DESC)
INCLUDE (category_id, category_type_id, total_price, description);
```

#### Enable `pg_stat_statements`

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

Monitor slow queries via Neon console.

---

### Phase 5: Reduce API Call Count

**Problem:** Analytics page makes 8 parallel API calls.

**Solution:** Consolidate into 1-2 batch endpoints.

#### Before (8 calls)
```
/api/transactions?all=true
/api/budgets
/api/categories
/api/financial-health
/api/charts/transaction-history
/api/analytics/monthly-category-duplicate
/api/transactions/daily
/api/analytics/day-of-week-category
```

#### After (2 calls)
```
/api/charts/analytics-bundle   → All analytics data in one payload
/api/categories                → Cached, rarely changes
```

---

## Implementation Timeline

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| **Phase 1**: Server-side aggregation | 8h | 🔥 Very High | P0 |
| **Phase 2**: Upstash Redis | 4h | 🔥 High | P1 |
| **Phase 3**: Lazy loading | 2h | ⚡ Medium | P2 |
| **Phase 4**: DB indexes | 1h | ⚡ Medium | P2 |
| **Phase 5**: API consolidation | 4h | ⚡ Medium | P3 |

---

## Expected Results

| Metric | Current | After Phase 1-2 | Improvement |
|--------|---------|-----------------|-------------|
| Initial load time | 2-3s | <500ms | **5-6x faster** |
| Payload size | 120KB | <10KB | **92% smaller** |
| DB queries/page | 8-15 | 1-2 | **85% fewer** |
| Client CPU | High | Minimal | **90% reduction** |

---

## Files to Create/Modify

### New Files

| Path | Purpose |
|------|---------|
| `app/api/charts/analytics-bundle/route.ts` | Consolidated analytics endpoint |
| `app/api/charts/fridge-bundle/route.ts` | Consolidated fridge endpoint |
| `lib/charts/aggregations.ts` | SQL aggregation queries |
| `lib/cache/upstash.ts` | Redis caching utilities |
| `components/lazy-chart.tsx` | IntersectionObserver wrapper |

### Modified Files

| Path | Changes |
|------|---------|
| `app/analytics/page.tsx` | Use bundle endpoint, remove useMemo |
| `app/fridge/fridge-page-client.tsx` | Use bundle endpoint |
| `package.json` | Add `@upstash/redis`, `react-intersection-observer` |

---

## Verification Plan

1. **Load time measurement** - Chrome DevTools Performance tab
2. **Payload size** - Network tab, compare before/after
3. **Database query count** - Neon console query logs
4. **Cache hit rate** - Upstash dashboard
5. **User testing** - Navigate between pages, verify <500ms loads

---

## Quick Wins (Can Implement Today)

These require minimal code changes:

1. **Increase TanStack Query `staleTime`** to 5 minutes
2. **Add response compression** - Vercel auto-compresses, but verify gzip
3. **Remove unnecessary `all=true`** - Charts often don't need ALL data
4. **Batch the 8 API calls into 2 groups** - Reduce connection overhead

---

## Questions for Review

1. Which phase should we prioritize first?
2. Is Upstash acceptable, or prefer another Redis provider?
3. Are there specific charts that are slower than others?
4. What's the target load time for the analytics page?
