"use client"

import { memo } from "react"
import { FileUp, ChartLine, Receipt, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface PageEmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
  ctaOnClick?: () => void
  className?: string
}

export const PageEmptyState = memo(function PageEmptyState({
  icon: Icon = ChartLine,
  title,
  description,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  className,
}: PageEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-20 px-6 animate-in fade-in slide-in-from-bottom-2 duration-500",
        className,
      )}
    >
      {/* Icon container — dashed border with brand tint, ledger chip below */}
      <div className="relative mb-7">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-[oklch(0.6716_0.1368_48.513/0.06)]">
          <Icon className="h-9 w-9" style={{ color: "oklch(0.6716 0.1368 48.513)" }} />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          TXN · NIL
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-[340px] mb-6">
        {description}
      </p>

      {ctaLabel && ctaHref && (
        <Button asChild>
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
      {ctaLabel && ctaOnClick && !ctaHref && (
        <Button onClick={ctaOnClick}>{ctaLabel}</Button>
      )}
    </div>
  )
})

PageEmptyState.displayName = "PageEmptyState"

/** Per-page empty state configs */
export const ANALYTICS_EMPTY_STATE = {
  icon: FileUp,
  title: "No financial data yet",
  description: "Import your bank statements to see insights",
} as const

export const ANALYTICS_EMPTY_PERIOD_STATE = {
  icon: ChartLine,
  title: "No data for this period",
  description: "Try selecting a different time period to see your data",
} as const

export const FRIDGE_EMPTY_STATE = {
  icon: Receipt,
  title: "No grocery data yet",
  description: "Upload receipts to track grocery spending",
} as const

export const SAVINGS_EMPTY_STATE = {
  icon: ChartLine,
  title: "No savings data yet",
  description: "Import bank statements with savings transactions",
} as const
