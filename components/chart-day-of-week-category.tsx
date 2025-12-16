"use client"

import * as React from "react"
import ReactECharts from "echarts-for-react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ChartDayOfWeekCategoryProps {
  dateFilter?: string | null
}

type DayOfWeekData = {
  category: string
  dayOfWeek: number
  total: number
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function ChartDayOfWeekCategory({ dateFilter }: ChartDayOfWeekCategoryProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette, colorScheme } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = React.useState(false)
  const [data, setData] = React.useState<DayOfWeekData[]>([])
  const [availableDays, setAvailableDays] = React.useState<number[]>([])
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)
  const chartRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = React.useState<{ label: string; value: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)
  const mousePositionRef = React.useRef<{ x: number; y: number } | null>(null)

  React.useEffect(() => {
    // Mark as mounted to avoid rendering chart on server
    setMounted(true)
  }, [])

  // Fetch available days first (without selected day) when dateFilter changes
  React.useEffect(() => {
    const fetchAvailableDays = async () => {
      try {
        const params = new URLSearchParams()
        if (dateFilter) {
          params.append("filter", dateFilter)
        }

        const result = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          `/api/analytics/day-of-week-category?${params.toString()}`
        )
        const days = result.availableDays || []
        setAvailableDays(days)

        // Reset selected day to first available when date filter changes
        if (days.length > 0) {
          setSelectedDay((prev) => {
            // Only update if current selection is not in the new list
            if (prev === null || !days.includes(prev)) {
              return days[0]
            }
            return prev
          })
        } else {
          setSelectedDay(null)
        }
      } catch (error) {
        console.error("Error fetching available days:", error)
        setAvailableDays([])
        setSelectedDay(null)
      }
    }

    if (mounted) {
      fetchAvailableDays()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, mounted])

  // Fetch data when selectedDay changes
  React.useEffect(() => {
    const fetchData = async () => {
      if (selectedDay === null) {
        setData([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (dateFilter) {
          params.append("filter", dateFilter)
        }
        params.append("dayOfWeek", selectedDay.toString())

        const result = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          `/api/analytics/day-of-week-category?${params.toString()}`
        )
        const fetchedData = result.data || []

        // If data is empty and there are other available days, try to find one with data
        if (fetchedData.length === 0 && availableDays.length > 1) {
          const currentIndex = availableDays.indexOf(selectedDay)
          // Try other days in order (starting from the first)
          for (const day of availableDays) {
            if (day === selectedDay) continue

            const altParams = new URLSearchParams()
            if (dateFilter) {
              altParams.append("filter", dateFilter)
            }
            altParams.append("dayOfWeek", day.toString())

            const altResult = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
              `/api/analytics/day-of-week-category?${altParams.toString()}`
            )

            if (altResult.data && altResult.data.length > 0) {
              setSelectedDay(day)
              setData(altResult.data)
              setLoading(false)
              return
            }
          }
        }

        setData(fetchedData)
      } catch (error) {
        console.error("Error fetching day of week category data:", error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    if (mounted && selectedDay !== null) {
      fetchData()
    }
  }, [selectedDay, dateFilter, mounted, availableDays])

  const palette = React.useMemo(() => {
    let base = getPalette().filter((color) => color !== "#c3c3c3")

    // For colored palette only, filter colors based on theme
    if (colorScheme === "colored") {
      const isDark = resolvedTheme === "dark"
      if (isDark) {
        // Dark mode: exclude "#2F1B15"
        base = base.filter((color) => color !== "#2F1B15")
      } else {
        // Light mode: exclude "#E8DCCA"
        base = base.filter((color) => color !== "#E8DCCA")
      }
    }

    if (!base.length) {
      return ["#0f766e", "#14b8a6", "#22c55e", "#84cc16", "#eab308"]
    }
    return base
  }, [getPalette, colorScheme, resolvedTheme])



  // ECharts event handlers for custom tooltip
  const handleChartMouseOver = React.useCallback(
    (params: any) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      let mouseX = 0
      let mouseY = 0
      const ecEvent = (params && (params.event?.event || params.event)) as
        | (MouseEvent & { offsetX?: number; offsetY?: number })
        | undefined

      if (ecEvent) {
        if (
          typeof ecEvent.clientX === "number" &&
          typeof ecEvent.clientY === "number"
        ) {
          mouseX = ecEvent.clientX - rect.left
          mouseY = ecEvent.clientY - rect.top
        } else if (
          typeof ecEvent.offsetX === "number" &&
          typeof ecEvent.offsetY === "number"
        ) {
          mouseX = ecEvent.offsetX
          mouseY = ecEvent.offsetY
        }
      }

      const position = { x: mouseX, y: mouseY }
      mousePositionRef.current = position
      setTooltipPosition(position)

      if (params && params.name) {
        const category = params.name || ""
        let value = 0
        if (Array.isArray(params.value)) {
          value = params.value[1] || params.value[0] || 0
        } else if (params.data && Array.isArray(params.data)) {
          value = params.data[1] || 0
        } else {
          value = params.value || 0
        }
        const index = params.dataIndex || 0
        const color = palette[index % palette.length]

        setTooltip({
          label: category,
          value,
          color,
        })
      }
    },
    [palette],
  )

  const handleChartMouseOut = React.useCallback(() => {
    setTooltip(null)
    setTooltipPosition(null)
    mousePositionRef.current = null
  }, [])

  const chartEvents = React.useMemo(
    () => ({
      mouseover: handleChartMouseOver,
      mouseout: handleChartMouseOut,
      // Ensure tooltip clears even if the cursor leaves the chart entirely
      globalout: handleChartMouseOut,
    }),
    [handleChartMouseOver, handleChartMouseOut],
  )

  // Track mouse movement continuously for tooltip positioning
  React.useEffect(() => {
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

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [tooltip])

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Day of Week Category Spending"
        description="Compare spending across categories for a selected day of the week."
        details={[
          "Each bar represents total spending in a category for the selected day of the week.",
          "Only the most spent categories are shown for each day.",
          "Use the day selector to switch between different days of the week.",
        ]}
        ignoredFootnote="Only expense transactions (amount < 0) are included."
      />
      <ChartAiInsightButton
        chartId="dayOfWeekCategory"
        chartTitle="Day of Week Category Spending"
        chartDescription="Compare spending across categories for a selected day of the week."
        size="sm"
      />
    </div>
  )

  const option = React.useMemo(() => {
    if (!data.length || selectedDay === null) return null

    // Data is already filtered to selected day and sorted by total descending
    // Get top categories (already sorted by API)
    const topCategories = data.slice(0, 10) // Show top 10 categories

    if (!topCategories.length) return null

    // Precompute a stable color for each category index so we don't
    // recalculate it inside render paths.
    const barColors = topCategories.map((_, index) => palette[index % palette.length])

    // Build dataset source
    const datasetSource: any[] = [["category", "Amount"]]
    topCategories.forEach((item) => {
      datasetSource.push([item.category, item.total])
    })

    const backgroundColor =
      resolvedTheme === "dark" ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"

    // Use muted-foreground color for axis labels
    const textColor = resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"

    return {
      backgroundColor,
      textStyle: {
        color: textColor,
      },
      legend: {
        show: false,
      },
      tooltip: {
        show: false, // Disable default ECharts tooltip
      },
      dataset: {
        source: datasetSource,
      },
      xAxis: {
        type: "category",
        axisLabel: {
          rotate: 45,
          interval: 0,
          color: textColor,
        },
        axisTick: {
          lineStyle: {
            color: textColor,
          },
        },
        axisLine: {
          lineStyle: {
            color: textColor,
          },
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 }),
          color: textColor,
        },
        axisTick: {
          lineStyle: {
            color: textColor,
          },
        },
        axisLine: {
          lineStyle: {
            color: textColor,
          },
        },
        splitLine: {
          lineStyle: {
            color: resolvedTheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          },
        },
      },
      series: [
        {
          type: "bar",
          itemStyle: {
            color: (params: any) => {
              const index = params.dataIndex
              return barColors[index] ?? palette[index % palette.length]
            },
          },
        },
      ],
    }
  }, [data, selectedDay, palette, resolvedTheme])

  // Ensure tooltip clears when leaving the chart canvas entirely
  React.useEffect(() => {
    if (!chartRef.current) return
    const instance = chartRef.current.getEchartsInstance?.()
    if (!instance || !instance.getZr) return

    const zr = instance.getZr()
    const handleGlobalOut = () => {
      setTooltip(null)
      setTooltipPosition(null)
      mousePositionRef.current = null
    }

    zr.on("globalout", handleGlobalOut)
    return () => {
      zr.off("globalout", handleGlobalOut)
    }
  }, [])

  // Memoize the heavy chart element so tooltip state changes
  // do not cause the ECharts instance to be recreated.
  const chartElement = React.useMemo(() => {
    if (!option) return null
    return (
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "svg" }}
        notMerge={true}
        onEvents={chartEvents}
      />
    )
  }, [option, chartEvents])

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState isLoading />
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState isLoading />
        </CardContent>
      </Card>
    )
  }

  if (!availableDays.length || selectedDay === null) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState isLoading={loading} />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartFavoriteButton
            chartId="dayOfWeekCategory"
            chartTitle="Day of Week Category Spending"
            size="md"
          />
          <CardTitle>Day of Week Category Spending</CardTitle>
        </div>
        <CardDescription>Compare spending across categories by day</CardDescription>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
          <Select
            value={selectedDay !== null ? selectedDay.toString() : ""}
            onValueChange={(value) => setSelectedDay(parseInt(value, 10))}
          >
            <SelectTrigger
              className="w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select day of week"
            >
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableDays.map((day) => (
                <SelectItem key={day} value={day.toString()} className="rounded-lg">
                  {DAY_NAMES[day]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        {option && data.length > 0 ? (
          <div className="h-full w-full flex flex-col">
            <div className="mb-2 text-sm font-medium text-foreground text-center">
              Total: {formatCurrency(data.reduce((sum, item) => sum + item.total, 0))}
            </div>
            <div ref={containerRef} className="relative flex-1 min-h-0" style={{ minHeight: 0, minWidth: 0 }}>
              {chartElement}
              {tooltip && tooltipPosition && (
                <div
                  className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: Math.min(Math.max(tooltipPosition.x + 16, 8), (containerRef.current?.clientWidth || 800) - 8),
                    top: Math.min(Math.max(tooltipPosition.y - 16, 8), (containerRef.current?.clientHeight || 250) - 8),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-border/50"
                      style={{ backgroundColor: tooltip.color, borderColor: tooltip.color }}
                    />
                    <span className="font-medium text-foreground whitespace-nowrap">{tooltip.label}</span>
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                    {formatCurrency(tooltip.value)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No data for selected day
          </div>
        )}
      </CardContent>
    </Card>
  )
}
