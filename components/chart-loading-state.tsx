"use client"

import { cn } from "@/lib/utils"

interface ChartLoadingStateProps {
  isLoading?: boolean
  className?: string
}

export function ChartLoadingState({ isLoading = false, className }: ChartLoadingStateProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full w-full", className)}>
        <span className="shimmer-text text-muted-foreground">Loading Data</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center text-muted-foreground h-full w-full", className)}>
      No data available
    </div>
  )
}

