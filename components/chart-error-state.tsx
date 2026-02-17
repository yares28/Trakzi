"use client"

import { memo } from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartErrorStateProps {
  title?: string
  description?: string
  className?: string
}

export const ChartErrorState = memo(function ChartErrorState({
  title = "Chart unavailable",
  description = "Something went wrong loading this chart. Please try again later.",
  className,
}: ChartErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4 py-8 h-full w-full",
        className,
      )}
    >
      <div className="p-3 rounded-full bg-destructive/10 mb-3">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        {title}
      </p>
      <p className="text-xs text-muted-foreground max-w-[220px]">
        {description}
      </p>
    </div>
  )
})

ChartErrorState.displayName = "ChartErrorState"
