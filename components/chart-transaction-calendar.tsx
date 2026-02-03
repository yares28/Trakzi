"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import ReactECharts from "echarts-for-react"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { formatDateForDisplay } from "@/lib/date"
import { deduplicatedFetch, getCachedResponse } from "@/lib/request-deduplication"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import {
  FALLBACK_DATE_FILTER,
  normalizeDateFilterValue,
} from "@/lib/date-filter"

interface ChartTransactionCalendarProps {
  data?: Array<{
    day: string
    value: number
  }>
  dateFilter?: string | null
  emptyTitle?: string
  emptyDescription?: string
}

const getRangeForFilter = (filter: string) => {
  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  switch (filter) {
    case "last7days": {
      const start = new Date(today)
      start.setDate(start.getDate() - 7)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    case "last30days": {
      const start = new Date(today)
      start.setDate(start.getDate() - 30)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    case "last3months": {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 3)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    case "last6months": {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 6)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    case "lastyear": {
      const start = new Date(today)
      start.setFullYear(start.getFullYear() - 1)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    default: {
      if (/^\d{4}$/.test(filter)) {
        return {
          fromDate: `${filter}-01-01`,
          toDate: `${filter}-12-31`,
        }
      }
      return null
    }
  }
}


export const ChartTransactionCalendar = React.memo(function ChartTransactionCalendar({
  data: propData,
  dateFilter: propDateFilter,
  emptyTitle,
  emptyDescription
}: ChartTransactionCalendarProps) {
  const { resolvedTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Daily Transaction Activity"
        description="Your spending patterns throughout the year - darker means more transactions"
        details={[
          "Each cell represents a day, colored by the total amount you spent.",
          "We pull expense-only data from /api/transactions/daily so income, transfers, and savings moves are excluded."
        ]}
        ignoredFootnote="The API filters to negative transactions only and trims out internal transfers and savings deposits."
      />
      <ChartAiInsightButton
        chartId="dailyTransactionActivity"
        chartTitle="Daily Transaction Activity"
        chartDescription="Your spending patterns throughout the year - darker means more transactions"
        size="sm"
      />
    </div>
  )
  const { colorScheme, getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  // Determine the date filter to use: prop > local state
  const [localDateFilter, setLocalDateFilter] = useState<string | null>(null)
  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter
  const effectiveDateFilter = normalizeDateFilterValue(
    dateFilter,
    FALLBACK_DATE_FILTER,
  )
  const dailyUrl = `/api/transactions/daily?filter=${encodeURIComponent(effectiveDateFilter)}`
  const cachedDaily = propData
    ? undefined
    : getCachedResponse<Array<{ day: string; value: number }>>(dailyUrl)
  const [allData, setAllData] = useState<Array<{ day: string; value: number }>>(
    () => propData ?? cachedDaily ?? [],
  )
  const [isLoading, setIsLoading] = useState(
    () => !propData && cachedDaily === undefined,
  )
  const [error, setError] = useState<string | null>(null)
  const chartRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ date: string; value: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  // Track if we've received a real mouse position to prevent flash at top-left
  const [hasValidPosition, setHasValidPosition] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const isGlobalFilterActive = Boolean(dateFilter)

  // Listen for global date filter changes (only if prop is not provided)
  useEffect(() => {
    if (propData) return
    if (propDateFilter !== undefined) return // Don't use event listener if prop is explicitly passed
    if (typeof window === "undefined") return

    const saved = window.localStorage.getItem("dateFilter")
    setLocalDateFilter(normalizeDateFilterValue(saved, FALLBACK_DATE_FILTER))

    const handleFilterChange = (event: Event) => {
      const detail = (event as CustomEvent).detail
      setLocalDateFilter(normalizeDateFilterValue(detail, FALLBACK_DATE_FILTER))
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)
    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [propData, propDateFilter])

  // Listen for transactions updated event (triggered after file uploads)
  useEffect(() => {
    if (propData) return
    if (typeof window === "undefined") return

    const handleTransactionsUpdated = () => {
      // Increment nonce to trigger a refetch
      setRefreshNonce((n) => n + 1)
    }

    window.addEventListener("transactionsUpdated", handleTransactionsUpdated)
    return () => {
      window.removeEventListener("transactionsUpdated", handleTransactionsUpdated)
    }
  }, [propData])

  // Fetch data from Neon database
  useEffect(() => {
    // If data is provided as prop, use it and don't fetch
    if (propData) {
      setAllData(propData)
      setIsLoading(false)
      return
    }
    const fetchDailyTransactions = async () => {
      const cached = getCachedResponse<Array<{ day: string; value: number }>>(dailyUrl)
      if (cached !== undefined) {
        setAllData(cached)
        setError(null)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const data = await deduplicatedFetch<Array<{ day: string; value: number }>>(dailyUrl)
        if (Array.isArray(data)) {
          setAllData(data)
          if (data.length === 0) {
            setError("No transaction data available for the selected period")
          }
        } else {
          console.error("[ChartTransactionCalendar] Invalid data format:", data)
          setAllData([])
          setError("Invalid data format received from server")
        }
      } catch (error: any) {
        console.error("[ChartTransactionCalendar] Error fetching daily transactions:", error)
        setAllData([])
        setError(error?.message || "Failed to load transaction data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDailyTransactions()
  }, [propData, dateFilter, dailyUrl, refreshNonce])

  useEffect(() => {
    // Mark as mounted to avoid rendering chart on server
    setMounted(true)
  }, [])

  // Calculate date range based on global filter.
  const { fromDate, toDate, enforcedByFilter } = useMemo(() => {
    if (dateFilter) {
      const range = getRangeForFilter(dateFilter)
      if (range) {
        return { ...range, enforcedByFilter: true }
      }
    }

    // Default to last year if no filter
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)
    return {
      fromDate: oneYearAgo.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      enforcedByFilter: false,
    }
  }, [dateFilter])

  // Filter data based on selection, excluding days with value 0 and future dates
  const filteredData = useMemo(() => {
    const filtered = allData.filter((item) => {
      const itemDate = item.day
      const today = new Date().toISOString().split('T')[0]

      if (item.value <= 0 || itemDate > today) return false
      if (fromDate && itemDate < fromDate) return false
      if (toDate && itemDate > toDate) return false
      return true
    })

    if (allData.length > 0 && filtered.length === 0) {
    }

    return filtered
  }, [allData, fromDate, toDate])

  // Format data for ECharts: [date, value] format
  const chartData = useMemo(() => {
    return filteredData.map((item) => [item.day, item.value])
  }, [filteredData])



  const values = useMemo(() => {
    return chartData
      .map(([, value]) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
  }, [chartData])

  const rawMaxValue = useMemo(() => {
    if (values.length === 0) return 0
    return Math.max(...values)
  }, [values])

  // Use a percentile-based max to avoid a single outlier flattening the colors
  const colorScaleMax = useMemo(() => {
    if (values.length === 0) return 1
    const sorted = [...values].sort((a, b) => a - b)
    if (sorted.length < 4) {
      return Math.max(sorted[sorted.length - 1], 1)
    }
    const pickPercentile = (percentile: number) => {
      const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.floor(percentile * (sorted.length - 1)))
      )
      return sorted[index]
    }
    const p95 = pickPercentile(0.95)
    if (p95 <= 0) return Math.max(rawMaxValue, 1)
    return Math.max(p95, 1)
  }, [values, rawMaxValue])

  const isDark = resolvedTheme === "dark"

  // Get colors from color scheme provider
  // Filter out #c3c3c3 (empty color) and reverse so darker colors are at the end (for high spending)
  // Limit to 3 colors for the legend
  const palette = useMemo(() => {
    const colors = getPalette().filter(color => color !== "#c3c3c3")
    const reversed = [...colors].reverse() // Reverse so darkest colors are at the end for high spending
    // Take only 3 colors: first (lightest), middle, and last (darkest)
    if (reversed.length >= 3) {
      return [reversed[0], reversed[Math.floor(reversed.length / 2)], reversed[reversed.length - 1]]
    }
    return reversed.slice(0, 3) // If less than 3 colors available, take what we have
  }, [getPalette])


  // Get color for a value based on the palette
  const getColorForValue = (value: number): string => {
    if (palette.length === 0) return "#c3c3c3"
    if (colorScaleMax === 0) return palette[0]

    const normalizedValue = Math.min(value / colorScaleMax, 1)

    if (palette.length === 1) return palette[0]
    if (palette.length === 2) {
      return normalizedValue < 0.5 ? palette[0] : palette[1]
    }

    // For 3+ colors, interpolate
    const segmentSize = 1 / (palette.length - 1)
    const segmentIndex = Math.min(Math.floor(normalizedValue / segmentSize), palette.length - 1)
    return palette[segmentIndex] || palette[palette.length - 1]
  }

  // Format currency value


  // ECharts event handlers for custom tooltip
  const handleChartMouseOver = (params: any) => {
    if (!containerRef.current) return

    // Get mouse position relative to container
    const rect = containerRef.current.getBoundingClientRect()
    let mouseX = 0
    let mouseY = 0

    // ECharts stores the native DOM event at params.event (or params.event.event in some versions)
    const ecEvent = (params?.event?.event || params?.event) as MouseEvent | undefined

    if (ecEvent) {
      if (typeof ecEvent.clientX === "number" && typeof ecEvent.clientY === "number") {
        mouseX = ecEvent.clientX - rect.left
        mouseY = ecEvent.clientY - rect.top
      } else if (typeof (ecEvent as any).offsetX === "number" && typeof (ecEvent as any).offsetY === "number") {
        mouseX = (ecEvent as any).offsetX
        mouseY = (ecEvent as any).offsetY
      }
    }

    // Set position immediately - no flash because we have real coordinates from the DOM event
    setTooltipPosition({ x: mouseX, y: mouseY })
    setHasValidPosition(true)

    // Extract data from params
    if (!params.data) return

    let date: string | null = null
    let value: number | null = null

    if (Array.isArray(params.data) && params.data.length >= 2) {
      date = params.data[0] as string
      value = Number(params.data[1])
    } else if (params.data && Array.isArray(params.data.value)) {
      date = params.data.value[0] as string
      const raw = params.data.raw
      value = typeof raw === "number" ? raw : Number(params.data.value[1])
    }

    if (date && value !== null && Number.isFinite(value)) {
      const color = getColorForValue(value)
      setTooltip({
        date,
        value,
        color,
      })
    }
  }

  const handleChartMouseOut = () => {
    setTooltip(null)
    setTooltipPosition(null)
    setHasValidPosition(false)
  }

  // Add global mousemove listener when tooltip is visible
  useEffect(() => {
    if (tooltip && containerRef.current) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setTooltipPosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
        // Only mark position as valid once we have real mouse coordinates
        if (!hasValidPosition) setHasValidPosition(true)
      }

      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [tooltip, hasValidPosition])

  // ECharts option configuration
  const option = useMemo(() => ({
    tooltip: {
      show: false, // Disable default ECharts tooltip
    },
    title: {
      show: false
    },
    visualMap: {
      min: 0,
      max: colorScaleMax,
      show: false, // Hide the default legend
      inRange: {
        color: palette
      }
    },
    calendar: {
      top: 30,
      left: 30,
      right: 30,
      bottom: 30,
      cellSize: ['auto', 13],
      range: [fromDate, toDate],
      itemStyle: {
        borderWidth: 0.5,
        borderColor: isDark ? '#e5e7eb' : '#e5e7eb'
      },
      yearLabel: { show: false },
      dayLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 11
      },
      monthLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 11
      }
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: chartData.map(([day, value]) => {
        const raw = Number(value) || 0
        return {
          value: [day, Math.min(raw, colorScaleMax)],
          raw
        }
      })
    }
  }), [chartData, colorScaleMax, fromDate, toDate, isDark, palette])

  if (!mounted || isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dailyTransactionActivity"
              chartTitle="Daily Transaction Activity"
              size="md"
            />
            <CardTitle>Daily Transaction Activity</CardTitle>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] w-full">
            <ChartLoadingState
              isLoading
              skeletonType="grid"
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error or empty state
  if (error || chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dailyTransactionActivity"
              chartTitle="Daily Transaction Activity"
              size="md"
            />
            <CardTitle>Daily Transaction Activity</CardTitle>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] w-full">
            <ChartLoadingState
              skeletonType="grid"
              emptyTitle={emptyTitle || "No daily activity yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see a calendar heatmap of your spending"}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Daily Transaction Activity"
        description="Spending patterns throughout the year"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
          Fullscreen view - Calendar heatmap shows spending intensity
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="dailyTransactionActivity"
              chartTitle="Daily Transaction Activity"
              size="md"
            />
            <CardTitle>Daily Transaction Activity</CardTitle>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div ref={containerRef} className="relative h-[250px] w-full" style={{ minHeight: 0, minWidth: 0 }}>
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
              notMerge={true}
              onEvents={{
                mouseover: handleChartMouseOver,
                mouseout: handleChartMouseOut,
              }}
            />
            {/* Only render tooltip after we have valid mouse coordinates to prevent flash */}
            {tooltip && tooltipPosition && hasValidPosition && (
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
                  <span className="font-medium text-foreground whitespace-nowrap">
                    {formatDateForDisplay(tooltip.date, "en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                  {formatCurrency(tooltip.value)}
                </div>
              </div>
            )}
          </div>
          {/* Color Legend - Only 3 colors */}
          <div className="mt-4 flex items-center justify-center gap-3 px-2 sm:px-6">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex h-4 items-center gap-0.5">
              {palette.slice(0, 3).map((color, index) => (
                <div
                  key={index}
                  className="h-full w-3 rounded-sm"
                  style={{ backgroundColor: color }}
                  title={`Expense level ${index + 1}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartTransactionCalendar.displayName = "ChartTransactionCalendar"
