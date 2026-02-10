"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import ReactECharts from "echarts-for-react"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { getChartTextColor, CHART_GRID_COLOR, DEFAULT_FALLBACK_PALETTE } from "@/lib/chart-colors"
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
import { useIsMobile } from "@/hooks/use-mobile"

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
    case "ytd": {
      const start = new Date(today.getFullYear(), 0, 1)
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

/** Desktop: always single. Mobile: dual for 6m (two 3m), last year / ytd / annual year (two 6m). */
export function getDailyTransactionActivityDisplayMode(
  effectiveDateFilter: string,
  isMobile: boolean
): "single" | "dual" {
  if (!isMobile) return "single"
  if (["last7days", "last30days", "last3months"].includes(effectiveDateFilter)) return "single"
  if (effectiveDateFilter === "last6months" || effectiveDateFilter === "lastyear" || effectiveDateFilter === "ytd") return "dual"
  if (/^\d{4}$/.test(effectiveDateFilter)) return "dual"
  return "single"
}


export const ChartTransactionCalendar = React.memo(function ChartTransactionCalendar({
  data: propData,
  dateFilter: propDateFilter,
  emptyTitle,
  emptyDescription
}: ChartTransactionCalendarProps) {
  const { resolvedTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isMobile = useIsMobile()

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Daily Transaction Activity"
        description="Daily spending by day — darker cells mean higher spending. On desktop the full period is one chart; on mobile, 6-month and last-year views split into two periods."
        details={[
          "Each cell represents a day, colored by the total amount you spent.",
          "On desktop the chart shows the full selected period. On mobile, 6 months shows two 3-month calendars and last year shows two 6-month calendars.",
          "Expense-only data is shown - income, transfers, and savings moves are excluded."
        ]}
        ignoredFootnote="The API filters to negative transactions only and trims out internal transfers and savings deposits."
      />
      <ChartAiInsightButton
        chartId="dailyTransactionActivity"
        chartTitle="Daily Transaction Activity"
        chartDescription="Daily spending by day; on mobile, 6-month and last-year views split into two periods"
        size="sm"
      />
    </div>
  )
  const { colorScheme, getRawPalette } = useColorScheme()
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

  // Desktop: always single full-period chart. Mobile: dual for 6m/ytd/lastyear/annual, single for ≤3m.
  const { period1, period2, singlePeriod } = useMemo(() => {
    const today = new Date()
    const formatDate = (date: Date) => date.toISOString().split('T')[0]
    const filter = effectiveDateFilter

    // Desktop (big screens): always one full-period calendar — never split into two
    if (!isMobile) {
      const range = getRangeForFilter(filter)
      if (range) {
        return { period1: null, period2: null, singlePeriod: range }
      }
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      return {
        period1: null,
        period2: null,
        singlePeriod: { fromDate: formatDate(sixMonthsAgo), toDate: formatDate(today) },
      }
    }

    // Mobile (small screens): single for last7days, last30days, last3months
    const shortRangeFilters = ["last7days", "last30days", "last3months"]
    if (shortRangeFilters.includes(filter)) {
      const range = getRangeForFilter(filter)
      if (range) {
        return { period1: null, period2: null, singlePeriod: range }
      }
    }

    // Mobile last6months: dual two 3-month periods
    if (filter === "last6months") {
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const threeMonthsAgo = new Date(today)
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const period1End = new Date(threeMonthsAgo)
      period1End.setDate(period1End.getDate() - 1)
      return {
        period1: {
          fromDate: formatDate(sixMonthsAgo),
          toDate: formatDate(period1End),
          label: getMonthRangeLabel(sixMonthsAgo, period1End),
        },
        period2: {
          fromDate: formatDate(threeMonthsAgo),
          toDate: formatDate(today),
          label: getMonthRangeLabel(threeMonthsAgo, today),
        },
        singlePeriod: null,
      }
    }

    // Mobile lastyear: dual two 6-month periods
    if (filter === "lastyear") {
      const twelveMonthsAgo = new Date(today)
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const period1End = new Date(sixMonthsAgo)
      period1End.setDate(period1End.getDate() - 1)
      return {
        period1: {
          fromDate: formatDate(twelveMonthsAgo),
          toDate: formatDate(period1End),
          label: getMonthRangeLabel(twelveMonthsAgo, period1End),
        },
        period2: {
          fromDate: formatDate(sixMonthsAgo),
          toDate: formatDate(today),
          label: getMonthRangeLabel(sixMonthsAgo, today),
        },
        singlePeriod: null,
      }
    }

    // Mobile ytd: dual two 6-month periods (Jan 1 - Jun 30, Jul 1 - today)
    if (filter === "ytd") {
      const year = today.getFullYear()
      const jan1 = new Date(year, 0, 1)
      const jul1 = new Date(year, 6, 1)
      const jun30 = new Date(year, 5, 30)
      return {
        period1: {
          fromDate: formatDate(jan1),
          toDate: formatDate(jun30),
          label: getMonthRangeLabel(jan1, jun30),
        },
        period2: {
          fromDate: formatDate(jul1),
          toDate: formatDate(today),
          label: getMonthRangeLabel(jul1, today),
        },
        singlePeriod: null,
      }
    }

    // Mobile annual (specific year e.g. "2024"): dual two 6-month periods (Jan-Jun, Jul-Dec)
    if (/^\d{4}$/.test(filter)) {
      const year = parseInt(filter, 10)
      const jan1 = new Date(year, 0, 1)
      const jul1 = new Date(year, 6, 1)
      const jun30 = new Date(year, 5, 30)
      const dec31 = new Date(year, 11, 31)
      return {
        period1: {
          fromDate: formatDate(jan1),
          toDate: formatDate(jun30),
          label: getMonthRangeLabel(jan1, jun30),
        },
        period2: {
          fromDate: formatDate(jul1),
          toDate: formatDate(dec31),
          label: getMonthRangeLabel(jul1, dec31),
        },
        singlePeriod: null,
      }
    }

    // Mobile other: single full range
    const range = getRangeForFilter(filter)
    if (range) {
      return { period1: null, period2: null, singlePeriod: range }
    }
    const sixMonthsAgo = new Date(today)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return {
      period1: null,
      period2: null,
      singlePeriod: { fromDate: formatDate(sixMonthsAgo), toDate: formatDate(today) },
    }
  }, [effectiveDateFilter, isMobile])

  // Helper to get month range label (e.g., "Aug - Oct 2025")
  function getMonthRangeLabel(start: Date, end: Date): string {
    const startMonth = start.toLocaleDateString("en-US", { month: "short" })
    const endMonth = end.toLocaleDateString("en-US", { month: "short" })
    const endYear = end.getFullYear()
    return `${startMonth} - ${endMonth} ${endYear}`
  }

  // Dual calendars only on mobile (6m = two 3m; ytd/lastyear/annual = two 6m). Desktop always single.
  const isDualCalendar = period1 !== null && period2 !== null
  const isDualDisplayMode = getDailyTransactionActivityDisplayMode(effectiveDateFilter, isMobile) === "dual"

  // For backwards compatibility, compute fromDate/toDate for data filtering
  const fromDate = isDualCalendar ? period1!.fromDate : singlePeriod?.fromDate || ""
  const toDate = isDualCalendar ? period2!.toDate : singlePeriod?.toDate || ""

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

  // Daily Transaction Activity uses the FULL palette in both themes (no first/last trimming)
  // Only filters out the neutral #c3c3c3, then picks 3 representative colors
  const palette = useMemo(() => {
    const colors = getRawPalette().filter(c => c !== "#c3c3c3")
    const reversed = [...colors].reverse()
    if (reversed.length >= 3) {
      return [reversed[0], reversed[Math.floor(reversed.length / 2)], reversed[reversed.length - 1]]
    }
    return reversed.slice(0, 3)
  }, [getRawPalette])


  // Get color for a value based on the palette
  const getColorForValue = (value: number): string => {
    if (palette.length === 0) return DEFAULT_FALLBACK_PALETTE[0]
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

  // Filter data for each period in dual calendar mode
  const { period1Data, period2Data } = useMemo(() => {
    if (!isDualCalendar) {
      return { period1Data: [], period2Data: [] }
    }

    const p1Data = chartData.filter(([day]) => {
      const d = day as string
      return d >= period1!.fromDate && d <= period1!.toDate
    })

    const p2Data = chartData.filter(([day]) => {
      const d = day as string
      return d >= period2!.fromDate && d <= period2!.toDate
    })

    return { period1Data: p1Data, period2Data: p2Data }
  }, [chartData, isDualCalendar, period1, period2])

  // ECharts option configuration
  const option = useMemo(() => {
    const baseConfig = {
      tooltip: {
        show: false, // Disable default ECharts tooltip
      },
      visualMap: {
        min: 0,
        max: colorScaleMax,
        show: false, // Hide the default legend
        inRange: {
          color: palette
        }
      },
    }

    // Dual calendar mode: two 3-month calendars stacked vertically
    if (isDualCalendar) {
      return {
        ...baseConfig,
        title: [],
        calendar: [
          {
            top: isMobile ? 16 : 22,
            left: isMobile ? 20 : 30,
            right: isMobile ? 10 : 30,
            height: '38%',
            cellSize: ['auto', isMobile ? 10 : 13],
            range: [period1!.fromDate, period1!.toDate],
            itemStyle: {
              borderWidth: 0.5,
              borderColor: CHART_GRID_COLOR
            },
            yearLabel: { show: false },
            dayLabel: {
              color: getChartTextColor(isDark),
              fontSize: isMobile ? 8 : 11
            },
            monthLabel: {
              color: getChartTextColor(isDark),
              fontSize: isMobile ? 8 : 11
            }
          },
          {
            top: '57%',
            left: isMobile ? 20 : 30,
            right: isMobile ? 10 : 30,
            height: '38%',
            cellSize: ['auto', isMobile ? 10 : 13],
            range: [period2!.fromDate, period2!.toDate],
            itemStyle: {
              borderWidth: 0.5,
              borderColor: CHART_GRID_COLOR
            },
            yearLabel: { show: false },
            dayLabel: {
              color: getChartTextColor(isDark),
              fontSize: isMobile ? 8 : 11
            },
            monthLabel: {
              color: getChartTextColor(isDark),
              fontSize: isMobile ? 8 : 11
            }
          }
        ],
        series: [
          {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            calendarIndex: 0,
            data: period1Data.map(([day, value]) => {
              const raw = Number(value) || 0
              return {
                value: [day, Math.min(raw, colorScaleMax)],
                raw
              }
            })
          },
          {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            calendarIndex: 1,
            data: period2Data.map(([day, value]) => {
              const raw = Number(value) || 0
              return {
                value: [day, Math.min(raw, colorScaleMax)],
                raw
              }
            })
          }
        ]
      }
    }

    // Single calendar mode (mobile or custom date filter)
    return {
      ...baseConfig,
      title: {
        show: false
      },
      calendar: {
        top: isMobile ? 15 : 30,
        left: isMobile ? 15 : 30,
        right: isMobile ? 15 : 30,
        bottom: isMobile ? 10 : 30,
        cellSize: ['auto', isMobile ? 11 : 13],
        range: [fromDate, toDate],
        itemStyle: {
          borderWidth: 0.5,
          borderColor: CHART_GRID_COLOR
        },
        yearLabel: { show: false },
        dayLabel: {
          color: getChartTextColor(isDark),
          fontSize: isMobile ? 9 : 11
        },
        monthLabel: {
          color: getChartTextColor(isDark),
          fontSize: isMobile ? 9 : 11
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
    }
  }, [chartData, colorScaleMax, fromDate, toDate, isDark, palette, isMobile, isDualCalendar, period1, period2, period1Data, period2Data])

  if (!mounted || isLoading) {
    const loadingHeight = isDualDisplayMode ? "h-[300px] md:h-[360px]" : "h-[140px] md:h-[250px]"
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
          <div className={`${loadingHeight} w-full`}>
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
    const emptyHeight = isDualDisplayMode ? "h-[300px] md:h-[360px]" : "h-[140px] md:h-[250px]"
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
          <div className={`${emptyHeight} w-full`}>
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
        <CardContent className="px-2 pt-4 pb-2 sm:px-6 sm:pt-6 md:pb-6">
          <div ref={containerRef} className={`relative w-full ${isDualCalendar ? "h-[300px] md:h-[360px]" : "h-[140px] md:h-[250px]"}`} style={{ minHeight: 0, minWidth: 0 }}>
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
          <div className="mt-2 md:mt-4 flex items-center justify-center gap-3 px-2 sm:px-6">
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
