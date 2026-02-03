"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface PieSkeletonProps {
  className?: string
}

/**
 * SVG skeleton for pie/donut/polar/ring charts
 * Shows segmented donut ring to represent circular data
 */
export const PieSkeleton = memo(function PieSkeleton({ className }: PieSkeletonProps) {
  // Create donut segments at different angles
  const segments = [
    { start: 0, end: 90, delay: "0ms", opacity: 1 },
    { start: 90, end: 160, delay: "80ms", opacity: 0.8 },
    { start: 160, end: 220, delay: "160ms", opacity: 0.6 },
    { start: 220, end: 280, delay: "240ms", opacity: 0.7 },
    { start: 280, end: 360, delay: "320ms", opacity: 0.5 },
  ]

  // Helper to convert angle to SVG arc path
  const describeArc = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const cx = 50
    const cy = 50
    const startRad = (startAngle - 90) * (Math.PI / 180)
    const endRad = (endAngle - 90) * (Math.PI / 180)

    const x1 = cx + outerRadius * Math.cos(startRad)
    const y1 = cy + outerRadius * Math.sin(startRad)
    const x2 = cx + outerRadius * Math.cos(endRad)
    const y2 = cy + outerRadius * Math.sin(endRad)
    const x3 = cx + innerRadius * Math.cos(endRad)
    const y3 = cy + innerRadius * Math.sin(endRad)
    const x4 = cx + innerRadius * Math.cos(startRad)
    const y4 = cy + innerRadius * Math.sin(startRad)

    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("w-full h-full", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {segments.map((segment, i) => (
        <path
          key={i}
          d={describeArc(segment.start + 2, segment.end - 2, 20, 38)}
          fill="currentColor"
          className="text-muted animate-pulse"
          style={{
            animationDelay: segment.delay,
            opacity: segment.opacity
          }}
        />
      ))}
    </svg>
  )
})

PieSkeleton.displayName = "PieSkeleton"
