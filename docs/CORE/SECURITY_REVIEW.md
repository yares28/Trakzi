# Security Review Report

**Date:** 2026-02-10 | **Branch:** `dev` | **Reviewed by:** 4 parallel security agents (API routes, secrets, auth/middleware, XSS/dependencies)

---

## Executive Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| **CRITICAL** | 3 | Committed secrets, API key in URLs, auth bypass env var |
| **HIGH** | 8 | Missing rate limiting, error message leaking, inconsistent auth |
| **MEDIUM** | 12 | Missing security headers, input validation, CORS, logging |
| **LOW** | 7 | Informational / good patterns confirmed |

**Overall Grade: B-** (strong fundamentals, but critical secrets and rate limiting gaps)

---

## Positive Security Findings

Before the issues, these practices are well-implemented:

| Area | Status | Details |
|------|--------|---------|
| User Data Isolation | Excellent | 100% of queries filter by `user_id` |
| SQL Parameterization | Excellent | All queries use `$1, $2` placeholders |
| Webhook Signature Verification | Excellent | Both Stripe and Clerk properly verify |
| Stripe Idempotency | Excellent | Event ID deduplication prevents duplicates |
| Client-Side Storage | Good | No tokens/secrets in localStorage |
| Input Sanitization Utilities | Good | `sanitizeForAI()`, `sanitizeHtml()`, `sanitizeFileName()` exist |
| Subscription Enforcement | Good | Transaction caps enforced per tier |
| SSL Database Connections | Good | `sslmode=require` on all connections |

---

## CRITICAL Findings (Fix Immediately)

### C1. Production Secrets Committed to Git

**File:** `.env` (entire file)

The `.env` file containing **all production credentials** is committed to the repository:
- `DATABASE_URL` (Neon PostgreSQL with password)
- `CLERK_SECRET_KEY` (sk_test_...)
- `STRIPE_SECRET_KEY` (sk_test_...)
- `STRIPE_WEBHOOK_SECRET` (whsec_...)
- `UPSTASH_REDIS_REST_TOKEN`
- `GEMINI_API_KEY`

**Action Required:**
1. Rotate ALL credentials immediately (Neon, Clerk, Stripe, Upstash, Gemini)
2. Remove `.env` from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Verify `.gitignore` prevents future commits (already configured correctly)

---

### C2. Gemini API Key Exposed in URL Query Parameters

**Files:**
- `lib/ai/categoriseTransactions.ts:1357`
- `lib/receipts/ocr/extractTextFromImage.ts:90`

```typescript
// CURRENT: API key in URL -- logged by proxies, CDNs, server logs
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
)
```

**Fix:** Move to request header:
```typescript
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: "POST",
    headers: {
      "x-goog-api-key": GEMINI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ... })
  }
)
```

---

### C3. Authentication Bypass via Environment Variable

**File:** `proxy.ts:9, 49-55`

```typescript
const BYPASS_AUTH = process.env.BYPASS_CLERK_AUTH === 'true'
if (BYPASS_AUTH) {
  return NextResponse.next()  // Skips ALL authentication
}
```

If `BYPASS_CLERK_AUTH=true` is accidentally set in production, the entire application becomes publicly accessible. The `NODE_ENV` check is only used for logging, not for gating the bypass.

**Fix:**
```typescript
const BYPASS_AUTH = process.env.BYPASS_CLERK_AUTH === 'true'
  && process.env.NODE_ENV === 'development'
  && !process.env.VERCEL_ENV
```

---

## HIGH Findings (Fix This Week)

### H1. Missing Rate Limiting on Expensive Operations

**Impact:** DoS via resource exhaustion

| Endpoint | Operation | Risk |
|----------|-----------|------|
| `POST /api/statements/import` | CSV parsing + bulk DB inserts | DB exhaustion |
| `POST /api/receipts/commit` | AI categorization (Gemini API calls) | API cost spike |
| `POST /api/categories/reset` | Bulk delete + insert | DB load spike |
| `GET /api/charts/*-bundle` (6 routes) | Complex aggregation queries | Query exhaustion |
| `POST /api/admin/backfill-all-categories` | Iterates ALL users | Full DB saturation |

The rate limiter infrastructure exists (`lib/security/rate-limiter.ts`) but is **in-memory only** -- ineffective in serverless/multi-instance deployments.

**Fix:** Replace with Upstash Redis rate limiter (already configured) and apply to all expensive endpoints:
```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
})
```

---

### H2. Error Messages Leak Internal Details to Clients

**Files:** 6+ API routes

| File | Line | Leaks |
|------|------|-------|
| `app/api/checkout/route.ts` | 180 | Stripe internals via `errorMessage` |
| `app/api/ai/chat/route.ts` | 413 | `error.message` in `details` field |
| `app/api/transactions/route.ts` | 300-307 | DB error messages |
| `app/api/webhook/clerk/route.ts` | 107 | Raw `error.message` |
| `app/api/receipts/manual/route.ts` | 70 | Raw `error.message` |
| `app/api/files/upload/route.ts` | 18 | Raw `error.message` |

**Fix:** Return generic messages to clients, log details server-side only:
```typescript
catch (error: any) {
  console.error('[API] Error:', error);
  return NextResponse.json(
    { error: "An error occurred. Please try again." },
    { status: 500 }
  );
}
```

---

### H3. Inconsistent Auth Patterns with Demo User Bypass

**Files:** 6+ bundle API routes + `transactions/route.ts`

```typescript
// PROBLEMATIC PATTERN:
let userId = await getCurrentUserIdOrNull()
if (!userId && process.env.DEMO_USER_ID) {
  userId = process.env.DEMO_USER_ID  // Anyone gets demo user's data
}
```

If `DEMO_USER_ID` is set in production, unauthenticated users access the demo account's financial data.

**Fix:** Standardize on `getCurrentUserId()` (throws 401) everywhere. Remove all `DEMO_USER_ID` logic from:
- `app/api/charts/analytics-bundle/route.ts`
- `app/api/charts/home-bundle/route.ts`
- `app/api/charts/fridge-bundle/route.ts`
- `app/api/charts/trends-bundle/route.ts`
- `app/api/charts/savings-bundle/route.ts`
- `app/api/transactions/route.ts`

---

### H4. Admin Endpoint Authorization Bypassed in Development

**File:** `app/api/admin/backfill-all-categories/route.ts:104-107`

```typescript
const isDevelopment = process.env.NODE_ENV === "development"
if (!isDevelopment && !ADMIN_USER_IDS.includes(userId)) { /* 403 */ }
```

Additionally, `ADMIN_USER_IDS` is an **empty array** with only a TODO comment -- no one can access admin endpoints in production either.

**Fix:**
1. Always enforce admin check regardless of environment
2. Populate admin IDs from env var:
   ```typescript
   const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean)
   ```

---

## MEDIUM Findings (Fix This Sprint)

### M1. Missing Security Headers

**File:** `next.config.ts`

No security headers configured. Add to `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    },
  ]
}
```

---

### M2. No Centralized API Route Protection

**File:** `proxy.ts:43-47`

Middleware explicitly skips auth for `/api/*` routes, relying on each handler to call `getCurrentUserId()`. New endpoints can easily be created without auth.

**Fix:** Protect all API routes by default in middleware, whitelist public ones:
```typescript
const publicApiRoutes = createRouteMatcher([
  '/api/health(.*)',
  '/api/webhook/(.*)',
])

if (path.startsWith('/api/') && !publicApiRoutes(req)) {
  const { userId } = await auth()
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
}
```

---

### M3. Missing Input Validation (Zod) on 36+ Mutation Endpoints

**Files:** POST/PATCH/PUT routes across `categories`, `transactions`, `statements/import`, `receipts/commit`, `pockets/instances`, `budgets`, `ai/chat`, `checkout`

Manual type checks instead of schema validation. No length limits on string fields.

**Example fix for categories:**
```typescript
import { z } from 'zod'

const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional().nullable(),
})

const body = await req.json().catch(() => ({}))
const validated = CreateCategorySchema.parse(body)
```

---

### M4. Overly Permissive CORS

**File:** `lib/security/cors.ts:35-38`

```typescript
origin.endsWith('.vercel.app')  // Allows ANY Vercel deployment
```

Any `*.vercel.app` site can make cross-origin requests to the API.

**Fix:** Restrict to Trakzi-specific deployment patterns:
```typescript
const trakziPreviewPattern = /^https:\/\/trakzi-[a-z0-9-]+\.vercel\.app$/
return ALLOWED_ORIGINS.includes(origin) || trakziPreviewPattern.test(origin)
```

---

### M5. Database Query Parameters Logged in Production

**File:** `lib/neonClient.ts:139`

```typescript
console.error(`[Neon] Params were:`, params);  // May contain PII
```

**Fix:** Log parameter count only, or gate behind development check:
```typescript
console.error(`[Neon] Params count:`, params.length);
```

---

### M6. File Upload -- Filename Not Sanitized

**File:** `lib/files/saveFileToNeon.ts:15-22`

`sanitizeFileName()` exists in `lib/security/input-sanitizer.ts` but is **not used** in the file upload flow.

**Fix:**
```typescript
import { sanitizeFileName } from '@/lib/security/input-sanitizer'
const fileName = sanitizeFileName(params.file.name)
```

---

### M7. In-Memory Rate Limiter Ineffective in Serverless

**File:** `lib/security/rate-limiter.ts`

Each serverless instance maintains its own `Map` -- limits are not shared across instances.

**Fix:** Replace with Upstash `@upstash/ratelimit` (Redis is already configured).

---

### M8. Stripe Redirect URLs Not Validated on Client

**Files:** 5 components use `window.location.href = data.url` without validation.

- `hooks/use-pending-checkout.ts:85`
- `components/pricing-section.tsx:208`
- `components/subscription-dialog/SubscriptionDialog.tsx:319, 530`
- `components/dashboard/subscription-card.tsx:561`
- `components/settings-panel.tsx:617`

**Fix:**
```typescript
if (data.url) {
  const url = new URL(data.url)
  if (!url.hostname.endsWith('stripe.com')) {
    throw new Error('Invalid redirect URL')
  }
  window.location.href = data.url
}
```

---

### M9. SQL Table Name Interpolation (Non-exploitable but risky pattern)

**Files:**
- `app/api/webhook/clerk/route.ts:39`
- `lib/user-sync.ts:177-185`

Table names interpolated from hardcoded arrays -- safe now but fragile if refactored.

**Fix:** Add whitelist validation:
```typescript
const ALLOWED_TABLES = new Set([
  'subscriptions', 'categories', 'receipt_categories',
  'transactions', 'statements', 'receipts', 'budgets'
])

function validateTableName(table: string): string {
  if (!ALLOWED_TABLES.has(table)) throw new Error(`Invalid table name: ${table}`)
  return table
}
```

---

### M10. Verbose Production Logging

**Files:** 75 API route files with 248+ `console.log/error` statements

Sensitive data (transaction amounts, user IDs, query parameters) may be logged in production.

**Fix:** Replace with structured logging, add `NODE_ENV` guards, or use a logging library with PII redaction.

---

### M11. Missing Webhook Rate Limiting

**Files:** `app/api/webhook/stripe/route.ts`, `app/api/webhook/clerk/route.ts`

While signatures are verified, no IP-based rate limiting exists to prevent DoS via rapid-fire requests (valid or invalid).

**Fix:** Add IP-based rate limiting before signature verification.

---

### M12. No DOMPurify Installed (Preventive)

No HTML sanitization library in dependencies. While the current codebase doesn't render user HTML, it's a gap if features expand.

**Fix:**
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

---

## Prioritized Remediation Plan

### Phase 1 -- Deploy Blocker (24 hours)

| # | Finding | Action | Files |
|---|---------|--------|-------|
| 1 | C1 | Rotate ALL credentials from committed `.env` | Neon/Clerk/Stripe/Upstash/Gemini dashboards |
| 2 | C1 | Remove `.env` from git history | `git filter-branch` |
| 3 | C2 | Move Gemini API key from URL to header | `lib/ai/categoriseTransactions.ts`, `lib/receipts/ocr/extractTextFromImage.ts` |
| 4 | C3 | Fix `BYPASS_CLERK_AUTH` to require dev env + no Vercel | `proxy.ts` |

### Phase 2 -- Critical (This Week)

| # | Finding | Action | Files |
|---|---------|--------|-------|
| 5 | H1 | Replace in-memory rate limiter with Upstash Redis | `lib/security/rate-limiter.ts` |
| 6 | H1 | Add rate limiting to all expensive endpoints | `statements/import`, `receipts/commit`, `categories/reset`, chart bundles |
| 7 | H2 | Sanitize all error responses (return generic messages) | 6 API route files |
| 8 | H3 | Remove `DEMO_USER_ID` bypass from all routes | 6 bundle API routes + `transactions/route.ts` |
| 9 | H4 | Fix admin authorization (always enforce, populate IDs from env) | `admin/backfill-all-categories/route.ts` |

### Phase 3 -- High Priority (This Sprint)

| # | Finding | Action | Files |
|---|---------|--------|-------|
| 10 | M1 | Add security headers | `next.config.ts` |
| 11 | M3 | Add Zod validation to mutation endpoints (incremental) | 36+ route files |
| 12 | M4 | Restrict CORS `.vercel.app` wildcard | `lib/security/cors.ts` |
| 13 | M6 | Use `sanitizeFileName()` in file uploads | `lib/files/saveFileToNeon.ts` |
| 14 | M5 | Reduce production logging verbosity | `lib/neonClient.ts` |
| 15 | M8 | Validate Stripe redirect URLs client-side | 5 component files |

### Phase 4 -- Maintenance (Ongoing)

| # | Finding | Action | Files |
|---|---------|--------|-------|
| 16 | M9 | Add table name validation for dynamic SQL patterns | `webhook/clerk/route.ts`, `lib/user-sync.ts` |
| 17 | M2 | Centralize API auth in middleware | `proxy.ts` |
| 18 | M10 | Replace console.log with structured logging | 75 API route files |
| 19 | M11 | Add IP-based rate limiting to webhooks | 2 webhook routes |
| 20 | M12 | Install DOMPurify for future HTML rendering | `package.json` |

---

## Checklist for Verification After Fixes

- [ ] All credentials rotated (Neon, Clerk, Stripe, Upstash, Gemini)
- [ ] `.env` removed from git history
- [ ] `BYPASS_CLERK_AUTH` cannot bypass auth in production
- [ ] No `DEMO_USER_ID` logic in production routes
- [ ] Rate limiting uses Redis (not in-memory)
- [ ] All expensive endpoints have rate limits
- [ ] No API routes return raw `error.message`
- [ ] Security headers present (check with securityheaders.com)
- [ ] CORS restricted to specific Vercel patterns
- [ ] File uploads sanitize filenames
- [ ] Admin endpoints enforce authorization always
- [ ] `npm audit` returns no critical/high vulnerabilities
