# Dashboard Caching Implementation

> **Last Updated:** December 25, 2024  
> **Versions:** v1 (TanStack Query), v2 (Upstash Redis + Bundle APIs)

---

## Overview

Multi-layer caching strategy for optimal performance:

1. **Server-side:** Upstash Redis caches pre-aggregated data
2. **Client-side:** TanStack Query caches API responses

---

## Architecture

```
Client → TanStack Query Cache → Bundle API → Upstash Redis → SQL Aggregation
                 (2 min)                         (5 min)
```

---

## Server-Side Caching (Upstash Redis)

**File:** [lib/cache/upstash.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/lib/cache/upstash.ts)

### Cache Configuration

| TTL | Pages | Invalidation |
|-----|-------|--------------|
| 5 min | Analytics, Fridge, Home, Trends, Savings | On data mutation |
| 30 min | Categories | Manual only |

### Cache Key Pattern

```
user:{userId}:{prefix}:{filter}:bundle
```

Example: `user:user_123:analytics:last30days:bundle`

### Functions

| Function | Purpose |
|----------|---------|
| `getCachedOrCompute()` | Cache-through pattern |
| `invalidateUserCache()` | Clear all user keys |
| `invalidateUserCachePrefix()` | Clear specific page cache |
| `buildCacheKey()` | Build user-scoped keys |

### Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

---

## Bundle API Endpoints

Pre-aggregated data endpoints with Redis caching:

| Endpoint | Page | What It Returns |
|----------|------|-----------------|
| `/api/charts/analytics-bundle` | Analytics | KPIs, category/daily/monthly spending, day-of-week, transaction history, needs/wants, cash flow, streamgraph |
| `/api/charts/fridge-bundle` | Fridge | KPIs, category/store spending, macronutrients |
| `/api/charts/home-bundle` | Home | KPIs, top categories, activity rings, daily trends |
| `/api/charts/trends-bundle` | Trends | Category → daily spending trends |
| `/api/charts/savings-bundle` | Savings | Savings KPIs, cumulative chart data |

### Aggregation Files

- [lib/charts/aggregations.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/lib/charts/aggregations.ts) - Analytics (10 functions)
- [lib/charts/fridge-aggregations.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/lib/charts/fridge-aggregations.ts) - Fridge
- [lib/charts/home-trends-savings-aggregations.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/lib/charts/home-trends-savings-aggregations.ts) - Home/Trends/Savings

### Analytics Context Provider

**File:** [contexts/analytics-data-context.tsx](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/contexts/analytics-data-context.tsx)

Provides bundle data to all chart components via React Context:

```tsx
<AnalyticsDataProvider>
  <ChartComponent /> {/* Uses useAnalyticsChartData() */}
</AnalyticsDataProvider>
```

---

## Client-Side Caching (TanStack Query)

**Provider:** [query-provider.tsx](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/components/query-provider.tsx)

| Setting | Value | Rationale |
|---------|-------|-----------|
| `staleTime` | 2 min | Data fresh for 2 min |
| `gcTime` | 20 min | Cache retained 20 min |
| `refetchOnWindowFocus` | false | No refetch on tab switch |
| `refetchOnMount` | false | Use cache on navigation |

### Dashboard Data Hooks

**File:** [use-dashboard-data.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/hooks/use-dashboard-data.ts)

- `useTransactions()` - Shared transaction data
- `useCategories()` - 5 min stale time
- `useHomeData()` / `useAnalyticsData()` / `useTrendsData()` / `useSavingsData()` / `useFridgeData()`

---

## Cache Invalidation

**Triggered on:**
- Transaction creation/update/delete
- Receipt upload/processing
- Category changes

**Location:** API mutation endpoints call `invalidateUserCachePrefix()`

---

## Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Analytics API calls | 8 parallel | 1 bundle |
| Fridge payload | ~500KB raw | ~10KB aggregated |
| Client CPU | Heavy useMemo | Pre-computed |
| Second request | Full DB query | Redis cache hit |

---

## Rate Limiting

**File:** [rate-limiter.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/lib/security/rate-limiter.ts)

| Type | Limit |
|------|-------|
| `dashboardRead` | 1000/min |
| `ai` | 10/min |
| `upload` | 20/min |
| `standard` | 100/min |

---

## Verification

1. **Redis cache:** Check Upstash dashboard for cache hits
2. **Network:** DevTools shows single bundle request per page
3. **Second visit:** Response includes `X-Cache-Key` header
