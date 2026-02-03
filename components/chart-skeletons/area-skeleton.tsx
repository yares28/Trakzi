"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface AreaSkeletonProps {
  className?: string
}

/**
 * SVG skeleton for area/streamgraph charts
 * Shows stacked wavy bands to represent layered area data
 */
export const AreaSkeleton = memo(function AreaSkeleton({ className }: AreaSkeletonProps) {
  return (
    <svg
      viewBox="0 0 200 100"
      className={cn("w-full h-full", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Bottom area band */}
      <path
        d="M0,100 L0,75 Q25,70 50,72 T100,68 T150,73 T200,70 L200,100 Z"
        fill="currentColor"
        className="text-muted animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      {/* Middle area band */}
      <path
        d="M0,75 L0,50 Q25,45 50,48 T100,42 T150,50 T200,45 L200,70 Q175,73 150,73 T100,68 T50,72 T0,75 Z"
        fill="currentColor"
        className="text-muted/70 animate-pulse"
        style={{ animationDelay: "100ms" }}
      />
      {/* Top area band */}
      <path
        d="M0,50 L0,30 Q25,25 50,28 T100,22 T150,30 T200,25 L200,45 Q175,50 150,50 T100,42 T50,48 T0,50 Z"
        fill="currentColor"
        className="text-muted/50 animate-pulse"
        style={{ animationDelay: "200ms" }}
      />
      {/* X-axis line */}
      <line
        x1="0"
        y1="100"
        x2="200"
        y2="100"
        stroke="currentColor"
        className="text-muted/60"
        strokeWidth="1"
      />
    </svg>
  )
})

AreaSkeleton.displayName = "AreaSkeleton"
