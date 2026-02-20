"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
import { DEFAULT_FALLBACK_PALETTE, getChartTextColor } from "@/lib/chart-colors"
import { formatDateForDisplay } from "@/lib/date"
import { useIsMobile } from "@/hooks/use-mobile"
import { useDateFilter } from "@/components/date-filter-provider"
import {
  FALLBACK_DATE_FILTER,
  normalizeDateFilterValue,
} from "@/lib/date-filter"
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

type ReceiptTransactionRow = {
  id: number
  receiptId: string
  storeName: string | null
  receiptDate: string
  receiptTime: string
  receiptTotalAmount: number
  receiptStatus: string
  description: string
  quantity: number
  pricePerUnit: number
  totalPrice: number
  categoryId: number | null
  categoryTypeId?: number | null
  categoryName: string | null
  categoryColor: string | null
  categoryTypeName?: string | null
  categoryTypeColor?: string | null
}

interface ChartDailyActivityFridgeProps {
  receiptTransactions?: ReceiptTransactionRow[]
  dailySpendingData?: Array<{ date: string; total: number; count: number }>
  dateFilter?: string | null
  isLoading?: boolean
}

const CHART_ID = "fridge:dailyActivity"
const CHART_TITLE = "Daily Grocery Activity"
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

export function getDailyGroceryActivityDisplayMode(
  effectiveDateFilter: string,
  isMobile: boolean,
): "single" | "dual" {
  if (!isMobile) return "single"
  if (["last7days", "last30days", "last3months"].includes(effectiveDateFilter)) return "single"
  if (effectiveDateFilter === "last6months") return "dual"
  if (effectiveDateFilter === "lastyear" || effectiveDateFilter === "ytd") return "dual"
  if (/^\d{4}$/.test(effectiveDateFilter)) return "dual"
  return "single"
}

export const ChartDailyActivityFridge = React.memo(function ChartDailyActivityFridge({
  receiptTransactions = [],
  dailySpendingData,
  dateFilter: propDateFilter,
  isLoading = false,
}: ChartDailyActivityFridgeProps) {
  const { resolvedTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isMobile = useIsMobile()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { filter: contextFilter } = useDateFilter()
  const [mounted, setMounted] = useState(false)
  const [tooltip, setTooltip] = useState<{ date: string; value: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  const dateFilter = propDateFilter !== undefined ? propDateFilter : contextFilter
  const effectiveDateFilter = normalizeDateFilterValue(dateFilter, FALLBACK_DATE_FILTER)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Dynamic sizing: observe container width
  const contentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!contentRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [mounted])

  const dailyData = useMemo(() => {
    if (dailySpendingData && dailySpendingData.length > 0) {
      return dailySpendingData
        .map((d) => ({ day: d.date, value: Number(d.total.toFixed(2)) }))
        .sort((a, b) => a.day.localeCompare(b.day))
    }

    const totals = new Map<string, number>()
    receiptTransactions.forEach((item) => {
      const date = item.receiptDate
      if (!date) return
      const spend = Number(item.totalPrice) || 0
      totals.set(date, (totals.get(date) || 0) + spend)
    })

    return Array.from(totals.entries())
      .map(([day, value]) => ({ day, value: Number(value.toFixed(2)) }))
      .sort((a, b) => a.day.localeCompare(b.day))
  }, [receiptTransactions, dailySpendingData])

  const { period1, period2, singlePeriod } = useMemo(() => {
    const today = new Date()
    const filter = effectiveDateFilter
    const year = today.getFullYear()

    const getLast3MonthsRange = () => {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 3)
      return { fromDate: fmtDate(start), toDate: fmtDate(today) }
    }

    if (["last7days", "last30days", "last3months"].includes(filter)) {
      return { period1: null, period2: null, singlePeriod: getLast3MonthsRange() }
    }

    if (filter === "ytd") {
      const jan1 = new Date(year, 0, 1)
      const dec31 = new Date(year, 11, 31)

      if (!isMobile) {
        return { period1: null, period2: null, singlePeriod: { fromDate: fmtDate(jan1), toDate: fmtDate(dec31) } }
      }
      const jun30 = new Date(year, 5, 30)
      const jul1 = new Date(year, 6, 1)
      return {
        period1: { fromDate: fmtDate(jan1), toDate: fmtDate(jun30), label: getMonthRangeLabel(jan1, jun30) },
        period2: { fromDate: fmtDate(jul1), toDate: fmtDate(dec31), label: getMonthRangeLabel(jul1, dec31) },
        singlePeriod: null
      }
    }

    if (filter === "lastyear") {
      const lastYear = year - 1
      const jan1 = new Date(lastYear, 0, 1)
      const dec31 = new Date(lastYear, 11, 31)

      if (!isMobile) {
        return { period1: null, period2: null, singlePeriod: { fromDate: fmtDate(jan1), toDate: fmtDate(dec31) } }
      }
      const jun30 = new Date(lastYear, 5, 30)
      const jul1 = new Date(lastYear, 6, 1)
      return {
        period1: { fromDate: fmtDate(jan1), toDate: fmtDate(jun30), label: getMonthRangeLabel(jan1, jun30) },
        period2: { fromDate: fmtDate(jul1), toDate: fmtDate(dec31), label: getMonthRangeLabel(jul1, dec31) },
        singlePeriod: null
      }
    }

    if (/^\d{4}$/.test(filter)) {
      const targetYear = parseInt(filter, 10)
      const jan1 = new Date(targetYear, 0, 1)
      const dec31 = new Date(targetYear, 11, 31)

      if (!isMobile) {
        return { period1: null, period2: null, singlePeriod: { fromDate: fmtDate(jan1), toDate: fmtDate(dec31) } }
      }
      const jun30 = new Date(targetYear, 5, 30)
      const jul1 = new Date(targetYear, 6, 1)
      return {
        period1: { fromDate: fmtDate(jan1), toDate: fmtDate(jun30), label: getMonthRangeLabel(jan1, jun30) },
        period2: { fromDate: fmtDate(jul1), toDate: fmtDate(dec31), label: getMonthRangeLabel(jul1, dec31) },
        singlePeriod: null
      }
    }

    if (filter === "last6months") {
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      if (!isMobile) {
        return { period1: null, period2: null, singlePeriod: { fromDate: fmtDate(sixMonthsAgo), toDate: fmtDate(today) } }
      }
      const threeMonthsAgo = new Date(today)
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const period1End = new Date(threeMonthsAgo)
      period1End.setDate(period1End.getDate() - 1)

      return {
        period1: { fromDate: fmtDate(sixMonthsAgo), toDate: fmtDate(period1End), label: getMonthRangeLabel(sixMonthsAgo, period1End) },
        period2: { fromDate: fmtDate(threeMonthsAgo), toDate: fmtDate(today), label: getMonthRangeLabel(threeMonthsAgo, today) },
        singlePeriod: null
      }
    }

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
  const isDualDisplayMode = getDailyGroceryActivityDisplayMode(effectiveDateFilter, isMobile) === "dual"

  const isShortPeriod = useMemo(() => {
    if (isMobile) {
      if (effectiveDateFilter === "last6months") return true
      return ["last7days", "last30days", "last3months"].includes(effectiveDateFilter)
    }
    return ["last7days", "last30days", "last3months", "last6months"].includes(effectiveDateFilter)
  }, [effectiveDateFilter, isMobile])

  const fromDate = isDualCalendar ? period1!.fromDate : singlePeriod?.fromDate || ""
  const toDate = isDualCalendar ? period2!.toDate : singlePeriod?.toDate || ""

  const filteredData = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]
    return dailyData.filter((item) => {
      if (item.value <= 0 || item.day > todayStr) return false
      if (fromDate && item.day < fromDate) return false
      if (toDate && item.day > toDate) return false
      return true
    })
  }, [dailyData, fromDate, toDate])

  const quartiles = useMemo(() => {
    const values = filteredData.map((d) => d.value).filter((v) => v > 0).sort((a, b) => a - b)
    if (values.length === 0) return { p25: 0, p50: 0, p75: 0 }

    const getPercentile = (p: number) => {
      const index = (values.length - 1) * p
      const lower = Math.floor(index)
      const upper = Math.ceil(index)
      const weight = index - lower
      return values[lower] * (1 - weight) + values[upper] * weight
    }

    return {
      p25: getPercentile(0.25),
      p50: getPercentile(0.5),
      p75: getPercentile(0.75),
    }
  }, [filteredData])

  const totalSpent = useMemo(
    () => filteredData.reduce((sum, d) => sum + d.value, 0),
    [filteredData]
  )

  const levelColors = useMemo(() => {
    const colors = getPalette()
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
  }, [getPalette])

  const isDark = resolvedTheme === "dark"

  const getFillForLevel = (level: number): string => {
    if (level === 0) return isDark ? "var(--muted)" : "#ebedf0"
    return levelColors[Math.min(level - 1, levelColors.length - 1)] ?? levelColors[0]
  }

  const buildActivities = (rangeFrom: string, rangeTo: string): Activity[] => {
    const dataMap = new Map(filteredData.map((d) => [d.day, d.value]))
    const start = new Date(rangeFrom)
    const end = new Date(rangeTo)
    const result: Activity[] = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      const value = dataMap.get(dateStr) || 0

      let level = 0
      if (value > 0) {
        if (value <= quartiles.p25 && value > 0) level = 1
        else if (value <= quartiles.p50) level = 2
        else if (value <= quartiles.p75) level = 3
        else level = 4
      }

      result.push({ date: dateStr, count: Math.round(value * 100) / 100, level })
    }

    return result
  }

  const singleActivities = useMemo(
    () => (!isDualCalendar && singlePeriod ? buildActivities(singlePeriod.fromDate, singlePeriod.toDate) : []),
    [filteredData, singlePeriod, quartiles, isDualCalendar],
  )

  const period1Activities = useMemo(
    () => (isDualCalendar && period1 ? buildActivities(period1.fromDate, period1.toDate) : []),
    [filteredData, period1, quartiles, isDualCalendar],
  )
  const period2Activities = useMemo(
    () => (isDualCalendar && period2 ? buildActivities(period2.fromDate, period2.toDate) : []),
    [filteredData, period2, quartiles, isDualCalendar],
  )

  const allActivities = isDualCalendar
    ? [...period1Activities, ...period2Activities]
    : singleActivities
  const hasData = allActivities.length > 0

  // Estimate the number of week columns for the displayed period
  const numWeeks = useMemo(() => {
    let from: string | undefined, to: string | undefined
    if (isDualCalendar && period1) {
      from = period1.fromDate
      to = period1.toDate
    } else if (singlePeriod) {
      from = singlePeriod.fromDate
      to = singlePeriod.toDate
    }
    if (!from || !to) return 14
    const days = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1
    const weeks = Math.ceil(days / 7) + 2

    // On desktop, enforce a minimum horizontal span to keep the chart horizontal (e.g. at least 6 months)
    return !isMobile ? Math.max(weeks, 26) : weeks
  }, [isDualCalendar, period1, singlePeriod, isMobile])

  // Dynamic block sizing based on container width
  const { blockSize, blockMargin } = useMemo(() => {
    if (containerWidth === 0) {
      // Fallback before ResizeObserver fires
      return {
        blockSize: isMobile ? (isShortPeriod ? 37 : 26) : 31,
        blockMargin: isMobile ? (isShortPeriod ? 6 : 5) : 6,
      }
    }
    const dayLabelWidth = isMobile ? 28 : 38
    const available = containerWidth - dayLabelWidth
    const rawSize = Math.floor(available / numWeeks)
    const margin = Math.max(2, Math.round(rawSize * 0.16))
    const size = rawSize - margin
    return {
      blockSize: Math.max(8, Math.min(size, 30)), // Reduced from 34 to 30
      blockMargin: margin,
    }
  }, [containerWidth, numWeeks, isMobile, isShortPeriod])

  const fontSize = isMobile ? 12 : 14
  const outlineColor = getChartTextColor(isDark)

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

  const renderContributionGraph = (activities: Activity[], showFooter: boolean) => {
    const footerText = (() => {
      if (filteredData.length === 0) return `No grocery transactions in ${new Date().getFullYear()}`
      if (effectiveDateFilter === "last7days") return `${formatCurrency(totalSpent)} spent on groceries in the last 7 days`
      if (effectiveDateFilter === "last30days") return `${formatCurrency(totalSpent)} spent on groceries in the last 30 days`
      if (effectiveDateFilter === "last3months") return `${formatCurrency(totalSpent)} spent on groceries in the last 3 months`
      if (effectiveDateFilter === "last6months") return `${formatCurrency(totalSpent)} spent on groceries in the last 6 months`
      const year = activities.length > 0 ? new Date(activities[0].date).getFullYear() : new Date().getFullYear()
      return `${formatCurrency(totalSpent)} spent on groceries in ${year}`
    })()

    return (
      <ContributionGraph
        data={activities}
        blockSize={blockSize}
        blockMargin={blockMargin}
        blockRadius={2}
        maxLevel={MAX_LEVEL}
        fontSize={fontSize}
        labels={{
          totalCount: footerText,
          legend: { less: "Less", more: "More" },
        }}
      >
        <ContributionGraphCalendar className="w-fit mx-auto">
          {({ activity, dayIndex, weekIndex }) => (
            <ContributionGraphBlock
              activity={activity}
              dayIndex={dayIndex}
              weekIndex={weekIndex}
              className="transition-opacity hover:opacity-80"
              style={{ fill: getFillForLevel(activity.level), stroke: outlineColor, strokeWidth: 1 }}
              onMouseEnter={(e) => handleBlockMouseEnter(e as unknown as React.MouseEvent, activity)}
              onMouseMove={(e) => handleBlockMouseMove(e as unknown as React.MouseEvent)}
              onMouseLeave={handleBlockMouseLeave}
            />
          )}
        </ContributionGraphCalendar>
        {showFooter && (
          <ContributionGraphFooter className="mt-4 px-0 text-xs text-muted-foreground flex flex-col items-center gap-2">
            <ContributionGraphTotalCount className="text-sm font-medium text-foreground order-1" />
            <ContributionGraphLegend className="order-2 !ml-0">
              {({ level }) => (
                <svg height={12} width={12}>
                  <title>{`Level ${level}`}</title>
                  <rect
                    height={12}
                    width={12}
                    rx={2}
                    ry={2}
                    style={{ fill: getFillForLevel(level), stroke: outlineColor, strokeWidth: 1 }}
                  />
                </svg>
              )}
            </ContributionGraphLegend>
          </ContributionGraphFooter>
        )}
      </ContributionGraph>
    )
  }

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={CHART_TITLE}
        description="Your grocery spending patterns throughout the year - darker means more spending. Uses the global time period filter."
        details={[
          "Each cell represents a day, colored by the total grocery amount you spent.",
          "On desktop the chart shows the full selected period. On mobile, yearly views split into two periods.",
          "Data is aggregated from your uploaded receipts.",
        ]}
        ignoredFootnote="Only days with receipt transactions are shown."
      />
      <ChartAiInsightButton
        chartId={CHART_ID}
        chartTitle={CHART_TITLE}
        chartDescription="Your grocery spending patterns throughout the year (contribution graph)"
        chartData={{
          totalDays: filteredData.length,
          totalSpent,
          maxDailySpend: Math.max(...filteredData.map((d) => d.value), 0),
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

  const contentHeight = isDualDisplayMode ? "h-[400px] md:h-[480px]" : "h-[150px] md:h-[220px]"

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
            <ChartLoadingState isLoading skeletonType="grid" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasData) {
    return (
      <Card className="@container/card">
        {renderCardHeader()}
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className={`${contentHeight} w-full`}>
            <ChartLoadingState
              isLoading={false}
              skeletonType="grid"
              emptyTitle="No daily grocery activity yet"
              emptyDescription="Upload your receipts to see a calendar heatmap of your grocery spending"
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
        description="Grocery spending patterns throughout the year"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
          Fullscreen view - Calendar heatmap shows grocery spending intensity
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        {renderCardHeader()}
        <CardContent className="flex flex-1 flex-col justify-center px-2 pt-4 pb-2 sm:px-6 sm:pt-6 md:pb-6">
          <div ref={contentRef} className="w-full">
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
          </div>

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

ChartDailyActivityFridge.displayName = "ChartDailyActivityFridge"
