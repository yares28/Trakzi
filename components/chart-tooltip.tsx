"use client"

import { memo, useRef, useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

/**
 * Unified tooltip styling for all chart libraries (Recharts and Nivo)
 *
 * This component provides consistent styling and behavior across:
 * - Nivo charts (Pie, Radar, Sankey, TreeMap, etc.)
 * - Can be used as a wrapper for Recharts custom tooltip content
 *
 * Features:
 * - Consistent styling matching the design system
 * - Color indicator dot support
 * - **Smart boundary detection** - renders in portal and flips position to stay visible
 * - Uses mouse position tracking for accurate viewport-aware positioning
 * - Prevents pointer events to avoid tooltip flickering
 */

export interface ChartTooltipWrapperProps {
  children: ReactNode
  className?: string
  /** Maximum width before text wraps (default: none) */
  maxWidth?: number
}

/**
 * Base wrapper for chart tooltips - provides consistent styling
 * Renders in a portal with viewport-aware positioning
 */
export const ChartTooltipWrapper = memo(function ChartTooltipWrapper({
  children,
  className,
  maxWidth,
}: ChartTooltipWrapperProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  // Track mouse position for tooltip placement
  useEffect(() => {
    setMounted(true)

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }

    // Use capture phase to get position before Nivo processes it
    document.addEventListener("mousemove", handleMouseMove, { passive: true })

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  // Calculate position with viewport boundary awareness
  const getTooltipStyle = (): React.CSSProperties => {
    if (!mounted || !tooltipRef.current) {
      return {
        position: "fixed",
        left: position.x + 12,
        top: position.y + 12,
        zIndex: 9999,
        pointerEvents: "none",
      }
    }

    const tooltip = tooltipRef.current
    const rect = tooltip.getBoundingClientRect()
    const padding = 12
    const cursorOffset = 12

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = position.x + cursorOffset
    let top = position.y + cursorOffset

    // Check right edge - flip to left of cursor
    if (left + rect.width > viewportWidth - padding) {
      left = position.x - rect.width - cursorOffset
    }

    // Check bottom edge - flip to above cursor
    if (top + rect.height > viewportHeight - padding) {
      top = position.y - rect.height - cursorOffset
    }

    // Ensure doesn't go off left edge
    if (left < padding) {
      left = padding
    }

    // Ensure doesn't go off top edge
    if (top < padding) {
      top = padding
    }

    return {
      position: "fixed",
      left,
      top,
      zIndex: 9999,
      pointerEvents: "none",
    }
  }

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={cn(
        // Base styling - consistent across all charts
        "rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl",
        // Prevent text selection
        "select-none",
        className
      )}
      style={{
        ...getTooltipStyle(),
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
      }}
    >
      {children}
    </div>
  )

  // Render in portal to escape Nivo's container
  if (!mounted) {
    return null
  }

  return createPortal(tooltipContent, document.body)
})

ChartTooltipWrapper.displayName = "ChartTooltipWrapper"

export interface ChartTooltipRowProps {
  /** Color for the indicator dot */
  color?: string
  /** Label text */
  label: string
  /** Value text (typically formatted currency or number) */
  value?: string
  /** Additional text (percentage, date, etc.) */
  subValue?: string
  /** Hide the color indicator dot */
  hideIndicator?: boolean
}

/**
 * Single row in a chart tooltip with color indicator, label, and value
 */
export const ChartTooltipRow = memo(function ChartTooltipRow({
  color,
  label,
  value,
  subValue,
  hideIndicator = false,
}: ChartTooltipRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {!hideIndicator && color && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/50"
            style={{ backgroundColor: color, borderColor: color }}
          />
        )}
        <span className="font-medium text-foreground whitespace-nowrap">{label}</span>
      </div>
      {(value || subValue) && (
        <div className="text-right">
          {value && (
            <div className="font-mono text-[0.7rem] text-foreground/80">{value}</div>
          )}
          {subValue && (
            <div className="text-[0.7rem] text-foreground/60">{subValue}</div>
          )}
        </div>
      )}
    </div>
  )
})

ChartTooltipRow.displayName = "ChartTooltipRow"

export interface NivoChartTooltipProps {
  /** Title/header of the tooltip */
  title?: string
  /** Color for the title indicator dot */
  titleColor?: string
  /** Hide the title indicator dot */
  hideTitleIndicator?: boolean
  /** Main value displayed below title */
  value?: string
  /** Secondary value (percentage, etc.) */
  subValue?: string
  /** Additional rows for multi-value tooltips */
  rows?: ChartTooltipRowProps[]
  /** Custom content to render instead of structured data */
  children?: ReactNode
  /** Maximum width before text wraps */
  maxWidth?: number
  className?: string
}

/**
 * Pre-built tooltip component for Nivo charts
 * Use this instead of inline tooltip functions for consistency
 *
 * Features:
 * - **Portal-based rendering** - escapes Nivo's container for proper positioning
 * - Automatic viewport boundary detection - flips position when near edges
 * - Consistent styling across all charts
 * - Supports single values, percentages, and multi-row data
 *
 * @example Simple tooltip
 * ```tsx
 * tooltip={({ datum }) => (
 *   <NivoChartTooltip
 *     title={datum.label}
 *     titleColor={datum.color}
 *     value={formatCurrency(datum.value)}
 *     subValue={`${percentage.toFixed(1)}%`}
 *   />
 * )}
 * ```
 *
 * @example Multi-row tooltip (like radar chart)
 * ```tsx
 * tooltip={({ data }) => (
 *   <NivoChartTooltip
 *     title="Category Name"
 *     rows={data.map(item => ({
 *       color: item.color,
 *       label: item.id,
 *       value: formatCurrency(item.value)
 *     }))}
 *   />
 * )}
 * ```
 */
export const NivoChartTooltip = memo(function NivoChartTooltip({
  title,
  titleColor,
  hideTitleIndicator = false,
  value,
  subValue,
  rows,
  children,
  maxWidth = 300,
  className,
}: NivoChartTooltipProps) {
  // If children are provided, render them directly
  if (children) {
    return (
      <ChartTooltipWrapper maxWidth={maxWidth} className={className}>
        {children}
      </ChartTooltipWrapper>
    )
  }

  return (
    <ChartTooltipWrapper maxWidth={maxWidth} className={className}>
      {/* Title with optional color indicator */}
      {title && (
        <div className="flex items-center gap-2">
          {!hideTitleIndicator && titleColor && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/50"
              style={{ backgroundColor: titleColor, borderColor: titleColor }}
            />
          )}
          <span className="font-medium text-foreground">{title}</span>
        </div>
      )}

      {/* Single value display */}
      {value && (
        <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{value}</div>
      )}
      {subValue && (
        <div className="mt-0.5 text-[0.7rem] text-foreground/60">{subValue}</div>
      )}

      {/* Multiple rows */}
      {rows && rows.length > 0 && (
        <div className={cn("space-y-1.5", title && "mt-2")}>
          {rows.map((row, index) => (
            <ChartTooltipRow key={`${row.label}-${index}`} {...row} />
          ))}
        </div>
      )}
    </ChartTooltipWrapper>
  )
})

NivoChartTooltip.displayName = "NivoChartTooltip"
