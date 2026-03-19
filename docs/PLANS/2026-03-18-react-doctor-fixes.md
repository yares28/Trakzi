# React Doctor Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 8 react-doctor errors and highest-impact warnings to bring the score from 77 → 90+/100.

**Architecture:** Fix errors first (correctness), then Next.js critical warnings (SSR impact), then bundle size wins, then performance/correctness warnings, and finally the large-scale chart inline render extraction.

**Tech Stack:** Next.js 15, React 19, TypeScript, SWR (already installed), Framer Motion, Recharts, Nivo charts.

---

## Priority Order

| Priority | Category | Issues |
|----------|----------|--------|
| P0 — Errors | Correctness | Nested component def, derived state effect, fetch in useEffect |
| P1 — Critical | Next.js SSR | useSearchParams without Suspense |
| P2 — Bundle | Bundle size | LazyMotion (17 files, ~30kb), recharts dynamic import |
| P3 — Performance | Re-renders | Default prop new refs, array index as key |
| P4 — Architecture | Reconciliation | 112 inline render functions across 28 chart files |

---

## Task 1: Fix Nested Component — AvatarContent inside TelegramHeader

**Files:**
- Modify: `components/ui/telegram-profile-header.tsx:54`

**Context:** `AvatarContent` is a component defined _inside_ `TelegramHeader`. React creates a new component class every render, which destroys and remounts the DOM on every parent re-render. This loses focus, scroll position, and animations.

**Step 1: Read the full file**
```bash
# Open components/ui/telegram-profile-header.tsx and read fully
```

**Step 2: Hoist AvatarContent above TelegramHeader**

Move the `AvatarContent` function from inside `TelegramHeader` to module scope (above the `TelegramHeader` function), passing the closed-over variables as props:

```typescript
// BEFORE (inside TelegramHeader):
const AvatarContent = ({ size, textSize }) => hasImage ? <img ... /> : <div ...>

// AFTER (module scope, above TelegramHeader):
interface AvatarContentProps {
  size?: string;
  textSize?: string;
  hasImage: boolean;
  avatar: string | null | undefined;
  name: string;
  bgColor: string;
  initials: string;
}

function AvatarContent({ size, textSize, hasImage, avatar, name, bgColor, initials }: AvatarContentProps) {
  return hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar!} alt={name} className="pointer-events-none h-full w-full object-cover" />
  ) : (
    <div className={cn("flex items-center justify-center h-full w-full select-none", size)} style={{ backgroundColor: bgColor }}>
      <span className={cn("text-white font-bold", textSize || "text-2xl")}>{initials}</span>
    </div>
  )
}
```

**Step 3: Update all callsites inside TelegramHeader**

Pass the closed-over variables as explicit props at each `<AvatarContent ... />` callsite:
```tsx
<AvatarContent size="..." textSize="..." hasImage={hasImage} avatar={avatar} name={name} bgColor={bgColor} initials={initials} />
```

**Step 4: Verify build passes**
```bash
npm run build 2>&1 | tail -20
```

**Step 5: Commit**
```bash
git add components/ui/telegram-profile-header.tsx
git commit -m "fix: hoist AvatarContent to module scope to prevent remount on every render"
```

---

## Task 2: Fix Derived State in useEffect — features.tsx

**Files:**
- Modify: `components/features.tsx:29-35`

**Context:** Lines 29-35 set `baseColor`, `glowColor`, and `dark` inside a `useEffect` whenever `theme` changes. This pattern always causes a flash: React renders with the old values, then runs the effect and re-renders again. These are pure derived values — compute them inline during render instead.

**Step 1: Read lines 26-36 of features.tsx**

**Step 2: Remove the three useState declarations + the useEffect**

```typescript
// REMOVE these 3 useState lines:
const [baseColor, setBaseColor] = useState<[number, number, number]>([0.906, 0.541, 0.325])
const [glowColor, setGlowColor] = useState<[number, number, number]>([0.906, 0.541, 0.325])
const [dark, setDark] = useState<number>(theme === "dark" ? 1 : 0)

// REMOVE this useEffect:
useEffect(() => {
  setBaseColor([0.906, 0.541, 0.325])
  setGlowColor([0.906, 0.541, 0.325])
  setDark(theme === "dark" ? 1 : 0)
}, [theme])
```

**Step 3: Replace with inline derived constants**

```typescript
// Derived inline — no useState/useEffect needed:
const BASE_COLOR: [number, number, number] = [0.906, 0.541, 0.325] // #e78a53
const baseColor: [number, number, number] = BASE_COLOR
const glowColor: [number, number, number] = BASE_COLOR
const dark = theme === "dark" ? 1 : 0
```

Note: `baseColor` and `glowColor` are always the same constant value, so they can be a module-level constant. `dark` depends on `theme` so it stays inline.

**Step 4: Verify TypeScript compiles**
```bash
npx tsc --noEmit 2>&1 | grep "features.tsx"
```

**Step 5: Verify build passes**
```bash
npm run build 2>&1 | tail -10
```

**Step 6: Commit**
```bash
git add components/features.tsx
git commit -m "fix: replace derived useEffect state with inline computation in Features component"
```

---

## Task 3: Wrap useSearchParams with Suspense

**Files:**
- Modify: `components/chat/chat-interface.tsx:172`
- Modify: `app/friends/page.tsx:24`

**Context:** `useSearchParams()` in Next.js App Router requires a `<Suspense>` boundary. Without one, Next.js cannot statically render any part of the page — the entire page falls back to client-side rendering, killing SSR performance.

**Step 1: Fix chat-interface.tsx**

Read the file around line 172 to see where `useSearchParams` is called. The fix is to ensure the component using `useSearchParams` is wrapped at its usage site. Since `chat-interface.tsx` is likely a client component, check where it's imported and wrap the import in `<Suspense>`.

If the `useSearchParams` call is at the top of `ChatInterface`, create an inner component:
```typescript
// In the parent that renders <ChatInterface />:
import { Suspense } from "react"
<Suspense fallback={<div className="animate-pulse h-full bg-muted rounded-lg" />}>
  <ChatInterface ... />
</Suspense>
```

Or extract the search-params reading to a small inner component:
```typescript
function ChatInterfaceWithParams(props: ChatInterfaceProps) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") // example
  return <ChatInterfaceInner {...props} initialTab={initialTab} />
}

// Then export:
export function ChatInterface(props: ChatInterfaceProps) {
  return (
    <Suspense fallback={<ChatInterfaceSkeleton />}>
      <ChatInterfaceWithParams {...props} />
    </Suspense>
  )
}
```

**Step 2: Fix app/friends/page.tsx**

Read the file. If `useSearchParams` is at the top of `FriendsPage`, extract the search-param reading to a sub-component:
```typescript
// app/friends/page.tsx
import { Suspense } from "react"

function FriendsPageContent() {
  const searchParams = useSearchParams()
  // ... rest of search params usage
  return <FriendsUI ... />
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<FriendsSkeleton />}>
      <FriendsPageContent />
    </Suspense>
  )
}
```

**Step 3: Verify build**
```bash
npm run build 2>&1 | tail -20
```

**Step 4: Commit**
```bash
git add components/chat/chat-interface.tsx app/friends/page.tsx
git commit -m "fix: wrap useSearchParams in Suspense boundary to prevent SSR bailout"
```

---

## Task 4: Fix fetch() in useEffect — Migrate to SWR

**Files:**
- `components/user-preferences-provider.tsx:358`
- `components/chat/chat-interface.tsx:211`
- `components/dashboard/subscription-card.tsx:283`
- `components/chart-swarm-plot.tsx:186`
- `components/dashboard/transaction-progress-bar.tsx:90`
- `components/friends/profile-modal.tsx:243`

**Context:** SWR is already installed in this project (verified in package.json). `fetch` in `useEffect` has no caching, no deduplication, no error retries, no loading states, and races with unmounts. SWR handles all of this.

**Step 1: Read each file around the flagged line to understand the fetch**

For each file, note:
- The URL being fetched
- The state variables being set (`setStatus`, `setData`, etc.)
- Any loading/error state

**Step 2: Replace the useEffect fetch pattern with useSWR**

General pattern to apply:
```typescript
// BEFORE:
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/some-endpoint")
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [dependency])

// AFTER:
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())
const { data, isLoading, error } = useSWR("/api/some-endpoint", fetcher)
```

For conditional fetching (dependent on some value):
```typescript
// Only fetch when userId is truthy:
const { data } = useSWR(userId ? `/api/user/${userId}` : null, fetcher)
```

**Step 3: Handle each file**

- `subscription-card.tsx:283` — fetches `/api/subscription/me`; replace with `useSWR("/api/subscription/me", fetcher)`
- `transaction-progress-bar.tsx:90` — read to find URL, replace with useSWR
- `user-preferences-provider.tsx:358` — read to find URL, replace with useSWR
- `chart-swarm-plot.tsx:186` — read to find URL, replace with useSWR
- `chat-interface.tsx:211` — read to find URL, replace with useSWR
- `profile-modal.tsx:243` — read to find URL (likely user-specific, use conditional key)

**Step 4: Remove now-unused useState declarations for the migrated data/loading/error state**

**Step 5: Verify build**
```bash
npm run build 2>&1 | tail -20
```

**Step 6: Commit**
```bash
git add components/user-preferences-provider.tsx components/chat/chat-interface.tsx \
  components/dashboard/subscription-card.tsx components/chart-swarm-plot.tsx \
  components/dashboard/transaction-progress-bar.tsx components/friends/profile-modal.tsx
git commit -m "fix: replace fetch-in-useEffect with useSWR for proper caching and cleanup"
```

---

## Task 5: LazyMotion Migration (17 files, ~30kb bundle savings)

**Files (all):**
- `components/dashboard/goal-setting-modal.tsx:4`
- `components/chat/chat-interface.tsx:11`
- `app/savings/page.tsx:33`
- `app/dashboard/_page/DashboardPage.tsx:5`
- `components/chat/chat-history-sheet.tsx:5`
- `components/ui/animated-tooltip.tsx:3`
- `components/charts-showcase.tsx:5`
- `components/faq-section.tsx:5`
- `components/features.tsx:9`
- `landing/hero.tsx:3`
- `components/pricing-section.tsx:3`
- `components/ui/telegram-profile-header.tsx:4`
- `components/chat/goal-wizard-card.tsx:4`
- `components/chat/chat-message.tsx:7`
- `components/sticky-footer.tsx:2`
- `components/friends/profile-modal.tsx:4`
- `components/chat/demo-chat-interface.tsx:7`

**Context:** `import { motion } from "framer-motion"` bundles the entire animation engine. `LazyMotion` + `m` with `domAnimation` feature set loads only the DOM subset (~7kb vs ~37kb). This is the biggest single bundle-size win.

**Step 1: Understand the two migration approaches**

**Option A — Wrap the whole app (recommended):**
Add `LazyMotion` once to the root layout, then each file just changes `motion` → `m`:
```tsx
// app/layout.tsx — add at root:
import { LazyMotion, domAnimation } from "framer-motion"

// Wrap children:
<LazyMotion features={domAnimation}>
  {children}
</LazyMotion>
```

Then in every component file, change:
```typescript
// BEFORE:
import { motion, AnimatePresence } from "framer-motion"
// ...
<motion.div animate={{ opacity: 1 }}>

// AFTER:
import { m, AnimatePresence } from "framer-motion"
// ...
<m.div animate={{ opacity: 1 }}>
```

`AnimatePresence`, `MotionConfig`, `useInView`, `useAnimation`, etc. are imported the same — only `motion` → `m`.

**Option B — Wrap per component (more isolated):**
```tsx
import { LazyMotion, domAnimation, m } from "framer-motion"

export function MyComponent() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div animate={{ opacity: 1 }}>...</m.div>
    </LazyMotion>
  )
}
```

**Recommendation:** Use Option A — add `LazyMotion` to `app/layout.tsx`, then do a bulk `motion.` → `m.` rename across all 17 files.

**Step 2: Add LazyMotion to app/layout.tsx**

Read `app/layout.tsx` first. Add:
```tsx
import { LazyMotion, domAnimation } from "framer-motion"

// Wrap the body/children with:
<LazyMotion features={domAnimation}>
  {/* existing children */}
</LazyMotion>
```

**Step 3: Update each of the 17 files**

For each file:
1. Change import: `{ motion, ... }` → `{ m, ... }` (keep other imports like `AnimatePresence`, `useInView`)
2. Rename all JSX: `<motion.div` → `<m.div`, `<motion.span` → `<m.span`, etc.
3. Closing tags too: `</motion.div>` → `</m.div>`

This is mostly mechanical. Read each file, apply the change, verify no TypeScript errors.

**Step 4: Verify build (catches missed motion.* references)**
```bash
npm run build 2>&1 | tail -20
```

**Step 5: Commit**
```bash
git add app/layout.tsx components/dashboard/goal-setting-modal.tsx \
  components/chat/chat-interface.tsx app/savings/page.tsx \
  app/dashboard/_page/DashboardPage.tsx components/chat/chat-history-sheet.tsx \
  components/ui/animated-tooltip.tsx components/charts-showcase.tsx \
  components/faq-section.tsx components/features.tsx landing/hero.tsx \
  components/pricing-section.tsx components/ui/telegram-profile-header.tsx \
  components/chat/goal-wizard-card.tsx components/chat/chat-message.tsx \
  components/sticky-footer.tsx components/friends/profile-modal.tsx \
  components/chat/demo-chat-interface.tsx
git commit -m "perf: migrate framer-motion to LazyMotion to reduce bundle size ~30kb"
```

---

## Task 6: Dynamic Import Recharts (4 files)

**Files:**
- `app/dashboard/_page/DashboardPage.tsx:6`
- `components/chat/chat-bubble-chart.tsx:4`
- `components/chart-spending-pyramid.tsx:4`
- `components/chart-area-interactive.tsx:4`

**Context:** Recharts is a large library. Components that use it should be dynamically imported so they're not in the initial JS bundle. This is especially important for charts that are below the fold.

**Step 1: Read each file to understand the recharts import**

Look for: `import { LineChart, BarChart, ... } from "recharts"`

**Step 2: Apply dynamic import pattern**

For Next.js, use `next/dynamic`:
```typescript
// BEFORE (in the component file itself, this stays):
import { LineChart, BarChart, ... } from "recharts"

// The change happens at the CONSUMER of the chart component.
// If the whole component file primarily uses recharts, convert the export:
```

Actually for recharts, since individual chart _components_ already are the units, the approach is to lazy-load the entire chart component at the usage site:
```typescript
// In the parent that renders <ChartSpendingPyramid />:
import dynamic from "next/dynamic"
const ChartSpendingPyramid = dynamic(
  () => import("@/components/chart-spending-pyramid").then(m => ({ default: m.ChartSpendingPyramid })),
  { ssr: false }
)
```

Or if the recharts import is isolated to a few components, wrap those components themselves:
```typescript
// chart-spending-pyramid.tsx — add at top:
"use client"
// Recharts is client-only and heavy, already code-split by this file being lazy-loaded
```

**Step 3: Check if these charts are already in LazyChart wrappers**

Refer to `CLAUDE.md` — the `LazyChart` component uses `IntersectionObserver`. If the chart is already in a `LazyChart` wrapper, the visual loading is deferred but the JS is still eagerly loaded. `next/dynamic` additionally defers the JS download.

**Step 4: Apply dynamic import for the 4 files at their usage sites (ChartsGrid files)**

**Step 5: Verify build**
```bash
npm run build 2>&1 | tail -20
```

**Step 6: Commit**
```bash
git commit -m "perf: dynamic import recharts-based chart components to reduce initial bundle"
```

---

## Task 7: Fix Default Prop New Object References

**Files:**
- `components/section-cards.tsx:103,250,312,372,436-466`
- `components/fridge/section-cards-fridge.tsx:51,127,192-200`
- `components/kibo-ui/contribution-graph/index.tsx:248`
- `app/rooms/[roomId]/_page/components/RoomMembers.tsx:44`

**Context:** Default values like `prop = {}` or `prop = []` create a new object/array reference on every render. When this prop is used as a `useEffect` dependency or passed to a `memo`-wrapped child, it triggers unnecessary re-renders on every parent render.

**Step 1: Read section-cards.tsx around the flagged lines**

Look for patterns like:
```typescript
// BEFORE:
function SectionCard({ items = [], trends = {} }: Props) {

// AFTER: Declare at module scope above the component
const EMPTY_ITEMS: ItemType[] = []
const EMPTY_TRENDS: TrendsType = {}

function SectionCard({ items = EMPTY_ITEMS, trends = EMPTY_TRENDS }: Props) {
```

**Step 2: Apply the same fix to all 4 files**

For each flagged line, extract the inline `{}` or `[]` default to a module-level constant with a descriptive name.

**Step 3: Verify TypeScript types still match**
```bash
npx tsc --noEmit 2>&1 | grep -E "section-cards|RoomMembers|contribution"
```

**Step 4: Commit**
```bash
git add components/section-cards.tsx components/fridge/section-cards-fridge.tsx \
  components/kibo-ui/contribution-graph/index.tsx \
  app/rooms/[roomId]/_page/components/RoomMembers.tsx
git commit -m "perf: extract default prop array/object literals to module-level constants to prevent re-renders"
```

---

## Task 8: Fix Array Index as Key (High-Impact Cases)

**Files (prioritize these — most likely to reorder/filter):**
- `components/chat/chat-message.tsx:21,62,66` — chat messages definitely reorder
- `app/home/_page/components/FavoritesGrid.tsx:293` — favorites can be reordered
- `components/subscription-dialog/SubscriptionDialog.tsx:502,810` — list items
- `components/rooms/add-to-room-dialog.tsx:148,153,245`

**Context:** Index keys cause React to reuse DOM nodes incorrectly when items are added, removed, or reordered. This can cause visible bugs like wrong input values, mismatched animations, or stale state.

**Step 1: Read each flagged file to understand what's being mapped**

For each file, find the `.map((item, idx) => ... key={idx})` pattern and determine what stable identifier is available.

**Step 2: Replace with stable keys**

Options (pick most appropriate):
```typescript
// If item has an id:
key={item.id}

// If item has a unique string field:
key={item.name} or key={item.slug}

// If items are static strings/labels (like plan features list):
key={item} // the string itself is stable

// For chat messages:
key={message.id} or key={`${message.role}-${message.timestamp}`}
```

**Step 3: Do NOT change static lookup tables or animation keyframe arrays** — index keys are fine when the list never reorders (e.g., `CHECKLIST_ITEMS.map((item, i) => ...)`).

**Step 4: Commit**
```bash
git commit -m "fix: replace array index keys with stable identifiers to prevent React reconciliation bugs"
```

---

## Task 9: Extract Inline Render Functions from Chart Components

**Files:** 28 chart component files with 112 inline `renderXxx()` function calls.

**Key files:**
- `components/chart-category-flow.tsx:119,331,334,351`
- `components/chart-radar.tsx:486,667`
- `components/chart-transaction-calendar.tsx:648,665,685,707,715,722,726,731`
- `components/chart-swarm-plot.tsx:513,543,568,590,593,610,679`
- `components/fridge/chart-daily-activity-fridge.tsx:562,579,594,616,624,631,635,640`
- (and 23 more files — see full list in `react-doctor--no-render-in-render.txt`)

**Context:** `renderXxx()` functions defined inside a component body and called in JSX (`{renderChart()}`) are not true React components — React sees them as inline JSX, not component boundaries. This prevents proper reconciliation (React can't reuse the fiber, it destroys and recreates the subtree). The fix is to extract them as real components.

**Step 1: Categorize the render functions**

Before touching any file, read 3-4 representative files to understand the types:
- **Nivo tooltip renderers** — `(node) => <CustomTooltip .../>` passed as `tooltip={}` prop. These are already correct (render props, not inline calls). Ignore these if react-doctor is flagging them.
- **Chart variants** — `renderFullChart()`, `renderCompactChart()` returning different `<ResponsiveXxx>` trees depending on isFullscreen state.
- **Conditional UI sections** — `renderInfoTrigger()`, `renderEmptyState()` — small JSX helpers.

**Step 2: Fix pattern for chart variant functions**

```typescript
// BEFORE (inside ChartCategoryFlow):
const renderFullChart = () => (
  <ResponsiveAreaBump data={data} ... />
)
const renderCompactChart = () => (
  <ResponsiveAreaBump data={data} ... />
)
return isFullscreen ? renderFullChart() : renderCompactChart()

// AFTER — extract to module-scope components:
interface ChartAreaBumpProps {
  data: typeof chartData
  colorConfig: string[]
  textColor: string
  // ... other shared props
}

const FullChart = memo(function FullChart({ data, colorConfig, textColor }: ChartAreaBumpProps) {
  return <ResponsiveAreaBump data={data} margin={{ top: 20, right: 15, bottom: 20, left: 85 }} ... />
})

const CompactChart = memo(function CompactChart({ data, colorConfig, textColor }: ChartAreaBumpProps) {
  return <ResponsiveAreaBump data={data} margin={{ top: 20, right: 15, bottom: 20, left: 60 }} ... />
})

// Inside ChartCategoryFlow:
return isFullscreen
  ? <FullChart data={data} colorConfig={colorConfig} textColor={textColor} />
  : <CompactChart data={data} colorConfig={colorConfig} textColor={textColor} />
```

**Step 3: Process files in batches of 3-4**

Process one file at a time:
1. Read the file
2. Identify all render functions
3. Extract each to a named component above the parent
4. Add `memo()` + `displayName` per CLAUDE.md requirements
5. Update the callsite from `{renderXxx()}` to `<XxxComponent .../>`
6. Verify TypeScript compiles for that file
7. Move to next file

**Step 4: Verify build after each batch of 5 files**
```bash
npm run build 2>&1 | tail -20
```

**Step 5: Commit per batch**
```bash
git commit -m "refactor: extract inline render functions to named components in chart files (batch N/6)"
```

---

## Task 10: Fix useEffect Simulating Event Handlers

**Files:**
- `components/chat/chat-history-sheet.tsx:50`
- `components/charts-showcase.tsx:29,136,231,316,420,507`
- `app/rooms/[roomId]/_page/components/RoomTransactionEditSheet.tsx:136`

**Context:** When a `useEffect` only runs because of a user action (click, submit) and has no true side-effect timing requirement, it should just be inline logic in the event handler.

**Step 1: Read each flagged file around the line number**

Look for patterns like:
```typescript
// BEFORE — effect triggered by interaction state:
const [shouldSubmit, setShouldSubmit] = useState(false)

useEffect(() => {
  if (shouldSubmit) {
    doSomething()
    setShouldSubmit(false)
  }
}, [shouldSubmit])

const handleClick = () => setShouldSubmit(true)

// AFTER — logic directly in handler:
const handleClick = () => {
  doSomething()
}
```

**Step 2: Apply the fix to each file**

**Step 3: Verify build**
```bash
npm run build 2>&1 | tail -20
```

**Step 4: Final commit**
```bash
git commit -m "fix: move useEffect event-handler logic to direct event handler callbacks"
```

---

## Final Verification

**Step 1: Run react-doctor again to confirm score improvement**
```bash
npx -y react-doctor@latest
```

Expected: 8 errors → 0, score 77 → 88+

**Step 2: Run full build**
```bash
npm run build
```

**Step 3: Run tests**
```bash
npm test
```
