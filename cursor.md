# Cursor Rules for Trakzi

Context file for Cursor AI. Auto-loaded at conversation start.
See CLAUDE.md for full project context — this file adds Cursor-specific notes.

## Stack

- **Next.js 16** (App Router, React 19) · **Tailwind CSS v4** · **shadcn/ui**
- **Neon Postgres** (raw SQL via `neonQuery`) · **Clerk** auth · **Upstash Redis** cache
- **Stripe** subscriptions · **PostHog** analytics

## Key Patterns

```typescript
// DB queries
import { neonQuery } from '@/lib/neonClient'
const rows = await neonQuery<T>('SELECT * FROM table WHERE user_id = $1', [userId])

// Auth — always first in API routes
import { getCurrentUserId } from '@/lib/auth'
const userId = await getCurrentUserId()

// Cache — all chart data goes through bundle APIs
import { getCachedOrCompute, buildCacheKey } from '@/lib/cache/upstash'
```

## Bundle APIs (never fetch chart data individually)

| Page | Bundle Route | Aggregation File |
|------|-------------|-----------------|
| Home | `/api/charts/home-bundle` | `lib/charts/home-trends-savings-aggregations.ts` |
| Analytics | `/api/charts/analytics-bundle` | `lib/charts/aggregations.ts` |
| Friends | `/api/charts/friends-bundle` | `lib/charts/friends-aggregations.ts` |
| Fridge | `/api/charts/fridge-bundle` | `lib/charts/fridge-aggregations.ts` |

## Test Accounts

| Environment | URL | Email | Password |
|-------------|-----|-------|----------|
| Production | `trakzi.com` | `yayafaresW9@gmail.com` | `Cabonegro11**` |
| Staging | `dev.trakzi.com` | `yayafaresW9@gmail.com` | `Cabonegro11**` |

## Deployment

| Environment | Domain | Purpose |
|-------------|--------|---------|
| Staging | `dev.trakzi.com` | All changes deploy here first |
| Production | `trakzi.com` | Only after staging validation |

## Commands

```bash
npm run dev       # Dev server (localhost:3000)
npm run build     # Production build — run before completing tasks
npm run lint      # ESLint
npm test          # Jest tests
```
