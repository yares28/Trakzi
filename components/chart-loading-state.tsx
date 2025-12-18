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
  emptyTitle = "No data yet",
  emptyDescription = "Import your bank statements or receipts to see insights here",
  emptyIcon = "chart",
  height = "h-full"
}: ChartLoadingStateProps) {

  // Loading state with shimmer
  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center w-full space-y-3", height, className)}>
        {/* Shimmer bars to simulate chart loading */}
        <div className="w-full max-w-xs space-y-2">
          <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-4/5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.1s" }} />
          <div className="h-3 w-3/5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="h-3 w-4/5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.3s" }} />
          <div className="h-3 w-2/3 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
        <ShimmeringText
          text="Loading data"
          className="text-muted-foreground font-medium text-sm"
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
    <div className={cn("rounded-xl border bg-card p-6", height, className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>

      {/* Chart area skeleton */}
      <div className="flex-1 flex items-end justify-center gap-1 pt-4">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="w-6 rounded-t bg-muted animate-pulse"
            style={{
              height: `${Math.random() * 60 + 40}%`,
              animationDelay: `${i * 0.05}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}
