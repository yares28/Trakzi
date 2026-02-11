"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import {
  ContributionGraph,
  ContributionGraphCalendar,
  ContributionGraphBlock,
  ContributionGraphFooter,
  ContributionGraphTotalCount,
  ContributionGraphLegend,
  type Activity,
} from "@/components/kibo-ui/contribution-graph"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { DEFAULT_FALLBACK_PALETTE } from "@/lib/chart-colors"
import { formatDateForDisplay } from "@/lib/date"
import { deduplicatedFetch, getCachedResponse } from "@/lib/request-deduplication"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

const CHART_ID = "dailyTransactionActivity"
const CHART_TITLE = "Daily Transaction Activity"
const MAX_LEVEL = 4

const getRangeForFilter = (filter: string) => {
  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split("T")[0]

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

function fmtDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function getMonthRangeLabel(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString("en-US", { month: "short" })
  const endMonth = end.toLocaleDateString("en-US", { month: "short" })
  const endYear = end.getFullYear()
  return `${startMonth} - ${endMonth} ${endYear}`
}

/** Desktop: always single. Mobile: dual for 6m (two 3m), last year / ytd / annual year (two 6m). */
export function getDailyTransactionActivityDisplayMode(
  effectiveDateFilter: string,
  isMobile: boolean,
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
  emptyDescription,
}: ChartTransactionCalendarProps) {
  const { resolvedTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isMobile = useIsMobile()
  const { getRawPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [tooltip, setTooltip] = useState<{ date: string; value: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Determine the date filter to use: prop > local state
  const [localDateFilter, setLocalDateFilter] = useState<string | null>(null)
  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter
  const effectiveDateFilter = normalizeDateFilterValue(dateFilter, FALLBACK_DATE_FILTER)

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
  const [refreshNonce, setRefreshNonce] = useState(0)

  // Listen for global date filter changes (only if prop is not provided)
  useEffect(() => {
    if (propData) return
    if (propDateFilter !== undefined) return
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
      setRefreshNonce((n) => n + 1)
    }

    window.addEventListener("transactionsUpdated", handleTransactionsUpdated)
    return () => {
      window.removeEventListener("transactionsUpdated", handleTransactionsUpdated)
    }
  }, [propData])

  // Fetch data from Neon database
  useEffect(() => {
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
          setAllData([])
          setError("Invalid data format received from server")
        }
      } catch (err: any) {
        setAllData([])
        setError(err?.message || "Failed to load transaction data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDailyTransactions()
  }, [propData, dateFilter, dailyUrl, refreshNonce])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Compute periods for display
  const { period1, period2, singlePeriod } = useMemo(() => {
    const today = new Date()
    const filter = effectiveDateFilter

    // Desktop: always single full-period calendar
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
        singlePeriod: { fromDate: fmtDate(sixMonthsAgo), toDate: fmtDate(today) },
      }
    }

    // Mobile: single for short ranges
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
          fromDate: fmtDate(sixMonthsAgo),
          toDate: fmtDate(period1End),
          label: getMonthRangeLabel(sixMonthsAgo, period1End),
        },
        period2: {
          fromDate: fmtDate(threeMonthsAgo),
          toDate: fmtDate(today),
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
          fromDate: fmtDate(twelveMonthsAgo),
          toDate: fmtDate(period1End),
          label: getMonthRangeLabel(twelveMonthsAgo, period1End),
        },
        period2: {
          fromDate: fmtDate(sixMonthsAgo),
          toDate: fmtDate(today),
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
          fromDate: fmtDate(jan1),
          toDate: fmtDate(jun30),
          label: getMonthRangeLabel(jan1, jun30),
        },
        period2: {
          fromDate: fmtDate(jul1),
          toDate: fmtDate(today),
          label: getMonthRangeLabel(jul1, today),
        },
        singlePeriod: null,
      }
    }

    // Mobile annual (specific year e.g. "2024"): dual Jan-Jun, Jul-Dec
    if (/^\d{4}$/.test(filter)) {
      const year = parseInt(filter, 10)
      const jan1 = new Date(year, 0, 1)
      const jul1 = new Date(year, 6, 1)
      const jun30 = new Date(year, 5, 30)
      const dec31 = new Date(year, 11, 31)
      return {
        period1: {
          fromDate: fmtDate(jan1),
          toDate: fmtDate(jun30),
          label: getMonthRangeLabel(jan1, jun30),
        },
        period2: {
          fromDate: fmtDate(jul1),
          toDate: fmtDate(dec31),
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
      singlePeriod: { fromDate: fmtDate(sixMonthsAgo), toDate: fmtDate(today) },
    }
  }, [effectiveDateFilter, isMobile])

  const isDualCalendar = period1 !== null && period2 !== null
  const isDualDisplayMode = getDailyTransactionActivityDisplayMode(effectiveDateFilter, isMobile) === "dual"

  // Overall date range for data filtering
  const fromDate = isDualCalendar ? period1!.fromDate : singlePeriod?.fromDate || ""
  const toDate = isDualCalendar ? period2!.toDate : singlePeriod?.toDate || ""

  // Filter data: exclude zero-value and future-date entries
  const filteredData = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]
    return allData.filter((item) => {
      if (item.value <= 0 || item.day > todayStr) return false
      if (fromDate && item.day < fromDate) return false
      if (toDate && item.day > toDate) return false
      return true
    })
  }, [allData, fromDate, toDate])

  // Max value for level computation
  const maxValue = useMemo(() => {
    if (filteredData.length === 0) return 1000
    return Math.max(...filteredData.map((d) => d.value), 10)
  }, [filteredData])

  // Total spent for footer
  const totalSpent = useMemo(
    () => filteredData.reduce((sum, d) => sum + d.value, 0),
    [filteredData],
  )

  // Get 4 colors from the palette for levels 1-4
  const levelColors = useMemo(() => {
    const colors = getRawPalette().filter((c) => c !== "#c3c3c3")
    const reversed = [...colors].reverse()
    if (reversed.length >= 4) {
      const step = (reversed.length - 1) / 3
      return [
        reversed[Math.round(step * 0)],
        reversed[Math.round(step * 1)],
        reversed[Math.round(step * 2)],
        reversed[Math.round(step * 3)],
      ]
    }
    return reversed.length > 0 ? reversed.slice(0, 4) : DEFAULT_FALLBACK_PALETTE.slice(0, 4)
  }, [getRawPalette])

  const isDark = resolvedTheme === "dark"
  const strokeColor = isDark ? "#4b5563" : "#c9ccd1"

  const getFillForLevel = (level: number): string => {
    if (level === 0) return isDark ? "var(--muted)" : "#ebedf0"
    return levelColors[Math.min(level - 1, levelColors.length - 1)] ?? levelColors[0]
  }

  // Build Activity[] for a given date range — always renders full range (no today cap)
  const buildActivities = (rangeFrom: string, rangeTo: string): Activity[] => {
    const dataMap = new Map(filteredData.map((d) => [d.day, d.value]))
    const start = new Date(rangeFrom)
    const end = new Date(rangeTo)
    const result: Activity[] = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      const value = dataMap.get(dateStr) || 0

      let level = 0
      if (value > 0 && maxValue > 0) {
        const normalized = value / maxValue
        if (normalized <= 0.25) level = 1
        else if (normalized <= 0.5) level = 2
        else if (normalized <= 0.75) level = 3
        else level = 4
      }

      result.push({ date: dateStr, count: Math.round(value * 100) / 100, level })
    }

    return result
  }

  const singleActivities = useMemo(
    () => (!isDualCalendar && singlePeriod ? buildActivities(singlePeriod.fromDate, singlePeriod.toDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredData, singlePeriod, maxValue, isDualCalendar],
  )

  const period1Activities = useMemo(
    () => (isDualCalendar && period1 ? buildActivities(period1.fromDate, period1.toDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredData, period1, maxValue, isDualCalendar],
  )
  const period2Activities = useMemo(
    () => (isDualCalendar && period2 ? buildActivities(period2.fromDate, period2.toDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredData, period2, maxValue, isDualCalendar],
  )

  const allActivities = isDualCalendar
    ? [...period1Activities, ...period2Activities]
    : singleActivities
  const hasData = allActivities.length > 0

  const blockSize = isMobile ? 10 : 14
  const blockMargin = isMobile ? 3 : 4
  const fontSize = isMobile ? 9 : 11

  const handleBlockMouseEnter = (e: React.MouseEvent, activity: Activity) => {
    if (activity.level === 0) return
    const color = getFillForLevel(activity.level)
    setTooltip({ date: activity.date, value: activity.count, color })
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  const handleBlockMouseMove = (e: React.MouseEvent) => {
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  const handleBlockMouseLeave = () => {
    setTooltip(null)
    setTooltipPosition(null)
  }

  const renderContributionGraph = (activities: Activity[], showFooter: boolean) => (
    <ContributionGraph
      data={activities}
      blockSize={blockSize}
      blockMargin={blockMargin}
      blockRadius={2}
      maxLevel={MAX_LEVEL}
      fontSize={fontSize}
      labels={{
        totalCount: `${formatCurrency(totalSpent)} spent in {{year}}`,
        legend: { less: "Less", more: "More" },
      }}
    >
      <ContributionGraphCalendar>
        {({ activity, dayIndex, weekIndex }) => (
          <ContributionGraphBlock
            activity={activity}
            dayIndex={dayIndex}
            weekIndex={weekIndex}
            className="transition-opacity hover:opacity-80"
            style={{ fill: getFillForLevel(activity.level), stroke: strokeColor, strokeWidth: 1 }}
            onMouseEnter={(e) => handleBlockMouseEnter(e as unknown as React.MouseEvent, activity)}
            onMouseMove={(e) => handleBlockMouseMove(e as unknown as React.MouseEvent)}
            onMouseLeave={handleBlockMouseLeave}
          />
        )}
      </ContributionGraphCalendar>
      {showFooter && (
        <ContributionGraphFooter className="mt-3 px-0 text-xs text-muted-foreground">
          <ContributionGraphTotalCount />
          <ContributionGraphLegend>
            {({ level }) => (
              <svg height={blockSize} width={blockSize}>
                <title>{`Level ${level}`}</title>
                <rect
                  height={blockSize}
                  width={blockSize}
                  rx={2}
                  ry={2}
                  style={{ fill: getFillForLevel(level), stroke: strokeColor, strokeWidth: 1 }}
                />
              </svg>
            )}
          </ContributionGraphLegend>
        </ContributionGraphFooter>
      )}
    </ContributionGraph>
  )

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={CHART_TITLE}
        description="Daily spending by day — darker cells mean higher spending. On desktop the full period is one chart; on mobile, 6-month and last-year views split into two periods."
        details={[
          "Each cell represents a day, colored by the total amount you spent.",
          "On desktop the chart shows the full selected period. On mobile, 6 months shows two 3-month calendars and last year shows two 6-month calendars.",
          "Expense-only data is shown - income, transfers, and savings moves are excluded.",
        ]}
        ignoredFootnote="The API filters to negative transactions only and trims out internal transfers and savings deposits."
      />
      <ChartAiInsightButton
        chartId={CHART_ID}
        chartTitle={CHART_TITLE}
        chartDescription="Daily spending by day; on mobile, 6-month and last-year views split into two periods"
        chartData={{
          totalDays: filteredData.length,
          totalSpent,
          maxDailySpend: maxValue,
        }}
        size="sm"
      />
    </div>
  )

  const renderCardHeader = () => (
    <CardHeader>
      <div className="flex items-center gap-2">
        <GridStackCardDragHandle />
        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
        <ChartFavoriteButton chartId={CHART_ID} chartTitle={CHART_TITLE} size="md" />
        <CardTitle>{CHART_TITLE}</CardTitle>
      </div>
      <CardAction className="flex flex-wrap items-center gap-2">
        {renderInfoTrigger()}
      </CardAction>
    </CardHeader>
  )

  const contentHeight = isDualDisplayMode ? "h-[300px] md:h-[360px]" : "h-[140px] md:h-[250px]"

  if (!mounted || isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton chartId={CHART_ID} chartTitle={CHART_TITLE} size="md" />
            <CardTitle>{CHART_TITLE}</CardTitle>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className={`${contentHeight} w-full`}>
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

  if (error || !hasData) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton chartId={CHART_ID} chartTitle={CHART_TITLE} size="md" />
            <CardTitle>{CHART_TITLE}</CardTitle>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className={`${contentHeight} w-full`}>
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
        title={CHART_TITLE}
        description="Spending patterns throughout the year"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
          Fullscreen view - Calendar heatmap shows spending intensity
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        {renderCardHeader()}
        <CardContent className="flex flex-1 flex-col justify-center px-2 pt-4 pb-2 sm:px-6 sm:pt-6 md:pb-6">
          {isDualCalendar && period1 && period2 ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{period1.label}</p>
                {renderContributionGraph(period1Activities, false)}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{period2.label}</p>
                {renderContributionGraph(period2Activities, true)}
              </div>
            </div>
          ) : (
            <div className="relative w-full">
              {renderContributionGraph(singleActivities, true)}
            </div>
          )}

          {mounted &&
            tooltip &&
            tooltipPosition &&
            createPortal(
              <div
                className="pointer-events-none fixed z-[9999] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl select-none"
                style={{
                  left:
                    tooltipPosition.x + 12 + 200 > window.innerWidth
                      ? tooltipPosition.x - 212
                      : tooltipPosition.x + 12,
                  top:
                    tooltipPosition.y - 60 < 0
                      ? tooltipPosition.y + 12
                      : tooltipPosition.y - 60,
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
              </div>,
              document.body,
            )}
        </CardContent>
      </Card>
    </>
  )
})

ChartTransactionCalendar.displayName = "ChartTransactionCalendar"
