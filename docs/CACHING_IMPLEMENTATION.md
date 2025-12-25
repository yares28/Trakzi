# Dashboard Caching Implementation

> **Implemented:** December 25, 2024  
> **Issue:** #3 - Charts rerender and data refetches on navigation

---

## Overview

Fixed redundant network requests and chart rerenders when navigating between Home/Analytics/Trends/Savings/Fridge pages.

## Solution

### TanStack Query

Added `@tanstack/react-query` for client-side caching.

**Provider:** [query-provider.tsx](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/components/query-provider.tsx)

| Setting | Value | Rationale |
|---------|-------|-----------|
| `staleTime` | 2 minutes | Data considered fresh for 2 min |
| `gcTime` | 20 minutes | Cache retained 20 min |
| `refetchOnWindowFocus` | false | No refetch on tab switch |
| `refetchOnMount` | false | Use cache on navigation |
| `retry` | 1 | Fast failure |

### Dashboard Data Hooks

**File:** [use-dashboard-data.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/hooks/use-dashboard-data.ts)

- `useTransactions(filter)` - Shared across pages
- `useCategories()` - 5 min stale time
- `useHomeData()` - Home page
- `useAnalyticsData()` - Analytics page
- `useTrendsData()` - Trends page + pre-computed chart data
- `useSavingsData()` - Savings page
- `useFridgeData()` - Fridge page

### Trends Page Optimization

**Before:** 2 + N API calls (page fetches + each chart refetches)  
**After:** 1 API call (cached, reused across charts)

Charts receive pre-computed data via props instead of self-fetching.

### Transactions API

**File:** [route.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/app/api/transactions/route.ts)

Dashboard charts use `all=true` parameter to bypass pagination:
- Default pagination: 50 per page, max 100
- With `all=true`: fetches up to 10,000 transactions
- Used by: Analytics, Trends, Savings chart data hooks

```
GET /api/transactions?all=true&filter=last30days
```

### Rate Limiting

**File:** [rate-limiter.ts](file:///c:/Users/Yaya/Desktop/PROJECTS/folio2/lib/security/rate-limiter.ts)

| Type | Limit | Change |
|------|-------|--------|
| `dashboardRead` | 1000/min | **NEW** |
| `ai` | 10/min | Unchanged |
| `upload` | 20/min | Unchanged |
| `standard` | 100/min | Unchanged |
| `auth` | 10/15min | Unchanged |

---

## Files Changed

- `package.json` - Added `@tanstack/react-query`
- `app/layout.tsx` - Added QueryProvider
- `components/query-provider.tsx` - **NEW**
- `hooks/use-dashboard-data.ts` - **NEW**
- `app/trends/page.tsx` - Refactored for caching
- `components/chart-category-trend.tsx` - Added memo + data prop
- `lib/security/rate-limiter.ts` - Added dashboardRead

---

## Verification

1. Navigate Home → Trends → Analytics → Trends
2. Check Network tab: no refetch on return visits within 2 min
3. Trends page: only 1 API call for all charts
4. Rapid navigation: no 429 errors
