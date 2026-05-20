"use client"

import { useState, useEffect } from "react"
import { IconAlertTriangle, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { usePlanFeatures } from "@/hooks/use-plan-features"
import { useAccounts } from "@/hooks/use-accounts"
import { useDemoMode } from "@/lib/demo/demo-context"

const DISMISS_KEY = "account_limit_banner_dismissed"

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function OverLimitBanner() {
  const features = usePlanFeatures()
  const { data: accounts = [] } = useAccounts()
  const { isDemoMode } = useDemoMode()
  // Start hidden to avoid layout flash before localStorage is checked
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY)
    setDismissed(stored === getTodayString())
  }, [])

  // Demo mode uses fixture data with N accounts by design — the real plan limit
  // doesn't apply here. Showing the banner would imply the user is over their
  // real plan when they're just looking at a preview.
  if (isDemoMode || !features || dismissed) return null

  const activeCount = accounts.filter((a) => a.isActive).length
  const { maxAccounts } = features

  if (activeCount <= maxAccounts) return null

  const overBy = activeCount - maxAccounts
  const planLabel = features.plan.charAt(0).toUpperCase() + features.plan.slice(1)

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, getTodayString())
    setDismissed(true)
  }

  return (
    <div className="mx-2 mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs group-data-[collapsible=icon]:hidden">
      <div className="flex items-start gap-2">
        <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-amber-700 dark:text-amber-400 leading-snug">
            Account limit exceeded
          </p>
          <p className="mt-0.5 text-muted-foreground leading-snug">
            {overBy} account{overBy !== 1 ? "s" : ""} over your {planLabel} plan
            limit of {maxAccounts}.
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-6 px-2 text-xs bg-amber-500 hover:bg-amber-600 text-white border-0"
              asChild
            >
              <a href="/billing">Upgrade</a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              Dismiss for today
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0 -mt-0.5 -mr-1 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <IconX className="size-3" />
        </Button>
      </div>
    </div>
  )
}
