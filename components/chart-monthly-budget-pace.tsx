"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, TooltipProps } from "recharts"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { CHART_GRID_COLOR } from "@/lib/chart-colors"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { ChartTooltipWrapper } from "@/components/chart-tooltip"

interface ChartMonthlyBudgetPaceProps {
  data: Array<{
    date: string
    amount: number
  }>
  dateFilter?: string | null
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

const CUSTOM_DATE_RANGE_RE_MBP = /^custom:\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$/
const YEAR_FILTER_RE_MBP = /^\d{4}$/

function getDateRangeFromFilterMBP(filter: string | null | undefined): { startDate: Date; endDate: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const MS = 86400000

  if (!filter) return { startDate: new Date(today.getTime() - 182 * MS), endDate: today }
  const f = filter.trim()

  if (CUSTOM_DATE_RANGE_RE_MBP.test(f)) {
    const parts = f.split(":")
    const start = new Date(parts[1]); start.setHours(0, 0, 0, 0)
    const end = new Date(parts[2]); end.setHours(0, 0, 0, 0)
    return { startDate: start, endDate: end }
  }

  if (YEAR_FILTER_RE_MBP.test(f)) {
    const year = parseInt(f, 10)
    const start = new Date(year, 0, 1)
    const end = year === today.getFullYear() ? today : new Date(year, 11, 31)
    return { startDate: start, endDate: end }
  }

  switch (f) {
    case "last30days":  return { startDate: new Date(today.getTime() - 30 * MS), endDate: today }
    case "last3months": return { startDate: new Date(today.getTime() - 91 * MS), endDate: today }
    case "last6months": return { startDate: new Date(today.getTime() - 182 * MS), endDate: today }
    case "lastyear":    return { startDate: new Date(today.getTime() - 365 * MS), endDate: today }
    case "ytd":         return { startDate: new Date(today.getFullYear(), 0, 1), endDate: today }
    default:            return { startDate: new Date(today.getTime() - 182 * MS), endDate: today }
  }
}

interface PaceChartData {
  lineData: Array<{ id: string; data: Array<{ x: number; y: number }> }>
  currentDay: number
  daysInMonth: number
  avgMonthlySpend: number
  currentSpend: number
  displayMonth: string
}

interface MonthlyBudgetPaceInfoTriggerProps {
  forFullscreen?: boolean
  chartTitle: string
  chartDescription: string
  chartData: PaceChartData
  formatCurrency: (value: number) => string
}

const MonthlyBudgetPaceInfoTrigger = memo(function MonthlyBudgetPaceInfoTrigger({
  forFullscreen = false,
  chartTitle,
  chartDescription,
  chartData,
  formatCurrency,
}: MonthlyBudgetPaceInfoTriggerProps) {
  return (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          `Spent so far: ${formatCurrency(chartData.currentSpend)}`,
          `Avg monthly: ${formatCurrency(chartData.avgMonthlySpend)}`,
          "Colored line = your actual spending",
          "Dashed = ideal daily pace",
        ]}
      />
      <ChartAiInsightButton
        chartId="monthlyBudgetPace"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={chartData}
        size="sm"
      />
    </div>
  )
})

MonthlyBudgetPaceInfoTrigger.displayName = "MonthlyBudgetPaceInfoTrigger"

interface FlatDataPoint {
  day: number
  pace: number | null
  actual: number | null
}

interface MonthlyBudgetPaceChartProps {
  flatData: FlatDataPoint[]
  palette: string[]
  isDark: boolean
  formatCurrency: (value: number) => string
  forFullscreen?: boolean
}

const MonthlyBudgetPaceChart = memo(function MonthlyBudgetPaceChart({
  flatData,
  palette,
  isDark,
  formatCurrency,
  forFullscreen = false,
}: MonthlyBudgetPaceChartProps) {
  // Animation trick: start with empty data then switch to real data on next frame
  const [useRealData, setUseRealData] = useState(false)
  useEffect(() => {
    const rafId = requestAnimationFrame(() => setUseRealData(true))
    return () => cancelAnimationFrame(rafId)
  }, [])
  const displayData = useRealData ? flatData : []

  const paceColor = isDark ? "#4b5563" : "#9ca3af"
  const actualColor = palette[0] || "#fe8339"

  const chartConfig = {
    pace: {
      label: "Pace",
      theme: { light: paceColor, dark: paceColor },
    },
    actual: {
      label: "Actual",
      theme: { light: actualColor, dark: actualColor },
    },
  } satisfies ChartConfig

  const tooltipContent = (props: TooltipProps<number, string>) => {
    const { active, payload } = props
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload as FlatDataPoint
    return (
      <ChartTooltipWrapper>
        <div className="font-medium text-foreground mb-1 whitespace-nowrap">Day {point.day}</div>
        {point.pace != null && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: paceColor }} />
            <span className="text-foreground/80">Pace:</span>
            <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(point.pace)}</span>
          </div>
        )}
        {point.actual != null && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: actualColor }} />
            <span className="text-foreground/80">Actual:</span>
            <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(point.actual)}</span>
          </div>
        )}
      </ChartTooltipWrapper>
    )
  }

  const chartHeight = forFullscreen ? "h-full" : "aspect-auto h-[250px]"

  return (
    <ChartContainer config={chartConfig} className={`${chartHeight} w-full min-w-0`}>
      <AreaChart data={displayData}>
        <defs>
          <linearGradient id="fillPaceMBP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-pace)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-pace)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillActualMBP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={30}
          tickFormatter={(v) => `Day ${v}`}
        />
        <Area
          dataKey="pace"
          type="monotone"
          fill="url(#fillPaceMBP)"
          stroke="var(--color-pace)"
          strokeWidth={2}
          strokeDasharray="6 3"
          connectNulls
          isAnimationActive={true}
          animationDuration={1000}
          animationEasing="ease-out"
        />
        <Area
          dataKey="actual"
          type="monotone"
          fill="url(#fillActualMBP)"
          stroke="var(--color-actual)"
          strokeWidth={2.5}
          connectNulls
          isAnimationActive={true}
          animationDuration={1000}
          animationEasing="ease-out"
        />
        <Tooltip cursor={false} content={tooltipContent} />
      </AreaChart>
    </ChartContainer>
  )
})

MonthlyBudgetPaceChart.displayName = "MonthlyBudgetPaceChart"

export const ChartMonthlyBudgetPace = memo(function ChartMonthlyBudgetPace({
  data,
  dateFilter,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartMonthlyBudgetPaceProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getPalette(), [getPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  const chartData = useMemo((): PaceChartData => {
    const empty: PaceChartData = { lineData: [], currentDay: 0, daysInMonth: 30, avgMonthlySpend: 0, currentSpend: 0, displayMonth: "" }
    if (!data || data.length === 0) return empty

    // Derive exact date range from filter — same approach as Income Burndown
    const { startDate, endDate } = getDateRangeFromFilterMBP(dateFilter)
    const MS = 86400000
    const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / MS) + 1)

    // Compute avg monthly spend from all months in the dataset
    const monthlyTotals = new Map<string, number>()
    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const txDate = new Date(tx.date)
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`
      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + Math.abs(tx.amount))
    })

    if (monthlyTotals.size === 0) return empty

    const avgMonthlySpend = Array.from(monthlyTotals.values()).reduce((a, b) => a + b, 0) / monthlyTotals.size
    const avgDailySpend = avgMonthlySpend / 30

    // Build cumulative actual spending over the full filter period
    const dailySpending = new Map<number, number>()
    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const txDate = new Date(tx.date.split("T")[0])
      txDate.setHours(0, 0, 0, 0)
      const dayIndex = Math.round((txDate.getTime() - startDate.getTime()) / MS)
      if (dayIndex >= 0 && dayIndex < totalDays) {
        dailySpending.set(dayIndex, (dailySpending.get(dayIndex) || 0) + Math.abs(tx.amount))
      }
    })

    let cumulative = 0
    const actualPoints: Array<{ x: number; y: number }> = []
    for (let i = 0; i < totalDays; i++) {
      cumulative += dailySpending.get(i) || 0
      actualPoints.push({ x: i + 1, y: cumulative })
    }

    // Ideal pace: linear 0 → avgDailySpend * totalDays over totalDays
    const pacePoints: Array<{ x: number; y: number }> = []
    for (let day = 1; day <= totalDays; day++) {
      pacePoints.push({ x: day, y: avgDailySpend * day })
    }

    return {
      lineData: [
        { id: "Pace", data: pacePoints },
        { id: "Actual", data: actualPoints },
      ],
      currentDay: totalDays,
      daysInMonth: totalDays,
      avgMonthlySpend,
      currentSpend: cumulative,
      displayMonth: "",
    }
  }, [data, dateFilter])

  // Flatten Nivo-style lineData into Recharts flat format
  const flatData = useMemo((): FlatDataPoint[] => {
    if (!chartData.lineData.length) return []
    const paceMap = new Map((chartData.lineData.find(l => l.id === "Pace")?.data || []).map(d => [d.x, d.y]))
    const actualMap = new Map((chartData.lineData.find(l => l.id === "Actual")?.data || []).map(d => [d.x, d.y]))
    const days = Array.from(new Set([...paceMap.keys(), ...actualMap.keys()])).sort((a, b) => a - b)
    return days.map(day => ({ day, pace: paceMap.get(day) ?? null, actual: actualMap.get(day) ?? null }))
  }, [chartData.lineData])

  const chartTitle = "Monthly Budget Pace"
  const chartDescription = "Are you on track this month? Your cumulative spending vs a steady daily pace."

  if (!mounted || isLoading || chartData.lineData.length === 0) {
    return (
      <Card className="@container/card h-full relative" suppressHydrationWarning>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="monthlyBudgetPace" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <MonthlyBudgetPaceInfoTrigger chartTitle={chartTitle} chartDescription={chartDescription} chartData={chartData} formatCurrency={formatCurrency} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading || !mounted}
              skeletonType="area"
              emptyTitle={emptyTitle || "No spending data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to track your monthly spending pace."}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  const paceColor = isDark ? "#4b5563" : "#9ca3af"
  const actualColor = palette[0] || "#fe8339"

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={chartTitle}
        description={chartDescription}
        headerActions={<MonthlyBudgetPaceInfoTrigger forFullscreen chartTitle={chartTitle} chartDescription={chartDescription} chartData={chartData} formatCurrency={formatCurrency} />}
      >
        <div className="h-full w-full min-h-[400px]">
          <MonthlyBudgetPaceChart flatData={flatData} palette={palette} isDark={isDark} formatCurrency={formatCurrency} forFullscreen />
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="monthlyBudgetPace" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <MonthlyBudgetPaceInfoTrigger chartTitle={chartTitle} chartDescription={chartDescription} chartData={chartData} formatCurrency={formatCurrency} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-[200px]">
            <MonthlyBudgetPaceChart flatData={flatData} palette={palette} isDark={isDark} formatCurrency={formatCurrency} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: paceColor }} />
              <span className="font-medium text-foreground">Pace</span>
              <span className="text-[0.7rem]">{formatCurrency(chartData.avgMonthlySpend)}/mo avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: actualColor }} />
              <span className="font-medium text-foreground">Actual</span>
              <span className="text-[0.7rem]">{formatCurrency(chartData.currentSpend)} so far</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartMonthlyBudgetPace.displayName = "ChartMonthlyBudgetPace"
