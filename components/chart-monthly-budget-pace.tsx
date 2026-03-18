"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
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
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { getChartTextColor, getChartAxisLineColor, getContrastTextColor } from "@/lib/chart-colors"

interface ChartMonthlyBudgetPaceProps {
  data: Array<{
    date: string
    amount: number
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

interface MonthlyBudgetPaceInfoTriggerProps {
  forFullscreen?: boolean
  chartTitle: string
  chartDescription: string
  chartData: {
    paceData: Array<{ label: string; value: number; color: string }>
    projectedTotal: number
    currentTotal: number
    daysRemaining: number
    dayOfMonth: number
    daysInMonth: number
    avgMonthlySpend: number
  }
}

const MonthlyBudgetPaceInfoTrigger = memo(function MonthlyBudgetPaceInfoTrigger({
  forFullscreen = false,
  chartTitle,
  chartDescription,
  chartData,
}: MonthlyBudgetPaceInfoTriggerProps) {
  return (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          "Spent: your actual spending so far",
          "Expected: where you should be based on avg",
          "Projected: estimated end-of-month total",
          "Avg: your typical monthly spending",
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

interface MonthlyBudgetPaceChartProps {
  paceData: Array<{ label: string; value: number; color: string }>
  dayOfMonth: number
  daysInMonth: number
  textColor: string
  gridColor: string
  formatCurrency: (value: number, options?: { maximumFractionDigits?: number }) => string
}

const MonthlyBudgetPaceChart = memo(function MonthlyBudgetPaceChart({
  paceData,
  dayOfMonth,
  daysInMonth,
  textColor,
  gridColor,
  formatCurrency,
}: MonthlyBudgetPaceChartProps) {
  return (
    <ResponsiveBar
      data={paceData}
      keys={["value"]}
      indexBy="label"
      layout="horizontal"
      margin={{ top: 10, right: 30, bottom: 40, left: 80 }}
      padding={0.35}
      colors={({ data: d }) => d.color as string}
      borderRadius={6}
      enableLabel={true}
      label={(d) => formatCurrency(d.value as number, { maximumFractionDigits: 0 })}
      labelSkipWidth={60}
      labelTextColor={(d) => getContrastTextColor(d.color)}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 0,
        tickPadding: 8,
        format: (v: number) => {
          if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
          if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
          return formatCurrency(v, { maximumFractionDigits: 0 })
        },
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 8,
      }}
      enableGridX={true}
      enableGridY={false}
      gridXValues={4}
      theme={{
        text: { fill: textColor, fontSize: 11 },
        axis: { ticks: { text: { fill: textColor } } },
        grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
      }}
      tooltip={({ data: d }) => {
        const dayInfo = dayOfMonth > 0 ? `Day ${dayOfMonth}/${daysInMonth}` : ""
        return (
          <NivoChartTooltip
            title={d.label as string}
            titleColor={d.color as string}
            value={formatCurrency(d.value as number)}
            subValue={dayInfo}
          />
        )
      }}
      animate={true}
      motionConfig="gentle"
    />
  )
})

MonthlyBudgetPaceChart.displayName = "MonthlyBudgetPaceChart"

export const ChartMonthlyBudgetPace = memo(function ChartMonthlyBudgetPace({
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartMonthlyBudgetPaceProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { paceData: [], projectedTotal: 0, currentTotal: 0, daysRemaining: 0, dayOfMonth: 0, daysInMonth: 0, avgMonthlySpend: 0 }

    // Group spending by calendar month
    const monthlyTotals = new Map<string, number>()

    data.forEach((tx) => {
      if (tx.amount >= 0) return // skip income
      const txDate = new Date(tx.date)
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`
      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + Math.abs(tx.amount))
    })

    if (monthlyTotals.size === 0) return { paceData: [], projectedTotal: 0, currentTotal: 0, daysRemaining: 0, dayOfMonth: 0, daysInMonth: 0, avgMonthlySpend: 0 }

    // Sort months chronologically
    const sortedMonths = Array.from(monthlyTotals.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    const totalSpending = sortedMonths.reduce((sum, [, v]) => sum + v, 0)
    const monthCount = sortedMonths.length

    // Current month info
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const daysRemaining = daysInMonth - dayOfMonth
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const hasCurrentMonth = monthlyTotals.has(currentMonthKey)
    const currentMonthSpent = monthlyTotals.get(currentMonthKey) || 0

    // Average of PAST months only (exclude current month for fairer comparison)
    const pastMonthTotals = sortedMonths.filter(([k]) => k !== currentMonthKey)
    const avgMonthlySpend = pastMonthTotals.length > 0
      ? pastMonthTotals.reduce((sum, [, v]) => sum + v, 0) / pastMonthTotals.length
      : (monthCount > 0 ? totalSpending / monthCount : 0)

    // "Spent" = current month actual spending, or total if only 1 month
    const displaySpent = hasCurrentMonth ? currentMonthSpent : (monthCount === 1 ? sortedMonths[0][1] : 0)

    // "Expected at this point" = how much you'd typically have spent by this day
    const expectedAtThisPoint = avgMonthlySpend > 0
      ? (avgMonthlySpend / daysInMonth) * dayOfMonth
      : 0

    // "Projected" = extrapolate current month spending to end of month
    const projectedTotal = hasCurrentMonth && dayOfMonth >= 2
      ? (currentMonthSpent / dayOfMonth) * daysInMonth
      : 0

    const paceData = [
      { label: "Spent", value: displaySpent, color: palette[0] || "#fe8339" },
      ...(avgMonthlySpend > 0 && pastMonthTotals.length > 0
        ? [{ label: "Expected", value: expectedAtThisPoint, color: palette[1] || "#10b981" }]
        : []),
      ...(projectedTotal > 0
        ? [{ label: "Projected", value: projectedTotal, color: palette[2] || "#3b82f6" }]
        : []),
      ...(avgMonthlySpend > 0 && pastMonthTotals.length > 0
        ? [{ label: "Avg Month", value: avgMonthlySpend, color: isDark ? "#6b7280" : "#9ca3af" }]
        : []),
    ]

    return { paceData, projectedTotal, currentTotal: displaySpent, daysRemaining, dayOfMonth, daysInMonth, avgMonthlySpend }
  }, [data, palette, isDark])

  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const chartTitle = "Monthly Budget Pace"
  const chartDescription = "Are you on track this month? Compare your spending pace against your typical month."

  if (!mounted || isLoading || chartData.paceData.length === 0) {
    return (
      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="monthlyBudgetPace" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <MonthlyBudgetPaceInfoTrigger chartTitle={chartTitle} chartDescription={chartDescription} chartData={chartData} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading || !mounted}
              skeletonType="bar"
              emptyTitle={emptyTitle || "No budget data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to track your monthly spending pace."}
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
        title={chartTitle}
        description={chartDescription}
        headerActions={<MonthlyBudgetPaceInfoTrigger forFullscreen chartTitle={chartTitle} chartDescription={chartDescription} chartData={chartData} />}
      >
        <div className="h-full w-full min-h-[400px]" key={colorScheme}>
          <MonthlyBudgetPaceChart paceData={chartData.paceData} dayOfMonth={chartData.dayOfMonth} daysInMonth={chartData.daysInMonth} textColor={textColor} gridColor={gridColor} formatCurrency={formatCurrency} />
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
            <MonthlyBudgetPaceInfoTrigger chartTitle={chartTitle} chartDescription={chartDescription} chartData={chartData} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-[200px]" key={colorScheme}>
            <MonthlyBudgetPaceChart paceData={chartData.paceData} dayOfMonth={chartData.dayOfMonth} daysInMonth={chartData.daysInMonth} textColor={textColor} gridColor={gridColor} formatCurrency={formatCurrency} />
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2 mb-2">
            {chartData.paceData.map((d) => (
              <div key={d.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="font-medium text-foreground truncate max-w-[80px]" title={d.label}>{d.label}</span>
                <span className="text-[0.7rem]">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartMonthlyBudgetPace.displayName = "ChartMonthlyBudgetPace"
