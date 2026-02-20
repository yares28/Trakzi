# Demo Mode — Implementation Plan

## Overview

Allow unauthenticated visitors to browse the **existing app pages** (`/home`, `/analytics`, `/fridge`, etc.) with realistic mock data — no separate `/demo` route tree. Visitors either skip login entirely ("Continue as Guest") or click "Live Demo" from the landing hero. The app detects guest/demo sessions and swaps real API calls for pre-built mock data.

**Purpose:** marketing/conversion — let users explore the full Pro-tier product before signing up.

**Constraints:**
- No Clerk auth required — fully public guest session
- No DB access — all data is hardcoded mock data
- No AI responses — chat is pre-scripted, AI insights are pre-written strings
- No uploads — upload/create buttons show a demo-mode toast
- Plan shown: Pro (all charts visible, insights enabled)
- **Same pages, same routes** — no duplicate page components

---

## Security Model

> [!CAUTION]
> The demo mode must **never** expose real user data. Every layer below enforces this independently.

### Two-Layer Defense (already exists in `proxy.ts`)

The app uses **Clerk middleware** (`proxy.ts`) as the primary security gatekeeper. It has two independent checks:

1. **API routes** (`/api/*`): Calls `auth()` → rejects with `401` if no valid Clerk session. This applies to **every** `/api/*` route except explicitly whitelisted public routes.
2. **Page routes** (`/home`, `/analytics`, etc.): Redirects unauthenticated users to `/sign-in`.

**The demo cookie (`trakzi-demo-mode`) is a client-side-only UI flag.** It tells the React app which data hooks to use. It has **zero effect** on server-side auth — the middleware doesn't read it, the real API routes don't read it.

### Middleware Changes (`proxy.ts`)

Add `/api/demo/*` to the public API route whitelist so demo endpoints bypass Clerk auth:

```typescript
const isPublicApiRoute = createRouteMatcher([
  '/api/webhook/(.*)',
  '/api/webhooks/(.*)',
  '/api/health(.*)',
  '/api/demo/(.*)',       // ← NEW: demo routes return hardcoded mock data only
])
```

For **page routes**, check the demo cookie in the middleware to skip the sign-in redirect:

```typescript
// If user is not signed in and trying to access protected routes
if (!userId && isProtectedRoute(req)) {
    // Allow demo mode — cookie is a UI hint, not a security grant
    const isDemoMode = req.cookies.get('trakzi-demo-mode')?.value === 'true'
    if (isDemoMode) {
        return NextResponse.next()  // Let the page load; hooks will fetch from /api/demo/*
    }
    // Normal flow: redirect to sign-in
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', path)
    return NextResponse.redirect(signInUrl)
}
```

> [!IMPORTANT]
> The demo cookie **only** skips the page redirect. It does NOT whitelist real API routes. A demo user visiting `/home` will render the page, but any fetch to `/api/home-bundle` (if a hook accidentally used the wrong endpoint) would still return `401`.

### Demo API Route Rules

Every file in `app/api/demo/` **must** follow these rules:

| Rule | Rationale |
|------|-----------|
| ❌ No `import { db }` / `import { drizzle }` / `import { supabase }` | No database access |
| ❌ No `import { getCurrentUserId }` / `import { auth }` | No auth calls — no user context |
| ❌ No `POST` / `PUT` / `DELETE` / `PATCH` exports | Read-only, no mutations |
| ❌ No `req.cookies` / `req.headers.get('authorization')` | No session/token inspection |
| ✅ Only `export const GET` | Simple GET handler |
| ✅ Only `import { MOCK_* } from '@/lib/demo/mock-data'` | All data from hardcoded mock file |
| ✅ Returns `NextResponse.json(MOCK_*)` | Static JSON, nothing else |

### Data Hook Safety

Each modified data hook checks `useDemoMode()` **before** constructing the fetch URL:

```typescript
const endpoint = isDemoMode ? '/api/demo/home-bundle' : '/api/home-bundle'
```

Even if a bug caused the demo hook to call `/api/home-bundle`, the middleware would reject it with `401` — **defense in depth**.

### Attack Scenarios Covered

| Attack | Blocked By |
|--------|-----------|
| Demo user calls `/api/transactions` directly | Middleware `auth()` → `401` |
| Demo user calls `/api/home-bundle` | Middleware `auth()` → `401` |
| Attacker sets `trakzi-demo-mode=true` cookie and calls `/api/transactions` | Middleware `auth()` → `401` (cookie is ignored for API routes) |
| Attacker removes demo cookie while on `/home` (no Clerk session) | Hooks re-fetch from `/api/home-bundle` → `401`; next navigation → middleware redirects to `/sign-in` |
| Real logged-in user sets demo cookie | Hooks switch to `/api/demo/*` → they see mock data, NOT another user's data. Their real data is never exposed. |
| Demo API route accidentally imports `db` | Caught by code review + CI grep check (see Verification Checklist) |

---

## Architecture

```
lib/demo/
    mock-data.ts                   ← ALL mock data centralized here
    demo-context.tsx               ← DemoModeProvider + useDemoMode()
    use-demo-bundle.ts             ← React Query hooks for /api/demo/* endpoints

app/api/demo/
    home-bundle/route.ts           ← returns MOCK_HOME_BUNDLE (no auth)
    analytics-bundle/route.ts
    fridge-bundle/route.ts
    savings-bundle/route.ts
    trends-bundle/route.ts
    pockets-bundle/route.ts
    data-library-bundle/route.ts
    subscription/me/route.ts       ← returns Pro plan mock

components/
    demo-banner.tsx                ← sticky "You're in demo mode — Sign up free" banner
```

**Key idea:** The existing pages (`app/(protected)/home/page.tsx`, etc.) use data hooks like `useHomeBundle()`. In demo mode, these hooks detect the demo context and fetch from `/api/demo/*` instead of `/api/*`. The real page components, charts, sidebar, and layout are **reused as-is**.

**Modified files:**
- `proxy.ts` — Whitelist `/api/demo/*` as public; allow demo cookie to bypass page redirect
- `landing/hero.tsx` — Add "Live Demo" button (same style as "Get Started", different icon)
- `app/(protected)/layout.tsx` — Wrap with `DemoModeProvider`; skip Clerk auth redirect when demo mode
- Existing data hooks (`use-home-bundle.ts`, etc.) — Add demo-aware fetch logic
- `components/app-sidebar.tsx` — Disable upload/create buttons in demo mode (show toast)

**Zero duplicate pages — the real pages serve both authenticated and demo users.**

---

## Implementation Phases

### Phase 1 — Mock Data (`lib/demo/mock-data.ts`)

Single file, all mock data. Import real TypeScript types to ensure shape correctness:
- `HomeSummary` from `lib/charts/home-trends-savings-aggregations.ts`
- `AnalyticsSummary` from `lib/charts/aggregations.ts`
- `FridgeSummary` from `lib/charts/fridge-aggregations.ts`
- `SavingsSummary` from `lib/charts/home-trends-savings-aggregations.ts`
- `TrendsSummary` — same file
- `PocketsBundleResponse` from `lib/charts/pockets-aggregations.ts`

**Persona:** Alex Chen, Pro plan, 847 transactions, EUR currency

**Transaction data (bank, ~850 total):**
- 18 months: Aug 2024 – Feb 2026
- Recurring: Salary €3,200/mo, Rent €950/mo, Subscriptions ~€65/mo
- Variable: Groceries, Restaurants, Transport, Shopping, Health
- Categories: Food & Drink, Transport, Shopping, Entertainment, Utilities, Health, Salary (income)

**Fridge data:**
- 3 stores: Mercadona, Carrefour, Lidl
- 40 receipt trips over 6 months
- Item categories: Produce, Dairy, Meat, Bakery, Beverages

**Pockets data:**
- Countries visited: France (€340), Spain (home)
- 1 vehicle: Honda Civic 2020 (€18,500)
- 1 property: rented apartment (€950/mo)

**Pre-scripted chat conversation (4 turns):**
```
User:  "What is my biggest spending category this month?"
AI:    "Your biggest spending category is Food & Drink at €487, representing 24%..."

User:  "Am I saving enough?"
AI:    "Your current savings rate is 18.3%. Financial experts recommend 20%..."

User:  "Where can I cut costs?"
AI:    "Based on your patterns, Entertainment (€210/mo) is 40% above your 6-month average..."

User:  "Show me my monthly trend"
AI:    "Over the last 6 months your expenses averaged €2,340/mo with a peak in December..."
```

---

### Phase 2 — Demo API Routes (`app/api/demo/*/route.ts`)

Each route: simple GET, no auth, no DB, no caching. Import from `lib/demo/mock-data.ts` and return.

```typescript
// Pattern (same for all 8 routes):
import { NextResponse } from 'next/server'
import { MOCK_HOME_BUNDLE } from '@/lib/demo/mock-data'

export const GET = async () => NextResponse.json(MOCK_HOME_BUNDLE)
```

`/api/demo/subscription/me` returns a hardcoded Pro plan object matching the shape of `/api/subscription/me`:
```typescript
{
  plan: 'pro', status: 'active', is_lifetime: false,
  cap: 1500, used_total: 847, remaining: 653,
  usage: { bank_transactions: 802, receipt_trips: 45, total: 847 },
  limits: {
    max_total_transactions: 1500,
    ai_chat_enabled: true, ai_chat_messages: 50, ai_chat_period: 'week',
    ai_insights_enabled: true, ai_insights_free_preview_count: 0,
    advanced_charts_enabled: true,
  }
}
```

---

### Phase 3 — Demo Context (`lib/demo/demo-context.tsx`)

A context + cookie-based flag that signals the entire app is in demo mode.

```typescript
const DEMO_COOKIE = 'trakzi-demo-mode'

const DemoModeContext = createContext({ isDemoMode: false, enterDemo: () => {}, exitDemo: () => {} })

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
    const [isDemoMode, setIsDemoMode] = useState(() => {
        if (typeof window === 'undefined') return false
        return document.cookie.includes(`${DEMO_COOKIE}=true`)
    })

    const enterDemo = () => {
        document.cookie = `${DEMO_COOKIE}=true; path=/; max-age=86400`
        setIsDemoMode(true)
    }

    const exitDemo = () => {
        document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`
        setIsDemoMode(false)
    }

    return (
        <DemoModeContext.Provider value={{ isDemoMode, enterDemo, exitDemo }}>
            {children}
        </DemoModeContext.Provider>
    )
}

export const useDemoMode = () => useContext(DemoModeContext)
```

When `isDemoMode` is `true`:
- Clerk auth is bypassed (layout doesn't redirect to sign-in)
- Data hooks fetch from `/api/demo/*` instead of `/api/*`
- Sidebar disables upload/create (shows toast)
- Demo banner appears at the top

---

### Phase 4 — Demo-Aware Data Hooks

Instead of creating separate hook files, **modify each existing data hook** to check `useDemoMode()` and swap the fetch URL:

```typescript
// Example: lib/hooks/use-home-bundle.ts
export function useHomeBundle() {
    const { isDemoMode } = useDemoMode()
    const endpoint = isDemoMode ? '/api/demo/home-bundle' : '/api/home-bundle'

    return useQuery({
        queryKey: ['home-bundle', isDemoMode ? 'demo' : 'live'],
        queryFn: () => fetch(endpoint).then(r => r.json()),
        staleTime: isDemoMode ? Infinity : 30_000,
    })
}
```

Apply the same pattern to all bundle hooks:
- `useHomeBundle()` → `/api/demo/home-bundle`
- `useAnalyticsBundle()` → `/api/demo/analytics-bundle`
- `useFridgeBundle()` → `/api/demo/fridge-bundle`
- `useSavingsBundle()` → `/api/demo/savings-bundle`
- `useTrendsBundle()` → `/api/demo/trends-bundle`
- `usePocketsBundle()` → `/api/demo/pockets-bundle`
- `useDataLibraryBundle()` → `/api/demo/data-library-bundle`
- `useSubscriptionMe()` → `/api/demo/subscription/me`

---

### Phase 5 — Demo Banner (`components/demo-banner.tsx`)

Sticky banner at top of all pages **when demo mode is active**:

```
[⚡ Demo Mode]  You're exploring Trakzi with sample data.
                Sign up free to use your real finances →     [×]
```

- Fixed position, `z-50`, dismissible (persisted to `sessionStorage`)
- Links "Sign up free" to `/sign-up`
- "×" close button calls `exitDemo()` and redirects to landing
- Dark-styled to contrast with the app UI

---

### Phase 6 — Auth Bypass in Layout (`app/(protected)/layout.tsx`)

The existing protected layout wraps pages with Clerk auth. Add a demo bypass:

```typescript
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const { isDemoMode } = useDemoMode()

    // Skip Clerk auth check in demo mode
    if (isDemoMode) {
        return (
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <DemoBanner />
                    {children}
                </SidebarInset>
            </SidebarProvider>
        )
    }

    // Normal auth flow
    return (
        <ClerkProvider>
            {/* ... existing auth-protected layout ... */}
        </ClerkProvider>
    )
}
```

---

### Phase 7 — Sidebar Demo Guards (`components/app-sidebar.tsx`)

In the existing sidebar, check `useDemoMode()`:

- **"Quick Create"** button → `if (isDemoMode) toast("Sign up to add transactions")` instead of opening dialog
- **"Upload"** button → `if (isDemoMode) toast("Uploads are disabled in demo mode")` instead of file picker
- **User section** → If demo mode, show "Demo User" avatar + "Sign Up Free →" button instead of Clerk user profile

---

### Phase 8 — Chat Page Demo Guard

In the existing chat page, check `useDemoMode()`:

- **If demo mode:** Render pre-scripted 4-turn conversation as message bubbles
- Use `useEffect` + `setTimeout` to simulate typing delay (AI response appears 800ms after "user" message)
- Input `<textarea>` is `disabled`, with placeholder: "Sign up free to chat with your AI financial assistant →"
- "Send" button links to `/sign-up` instead

---

### Phase 9 — Landing Hero Button (`landing/hero.tsx`)

Add a **"Live Demo"** button next to "Get Started". **Same pill/capsule style** (rounded-full border card), but with a **Play/Eye icon** instead of the spinning globe:

```tsx
{/* CTA buttons */}
<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
    {/* Get started button (existing) */}
    <Link href="/sign-up">
        <div className="group cursor-pointer border border-border bg-card gap-2 h-[60px] flex items-center p-[10px] rounded-full">
            <div className="border border-border bg-primary h-[40px] rounded-full flex items-center justify-center text-primary-foreground">
                <p className="font-medium tracking-tight mr-3 ml-3 flex items-center gap-2 justify-center text-base">
                    <svg ...globe icon spinning... />
                    Get started
                </p>
            </div>
            <div className="text-muted-foreground group-hover:ml-4 ease-in-out transition-all size-[24px] flex items-center justify-center rounded-full border-2 border-border">
                <svg ...arrow-right... />
            </div>
        </div>
    </Link>

    {/* Live Demo button (NEW — same style, different icon) */}
    <Link href="/home" onClick={enterDemo}>
        <div className="group cursor-pointer border border-border bg-card gap-2 h-[60px] flex items-center p-[10px] rounded-full">
            <div className="border border-border bg-primary h-[40px] rounded-full flex items-center justify-center text-primary-foreground">
                <p className="font-medium tracking-tight mr-3 ml-3 flex items-center gap-2 justify-center text-base">
                    <Play className="h-[18px] w-[18px]" />
                    Live Demo
                </p>
            </div>
            <div className="text-muted-foreground group-hover:ml-4 ease-in-out transition-all size-[24px] flex items-center justify-center rounded-full border-2 border-border">
                <svg ...arrow-right... />
            </div>
        </div>
    </Link>
</div>
```

**Key details:**
- Same `h-[60px] rounded-full border bg-card` pill shape
- Same inner `h-[40px] rounded-full bg-primary` label capsule
- Same hover arrow animation (`group-hover:ml-4`)
- **Different icon:** `Play` (from lucide-react) instead of the spinning globe
- **`onClick`** calls `enterDemo()` from demo context to set the cookie, then navigates to `/home`

---

## Files Summary

| Action | Path |
|--------|------|
| **Create** | `lib/demo/mock-data.ts` |
| **Create** | `lib/demo/demo-context.tsx` |
| **Create** | `components/demo-banner.tsx` |
| **Create** | `app/api/demo/home-bundle/route.ts` |
| **Create** | `app/api/demo/analytics-bundle/route.ts` |
| **Create** | `app/api/demo/fridge-bundle/route.ts` |
| **Create** | `app/api/demo/savings-bundle/route.ts` |
| **Create** | `app/api/demo/trends-bundle/route.ts` |
| **Create** | `app/api/demo/pockets-bundle/route.ts` |
| **Create** | `app/api/demo/data-library-bundle/route.ts` |
| **Create** | `app/api/demo/subscription/me/route.ts` |
| **Modify** | `proxy.ts` — Whitelist `/api/demo/*` as public; demo cookie page bypass |
| **Modify** | `landing/hero.tsx` — Add "Live Demo" button (same capsule style, Play icon) |
| **Modify** | `app/(protected)/layout.tsx` — Demo mode auth bypass |
| **Modify** | `lib/hooks/use-home-bundle.ts` — Demo-aware fetch |
| **Modify** | `lib/hooks/use-analytics-bundle.ts` — Demo-aware fetch |
| **Modify** | `lib/hooks/use-fridge-bundle.ts` — Demo-aware fetch |
| **Modify** | `lib/hooks/use-savings-bundle.ts` — Demo-aware fetch |
| **Modify** | `lib/hooks/use-trends-bundle.ts` — Demo-aware fetch |
| **Modify** | `lib/hooks/use-pockets-bundle.ts` — Demo-aware fetch |
| **Modify** | `lib/hooks/use-data-library-bundle.ts` — Demo-aware fetch |
| **Modify** | `lib/hooks/use-subscription-me.ts` — Demo-aware fetch |
| **Modify** | `components/app-sidebar.tsx` — Disable upload/create in demo mode |
| **Modify** | Chat page — Pre-scripted conversation in demo mode |

**Total: 11 new files, 13 modified files. Zero duplicate pages.**

---

## Verification Checklist

### Functional

- [ ] `npm run build` passes with no errors
- [ ] Landing hero: "Live Demo" button renders with same pill style as "Get Started" but with Play icon
- [ ] Clicking "Live Demo" → sets demo cookie → navigates to `/home` with mock data
- [ ] `/home` (demo mode) — all charts render with mock data, no auth redirect
- [ ] `/analytics` (demo mode) — Advanced tab visible (Pro plan)
- [ ] `/fridge` (demo mode) — receipt trips table shows mock receipts
- [ ] `/chat` (demo mode) — pre-scripted conversation shown; input disabled
- [ ] `/dashboard` (demo mode) — all 3 score cards unlocked (Pro)
- [ ] Sidebar "Upload" in demo → toast shown, no dialog
- [ ] Sidebar "Quick Create" in demo → toast shown, no dialog
- [ ] Demo banner "Sign Up Free" → navigates to `/sign-up`
- [ ] Demo banner "×" → exits demo mode, redirects to landing
- [ ] Real `/home` (authenticated, no demo cookie) — still works normally, no regressions

### Security

- [ ] **No real data leak**: Open DevTools Network tab in demo mode → confirm ALL XHR/fetch calls go to `/api/demo/*`, never to `/api/home-bundle`, `/api/transactions`, etc.
- [ ] **Real API blocked**: While in demo mode, manually `curl` / fetch `/api/home-bundle` without a Clerk token → confirm `401 Unauthorized`
- [ ] **Demo API has no DB**: Grep all files in `app/api/demo/` — confirm zero imports of `db`, `drizzle`, `supabase`, `getCurrentUserId`, `auth`
- [ ] **Demo API is GET-only**: Confirm no POST/PUT/DELETE/PATCH exports in any `app/api/demo/*` route
- [ ] **Cookie cannot escalate**: Set `trakzi-demo-mode=true` cookie manually, then call `/api/transactions` → confirm `401` (cookie grants zero API access)
- [ ] **Authenticated user isolation**: Log in as real user, set demo cookie, refresh → confirm you see mock data, NOT your real data (hooks must check demo context first)
- [ ] **Cookie removal restores auth**: Clear demo cookie while on `/home` without Clerk session → confirm redirect to `/sign-in`
