// components/onboarding/onboarding-provider.tsx
"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useUserPreferences } from "@/components/user-preferences-provider"
import { OnboardingContext } from "./onboarding-context"
import { CHECKLIST_ITEMS } from "./tour-content"
import type { ChecklistItemId } from "./tour-content"

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { preferences, isServerSynced, updateOnboarding } = useUserPreferences()
  const onboarding = preferences.onboarding ?? {}

  const [activeTour, setActiveTour] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  // Only show welcome modal once server data is confirmed — not just localStorage.
  // This prevents the modal from appearing during deployment cold starts when the
  // API fails and falls back to empty localStorage state.
  useEffect(() => {
    if (!isServerSynced) return
    if (!onboarding.welcomeSeen) {
      setShowWelcome(true)
    }
  }, [isServerSynced, onboarding.welcomeSeen])

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
    (id: ChecklistItemId) => {
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

  // Use isServerSynced (not isLoaded) so the checklist only appears once we
  // have authoritative DB data — not just a localStorage fallback that might
  // be stale or empty after a deployment. checklistDismissed is a hard override
  // that persists regardless of how many items are added between deployments.
  const showChecklist =
    isServerSynced &&
    !onboarding.checklistDismissed &&
    (onboarding.completedItems ?? []).length < CHECKLIST_ITEMS.length

  const value = useMemo(
    () => ({
      showWelcome,
      activeTour,
      showChecklist,
      completedItems: (onboarding.completedItems ?? []) as ChecklistItemId[],
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
