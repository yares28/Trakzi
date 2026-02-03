"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface BarSkeletonProps {
  className?: string
}

/**
 * SVG skeleton for bar/column charts
 * Shows vertical bars of varying heights to represent bar chart data
 */
export const BarSkeleton = memo(function BarSkeleton({ className }: BarSkeletonProps) {
  // Bar heights as percentages, creating visual variety
  const bars = [
    { height: 40, delay: "0ms" },
    { height: 65, delay: "50ms" },
    { height: 50, delay: "100ms" },
    { height: 80, delay: "150ms" },
    { height: 35, delay: "200ms" },
    { height: 70, delay: "250ms" },
    { height: 55, delay: "300ms" },
    { height: 75, delay: "350ms" },
    { height: 45, delay: "400ms" },
    { height: 60, delay: "450ms" },
  ]

  const barWidth = 14
  const gap = 6
  const totalWidth = bars.length * barWidth + (bars.length - 1) * gap
  const startX = (200 - totalWidth) / 2

  return (
    <svg
      viewBox="0 0 200 100"
      className={cn("w-full h-full", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={startX + i * (barWidth + gap)}
          y={95 - bar.height}
          width={barWidth}
          height={bar.height}
          rx={2}
          fill="currentColor"
          className="text-muted animate-pulse"
          style={{ animationDelay: bar.delay }}
        />
      ))}
      {/* X-axis line */}
      <line
        x1="10"
        y1="96"
        x2="190"
        y2="96"
        stroke="currentColor"
        className="text-muted/60"
        strokeWidth="1"
      />
    </svg>
  )
})

BarSkeleton.displayName = "BarSkeleton"
