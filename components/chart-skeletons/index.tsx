"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"
import { AreaSkeleton } from "./area-skeleton"
import { PieSkeleton } from "./pie-skeleton"
import { BarSkeleton } from "./bar-skeleton"
import { FlowSkeleton } from "./flow-skeleton"
import { GridSkeleton } from "./grid-skeleton"

export type ChartSkeletonType = "area" | "pie" | "bar" | "flow" | "grid"

interface ChartSkeletonProps {
  type: ChartSkeletonType
  className?: string
}

/**
 * Unified chart skeleton component that renders the appropriate
 * skeleton based on chart type
 */
export const ChartSkeleton = memo(function ChartSkeleton({
  type,
  className
}: ChartSkeletonProps) {
  const skeletonClass = cn("w-full h-full", className)

  switch (type) {
    case "area":
      return <AreaSkeleton className={skeletonClass} />
    case "pie":
      return <PieSkeleton className={skeletonClass} />
    case "bar":
      return <BarSkeleton className={skeletonClass} />
    case "flow":
      return <FlowSkeleton className={skeletonClass} />
    case "grid":
      return <GridSkeleton className={skeletonClass} />
    default:
      return <BarSkeleton className={skeletonClass} />
  }
})

ChartSkeleton.displayName = "ChartSkeleton"

// Re-export individual skeletons for direct use if needed
export { AreaSkeleton } from "./area-skeleton"
export { PieSkeleton } from "./pie-skeleton"
export { BarSkeleton } from "./bar-skeleton"
export { FlowSkeleton } from "./flow-skeleton"
export { GridSkeleton } from "./grid-skeleton"
