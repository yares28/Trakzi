# Launch Audit — Must Fix

> Audit date: 2026-05-12
> Status: 🔴 Not started

---

## P0 — Launch Blockers

These must be resolved before going live. Each one is either a legal violation, a security hole, or a broken feature.

---

### 1. Cookie Consent Banner (GDPR)
**Status:** 🔴 Not started
**File:** `instrumentation-client.ts`, `lib/posthog-server.ts`

PostHog fires immediately on page load with no user consent. The controller is based in Spain — ePrivacy Directive and GDPR require explicit opt-in before analytics tracking. Zero cookie consent UI exists anywhere in the codebase.

**Fix:** Add a cookie consent banner that defers `posthog.init()` until the user accepts. Gate PostHog initialization behind a consent flag stored in localStorage.

---

### 2. Dashboard Goal Saving is a TODO
**Status:** 🔴 Not started
**File:** `app/dashboard/_page/DashboardPage.tsx:394`

The goal-setting modal renders and accepts input but `onSaveGoal` is literally `console.log + // TODO: Persist goal to database`. The feature appears functional but does nothing.

**Fix:** Either implement goal persistence to the database or hide the modal trigger entirely until it's built.

---

### 3. Unauthenticated Test Chart Routes
**Status:** 🔴 Not started
**Files:** `app/api/test-charts/idea-lab/route.ts:207`, `app/api/test-charts/feature-lab/route.ts`

These routes have no auth check and read markdown files off the filesystem (`process.cwd()/docs/chart generation/...`), exposing internal product roadmap and idea data. Middleware blocks them for now, but there's no defensive auth in the route itself.

**Fix:** Add `isAdminUser` check, or delete the routes entirely before launch.

---

### 4. Migration & Debug Routes Open to Any User
**Status:** 🔴 Not started
**Files:** `app/api/migrations/multi-account-schema/route.ts:18-21`, `app/api/migrations/fix-default-categories/route.ts:9`, `app/api/debug/sync-user/route.ts`

Schema-mutating migration endpoints are accessible to any authenticated user — not just admins. Any logged-in user can trigger these.

**Fix:** Gate all `/api/migrations/*` and `/api/debug/*` routes behind `isAdminUser()` from `lib/admin.ts`, or remove them from production entirely.

---

### 5. Admin Fails Open + Hardcoded Admin ID
**Status:** 🔴 Not started
**File:** `lib/admin.ts:7-11`

Two problems:
- In `development` env, `allowed === null` means **anyone authenticated is an admin**. If `VERCEL_ENV` is missing in any prod deployment, this grants everyone admin access.
- The production admin Clerk user ID is hardcoded directly in source code.

**Fix:**
1. Fail closed — if `VERCEL_ENV` is unset, default to non-admin.
2. Move admin user IDs to `ADMIN_USER_IDS` env var (comma-separated).

---

### 6. No `.env.example`
**Status:** 🔴 Not started
**File:** — (missing)

There are 20+ required environment variables across Clerk, Stripe, Neon, Upstash, PostHog, Gemini, and OpenRouter. None are documented. New devs and CI/CD pipelines have no reference.

**Required vars to document:**
- `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- All `STRIPE_PRICE_ID_*` and `NEXT_PUBLIC_STRIPE_PRICE_ID_*` pairs (7 each)
- `NEXT_PUBLIC_APP_URL`, `SITE_URL`, `SITE_NAME`
- `OPENROUTER_API_KEY`, `GEMINI_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `CRON_SECRET`, `VERCEL_ENV`

**Fix:** Create `.env.example` with all keys and placeholder values.

---

### 7. Viewport Blocks User Zoom (WCAG Violation)
**Status:** 🔴 Not started
**File:** `app/layout.tsx:39-47`

`userScalable: false` and `maximumScale: 1` prevent pinch-to-zoom on mobile. This fails WCAG Success Criterion 1.4.4 (Resize Text) and is hostile to low-vision users.

**Fix:** Remove `userScalable: false` and `maximumScale: 1` from the viewport metadata.

---

### 8. Duplicate Clerk Post-Login Redirect URL
**Status:** 🔴 Not started
**File:** `.env:16, 20`

`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` is defined twice — first as `/home`, then overridden to `/dashboard`. The second value silently wins. The intended redirect target is ambiguous.

**Fix:** Remove the duplicate, keep only one definition, confirm the correct target route.

---

## P1 — Strongly Recommended Before Launch

---

### 9. No Transactional Email
**Status:** 🔴 Not started

No email service is integrated (`resend`, `sendgrid`, `postmark`, `nodemailer` — all absent from `package.json`). Users receive no emails for:
- Payment failure / card decline
- Subscription cancellation confirmation
- Dispute opened
- Renewal reminder
- Refund confirmation

Stripe sends its own payment receipts if enabled in the dashboard — verify that's on. But product-level emails are entirely missing.

**Fix:** Integrate Resend or Postmark. Start with payment-failure and cancellation emails as minimum viable set.

---

### 10. No `/settings` Page
**Status:** 🔴 Not started
**File:** `app/settings/` (empty directory)

The settings UI lives in `components/settings-panel.tsx` as a dialog/sheet, but the `/settings` URL returns nothing. Users can't deep-link to settings from emails, support, or browser history.

**Fix:** Create `app/settings/page.tsx` that renders the settings panel, or redirect `/settings` to the page that opens it.

---

### 11. No `/billing` Page
**Status:** 🔴 Not started
**File:** `app/billing/` (only contains `/return/page.tsx`)

`/billing/return` handles post-checkout redirect, but there's no standalone billing management page. Subscription management is only reachable via `SubscriptionDialog` triggered from the dashboard — not discoverable from the URL bar or emails.

**Fix:** Create `app/billing/page.tsx` as a proper billing management page, or ensure `SubscriptionDialog` is obviously accessible and linked from settings.

---

### 12. Stripe Webhook: `periodStart` Calculated Wrong
**Status:** 🔴 Not started
**File:** `app/api/webhook/stripe/route.ts:411, 597`

`current_period_start` is derived as `current_period_end - 31 days`. This is wrong for annual plans (off by ~334 days) and months that aren't 31 days.

**Fix:** Use Stripe's actual `subscription.current_period_start` field directly from the event payload.

---

### 13. Stripe Webhook: Downgrade Detection Window Too Narrow
**Status:** 🔴 Not started
**File:** `app/api/webhook/stripe/route.ts:549`

Pending downgrades are detected by checking if the webhook arrives within 60 seconds of `period_end`. Stripe webhook delivery can easily exceed 60s under load, causing downgrades to be silently skipped.

**Fix:** Use Stripe's `cancel_at_period_end` and `pending_update` fields directly instead of a time-based proximity check.

---

### 14. Unknown Stripe Price ID Silently Succeeds
**Status:** 🔴 Not started
**File:** `app/api/webhook/stripe/route.ts:481-491`

When a webhook arrives with an unrecognized price ID, the handler returns early but still marks the event as `completed`. A misconfigured price will silently leave users on the wrong plan with no error or alert.

**Fix:** Mark the event as failed (throw or call `markEventAsFailed`) when an unknown price ID is encountered so Stripe retries and you get alerted.

---

### 15. Cache Logs Flooding Production
**Status:** 🔴 Not started
**File:** `lib/cache/upstash.ts:85-90, 116`

`console.log` fires on every cache HIT, MISS, and SET. At scale this generates enormous log noise and adds measurable latency.

**Fix:** Gate all cache logging behind `process.env.NODE_ENV !== 'production'` or a `DEBUG_CACHE=true` env flag.

---

### 16. No Rate Limit on Cache Invalidation Route
**Status:** 🔴 Not started
**File:** `app/api/cache/invalidate/route.ts`

Any authenticated user can call this endpoint repeatedly to bust their cache, potentially hammering the database. No rate limit is applied.

**Fix:** Add to the `mutation` rate-limit bucket in `lib/security/rate-limiter.ts`.

---

## P2 — Post-Launch Polish

- [ ] Add `loading.tsx` to `/pockets`, `/billing`, `/admin`, `/chat`
- [ ] Update "Effective January 1, 2026" on `app/(landing)/privacy/page.tsx:32` and `app/(landing)/terms/page.tsx:32` to actual launch date
- [ ] Add `customer.subscription.trial_will_end` webhook handler
- [ ] Parallelize Clerk user-deletion deletes with `Promise.all` — `app/api/webhook/clerk/route.ts:44-60`
- [ ] Define explicit `CACHE_TTL` entries for `home`, `trends`, `savings`, `data-library` prefixes — currently fall through to `analytics` default
- [ ] Add `tsconfig.tsbuildinfo` to `.gitignore`
- [ ] Consider enabling `reactStrictMode: true` in `next.config.ts` — currently disabled

---

## What's Solid — No Action Needed

- Stripe webhook idempotency, prepaid-card detection + auto-refund, dispute flow, 3DS liability shift
- Cache stampede protection (in-process `inflight` map + Redis NX lock + stale fallback)
- CSP, HSTS, X-Frame-Options DENY, Permissions-Policy in `next.config.ts`
- Rate limiting on all mutating routes via Upstash
- Auth coverage — 124/124 non-public API routes protected
- Plan-tier gating via `lib/feature-access.ts` and `lib/plan-limits.ts`
- Onboarding state machine in `components/onboarding/onboarding-provider.tsx`
