"use client"

import { useMemo, memo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useTheme } from "next-themes"

import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
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
  ChartTooltip,
  ChartTooltipContent,
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
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"

  // Memoize palette computation
  const { categoryColor, categoryBorderColor } = useMemo(() => {
    const palette = getPalette().filter((color) => color !== "#c3c3c3")
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
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-w-0 overflow-hidden flex-1 min-h-0">
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
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return formatDateForDisplay(String(value), "en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
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
      </CardContent>
    </Card>
  )
})
