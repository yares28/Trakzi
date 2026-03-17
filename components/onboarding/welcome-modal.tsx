// components/onboarding/welcome-modal.tsx
"use client"

import { memo } from "react"
import { Button } from "@/components/ui/button"
import { useOnboarding } from "./onboarding-context"
import { OnboardingShell } from "./onboarding-shell"

export const WelcomeModal = memo(function WelcomeModal() {
  const { showWelcome, dismissWelcome } = useOnboarding()

  return (
    <OnboardingShell open={showWelcome} onOpenChange={(open) => { if (!open) dismissWelcome() }}>
      {/* Same thin bar as tour panels — empty to signal "start" */}
      <div className="h-0.5 w-full bg-neutral-100 dark:bg-neutral-800" />

      <div className="p-6 sm:p-8 lg:p-10 flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Welcome to Trakzi
          </p>
          <h2 className="text-lg font-semibold tracking-tight">
            Your financial workspace
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Import bank statements, scan receipts, track savings, and
            visualize spending — all in one place.
          </p>
        </div>

        {/* Feature list */}
        <ul className="flex flex-col gap-2.5">
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
        <div className="flex flex-col gap-2 pb-2 sm:pb-0">
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
    </OnboardingShell>
  )
})

WelcomeModal.displayName = "WelcomeModal"
