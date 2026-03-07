"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
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
import { getChartTextColor } from "@/lib/chart-colors"

interface ChartIncomeExpenseRatioProps {
  data: Array<{
    date: string
    amount: number
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartIncomeExpenseRatio = memo(function ChartIncomeExpenseRatio({
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartIncomeExpenseRatioProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const ratioData = useMemo(() => {
    if (!data || data.length === 0) return { ratio: 0, income: 0, expenses: 0, status: "neutral" as const }

    let totalIncome = 0
    let totalExpenses = 0

    data.forEach((tx) => {
      if (tx.amount > 0) totalIncome += tx.amount
      else totalExpenses += Math.abs(tx.amount)
    })

    const ratio = totalExpenses > 0 ? totalIncome / totalExpenses : 0

    let status: "danger" | "warning" | "good" | "excellent" | "neutral"
    if (ratio < 0.8) status = "danger"
    else if (ratio < 1) status = "warning"
    else if (ratio < 1.5) status = "good"
    else status = "excellent"

    return { ratio, income: totalIncome, expenses: totalExpenses, status }
  }, [data])

  const pieData = useMemo(() => {
    if (ratioData.income === 0 && ratioData.expenses === 0) return []
    return [
      { id: "Income", label: "Income", value: ratioData.income, color: palette[1] || "#10b981" },
      { id: "Expenses", label: "Expenses", value: ratioData.expenses, color: palette[0] || "#fe8339" },
    ].filter((d) => d.value > 0)
  }, [ratioData, palette])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const chartTitle = "Income to Expense Ratio"
  const chartDescription = "Shows how your income compares to your expenses. A ratio above 1 means you're earning more than spending."

  const getStatusColor = () => {
    switch (ratioData.status) {
      case "danger": return "#ef4444"
      case "warning": return "#f59e0b"
      case "good": return "#10b981"
      case "excellent": return palette[1] || "#22c55e"
      default: return textColor
    }
  }

  const getStatusText = () => {
    switch (ratioData.status) {
      case "danger": return "Overspending"
      case "warning": return "Near Break-even"
      case "good": return "Healthy"
      case "excellent": return "Excellent"
      default: return "No Data"
    }
  }

  const total = ratioData.income + ratioData.expenses

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          "< 0.8x = Danger zone (overspending)",
          "0.8-1x = Warning (near break-even)",
          "1-1.5x = Healthy surplus",
          "> 1.5x = Excellent savings",
        ]}
      />
      <ChartAiInsightButton
        chartId="incomeExpenseRatio"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={ratioData}
        size="sm"
      />
    </div>
  )

  const renderChart = () => (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <div className="w-full h-[200px] relative">
        <ResponsivePie
          data={pieData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          colors={{ datum: "data.color" }}
          borderWidth={0}
          enableArcLinkLabels={false}
          enableArcLabels={false}
          tooltip={({ datum }) => {
            const pct = total > 0 ? (Number(datum.value) / total) * 100 : 0
            return (
              <NivoChartTooltip
                title={datum.label as string}
                titleColor={datum.color as string}
                value={formatCurrency(Number(datum.value))}
                subValue={`${pct.toFixed(1)}% of total`}
              />
            )
          }}
          theme={{ text: { fill: textColor, fontSize: 12 } }}
          animate={true}
          motionConfig="gentle"
        />
        {/* Center label overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-foreground">{ratioData.ratio.toFixed(2)}x</span>
          <span className="text-sm font-medium" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Income/Expense breakdown */}
      <div className="flex gap-8 mt-4 text-sm">
        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: palette[1] || "#10b981" }} />
            <span style={{ color: textColor }}>Income</span>
          </div>
          <div className="font-semibold text-emerald-500 mt-0.5">{formatCurrency(ratioData.income)}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: palette[0] || "#fe8339" }} />
            <span style={{ color: textColor }}>Expenses</span>
          </div>
          <div className="font-semibold text-red-500 mt-0.5">{formatCurrency(ratioData.expenses)}</div>
        </div>
      </div>
    </div>
  )

  if (!mounted || isLoading || pieData.length === 0) {
    return (
      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="incomeExpenseRatio" chartTitle={chartTitle} size="md" />
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
              skeletonType="pie"
              emptyTitle={emptyTitle || "No income/expense data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see your income to expense ratio."}
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
            <ChartFavoriteButton chartId="incomeExpenseRatio" chartTitle={chartTitle} size="md" />
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

ChartIncomeExpenseRatio.displayName = "ChartIncomeExpenseRatio"
