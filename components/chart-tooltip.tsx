"use client"

import { memo, useRef, useEffect, useState, type ReactNode, useCallback } from "react"
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
 * - **Smart boundary detection** - flips position to stay within visible area
 * - Uses fixed positioning relative to viewport for accurate boundary detection
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
 * with smart viewport boundary detection
 */
export const ChartTooltipWrapper = memo(function ChartTooltipWrapper({
  children,
  className,
  maxWidth,
}: ChartTooltipWrapperProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [adjustedStyle, setAdjustedStyle] = useState<React.CSSProperties>({})
  const frameRef = useRef<number | null>(null)

  // Adjust tooltip position to stay within viewport
  const adjustPosition = useCallback(() => {
    if (!tooltipRef.current) return

    const tooltip = tooltipRef.current
    const rect = tooltip.getBoundingClientRect()
    const padding = 12 // Minimum padding from viewport edge

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let transform = ''

    // Check right edge overflow
    if (rect.right > viewportWidth - padding) {
      // Flip to left - move tooltip left by its width plus offset
      const overflowX = rect.right - (viewportWidth - padding)
      transform += `translateX(-${overflowX + rect.width + 24}px) `
    }

    // Check bottom edge overflow
    if (rect.bottom > viewportHeight - padding) {
      // Flip to top - move tooltip up by its height plus offset
      const overflowY = rect.bottom - (viewportHeight - padding)
      transform += `translateY(-${overflowY + rect.height + 16}px) `
    }

    // Check left edge (after potential right-edge flip)
    if (rect.left < padding) {
      transform += `translateX(${padding - rect.left}px) `
    }

    // Check top edge (after potential bottom-edge flip)
    if (rect.top < padding) {
      transform += `translateY(${padding - rect.top}px) `
    }

    if (transform) {
      setAdjustedStyle({ transform: transform.trim() })
    } else {
      setAdjustedStyle({})
    }
  }, [])

  useEffect(() => {
    // Run adjustment after render
    frameRef.current = requestAnimationFrame(adjustPosition)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [adjustPosition, children]) // Re-run when children change (tooltip content updates)

  return (
    <div
      ref={tooltipRef}
      className={cn(
        // Base styling - consistent across all charts
        "pointer-events-none rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl",
        // Prevent text selection
        "select-none",
        // Ensure tooltip is above other elements
        "z-[100]",
        // Position relative for transform to work
        "relative",
        className
      )}
      style={{
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
        ...adjustedStyle,
      }}
    >
      {children}
    </div>
  )
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
