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
      const timer = setTimeout(() => startTour(pageId), 800)
      return () => clearTimeout(timer)
    }
  }, [pageId]) // eslint-disable-line react-hooks/exhaustive-deps

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
