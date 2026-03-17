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
