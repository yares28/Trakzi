"use client"

import { useMemo, memo, useState, useRef, useEffect } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, TooltipProps } from "recharts"
import { useTheme } from "next-themes"

import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"
import { formatDateForDisplay } from "@/lib/date"

interface ChartDataPoint {
  date: string
  value: number
}

interface ChartCategoryTrendProps {
  categoryName: string
  /** Pre-computed chart data from parent - eliminates per-chart fetching */
  data?: ChartDataPoint[]
}

/**
 * Category trend chart component - memoized to prevent unnecessary rerenders
 * Now accepts data as a prop instead of self-fetching (eliminates N+1 calls)
 */
export const ChartCategoryTrend = memo(function ChartCategoryTrend({
  categoryName,
  data
}: ChartCategoryTrendProps) {
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"

  // Custom tooltip state (same pattern as chart-area-interactive-fridge.tsx)
  const [tooltip, setTooltip] = useState<{ date: string; value: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null)

  // Memoize palette computation
  const { categoryColor, categoryBorderColor } = useMemo(() => {
    const palette = getPalette()
    const reversedPalette = [...palette].reverse()
    const categoryColorIndex =
      categoryName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      reversedPalette.length
    return {
      categoryColor: reversedPalette[categoryColorIndex] || reversedPalette[reversedPalette.length - 1],
      categoryBorderColor: reversedPalette[Math.max(0, categoryColorIndex - 1)] || reversedPalette[0]
    }
  }, [categoryName, getPalette])

  // Memoize chart config
  const chartConfig = useMemo(() => ({
    value: {
      label: categoryName,
      color: categoryColor,
    },
  } satisfies ChartConfig), [categoryName, categoryColor])

  // Memoize gradient ID
  const gradientId = useMemo(
    () => `fill-${categoryName.replace(/\s+/g, "-")}`,
    [categoryName]
  )

  // Track mouse movement for smooth tooltip positioning
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
      mousePositionRef.current = position
      if (tooltip) {
        setTooltipPosition(position)
      }
    }

    const handleMouseLeave = () => {
      setTooltip(null)
      setTooltipPosition(null)
      mousePositionRef.current = null
    }

    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [tooltip])

  const renderInfoAction = () => (
    <ChartInfoPopover
      title={`${categoryName} Spending Trend`}
      description={`Daily spending for ${categoryName} over time.`}
      details={[
        "This chart shows your daily expenses for this category.",
        "Only negative transactions (expenses) are included.",
      ]}
    />
  )

  // Hide chart if no data
  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card className="@container/card h-full w-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>{categoryName}</CardTitle>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoAction()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-w-0 flex-1 min-h-0">
        <div ref={containerRef} className="relative h-full w-full">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-full w-full min-w-0"
          >
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={categoryColor}
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor={categoryColor}
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridStrokeColor} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  return formatDateForDisplay(String(value), "en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <Tooltip
                cursor={false}
                content={(props: TooltipProps<number, string>) => {
                  const { active, payload, coordinate } = props

                  if (!active || !payload || !payload.length || !coordinate) {
                    queueMicrotask(() => {
                      setTooltip(null)
                      setTooltipPosition(null)
                    })
                    return null
                  }

                  const dataPoint = payload[0].payload
                  const date = dataPoint.date
                  const value = dataPoint.value || 0

                  if (containerRef.current && coordinate) {
                    const basePosition = mousePositionRef.current ?? {
                      x: coordinate.x ?? 0,
                      y: coordinate.y ?? 0,
                    }

                    queueMicrotask(() => {
                      setTooltipPosition(basePosition)
                      setTooltip({ date, value })
                    })
                  }

                  return null
                }}
              />
              <Area
                dataKey="value"
                type="natural"
                fill={`url(#${gradientId})`}
                stroke={categoryBorderColor}
                strokeWidth={1}
              />
            </AreaChart>
          </ChartContainer>
          {tooltip && tooltipPosition && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
              style={{
                left: `${(tooltipPosition.x ?? 0) + 16}px`,
                top: `${(tooltipPosition.y ?? 0) - 16}px`,
                transform: 'translate(0, -100%)',
              }}
            >
              <div className="font-medium text-foreground mb-2 whitespace-nowrap">
                {formatDateForDisplay(tooltip.date, "en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-border/50"
                  style={{ backgroundColor: categoryColor, borderColor: categoryColor }}
                />
                <span className="text-foreground/80">{categoryName}:</span>
                <span className="font-mono text-[0.7rem] text-foreground font-medium">
                  {formatCurrency(tooltip.value)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

