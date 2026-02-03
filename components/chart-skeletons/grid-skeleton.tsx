"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface GridSkeletonProps {
  className?: string
}

/**
 * SVG skeleton for treemap/calendar/bubble/radar/scatter charts
 * Shows a grid of rectangles to represent grid-based or scattered data
 */
export const GridSkeleton = memo(function GridSkeleton({ className }: GridSkeletonProps) {
  // Grid cells with varied sizes to create visual interest
  const cells = [
    // Row 1 - varied widths
    { x: 5, y: 5, w: 55, h: 28, delay: "0ms", opacity: "1" },
    { x: 65, y: 5, w: 35, h: 28, delay: "50ms", opacity: "0.8" },
    { x: 105, y: 5, w: 45, h: 28, delay: "100ms", opacity: "0.7" },
    { x: 155, y: 5, w: 40, h: 28, delay: "150ms", opacity: "0.9" },
    // Row 2 - varied widths
    { x: 5, y: 38, w: 40, h: 28, delay: "200ms", opacity: "0.75" },
    { x: 50, y: 38, w: 50, h: 28, delay: "250ms", opacity: "0.85" },
    { x: 105, y: 38, w: 30, h: 28, delay: "300ms", opacity: "0.6" },
    { x: 140, y: 38, w: 55, h: 28, delay: "350ms", opacity: "0.8" },
    // Row 3 - varied widths
    { x: 5, y: 71, w: 60, h: 24, delay: "400ms", opacity: "0.7" },
    { x: 70, y: 71, w: 45, h: 24, delay: "450ms", opacity: "0.9" },
    { x: 120, y: 71, w: 35, h: 24, delay: "500ms", opacity: "0.65" },
    { x: 160, y: 71, w: 35, h: 24, delay: "550ms", opacity: "0.8" },
  ]

  return (
    <svg
      viewBox="0 0 200 100"
      className={cn("w-full h-full", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {cells.map((cell, i) => (
        <rect
          key={i}
          x={cell.x}
          y={cell.y}
          width={cell.w}
          height={cell.h}
          rx={3}
          className="fill-muted animate-pulse"
          style={{
            animationDelay: cell.delay,
            opacity: cell.opacity
          }}
        />
      ))}
    </svg>
  )
})

GridSkeleton.displayName = "GridSkeleton"
