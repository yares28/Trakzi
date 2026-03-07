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
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"

interface ChartMonthlyBudgetPaceProps {
  data: Array<{
    date: string
    amount: number
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

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

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const daysRemaining = daysInMonth - dayOfMonth

    const monthlyTotals = new Map<string, number>()
    let currentMonthTotal = 0

    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const txDate = new Date(tx.date)
      const txMonth = txDate.getMonth()
      const txYear = txDate.getFullYear()

      if (txMonth === currentMonth && txYear === currentYear) {
        currentMonthTotal += Math.abs(tx.amount)
      }

      const monthKey = `${txYear}-${txMonth}`
      monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + Math.abs(tx.amount))
    })

    const pastMonths = Array.from(monthlyTotals.entries())
      .filter(([key]) => {
        const [y, m] = key.split("-").map(Number)
        return !(y === currentYear && m === currentMonth)
      })
      .map(([, val]) => val)

    const avgMonthlySpend = pastMonths.length > 0
      ? pastMonths.reduce((a, b) => a + b, 0) / pastMonths.length
      : 0

    // Only show projection when we have enough data (at least 3 days in)
    // to avoid wildly inaccurate extrapolations on day 1-2
    const hasReliableProjection = dayOfMonth >= 3
    const expectedAtThisPoint = avgMonthlySpend > 0
      ? (avgMonthlySpend / daysInMonth) * dayOfMonth
      : 0
    const projectedTotal = hasReliableProjection
      ? (currentMonthTotal / dayOfMonth) * daysInMonth
      : 0

    const paceData = [
      { label: "Spent", value: currentMonthTotal, color: palette[0] || "#fe8339" },
      ...(avgMonthlySpend > 0
        ? [{ label: "Expected", value: expectedAtThisPoint, color: palette[1] || "#10b981" }]
        : []),
      ...(hasReliableProjection && currentMonthTotal > 0
        ? [{ label: "Projected", value: projectedTotal, color: palette[2] || "#3b82f6" }]
        : []),
      ...(avgMonthlySpend > 0
        ? [{ label: "Avg Month", value: avgMonthlySpend, color: isDark ? "#6b7280" : "#9ca3af" }]
        : []),
    ]

    return { paceData, projectedTotal, currentTotal: currentMonthTotal, daysRemaining, dayOfMonth, daysInMonth, avgMonthlySpend }
  }, [data, palette, isDark])

  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const chartTitle = "Monthly Budget Pace"
  const chartDescription = "Are you on track this month? Compare your spending pace against your typical month."

  const renderInfoTrigger = (forFullscreen = false) => (
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

  const renderChart = () => (
    <ResponsiveBar
      data={chartData.paceData}
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
      labelTextColor="#ffffff"
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
        const dayInfo = chartData.dayOfMonth > 0 ? `Day ${chartData.dayOfMonth}/${chartData.daysInMonth}` : ""
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
            {renderInfoTrigger()}
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
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]" key={colorScheme}>
          {renderChart()}
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
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartMonthlyBudgetPace.displayName = "ChartMonthlyBudgetPace"
