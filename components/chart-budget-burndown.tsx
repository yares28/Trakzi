"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveLine } from "@nivo/line"
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

interface ChartBudgetBurndownProps {
  data: Array<{
    date: string
    amount: number
  }>
  isLoading?: boolean
  monthlyBudget?: number
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartBudgetBurndown = memo(function ChartBudgetBurndown({
  data,
  isLoading = false,
  monthlyBudget = 3000,
  emptyTitle,
  emptyDescription,
}: ChartBudgetBurndownProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { actual: [], ideal: [], remaining: monthlyBudget, daysInMonth: 30, currentDay: 1, effectiveBudget: monthlyBudget }

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Compute average past monthly spending as a smart budget default
    const monthlyTotals = new Map<string, number>()
    const currentMonthData: typeof data = []

    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const txDate = new Date(tx.date)
      const txMonth = txDate.getMonth()
      const txYear = txDate.getFullYear()

      if (txMonth === currentMonth && txYear === currentYear) {
        currentMonthData.push(tx)
      }

      const key = `${txYear}-${txMonth}`
      monthlyTotals.set(key, (monthlyTotals.get(key) || 0) + Math.abs(tx.amount))
    })

    // Use past months to derive budget when no explicit budget set
    const pastMonthValues = Array.from(monthlyTotals.entries())
      .filter(([key]) => {
        const [y, m] = key.split("-").map(Number)
        return !(y === currentYear && m === currentMonth)
      })
      .map(([, val]) => val)

    // Use provided budget, or derive from average past spending (rounded up to nearest 100)
    const effectiveBudget = monthlyBudget !== 3000 ? monthlyBudget : (
      pastMonthValues.length > 0
        ? Math.ceil((pastMonthValues.reduce((a, b) => a + b, 0) / pastMonthValues.length) / 100) * 100
        : monthlyBudget
    )

    const dailySpending = new Map<number, number>()
    currentMonthData.forEach((tx) => {
      const day = new Date(tx.date).getDate()
      dailySpending.set(day, (dailySpending.get(day) || 0) + Math.abs(tx.amount))
    })

    let remaining = effectiveBudget
    const actualData: Array<{ x: number; y: number }> = [{ x: 0, y: effectiveBudget }]

    for (let day = 1; day <= daysInMonth; day++) {
      const spent = dailySpending.get(day) || 0
      remaining -= spent
      if (day <= now.getDate()) {
        actualData.push({ x: day, y: Math.max(0, remaining) })
      }
    }

    const idealData: Array<{ x: number; y: number }> = []
    const dailyBudget = effectiveBudget / daysInMonth
    for (let day = 0; day <= daysInMonth; day++) {
      idealData.push({ x: day, y: effectiveBudget - dailyBudget * day })
    }

    return {
      actual: [{ id: "Actual", data: actualData }],
      ideal: [{ id: "Ideal", data: idealData }],
      remaining,
      daysInMonth,
      currentDay: now.getDate(),
      effectiveBudget,
    }
  }, [data, monthlyBudget])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const chartTitle = "Budget Burndown"
  const chartDescription = "Track how quickly you're burning through your monthly budget. Stay below the ideal line!"

  const paceStatus = useMemo(() => {
    if (!chartData.actual?.[0]?.data) return "unknown"
    const lastActual = chartData.actual[0].data[chartData.actual[0].data.length - 1]?.y ?? 0
    const idealAtDay = chartData.ideal?.[0]?.data?.[chartData.currentDay ?? 0]?.y ?? 0
    return lastActual > idealAtDay ? "under" : "over"
  }, [chartData])

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          `Budget: ${formatCurrency(chartData.effectiveBudget ?? monthlyBudget)}`,
          "Solid line = actual spending",
          "Dashed line = ideal pace",
          "Stay above the ideal for savings",
        ]}
      />
      <ChartAiInsightButton
        chartId="budgetBurndown"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={{ remaining: chartData.remaining, monthlyBudget: chartData.effectiveBudget ?? monthlyBudget, paceStatus }}
        size="sm"
      />
    </div>
  )

  const combinedData = useMemo(
    () => [...(chartData.ideal || []), ...(chartData.actual || [])],
    [chartData.ideal, chartData.actual],
  )

  const renderChart = () => (
    <ResponsiveLine
      data={combinedData}
      margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
      xScale={{ type: "linear", min: 0, max: chartData.daysInMonth }}
      yScale={{ type: "linear", min: 0, max: (chartData.effectiveBudget ?? monthlyBudget) * 1.1 }}
      curve="monotoneX"
      colors={[isDark ? "#4b5563" : "#9ca3af", palette[0] || "#fe8339"]}
      lineWidth={3}
      enablePoints={false}
      enableGridX={false}
      enableArea={true}
      areaOpacity={0.06}
      axisBottom={{
        tickSize: 0,
        tickPadding: 12,
        legend: "Day of Month",
        legendOffset: 36,
        legendPosition: "middle",
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 8,
        format: (v: number) => {
          if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
          if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
          return formatCurrency(v, { maximumFractionDigits: 0 })
        },
      }}
      theme={{
        text: { fill: textColor, fontSize: 11 },
        axis: {
          ticks: { text: { fill: textColor } },
          legend: { text: { fill: textColor, fontSize: 11 } },
        },
        grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
        crosshair: { line: { stroke: textColor, strokeWidth: 1, strokeOpacity: 0.35 } },
      }}
      useMesh={true}
      tooltip={(props) => {
        const point = props.point as unknown as { serieId: string; data: { x: number; y: number }; color: string }
        return (
          <NivoChartTooltip
            title={`Day ${point.data.x}`}
            titleColor={point.color}
            value={`${point.serieId}: ${formatCurrency(point.data.y)}`}
          />
        )
      }}
      animate={true}
      motionConfig="gentle"
    />
  )

  if (!mounted || isLoading || !chartData.actual?.length) {
    return (
      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="budgetBurndown" chartTitle={chartTitle} size="md" />
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
              skeletonType="area"
              emptyTitle={emptyTitle || "No budget data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to track your budget burndown."}
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
            <ChartFavoriteButton chartId="budgetBurndown" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-[200px]" key={colorScheme}>
            {renderChart()}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: [isDark ? "#4b5563" : "#9ca3af", palette[0] || "#fe8339"][0] }} />
              <span className="font-medium text-foreground truncate max-w-[80px]" title="Ideal">Ideal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: [isDark ? "#4b5563" : "#9ca3af", palette[0] || "#fe8339"][1] }} />
              <span className="font-medium text-foreground truncate max-w-[80px]" title="Actual">Actual</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartBudgetBurndown.displayName = "ChartBudgetBurndown"
