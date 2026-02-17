"use client"

import { memo } from "react"
import { BarChart3, UtensilsCrossed, PiggyBank, type LucideIcon } from "lucide-react"

type PageEmptyStateProps = {
  icon?: LucideIcon
  title: string
  description: string
  className?: string
}

export const PageEmptyState = memo(function PageEmptyState({
  icon: Icon,
  title,
  description,
  className,
}: PageEmptyStateProps) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center text-center py-12 px-4">
        {Icon && (
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      </div>
    </div>
  )
})

PageEmptyState.displayName = "PageEmptyState"

// ── Per-page empty state configs ─────────────────────────────────────
export const ANALYTICS_EMPTY_STATE = {
  icon: BarChart3,
  title: "No financial data yet",
  description: "Import your bank statements to see insights and analytics about your spending patterns.",
}

export const ANALYTICS_EMPTY_PERIOD_STATE = {
  icon: BarChart3,
  title: "No data for this period",
  description: "Try selecting a different time period to see your analytics.",
}

export const FRIDGE_EMPTY_STATE = {
  icon: UtensilsCrossed,
  title: "No grocery data yet",
  description: "Upload receipts to track grocery spending and see insights about your food purchases.",
}

export const SAVINGS_EMPTY_STATE = {
  icon: PiggyBank,
  title: "No savings data yet",
  description: "Import bank statements with savings transactions to track your savings over time.",
}
