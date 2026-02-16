"use client"

import { useState, useEffect, useRef } from "react"
import { FileUp, ChartLine, Receipt, Info } from "lucide-react"
import { ShimmeringText } from "@/components/ui/shimmering-text"
import { cn } from "@/lib/utils"
import { ChartSkeleton, type ChartSkeletonType } from "@/components/chart-skeletons"

interface ChartLoadingStateProps {
  isLoading?: boolean
  className?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: "chart" | "upload" | "receipt" | "info"
  /** Height of the loading shimmer area */
  height?: string
  /** Type of skeleton to display (matches chart type) */
  skeletonType?: ChartSkeletonType
  /** Maximum loading time in ms before transitioning to empty state (default: 15000) */
  maxLoadingTime?: number
}

export function ChartLoadingState({
  isLoading = false,
  className,
  emptyTitle = "No data yet ..",
  emptyDescription = "Import your bank statements or receipts to see insights here",
  emptyIcon = "chart",
  height = "h-full",
  skeletonType = "bar",
  maxLoadingTime = 15000
}: ChartLoadingStateProps) {
  const [timedOut, setTimedOut] = useState(false)
  const [showContent, setShowContent] = useState(!isLoading)
  const prevLoadingRef = useRef(isLoading)

  // Timeout protection - transition to empty state if loading takes too long
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false)
      return
    }

    const timer = setTimeout(() => {
      setTimedOut(true)
    }, maxLoadingTime)

    return () => clearTimeout(timer)
  }, [isLoading, maxLoadingTime])

  // Handle transition from loading to content
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      // Was loading, now stopped - trigger content enter animation
      setShowContent(true)
    }
    prevLoadingRef.current = isLoading
  }, [isLoading])

  // If timed out, silently transition to empty state
  if (timedOut) {
    return <EmptyState
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyIcon={emptyIcon}
      height={height}
      className={className}
    />
  }

  // Loading state with appropriate skeleton — min-h-0 so it fits the card (doesn't overflow)
  if (isLoading) {
    return (
      <div className={cn("flex min-h-0 flex-col w-full", height, className)}>
        <div className="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-2 sm:px-6 sm:pt-2 sm:pb-4">
          <div className="min-h-0 flex-1 w-full">
            <ChartSkeleton type={skeletonType} />
          </div>
          <ShimmeringText
            text="Loading .."
            className="text-muted-foreground font-medium text-sm text-center mt-1.5 shrink-0"
            duration={1.8}
            repeatDelay={0.3}
            spread={2.5}
          />
        </div>
      </div>
    )
  }

  // Empty state with optional fade-in animation
  return (
    <EmptyState
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyIcon={emptyIcon}
      height={height}
      className={cn(showContent && "chart-content-enter", className)}
    />
  )
}

/**
 * Empty state component (extracted for reuse)
 */
function EmptyState({
  emptyTitle,
  emptyDescription,
  emptyIcon,
  height,
  className
}: {
  emptyTitle: string
  emptyDescription: string
  emptyIcon: "chart" | "upload" | "receipt" | "info"
  height: string
  className?: string
}) {
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
export function ChartCardSkeleton({
  className,
  height = "h-[300px]",
  skeletonType = "bar"
}: {
  className?: string
  height?: string
  skeletonType?: ChartSkeletonType
}) {
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

      {/* Chart area skeleton - use appropriate type */}
      <div className="flex-1 flex items-center justify-center pt-4">
        <ChartSkeleton type={skeletonType} />
      </div>
    </div>
  )
}
