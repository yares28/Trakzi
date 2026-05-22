"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { IconLock, IconSparkles } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FeatureGateBlurProps {
  children: ReactNode
  /** If true, render children normally. If false, show blur + upgrade overlay. */
  enabled?: boolean
  featureName?: string
  description?: string
  className?: string
}

/**
 * Wraps any content with a blur overlay and upgrade CTA when the feature is
 * not available on the user's current plan. Pass `enabled={false}` to activate
 * the gate; `enabled={true}` renders children transparently.
 */
export function FeatureGateBlur({
  children,
  enabled = true,
  featureName = "Advanced Feature",
  description = "Upgrade to Pro or Max to unlock this feature",
  className,
}: FeatureGateBlurProps) {
  if (enabled) {
    return <>{children}</>
  }

  return (
    <div className={cn("relative rounded-xl overflow-hidden", className)}>
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40 saturate-50">
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[3px]">
        <div className="flex flex-col items-center gap-3 p-6 text-center max-w-xs">
          <div className="rounded-full bg-primary/10 border border-primary/20 p-3">
            <IconLock className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">{featureName}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Button size="sm" asChild>
            <Link href="/settings">
              <IconSparkles className="h-3.5 w-3.5 mr-1.5" />
              Upgrade Plan
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
