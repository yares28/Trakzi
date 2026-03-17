// components/onboarding/onboarding-tour.tsx
"use client"

import { memo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useOnboarding } from "./onboarding-context"
import { PAGE_TOURS } from "./tour-content"
import { OnboardingShell } from "./onboarding-shell"

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
      const timer = setTimeout(() => startTour(pageId), 800)
      return () => clearTimeout(timer)
    }
  }, [pageId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!tour) return null

  const currentStep = tour.steps[step]
  const totalSteps = tour.steps.length
  const isLastStep = step === totalSteps - 1
  const isFirstStep = step === 0

  function handleNext() {
    if (isLastStep) {
      completeTour(pageId)
      setStep(0)
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1))
  }

  function handleSkip() {
    completeTour(pageId)
    setStep(0)
  }

  return (
    <OnboardingShell open={isOpen} onOpenChange={(open) => { if (!open) handleSkip() }}>
      {/* Step progress bar */}
      <div className="h-0.5 w-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-300 ease-out"
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      <div className="p-6 sm:p-8 lg:p-10 flex flex-col gap-5">
        {/* Step counter */}
        <span className="text-xs text-muted-foreground font-medium">
          {step + 1} / {totalSteps}
        </span>

        {/* Visual placeholder — swap src for a real GIF when ready */}
        <div className="rounded-lg overflow-hidden border border-border bg-muted/40 aspect-video flex items-center justify-center">
          {currentStep.image ? (
            <img
              src={currentStep.image}
              alt={currentStep.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-muted-foreground/30 text-xs uppercase tracking-widest select-none px-4 text-center">
              {currentStep.title}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-semibold tracking-tight">
            {currentStep.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pb-2 sm:pb-0">
          {isFirstStep ? (
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-1 text-xs h-7 px-2 text-muted-foreground"
            >
              <ChevronLeft className="size-3.5" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={handleNext} className="gap-1.5">
            {isLastStep ? "Done" : "Next"}
            {!isLastStep && <ChevronRight className="size-3.5" />}
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
})

OnboardingTour.displayName = "OnboardingTour"
