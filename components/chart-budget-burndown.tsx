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

interface ChartBudgetBurndownProps {
  data: Array<{
    date: string
    amount: number
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

interface BudgetBurndownInfoTriggerProps {
  forFullscreen?: boolean
  chartTitle: string
  chartDescription: string
  monthlyIncome: number
  remaining: number
  paceStatus: string
  formatCurrency: (value: number) => string
}

const BudgetBurndownInfoTrigger = memo(function BudgetBurndownInfoTrigger({
  forFullscreen = false,
  chartTitle,
  chartDescription,
  monthlyIncome,
  remaining,
  paceStatus,
  formatCurrency,
}: BudgetBurndownInfoTriggerProps) {
  return (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          `Income: ${formatCurrency(monthlyIncome)}`,
          "Solid line = actual remaining balance",
          "Dashed line = ideal burn rate",
          "Stay above ideal to have savings",
        ]}
      />
      <ChartAiInsightButton
        chartId="budgetBurndown"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={{ remaining, monthlyIncome, paceStatus }}
        size="sm"
      />
    </div>
  )
})

BudgetBurndownInfoTrigger.displayName = "BudgetBurndownInfoTrigger"

interface FlatBurndownPoint {
  day: number
  ideal: number | null
  actual: number | null
}

interface BudgetBurndownChartProps {
  flatData: FlatBurndownPoint[]
  palette: string[]
  isDark: boolean
  formatCurrency: (value: number) => string
  forFullscreen?: boolean
}

const BudgetBurndownChart = memo(function BudgetBurndownChart({
  flatData,
  palette,
  isDark,
  formatCurrency,
  forFullscreen = false,
}: BudgetBurndownChartProps) {
  // Animation trick: start with empty data then switch to real data on next frame
  const [useRealData, setUseRealData] = useState(false)
  useEffect(() => {
    const rafId = requestAnimationFrame(() => setUseRealData(true))
    return () => cancelAnimationFrame(rafId)
  }, [])
  const displayData = useRealData ? flatData : []

  const idealColor = isDark ? "#4b5563" : "#9ca3af"
  const actualColor = palette[0] || "#fe8339"

  const chartConfig = {
    ideal: {
      label: "Ideal",
      theme: { light: idealColor, dark: idealColor },
    },
    actual: {
      label: "Actual",
      theme: { light: actualColor, dark: actualColor },
    },
  } satisfies ChartConfig

  const tooltipContent = (props: TooltipProps<number, string>) => {
    const { active, payload } = props
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload as FlatBurndownPoint
    return (
      <ChartTooltipWrapper>
        <div className="font-medium text-foreground mb-1 whitespace-nowrap">Day {point.day}</div>
        {point.ideal != null && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: idealColor }} />
            <span className="text-foreground/80">Ideal:</span>
            <span className="font-mono text-[0.7rem] text-foreground font-medium">{formatCurrency(point.ideal)}</span>
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
          <linearGradient id="fillIdealIB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-ideal)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-ideal)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillActualIB" x1="0" y1="0" x2="0" y2="1">
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
          dataKey="ideal"
          type="monotone"
          fill="url(#fillIdealIB)"
          stroke="var(--color-ideal)"
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
          fill="url(#fillActualIB)"
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

BudgetBurndownChart.displayName = "BudgetBurndownChart"

export const ChartBudgetBurndown = memo(function ChartBudgetBurndown({
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartBudgetBurndownProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getPalette(), [getPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const chartDataRaw = useMemo(() => {
    const empty = { actual: [] as Array<{ id: string; data: Array<{ x: number; y: number }> }>, ideal: [] as Array<{ id: string; data: Array<{ x: number; y: number }> }>, remaining: 0, daysInMonth: 30, currentDay: 1, monthlyIncome: 0 }
    if (!data || data.length === 0) return empty

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Compute income per month
    const monthlyIncome = new Map<string, number>()
    const currentMonthData: typeof data = []

    data.forEach((tx) => {
      const txDate = new Date(tx.date)
      const key = `${txDate.getFullYear()}-${txDate.getMonth()}`

      if (tx.amount > 0) {
        monthlyIncome.set(key, (monthlyIncome.get(key) || 0) + tx.amount)
      }

      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear && tx.amount < 0) {
        currentMonthData.push(tx)
      }
    })

    const currentKey = `${currentYear}-${currentMonth}`
    let income = monthlyIncome.get(currentKey) || 0

    // Fall back to previous month income if current month has none
    if (income === 0) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      income = monthlyIncome.get(`${prevYear}-${prevMonth}`) || 0
    }

    if (income === 0) return empty

    // Build daily spending map for current month
    const dailySpending = new Map<number, number>()
    currentMonthData.forEach((tx) => {
      const day = new Date(tx.date).getDate()
      dailySpending.set(day, (dailySpending.get(day) || 0) + Math.abs(tx.amount))
    })

    // Actual burndown: start at income, subtract daily spending
    let remaining = income
    const actualData: Array<{ x: number; y: number }> = [{ x: 0, y: income }]
    for (let day = 1; day <= now.getDate(); day++) {
      remaining -= dailySpending.get(day) || 0
      actualData.push({ x: day, y: Math.max(0, remaining) })
    }

    // Ideal burndown: linear from income to 0
    const idealData: Array<{ x: number; y: number }> = []
    const dailyBurn = income / daysInMonth
    for (let day = 0; day <= daysInMonth; day++) {
      idealData.push({ x: day, y: Math.max(0, income - dailyBurn * day) })
    }

    return {
      actual: [{ id: "Actual", data: actualData }],
      ideal: [{ id: "Ideal", data: idealData }],
      remaining,
      daysInMonth,
      currentDay: now.getDate(),
      monthlyIncome: income,
    }
  }, [data])

  const isDark = resolvedTheme === "dark"

  const chartTitle = "Income Burndown"
  const chartDescription = "See how fast you burn through your monthly income. Stay above the ideal line to save."

  const paceStatus = useMemo(() => {
    if (!chartDataRaw.actual?.[0]?.data) return "unknown"
    const lastActual = chartDataRaw.actual[0].data[chartDataRaw.actual[0].data.length - 1]?.y ?? 0
    const idealAtDay = chartDataRaw.ideal?.[0]?.data?.[chartDataRaw.currentDay ?? 0]?.y ?? 0
    return lastActual >= idealAtDay ? "on track" : "over pace"
  }, [chartDataRaw])

  // Flatten into Recharts format
  const flatData = useMemo((): FlatBurndownPoint[] => {
    const idealSeries = chartDataRaw.ideal?.[0]
    const actualSeries = chartDataRaw.actual?.[0]
    if (!idealSeries && !actualSeries) return []

    const idealMap = new Map((idealSeries?.data || []).map(d => [d.x, d.y]))
    const actualMap = new Map((actualSeries?.data || []).map(d => [d.x, d.y]))
    const days = Array.from(new Set([...idealMap.keys(), ...actualMap.keys()])).sort((a, b) => a - b)
    return days.map(day => ({ day, ideal: idealMap.get(day) ?? null, actual: actualMap.get(day) ?? null }))
  }, [chartDataRaw])

  if (!mounted || isLoading || !chartDataRaw.actual?.length) {
    return (
      <Card className="@container/card h-full relative" suppressHydrationWarning>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="budgetBurndown" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <BudgetBurndownInfoTrigger chartTitle={chartTitle} chartDescription={chartDescription} monthlyIncome={chartDataRaw.monthlyIncome} remaining={chartDataRaw.remaining} paceStatus={paceStatus} formatCurrency={formatCurrency} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading || !mounted}
              skeletonType="area"
              emptyTitle={emptyTitle || "No income data found"}
              emptyDescription={emptyDescription || "Import your bank statements to track your income burndown."}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  const idealColor = isDark ? "#4b5563" : "#9ca3af"
  const actualColor = palette[0] || "#fe8339"

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={chartTitle}
        description={chartDescription}
        headerActions={<BudgetBurndownInfoTrigger forFullscreen chartTitle={chartTitle} chartDescription={chartDescription} monthlyIncome={chartDataRaw.monthlyIncome} remaining={chartDataRaw.remaining} paceStatus={paceStatus} formatCurrency={formatCurrency} />}
      >
        <div className="h-full w-full min-h-[400px]">
          <BudgetBurndownChart flatData={flatData} palette={palette} isDark={isDark} formatCurrency={formatCurrency} forFullscreen />
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
            <BudgetBurndownInfoTrigger chartTitle={chartTitle} chartDescription={chartDescription} monthlyIncome={chartDataRaw.monthlyIncome} remaining={chartDataRaw.remaining} paceStatus={paceStatus} formatCurrency={formatCurrency} />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-[200px]">
            <BudgetBurndownChart flatData={flatData} palette={palette} isDark={isDark} formatCurrency={formatCurrency} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: idealColor }} />
              <span className="font-medium text-foreground">Ideal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: actualColor }} />
              <span className="font-medium text-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-foreground/60">Remaining:</span>
              <span className="font-mono font-medium text-foreground">{formatCurrency(chartDataRaw.remaining)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartBudgetBurndown.displayName = "ChartBudgetBurndown"
