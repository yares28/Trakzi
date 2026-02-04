"use client"

// Single Month Category Spending Chart - Shows one selected month at a time
import * as React from "react"
import ReactECharts from "echarts-for-react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { deduplicatedFetch, getCachedResponse } from "@/lib/request-deduplication"
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
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

interface ChartSingleMonthCategorySpendingProps {
  dateFilter?: string | null
  monthlyCategoriesData?: Array<{ category: string; month: string | number; total: number }>
  bundleLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

type MonthData = {
  category: string
  month: number
  total: number
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const SHORT_MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse "Jan 2024" or "Jan" to month number 1-12
const parseMonthToNumber = (m: string | number): number => {
  if (typeof m === 'number') return m
  const monthStr = String(m).split(' ')[0] // Extract "Jan" from "Jan 2024"
  const idx = SHORT_MONTH_NAMES.indexOf(monthStr)
  return idx >= 0 ? idx + 1 : 1
}

// Transform and aggregate bundle data by month number (combines all years)
const aggregateBundleData = (
  data: Array<{ category: string; month: string | number; total: number }>
): MonthData[] => {
  const aggregated = new Map<string, Map<number, number>>() // category -> (month -> total)

  data.forEach((d) => {
    const monthNum = parseMonthToNumber(d.month)
    if (!aggregated.has(d.category)) {
      aggregated.set(d.category, new Map())
    }
    const categoryMap = aggregated.get(d.category)!
    categoryMap.set(monthNum, (categoryMap.get(monthNum) || 0) + d.total)
  })

  const result: MonthData[] = []
  aggregated.forEach((monthMap, category) => {
    monthMap.forEach((total, month) => {
      result.push({ category, month, total })
    })
  })
  return result
}

const buildMonthlyCategoryUrl = (params: URLSearchParams) =>
  `/api/analytics/monthly-category-duplicate?${params.toString()}`

export const ChartSingleMonthCategorySpending = React.memo(function ChartSingleMonthCategorySpending({
  dateFilter,
  monthlyCategoriesData,
  bundleLoading,
  emptyTitle,
  emptyDescription
}: ChartSingleMonthCategorySpendingProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const buildMonthParams = React.useCallback(
    (month?: number | null) => {
      const params = new URLSearchParams()
      if (dateFilter) {
        params.append("filter", dateFilter)
      }
      if (typeof month === "number") {
        params.append("month", month.toString())
      }
      return params
    },
    [dateFilter],
  )
  const availableUrl = buildMonthlyCategoryUrl(buildMonthParams())
  const cachedAvailable = getCachedResponse<{
    data: Array<{ category: string; month: number; total: number }>
    availableMonths: number[]
  }>(availableUrl)
  const initialAvailableMonths = cachedAvailable?.availableMonths ?? []
  const initialSelectedMonth =
    initialAvailableMonths.length > 0 ? initialAvailableMonths[0] : null
  const cachedSelected = initialSelectedMonth !== null
    ? getCachedResponse<{
      data: Array<{ category: string; month: number; total: number }>
      availableMonths: number[]
    }>(buildMonthlyCategoryUrl(buildMonthParams(initialSelectedMonth)))
    : undefined
  const [mounted, setMounted] = React.useState(false)
  const [data, setData] = React.useState<MonthData[]>(
    () => cachedSelected?.data ?? [],
  )
  const [availableMonths, setAvailableMonths] = React.useState<number[]>(
    () => initialAvailableMonths,
  )
  const [selectedMonth, setSelectedMonth] = React.useState<number | null>(
    () => initialSelectedMonth,
  )
  const [loading, setLoading] = React.useState(
    () => initialAvailableMonths.length > 0 && cachedSelected === undefined,
  )
  const chartRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = React.useState<{ label: string; value: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)
  const mousePositionRef = React.useRef<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [refreshNonce, setRefreshNonce] = React.useState(0)
  // Track if initial animation has completed to prevent replay on theme hydration
  const hasAnimatedRef = React.useRef(false)

  React.useEffect(() => {
    // Mark as mounted to avoid rendering chart on server
    setMounted(true)
  }, [])

  // Listen for transactions updated event (triggered after file uploads)
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const handleTransactionsUpdated = () => {
      // Increment nonce to trigger a refetch
      setRefreshNonce((n) => n + 1)
    }

    window.addEventListener("transactionsUpdated", handleTransactionsUpdated)
    return () => {
      window.removeEventListener("transactionsUpdated", handleTransactionsUpdated)
    }
  }, [])

  // Fetch available months first (without selected month) when dateFilter changes
  React.useEffect(() => {
    // If parent provides bundleLoading prop, it's using the bundle system
    if (bundleLoading !== undefined) {
      // Still loading - wait
      if (bundleLoading) {
        setLoading(true)
        return
      }
      // Use monthlyCategoriesData if provided
      if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
        // Transform bundle data: parse "Mon YYYY" strings to month numbers and aggregate across years
        const normalizedData = aggregateBundleData(monthlyCategoriesData)
        const months = [...new Set(normalizedData.map(d => d.month))].sort((a, b) => a - b)
        setAvailableMonths(months)
        if (months.length > 0) {
          setSelectedMonth((prev) => {
            if (prev === null || !months.includes(prev)) {
              return months[0]
            }
            return prev
          })
        } else {
          setSelectedMonth(null)
        }
        setLoading(false)
        return
      }
      // Bundle returned empty
      setAvailableMonths([])
      setSelectedMonth(null)
      setLoading(false)
      return
    }

    // Fallback: parent doesn't use bundle system

    const fetchAvailableMonths = async () => {
      try {
        const cached = getCachedResponse<{ data: Array<{ category: string; month: number; total: number }>; availableMonths: number[] }>(
          availableUrl,
        )
        if (cached) {
          const months = cached.availableMonths || []
          setAvailableMonths(months)

          if (months.length > 0) {
            setSelectedMonth((prev) => {
              if (prev === null || !months.includes(prev)) {
                return months[0]
              }
              return prev
            })
          } else {
            setSelectedMonth(null)
            setLoading(false)
          }
          return
        }

        const result = await deduplicatedFetch<{ data: Array<{ category: string; month: number; total: number }>; availableMonths: number[] }>(
          availableUrl
        )
        const months = result.availableMonths || []
        setAvailableMonths(months)

        // Reset selected month to first available when date filter changes
        if (months.length > 0) {
          setSelectedMonth((prev) => {
            // Only update if current selection is not in the new list
            if (prev === null || !months.includes(prev)) {
              return months[0]
            }
            return prev
          })
        } else {
          // No months available - set loading to false so we show empty state
          setSelectedMonth(null)
          setLoading(false)
        }
      } catch (error) {
        console.error("Error fetching available months:", error)
        setAvailableMonths([])
        setSelectedMonth(null)
        setLoading(false)
      }
    }

    if (mounted) {
      fetchAvailableMonths()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, mounted, availableUrl, refreshNonce, monthlyCategoriesData, bundleLoading])

  // Fetch data when selectedMonth changes
  React.useEffect(() => {
    // If parent provides bundleLoading prop, it's using the bundle system
    if (bundleLoading !== undefined) {
      // Still loading - wait
      if (bundleLoading) {
        return
      }
      // Use bundleData if available
      if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
        // Transform bundle data: parse "Mon YYYY" strings to month numbers and aggregate across years
        const normalizedData = aggregateBundleData(monthlyCategoriesData)
        if (selectedMonth === null) {
          setData([])
        } else {
          const filtered = normalizedData.filter(d => d.month === selectedMonth)
          setData(filtered)
        }
        setLoading(false)
        return
      }
      // Bundle returned empty
      setData([])
      setLoading(false)
      return
    }

    // Fallback: parent doesn't use bundle system

    const fetchData = async () => {
      if (selectedMonth === null) {
        setData([])
        setLoading(false)
        return
      }

      const dataUrl = buildMonthlyCategoryUrl(buildMonthParams(selectedMonth))
      const cached = getCachedResponse<{ data: Array<{ category: string; month: number; total: number }>; availableMonths: number[] }>(
        dataUrl,
      )
      if (cached) {
        setData(cached.data || [])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await deduplicatedFetch<{ data: Array<{ category: string; month: number; total: number }>; availableMonths: number[] }>(
          dataUrl
        )
        const fetchedData = result.data || []

        // If data is empty and there are other available months, try to find one with data
        if (fetchedData.length === 0 && availableMonths.length > 1) {
          // Try other months in order (starting from the first)
          for (const month of availableMonths) {
            if (month === selectedMonth) continue

            const altUrl = buildMonthlyCategoryUrl(buildMonthParams(month))
            const cachedAlt = getCachedResponse<{ data: Array<{ category: string; month: number; total: number }>; availableMonths: number[] }>(
              altUrl,
            )
            if (cachedAlt?.data && cachedAlt.data.length > 0) {
              setSelectedMonth(month)
              setData(cachedAlt.data)
              setLoading(false)
              return
            }

            const altResult = await deduplicatedFetch<{ data: Array<{ category: string; month: number; total: number }>; availableMonths: number[] }>(
              altUrl
            )

            if (altResult.data && altResult.data.length > 0) {
              setSelectedMonth(month)
              setData(altResult.data)
              setLoading(false)
              return
            }
          }
        }

        setData(fetchedData)
      } catch (error) {
        console.error("Error fetching month category data:", error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    if (mounted && selectedMonth !== null) {
      fetchData()
    }
  }, [selectedMonth, dateFilter, mounted, availableMonths, buildMonthParams, refreshNonce, monthlyCategoriesData, bundleLoading])

  // Palette is ordered dark → light. For better contrast:
  // - Dark mode: skip first color (darkest) so bars are visible against dark background
  // - Light mode: skip last color (lightest) so bars are visible against light background
  const palette = React.useMemo(() => {
    const base = getPalette().filter((color) => color !== "#c3c3c3")
    if (!base.length) {
      return ["#0f766e", "#14b8a6", "#22c55e", "#84cc16", "#eab308"]
    }
    if (resolvedTheme === "dark") {
      return base.slice(1)
    }
    return base.slice(0, -1)
  }, [getPalette, resolvedTheme])


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

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Single Month Category Spending"
        description="Compare spending across categories for a selected month."
        details={[
          "Each bar represents total spending in a category for the selected month.",
          "Use the month selector to switch between different months.",
          "Only the most spent categories are shown for each month.",
        ]}
        ignoredFootnote="Only expense transactions (amount < 0) are included."
      />
      <ChartAiInsightButton
        chartId="singleMonthCategorySpending"
        chartTitle="Single Month Category Spending"
        chartDescription="Compare spending across categories for a selected month."
        size="sm"
      />
    </div>
  )

  const option = React.useMemo(() => {
    if (!data.length || selectedMonth === null) return null

    // Data is already filtered to selected month and sorted by total descending
    // Get top categories (already sorted by API)
    const topCategories = data.slice(0, 10) // Show top 10 categories

    if (!topCategories.length) return null

    // Build dataset source
    const datasetSource: any[] = [["category", "Amount"]]
    topCategories.forEach((item) => {
      datasetSource.push([item.category, item.total])
    })

    const backgroundColor =
      resolvedTheme === "dark" ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"

    // Use muted-foreground color for axis labels
    const textColor = resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"

    // Disable animation after first render to prevent replay on theme hydration
    // Set ref synchronously to prevent race condition with theme changes
    const shouldAnimate = !hasAnimatedRef.current
    if (shouldAnimate) {
      hasAnimatedRef.current = true
    }

    return {
      backgroundColor,
      animation: shouldAnimate,
      animationDuration: shouldAnimate ? 1000 : 0,
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
              return palette[index % palette.length]
            },
          },
        },
      ],
    }
  }, [data, selectedMonth, palette, resolvedTheme])

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
              chartId="singleMonthCategorySpending"
              chartTitle="Single Month Category Spending"
              size="md"
            />
            <CardTitle>Single Month Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
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
              chartId="singleMonthCategorySpending"
              chartTitle="Single Month Category Spending"
              size="md"
            />
            <CardTitle>Single Month Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  if (!availableMonths.length || selectedMonth === null) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="singleMonthCategorySpending"
              chartTitle="Single Month Category Spending"
              size="md"
            />
            <CardTitle>Single Month Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            skeletonType="bar"
            emptyTitle={emptyTitle || "No monthly data yet"}
            emptyDescription={emptyDescription || "Import your bank statements to see monthly category spending"}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Single Month Category Spending"
        description="Compare spending across categories for a selected month"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
          Fullscreen view - Select a month to see category breakdown
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="singleMonthCategorySpending"
              chartTitle="Single Month Category Spending"
              size="md"
            />
            <CardTitle>Single Month Category Spending</CardTitle>
          </div>
          <CardDescription>Compare spending across categories by month</CardDescription>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Select
              value={selectedMonth !== null ? selectedMonth.toString() : ""}
              onValueChange={(value) => setSelectedMonth(parseInt(value, 10))}
            >
              <SelectTrigger
                className="w-32"
                size="sm"
                aria-label="Select month"
              >
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month.toString()} className="rounded-lg">
                    {MONTH_NAMES[month - 1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {renderInfoTrigger()}
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
            <ChartLoadingState
              skeletonType="bar"
              emptyTitle={emptyTitle || "No spending data"}
              emptyDescription={emptyDescription || "No transactions recorded for this month yet"}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
})

ChartSingleMonthCategorySpending.displayName = "ChartSingleMonthCategorySpending"
