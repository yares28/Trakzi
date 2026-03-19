# Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full onboarding system — Welcome Modal, per-page step-card tour (modal cards with next/skip), and a floating checklist widget — for 6 pages: Home, Analytics, Fridge, Savings, Pockets, Data Library.

**Architecture:** Onboarding state (`OnboardingPreferences`) is stored as a new top-level key in the existing `UserPreferences` JSONB (no schema migration needed). A new `OnboardingProvider` wraps the app and exposes context consumed by a `WelcomeModal`, per-page `OnboardingTour` (step-card modal), and `OnboardingChecklist` (floating widget). Tours auto-start on first page visit; a "Take a tour" button allows replay.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui (Dialog, Button), Framer Motion (already installed), Lucide icons, existing `UserPreferencesProvider` + `/api/user-preferences` API.

---

## Design Decisions

### Checklist Items (6 total)
| ID | Label |
|----|-------|
| `upload_statement` | Import your first bank statement |
| `upload_receipt` | Upload a grocery receipt |
| `explore_analytics` | Explore the Analytics page |
| `explore_fridge` | Explore the Fridge page |
| `explore_savings` | Explore the Savings page |
| `explore_pockets` | Explore the Pockets page |

### Per-Page Tour Steps (3–4 steps each)
**Home:** Welcome → Charts overview → Date filter → Upload data
**Analytics:** Spending breakdown → Category filter → Date range
**Fridge:** Grocery tracking → Upload receipt → View trends
**Savings:** Savings goals → Track progress → Add goal
**Pockets:** Budget pockets → Category split → Create pocket
**Data Library:** All transactions → Search & filter → Export

### State Shape
```typescript
interface OnboardingPreferences {
  welcomeSeen: boolean           // WelcomeModal shown once
  completedTours: string[]       // e.g. ['home', 'analytics']
  completedItems: string[]       // checklist item IDs completed
  checklistDismissed: boolean    // widget collapsed permanently
}
```

---

## Task 1: Add OnboardingPreferences type

**Files:**
- Modify: `lib/types/user-preferences.ts`

**Step 1: Add the type**

```typescript
// Add BEFORE the UserPreferences interface

/** Onboarding state — tracks tour completion and checklist progress. */
export interface OnboardingPreferences {
  /** True once the Welcome modal has been shown. */
  welcomeSeen?: boolean
  /** Page IDs whose tours have been completed or skipped. */
  completedTours?: string[]
  /** Checklist item IDs the user has completed. */
  completedItems?: string[]
  /** True when user permanently collapses the checklist widget. */
  checklistDismissed?: boolean
}
```

**Step 2: Add to UserPreferences**

In `UserPreferences`, add:
```typescript
onboarding?: OnboardingPreferences
```

**Step 3: Commit**
```bash
git add lib/types/user-preferences.ts
git commit -m "feat: add OnboardingPreferences type to UserPreferences"
```

---

## Task 2: Extend UserPreferencesProvider with onboarding support

**Files:**
- Modify: `components/user-preferences-provider.tsx`

**Step 1: Add `updateOnboarding` to the context interface**

In `UserPreferencesContextValue`, add:
```typescript
updateOnboarding: (data: Partial<OnboardingPreferences>) => void
```

Import `OnboardingPreferences` at the top:
```typescript
import type {
  HomePreferences,
  OnboardingPreferences,
  PageLayoutPreferences,
  SettingsPreferences,
  UserPreferences,
} from "@/lib/types/user-preferences"
```

**Step 2: Implement `updateOnboarding`**

Add this alongside `updatePagePreferences`:
```typescript
const updateOnboarding = useCallback(
  (data: Partial<OnboardingPreferences>) => {
    setPreferences((prev) => {
      const next: UserPreferences = {
        ...prev,
        onboarding: { ...(prev.onboarding ?? {}), ...data },
      }
      latestRef.current = next
      saveAllToLocalStorage(next)
      if (readyToSaveRef.current && isServerSynced) {
        scheduleSave()
      }
      return next
    })
  },
  [isServerSynced, scheduleSave]
)
```

**Step 3: Add to context value and memoize**

```typescript
const value = useMemo<UserPreferencesContextValue>(
  () => ({
    preferences,
    isLoaded,
    isServerSynced,
    updatePagePreferences,
    updateOnboarding,  // ADD THIS
  }),
  [preferences, isLoaded, isServerSynced, updatePagePreferences, updateOnboarding]
)
```

**Step 4: Add `onboarding` to localStorage helpers**

In `loadAllFromLocalStorage`, after the settings block:
```typescript
const onboardingRaw = localStorage.getItem("trakzi-onboarding")
if (onboardingRaw) {
  prefs.onboarding = safeJsonParse<OnboardingPreferences>(onboardingRaw, {})
}
```

In `saveAllToLocalStorage`, after the settings block:
```typescript
if (prefs.onboarding) {
  localStorage.setItem("trakzi-onboarding", JSON.stringify(prefs.onboarding))
}
```

**Step 5: Commit**
```bash
git add components/user-preferences-provider.tsx
git commit -m "feat: add updateOnboarding to UserPreferencesProvider"
```

---

## Task 3: Create OnboardingProvider

**Files:**
- Create: `components/onboarding/onboarding-provider.tsx`
- Create: `components/onboarding/onboarding-context.ts`
- Create: `components/onboarding/tour-content.ts`

**Step 1: Create `tour-content.ts`** — defines all step data

```typescript
// components/onboarding/tour-content.ts

export interface TourStep {
  title: string
  description: string
  /** Optional image/GIF path relative to /public */
  image?: string
}

export interface PageTour {
  pageId: string
  steps: TourStep[]
}

export const PAGE_TOURS: Record<string, PageTour> = {
  home: {
    pageId: "home",
    steps: [
      {
        title: "Welcome to your dashboard",
        description: "This is your financial command center. All your key metrics are here at a glance.",
      },
      {
        title: "Your charts",
        description: "Charts update automatically as you add data. Drag and resize them to customize your layout.",
      },
      {
        title: "Filter by date",
        description: "Use the date filter at the top to zoom in on any time period — last month, last year, or custom.",
      },
      {
        title: "Add your first data",
        description: "Upload a bank statement CSV or scan a receipt to start seeing your spending insights.",
      },
    ],
  },
  analytics: {
    pageId: "analytics",
    steps: [
      {
        title: "Your spending breakdown",
        description: "Analytics gives you a deep dive into where your money goes, broken down by category.",
      },
      {
        title: "Filter by category",
        description: "Click any category chip to focus the charts on a specific spending area.",
      },
      {
        title: "Adjust the date range",
        description: "Narrow or widen the time window to compare spending across different periods.",
      },
    ],
  },
  fridge: {
    pageId: "fridge",
    steps: [
      {
        title: "Grocery & receipt tracking",
        description: "The Fridge section tracks your grocery spending. Upload receipts to get item-level insights.",
      },
      {
        title: "Upload a receipt",
        description: "Take a photo of any grocery receipt. Our AI reads and categorizes each item automatically.",
      },
      {
        title: "See your food trends",
        description: "Charts here show which categories you spend most on and how your grocery bill changes over time.",
      },
    ],
  },
  savings: {
    pageId: "savings",
    steps: [
      {
        title: "Track your savings",
        description: "Savings shows how much you're setting aside each month and your progress toward goals.",
      },
      {
        title: "Monitor progress",
        description: "Charts track your savings rate over time so you can spot when you're ahead or behind.",
      },
      {
        title: "Set a savings goal",
        description: "Define a target amount and a deadline. Trakzi tracks your progress automatically.",
      },
    ],
  },
  pockets: {
    pageId: "pockets",
    steps: [
      {
        title: "Budget pockets",
        description: "Pockets are virtual envelopes for your spending categories — like a digital cash budgeting system.",
      },
      {
        title: "Allocate your budget",
        description: "Set a monthly limit per pocket. The charts show how much you've used versus what's left.",
      },
      {
        title: "Create your first pocket",
        description: "Hit the + button to create a pocket for any spending category that matters to you.",
      },
    ],
  },
  "data-library": {
    pageId: "data-library",
    steps: [
      {
        title: "All your transactions",
        description: "The Data Library is a searchable, filterable table of every transaction you've imported.",
      },
      {
        title: "Search and filter",
        description: "Use the search bar and filters to find any transaction by name, category, date, or amount.",
      },
      {
        title: "Edit or delete",
        description: "Click any row to edit transaction details, fix a category, or remove a duplicate.",
      },
    ],
  },
}

export const CHECKLIST_ITEMS = [
  { id: "upload_statement", label: "Import your first bank statement" },
  { id: "upload_receipt", label: "Upload a grocery receipt" },
  { id: "explore_analytics", label: "Explore the Analytics page" },
  { id: "explore_fridge", label: "Explore the Fridge page" },
  { id: "explore_savings", label: "Explore the Savings page" },
  { id: "explore_pockets", label: "Explore the Pockets page" },
] as const

export type ChecklistItemId = typeof CHECKLIST_ITEMS[number]["id"]
```

**Step 2: Create `onboarding-context.ts`**

```typescript
// components/onboarding/onboarding-context.ts
import { createContext, useContext } from "react"

export interface OnboardingContextValue {
  /** True when welcome modal should show */
  showWelcome: boolean
  /** pageId of the currently active tour, or null */
  activeTour: string | null
  /** Whether the checklist widget is visible */
  showChecklist: boolean
  /** IDs of completed checklist items */
  completedItems: string[]
  /** Start a tour for a specific page */
  startTour: (pageId: string) => void
  /** Dismiss the welcome modal */
  dismissWelcome: () => void
  /** Complete or skip current tour */
  completeTour: (pageId: string) => void
  /** Mark a checklist item complete */
  completeChecklistItem: (id: string) => void
  /** Collapse/dismiss the checklist permanently */
  dismissChecklist: () => void
  /** Whether a page tour has already been completed */
  isTourCompleted: (pageId: string) => boolean
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error("useOnboarding must be used inside <OnboardingProvider>")
  return ctx
}
```

**Step 3: Create `onboarding-provider.tsx`**

```typescript
// components/onboarding/onboarding-provider.tsx
"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useUserPreferences } from "@/components/user-preferences-provider"
import { OnboardingContext } from "./onboarding-context"

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { preferences, isLoaded, updateOnboarding } = useUserPreferences()
  const onboarding = preferences.onboarding ?? {}

  const [activeTour, setActiveTour] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  // Show welcome modal once DB/localStorage is loaded and welcomeSeen is false
  useEffect(() => {
    if (!isLoaded) return
    if (!onboarding.welcomeSeen) {
      setShowWelcome(true)
    }
  }, [isLoaded]) // intentionally only on load

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false)
    updateOnboarding({ welcomeSeen: true })
  }, [updateOnboarding])

  const startTour = useCallback((pageId: string) => {
    setActiveTour(pageId)
  }, [])

  const completeTour = useCallback(
    (pageId: string) => {
      setActiveTour(null)
      const current = onboarding.completedTours ?? []
      if (!current.includes(pageId)) {
        updateOnboarding({ completedTours: [...current, pageId] })
      }
    },
    [onboarding.completedTours, updateOnboarding]
  )

  const completeChecklistItem = useCallback(
    (id: string) => {
      const current = onboarding.completedItems ?? []
      if (!current.includes(id)) {
        updateOnboarding({ completedItems: [...current, id] })
      }
    },
    [onboarding.completedItems, updateOnboarding]
  )

  const dismissChecklist = useCallback(() => {
    updateOnboarding({ checklistDismissed: true })
  }, [updateOnboarding])

  const isTourCompleted = useCallback(
    (pageId: string) => (onboarding.completedTours ?? []).includes(pageId),
    [onboarding.completedTours]
  )

  const showChecklist =
    isLoaded &&
    !onboarding.checklistDismissed &&
    (onboarding.completedItems ?? []).length < 6

  const value = useMemo(
    () => ({
      showWelcome,
      activeTour,
      showChecklist,
      completedItems: onboarding.completedItems ?? [],
      startTour,
      dismissWelcome,
      completeTour,
      completeChecklistItem,
      dismissChecklist,
      isTourCompleted,
    }),
    [
      showWelcome,
      activeTour,
      showChecklist,
      onboarding.completedItems,
      startTour,
      dismissWelcome,
      completeTour,
      completeChecklistItem,
      dismissChecklist,
      isTourCompleted,
    ]
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

OnboardingProvider.displayName = "OnboardingProvider"
```

**Step 4: Commit**
```bash
git add components/onboarding/
git commit -m "feat: add OnboardingProvider, context, and tour content"
```

---

## Task 4: Create WelcomeModal

**Files:**
- Create: `components/onboarding/welcome-modal.tsx`

**Step 1: Build the component**

```typescript
// components/onboarding/welcome-modal.tsx
"use client"

import { memo } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useOnboarding } from "./onboarding-context"

export const WelcomeModal = memo(function WelcomeModal() {
  const { showWelcome, dismissWelcome } = useOnboarding()

  return (
    <Dialog open={showWelcome} onOpenChange={(open) => { if (!open) dismissWelcome() }}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-neutral-300 to-neutral-500 dark:from-neutral-600 dark:to-neutral-400" />

        <div className="p-8 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Welcome
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your financial workspace
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Trakzi helps you understand your money — import bank statements,
              scan receipts, track savings, and visualize spending. Let's get
              you set up.
            </p>
          </div>

          {/* Feature list */}
          <ul className="flex flex-col gap-3">
            {[
              { icon: "📊", label: "Charts that update as you add data" },
              { icon: "📁", label: "Import bank CSV or scan receipts" },
              { icon: "💰", label: "Track savings goals and pockets" },
              { icon: "🤖", label: "AI-powered categorization" },
            ].map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="text-base">{icon}</span>
                {label}
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={dismissWelcome} className="w-full">
              Get started
            </Button>
            <Button
              variant="ghost"
              onClick={dismissWelcome}
              className="w-full text-muted-foreground text-xs"
            >
              Skip intro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})

WelcomeModal.displayName = "WelcomeModal"
```

**Step 2: Commit**
```bash
git add components/onboarding/welcome-modal.tsx
git commit -m "feat: add WelcomeModal for first-time onboarding"
```

---

## Task 5: Create OnboardingTour (step-card modal)

**Files:**
- Create: `components/onboarding/onboarding-tour.tsx`

**Step 1: Build the component**

```typescript
// components/onboarding/onboarding-tour.tsx
"use client"

import { memo, useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronRight, X } from "lucide-react"
import { useOnboarding } from "./onboarding-context"
import { PAGE_TOURS } from "./tour-content"

interface OnboardingTourProps {
  pageId: string
}

export const OnboardingTour = memo(function OnboardingTour({ pageId }: OnboardingTourProps) {
  const { activeTour, completeTour, isTourCompleted, startTour } = useOnboarding()
  const [step, setStep] = useState(0)

  const tour = PAGE_TOURS[pageId]
  const isOpen = activeTour === pageId

  // Auto-start tour on first visit to this page
  useEffect(() => {
    if (!isTourCompleted(pageId)) {
      // Small delay so the page has time to render
      const timer = setTimeout(() => startTour(pageId), 800)
      return () => clearTimeout(timer)
    }
  }, [pageId]) // Only run once on mount

  if (!tour) return null

  const currentStep = tour.steps[step]
  const totalSteps = tour.steps.length
  const isLastStep = step === totalSteps - 1

  function handleNext() {
    if (isLastStep) {
      completeTour(pageId)
      setStep(0)
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleSkip() {
    completeTour(pageId)
    setStep(0)
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleSkip()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm gap-0 p-0 overflow-hidden">
        {/* Step progress bar */}
        <div className="h-0.5 w-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Step indicator + close */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {step + 1} / {totalSteps}
            </span>
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold tracking-tight">
              {currentStep.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Optional image */}
          {currentStep.image && (
            <div className="rounded-md overflow-hidden border border-border bg-muted/30 aspect-video">
              <img
                src={currentStep.image}
                alt={currentStep.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
            <Button size="sm" onClick={handleNext} className="gap-1.5">
              {isLastStep ? "Done" : "Next"}
              {!isLastStep && <ChevronRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})

OnboardingTour.displayName = "OnboardingTour"
```

**Step 2: Commit**
```bash
git add components/onboarding/onboarding-tour.tsx
git commit -m "feat: add OnboardingTour step-card modal"
```

---

## Task 6: Create OnboardingChecklist (floating widget)

**Files:**
- Create: `components/onboarding/onboarding-checklist.tsx`

**Step 1: Build the component**

```typescript
// components/onboarding/onboarding-checklist.tsx
"use client"

import { memo, useState } from "react"
import { Check, ChevronDown, ChevronUp, X } from "lucide-react"
import { useOnboarding } from "./onboarding-context"
import { CHECKLIST_ITEMS } from "./tour-content"
import { cn } from "@/lib/utils"

export const OnboardingChecklist = memo(function OnboardingChecklist() {
  const { showChecklist, completedItems, dismissChecklist } = useOnboarding()
  const [expanded, setExpanded] = useState(true)

  if (!showChecklist) return null

  const completedCount = completedItems.length
  const totalCount = CHECKLIST_ITEMS.length
  const progressPercent = (completedCount / totalCount) * 100

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Getting started</span>
          <span className="text-xs text-muted-foreground">
            {completedCount} of {totalCount} complete
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
          <button
            onClick={dismissChecklist}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Items */}
      {expanded && (
        <ul className="flex flex-col px-4 py-3 gap-2.5">
          {CHECKLIST_ITEMS.map((item) => {
            const done = completedItems.includes(item.id)
            return (
              <li key={item.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex-shrink-0 size-5 rounded-full border flex items-center justify-center transition-colors",
                    done
                      ? "bg-neutral-900 border-neutral-900 dark:bg-neutral-100 dark:border-neutral-100"
                      : "border-neutral-300 dark:border-neutral-600"
                  )}
                >
                  {done && <Check className="size-3 text-white dark:text-neutral-900" strokeWidth={2.5} />}
                </span>
                <span
                  className={cn(
                    "text-sm transition-colors",
                    done ? "text-muted-foreground line-through" : "text-foreground"
                  )}
                >
                  {item.label}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
})

OnboardingChecklist.displayName = "OnboardingChecklist"
```

**Step 2: Commit**
```bash
git add components/onboarding/onboarding-checklist.tsx
git commit -m "feat: add floating OnboardingChecklist widget"
```

---

## Task 7: Create OnboardingRoot — mounts all global onboarding UI

**Files:**
- Create: `components/onboarding/onboarding-root.tsx`

This is a single component that renders the WelcomeModal and OnboardingChecklist globally (in the root layout), so they appear on every page.

```typescript
// components/onboarding/onboarding-root.tsx
"use client"

import { memo } from "react"
import { WelcomeModal } from "./welcome-modal"
import { OnboardingChecklist } from "./onboarding-checklist"

export const OnboardingRoot = memo(function OnboardingRoot() {
  return (
    <>
      <WelcomeModal />
      <OnboardingChecklist />
    </>
  )
})

OnboardingRoot.displayName = "OnboardingRoot"
```

**Commit:**
```bash
git add components/onboarding/onboarding-root.tsx
git commit -m "feat: add OnboardingRoot combining global onboarding UI"
```

---

## Task 8: Mount OnboardingProvider and OnboardingRoot in root layout

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Import the new components**

Add imports after existing imports:
```typescript
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider"
import { OnboardingRoot } from "@/components/onboarding/onboarding-root"
```

**Step 2: Wrap the tree**

Place `OnboardingProvider` inside `UserPreferencesProvider` (it needs access to preferences), and add `OnboardingRoot` just before `{children}`:

```tsx
<UserPreferencesProvider>
  <OnboardingProvider>       {/* ADD */}
    <ChartResizeProvider>
      ...
      <DemoModeProvider>
        <div className="flex flex-col min-h-screen overflow-x-hidden">
          <PostHogUserIdentifier />
          <DemoBanner />
          <OnboardingRoot />   {/* ADD */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </DemoModeProvider>
      ...
    </ChartResizeProvider>
  </OnboardingProvider>       {/* ADD */}
</UserPreferencesProvider>
```

**Step 3: Commit**
```bash
git add app/layout.tsx
git commit -m "feat: mount OnboardingProvider and OnboardingRoot in root layout"
```

---

## Task 9: Add OnboardingTour to each of the 6 pages

**Files:**
- Modify: `app/home/page.tsx` (or `app/home/_page/` entry component)
- Modify: `app/analytics/page.tsx`
- Modify: `app/fridge/page.tsx`
- Modify: `app/savings/page.tsx`
- Modify: `app/pockets/page.tsx`
- Modify: `app/data-library/page.tsx`

**Step 1: Pattern to apply to each page**

At the bottom of the page's JSX (just before closing tag), add:
```tsx
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"

// Inside the return, at the end:
<OnboardingTour pageId="home" />   // change pageId per page
```

Page ID mapping:
| Page file | pageId |
|-----------|--------|
| `app/home/` | `"home"` |
| `app/analytics/` | `"analytics"` |
| `app/fridge/` | `"fridge"` |
| `app/savings/` | `"savings"` |
| `app/pockets/` | `"pockets"` |
| `app/data-library/` | `"data-library"` |

**Step 2: Add "Take a tour" replay button**

In each page's header area, add a small ghost button that triggers the tour replay:
```tsx
import { useOnboarding } from "@/components/onboarding/onboarding-context"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

// Inside the component:
const { startTour } = useOnboarding()

// In JSX (near page title):
<Button
  variant="ghost"
  size="sm"
  onClick={() => startTour("home")}  // change per page
  className="text-muted-foreground gap-1.5 text-xs"
>
  <MapPin className="size-3.5" />
  Take a tour
</Button>
```

> **Note:** Read each page file before modifying to understand the current structure and where to best place the button.

**Step 3: Commit after all 6 pages**
```bash
git add app/home/ app/analytics/ app/fridge/ app/savings/ app/pockets/ app/data-library/
git commit -m "feat: add OnboardingTour and replay button to all 6 pages"
```

---

## Task 10: Connect checklist items to real events

**Files:**
- Modify: The components that handle file upload (CSV statement, receipt upload)
- Modify: Each of the 4 "explore" page files (to auto-check on visit)

**Step 1: Auto-complete "explore" items on page visit**

In Analytics, Fridge, Savings, and Pockets pages, add this effect:
```typescript
const { completeChecklistItem } = useOnboarding()

useEffect(() => {
  completeChecklistItem("explore_analytics") // change id per page
}, []) // run once on mount
```

Page → checklist item ID mapping:
| Page | Checklist Item ID |
|------|-------------------|
| Analytics | `"explore_analytics"` |
| Fridge | `"explore_fridge"` |
| Savings | `"explore_savings"` |
| Pockets | `"explore_pockets"` |

**Step 2: Complete upload items after successful upload**

Find the upload success handler for bank statement CSV (search for where it calls the API to process a statement). After the success response:
```typescript
const { completeChecklistItem } = useOnboarding()

// After successful statement upload:
completeChecklistItem("upload_statement")
```

Find the upload success handler for receipts (Fridge section). After success:
```typescript
completeChecklistItem("upload_receipt")
```

> **Note:** Use `grep -r "upload" app/ lib/` and `grep -r "receipt" app/ lib/` to find the right components. Look for existing success toasts — add `completeChecklistItem` right next to them.

**Step 3: Commit**
```bash
git add .
git commit -m "feat: connect onboarding checklist to real upload and navigation events"
```

---

## Task 11: Build verification

**Step 1: Run build**
```bash
npm run build
```
Expected: no TypeScript errors, no build failures.

**Step 2: Run lint**
```bash
npm run lint
```
Expected: no new lint errors.

**Step 3: Manual smoke test checklist**
- [ ] Fresh user (clear localStorage + DB) → WelcomeModal appears on Home
- [ ] Click "Get started" → modal dismisses, not shown again on reload
- [ ] Navigate to Analytics → OnboardingTour auto-starts (step 1/3)
- [ ] Click "Next" through all steps → tour completes, won't show again on revisit
- [ ] Click "Skip tour" → tour closes, page marked complete
- [ ] "Take a tour" button → re-opens the tour from step 1
- [ ] Floating checklist visible → shows progress bar and items
- [ ] Upload a statement → checklist item checks off automatically
- [ ] X button on checklist → permanently dismisses (persists across reload)
- [ ] Complete all 6 checklist items → checklist disappears

**Step 4: Final commit**
```bash
git add .
git commit -m "feat: complete onboarding system — welcome modal, page tours, checklist"
```

---

## File Summary

| File | Action |
|------|--------|
| `lib/types/user-preferences.ts` | Add `OnboardingPreferences` type + field to `UserPreferences` |
| `components/user-preferences-provider.tsx` | Add `updateOnboarding` method, extend localStorage helpers |
| `components/onboarding/tour-content.ts` | All tour steps + checklist items (single source of truth) |
| `components/onboarding/onboarding-context.ts` | React context + `useOnboarding` hook |
| `components/onboarding/onboarding-provider.tsx` | State management + actions |
| `components/onboarding/welcome-modal.tsx` | First-time welcome dialog |
| `components/onboarding/onboarding-tour.tsx` | Per-page step-card modal (3–4 steps, progress bar) |
| `components/onboarding/onboarding-checklist.tsx` | Floating bottom-right widget |
| `components/onboarding/onboarding-root.tsx` | Mounts WelcomeModal + Checklist globally |
| `app/layout.tsx` | Add OnboardingProvider + OnboardingRoot |
| `app/home/page.tsx` | Add OnboardingTour + replay button |
| `app/analytics/page.tsx` | Add OnboardingTour + replay button + checklist trigger |
| `app/fridge/page.tsx` | Add OnboardingTour + replay button + checklist trigger |
| `app/savings/page.tsx` | Add OnboardingTour + replay button + checklist trigger |
| `app/pockets/page.tsx` | Add OnboardingTour + replay button + checklist trigger |
| `app/data-library/page.tsx` | Add OnboardingTour + replay button |
