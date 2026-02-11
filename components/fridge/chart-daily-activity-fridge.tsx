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
import { useIsMobile } from "@/hooks/use-mobile"
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
  isLoading?: boolean
}

const CHART_ID = "fridge:dailyActivity"
const CHART_TITLE = "Daily Grocery Activity"
const MAX_LEVEL = 4

/** Desktop: always single. Mobile: dual for YTD and specific years (two 6-month halves). */
function getDisplayMode(selectedYear: string, isMobile: boolean): "single" | "dual" {
  if (!isMobile) return "single"
  if (selectedYear === "YTD") return "dual"
  if (/^\d{4}$/.test(selectedYear)) return "dual"
  return "single"
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

export const ChartDailyActivityFridge = React.memo(function ChartDailyActivityFridge({
  receiptTransactions = [],
  dailySpendingData,
  isLoading = false,
}: ChartDailyActivityFridgeProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const { resolvedTheme } = useTheme()
  const { getRawPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)
  const [tooltip, setTooltip] = useState<{ date: string; value: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  const isYTD = selectedYear === "YTD"
  const displayMode = getDisplayMode(selectedYear, isMobile)
  const isDualCalendar = displayMode === "dual"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Aggregate receipt transactions by date
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

  // Generate list of available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    dailyData.forEach((item) => {
      const year = new Date(item.day).getFullYear()
      years.add(year)
    })
    if (years.size === 0) {
      years.add(currentYear)
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [dailyData, currentYear])

  // Calculate date range based on year selection
  const { fromDate, toDate } = useMemo(() => {
    if (isYTD) {
      const today = new Date()
      const oneYearAgo = new Date(today)
      oneYearAgo.setDate(oneYearAgo.getDate() - 365)
      return {
        fromDate: oneYearAgo.toISOString().split("T")[0],
        toDate: today.toISOString().split("T")[0],
      }
    }
    // For specific years (including current year), always show full year Jan 1 - Dec 31
    return {
      fromDate: `${selectedYear}-01-01`,
      toDate: `${selectedYear}-12-31`,
    }
  }, [isYTD, selectedYear])

  // Calculate dual periods for mobile
  const { period1, period2 } = useMemo(() => {
    if (!isDualCalendar) return { period1: null, period2: null }

    const today = new Date()

    if (isYTD) {
      const oneYearAgo = new Date(today)
      oneYearAgo.setDate(oneYearAgo.getDate() - 365)
      const sixMonthsAgo = new Date(today)
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const p1End = new Date(sixMonthsAgo)
      p1End.setDate(p1End.getDate() - 1)
      return {
        period1: {
          fromDate: fmtDate(oneYearAgo),
          toDate: fmtDate(p1End),
          label: getMonthRangeLabel(oneYearAgo, p1End),
        },
        period2: {
          fromDate: fmtDate(sixMonthsAgo),
          toDate: fmtDate(today),
          label: getMonthRangeLabel(sixMonthsAgo, today),
        },
      }
    }

    // Specific year: Jan-Jun, Jul-Dec
    const year = parseInt(selectedYear, 10)
    const jan1 = new Date(year, 0, 1)
    const jun30 = new Date(year, 5, 30)
    const jul1 = new Date(year, 6, 1)
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
    }
  }, [isDualCalendar, isYTD, selectedYear])

  // Filter data based on selection (only filter values, don't cap future dates)
  const filteredData = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return dailyData.filter((item) => {
      if (item.value <= 0 || item.day > today) return false
      if (fromDate && item.day < fromDate) return false
      if (toDate && item.day > toDate) return false
      return true
    })
  }, [dailyData, fromDate, toDate])

  // Auto-switch to year with data if current selection is empty
  useEffect(() => {
    if (!dailyData || dailyData.length === 0 || availableYears.length === 0) return
    if (filteredData.length > 0) return

    const closestYear = availableYears.reduce((best, year) => {
      const bestDiff = Math.abs(best - currentYear)
      const yearDiff = Math.abs(year - currentYear)
      if (yearDiff < bestDiff) return year
      if (yearDiff === bestDiff) return year > best ? year : best
      return best
    }, availableYears[0])

    if (selectedYear !== closestYear.toString()) {
      setSelectedYear(closestYear.toString())
    }
  }, [filteredData, dailyData, availableYears, currentYear, selectedYear])

  // Max value for level computation
  const maxValue = useMemo(() => {
    if (filteredData.length === 0) return 1000
    return Math.max(...filteredData.map((d) => d.value), 10)
  }, [filteredData])

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
    () => (isDualCalendar ? [] : buildActivities(fromDate, toDate)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredData, fromDate, toDate, maxValue, isDualCalendar]
  )

  const period1Activities = useMemo(
    () => (isDualCalendar && period1 ? buildActivities(period1.fromDate, period1.toDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredData, period1, maxValue, isDualCalendar]
  )
  const period2Activities = useMemo(
    () => (isDualCalendar && period2 ? buildActivities(period2.fromDate, period2.toDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredData, period2, maxValue, isDualCalendar]
  )

  const allActivities = isDualCalendar
    ? [...period1Activities, ...period2Activities]
    : singleActivities
  const hasData = allActivities.length > 0

  const totalSpent = useMemo(
    () => filteredData.reduce((sum, d) => sum + d.value, 0),
    [filteredData]
  )

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

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title={CHART_TITLE}
        description="Your grocery spending patterns throughout the year - darker means more spending"
        details={[
          "Each cell represents a day, colored by the total grocery amount you spent.",
          "On desktop the chart shows the full selected period. On mobile, yearly views split into two 6-month calendars.",
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
          maxDailySpend: maxValue,
        }}
        size="sm"
      />
    </div>
  )

  const renderYearSelector = () => (
    <Select value={selectedYear} onValueChange={setSelectedYear}>
      <SelectTrigger className="w-32" size="sm" aria-label="Select year">
        <SelectValue
          placeholder={selectedYear === "YTD" ? "YTD" : selectedYear || currentYear.toString()}
        />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        <SelectItem value="YTD" className="rounded-lg">
          YTD
        </SelectItem>
        {availableYears.map((year) => (
          <SelectItem key={year} value={year.toString()} className="rounded-lg">
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const renderCardHeader = () => (
    <CardHeader>
      <div className="flex items-center gap-2">
        <GridStackCardDragHandle />
        <ChartFavoriteButton chartId={CHART_ID} chartTitle={CHART_TITLE} size="md" />
        <CardTitle>{CHART_TITLE}</CardTitle>
      </div>
      <CardAction className="flex flex-wrap items-center gap-2">
        {renderInfoTrigger()}
        {renderYearSelector()}
      </CardAction>
    </CardHeader>
  )

  const contentHeight = isDualCalendar ? "h-[300px] md:h-[360px]" : "h-[140px] md:h-[250px]"

  if (!mounted || isLoading) {
    return (
      <Card className="@container/card">
        {renderCardHeader()}
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className={`${contentHeight} w-full`}>
            <ChartLoadingState isLoading={true} skeletonType="grid" />
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
              emptyTitle="No daily activity yet"
              emptyDescription="Upload your receipts to see a calendar heatmap of your grocery spending"
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
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
            document.body
          )}
      </CardContent>
    </Card>
  )
})

ChartDailyActivityFridge.displayName = "ChartDailyActivityFridge"
