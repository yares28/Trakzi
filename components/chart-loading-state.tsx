"use client"

import { FileUp, ChartLine, Receipt, Info } from "lucide-react"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { cn } from "@/lib/utils"

interface ChartLoadingStateProps {
  isLoading?: boolean
  className?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: "chart" | "upload" | "receipt" | "info"
  /** Height of the loading shimmer area */
  height?: string
}

export function ChartLoadingState({
  isLoading = false,
  className,
  emptyTitle = "No data yet ..",
  emptyDescription = "Import your bank statements or receipts to see insights here",
  emptyIcon = "chart",
  height = "h-full"
}: ChartLoadingStateProps) {

  // Loading state with shimmer box that fills the chart area
  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center w-full", height, className)}>
        {/* Box shimmer skeleton to fill chart area */}
        <div className="w-full h-full max-h-[200px] flex flex-col justify-end items-center gap-0.5 p-4">
          {/* Simulated bar chart skeleton */}
          <div className="w-full flex items-end justify-center gap-1.5">
            {[40, 65, 50, 80, 35, 70, 55, 75, 45, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 max-w-8 rounded-t bg-muted animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 0.08}s`
                }}
              />
            ))}
          </div>
          {/* X-axis line */}
          <div className="w-full h-0.5 bg-muted/60 rounded" />
        </div>
        <ShimmeringText
          text="Loading .."
          className="text-muted-foreground font-medium text-sm mt-2"
          duration={1.8}
          repeatDelay={0.3}
          spread={2.5}
        />
      </div>
    )
  }

  // Empty state with helpful message
  const IconComponent = {
    chart: ChartLine,
    upload: FileUp,
    receipt: Receipt,
    info: Info,
  }[emptyIcon]

  return (
    <div className={cn("flex flex-col items-center justify-center text-center px-4 w-full", height, className)}>
      <div className="p-3 rounded-full bg-muted/50 mb-3">
        <IconComponent className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        {emptyTitle}
      </p>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        {emptyDescription}
      </p>
    </div>
  )
}

/**
 * Shimmer skeleton for chart cards while data is loading
 * Can be used as a full card replacement during initial load
 */
export function ChartCardSkeleton({ className, height = "h-[300px]" }: { className?: string; height?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 flex flex-col", height, className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>

      {/* Chart area skeleton - simulated bar chart */}
      <div className="flex-1 flex items-end justify-center gap-1.5 pt-4">
        {[50, 70, 45, 85, 40, 75, 60, 80, 55, 65, 50, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 max-w-6 rounded-t bg-muted animate-pulse"
            style={{
              height: `${h}%`,
              animationDelay: `${i * 0.05}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}
