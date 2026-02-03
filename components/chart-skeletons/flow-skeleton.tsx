"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"

interface FlowSkeletonProps {
  className?: string
}

/**
 * SVG skeleton for sankey/flow/funnel charts
 * Shows rectangles with connecting bands to represent flow data
 */
export const FlowSkeleton = memo(function FlowSkeleton({ className }: FlowSkeletonProps) {
  return (
    <svg
      viewBox="0 0 200 100"
      className={cn("w-full h-full", className)}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Left column nodes */}
      <rect
        x="10"
        y="10"
        width="20"
        height="35"
        rx="3"
        className="fill-muted animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <rect
        x="10"
        y="55"
        width="20"
        height="35"
        rx="3"
        className="fill-muted animate-pulse"
        style={{ animationDelay: "100ms" }}
      />

      {/* Middle column nodes */}
      <rect
        x="90"
        y="5"
        width="20"
        height="25"
        rx="3"
        className="fill-muted animate-pulse"
        style={{ animationDelay: "200ms" }}
      />
      <rect
        x="90"
        y="38"
        width="20"
        height="25"
        rx="3"
        className="fill-muted animate-pulse"
        style={{ animationDelay: "250ms" }}
      />
      <rect
        x="90"
        y="70"
        width="20"
        height="25"
        rx="3"
        className="fill-muted animate-pulse"
        style={{ animationDelay: "300ms" }}
      />

      {/* Right column nodes */}
      <rect
        x="170"
        y="15"
        width="20"
        height="30"
        rx="3"
        className="fill-muted animate-pulse"
        style={{ animationDelay: "350ms" }}
      />
      <rect
        x="170"
        y="55"
        width="20"
        height="30"
        rx="3"
        className="fill-muted animate-pulse"
        style={{ animationDelay: "400ms" }}
      />

      {/* Flow connections (curved bands) */}
      <path
        d="M30,20 C60,20 60,15 90,15"
        fill="none"
        className="stroke-muted/40 animate-pulse"
        strokeWidth="8"
        style={{ animationDelay: "50ms" }}
      />
      <path
        d="M30,35 C60,35 60,50 90,50"
        fill="none"
        className="stroke-muted/40 animate-pulse"
        strokeWidth="6"
        style={{ animationDelay: "150ms" }}
      />
      <path
        d="M30,70 C60,70 60,82 90,82"
        fill="none"
        className="stroke-muted/40 animate-pulse"
        strokeWidth="10"
        style={{ animationDelay: "200ms" }}
      />
      <path
        d="M110,17 C140,17 140,25 170,25"
        fill="none"
        className="stroke-muted/40 animate-pulse"
        strokeWidth="6"
        style={{ animationDelay: "300ms" }}
      />
      <path
        d="M110,50 C140,50 140,35 170,35"
        fill="none"
        className="stroke-muted/40 animate-pulse"
        strokeWidth="5"
        style={{ animationDelay: "350ms" }}
      />
      <path
        d="M110,82 C140,82 140,70 170,70"
        fill="none"
        className="stroke-muted/40 animate-pulse"
        strokeWidth="8"
        style={{ animationDelay: "400ms" }}
      />
    </svg>
  )
})

FlowSkeleton.displayName = "FlowSkeleton"
