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
