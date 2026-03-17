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
