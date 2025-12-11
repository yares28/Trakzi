"use client"

import { ShimmeringText } from "@/components/ui/shimmering-text"
import { cn } from "@/lib/utils"

interface ChartLoadingStateProps {
  isLoading?: boolean
  className?: string
}

export function ChartLoadingState({ isLoading = false, className }: ChartLoadingStateProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full w-full", className)}>
        <ShimmeringText
          text="Loading data"
          className="text-muted-foreground font-medium"
          duration={1.8}
          repeatDelay={0.3}
          spread={2.5}
        />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center text-muted-foreground h-full w-full", className)}>
      No data available
    </div>
  )
}

