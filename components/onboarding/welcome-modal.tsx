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
        {/* Same thin bar as tour panels — empty (0%) to signal start */}
        <div className="h-0.5 w-full bg-neutral-100 dark:bg-neutral-800" />

        <div className="p-8 flex flex-col gap-5">
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
          <div className="flex flex-col gap-2 pt-1">
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
