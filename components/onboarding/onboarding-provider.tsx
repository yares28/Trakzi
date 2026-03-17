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
  }, [isLoaded]) // intentionally only on isLoaded change

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
