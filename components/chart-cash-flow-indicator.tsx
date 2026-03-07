"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
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
import { getChartTextColor } from "@/lib/chart-colors"

interface ChartCashFlowIndicatorProps {
  data: Array<{
    date: string
    amount: number
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartCashFlowIndicator = memo(function ChartCashFlowIndicator({
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartCashFlowIndicatorProps) {
  const { resolvedTheme } = useTheme()
  const { getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const cashFlowData = useMemo(() => {
    if (!data || data.length === 0) return { income: 0, expenses: 0, netFlow: 0, flowPercentage: 50, incomePercent: 50, expensePercent: 50 }

    let income = 0
    let expenses = 0

    data.forEach((tx) => {
      if (tx.amount > 0) {
        income += tx.amount
      } else {
        expenses += Math.abs(tx.amount)
      }
    })

    const netFlow = income - expenses
    const total = income + expenses
    const incomePercent = total > 0 ? (income / total) * 100 : 50
    const expensePercent = total > 0 ? (expenses / total) * 100 : 50
    const maxRange = Math.max(income, expenses) * 2
    const flowPercentage = maxRange > 0 ? Math.max(0, Math.min(100, 50 + (netFlow / maxRange) * 50)) : 50

    return { income, expenses, netFlow, flowPercentage, incomePercent, expensePercent }
  }, [data])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const chartTitle = "Cash Flow Indicator"
  const chartDescription = "Visualize your income vs expenses for your selected period. Stay in the green zone!"

  const getFlowStatus = () => {
    if (cashFlowData.flowPercentage >= 70) return { text: "Excellent", color: "#10b981" }
    if (cashFlowData.flowPercentage >= 55) return { text: "Good", color: palette[1] || "#22c55e" }
    if (cashFlowData.flowPercentage >= 45) return { text: "Break-even", color: "#f59e0b" }
    if (cashFlowData.flowPercentage >= 30) return { text: "Deficit", color: "#ef4444" }
    return { text: "Critical", color: "#dc2626" }
  }

  const status = getFlowStatus()

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          "Measures income vs expenses",
          "50% = break-even",
          "> 50% = positive cash flow",
          "< 50% = negative cash flow",
        ]}
      />
      <ChartAiInsightButton
        chartId="cashFlowIndicator"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={cashFlowData}
        size="sm"
      />
    </div>
  )

  const incomeColor = palette[1] || "#10b981"
  const expenseColor = palette[0] || "#fe8339"

  const renderGauge = () => (
    <div className="h-full w-full flex flex-col items-center justify-center gap-5">
      {/* Status */}
      <div className="text-center">
        <div className="text-3xl font-bold" style={{ color: status.color }}>
          {status.text}
        </div>
        <div className="text-sm mt-1" style={{ color: textColor }}>
          Net Flow:{" "}
          <span className="font-semibold" style={{ color: cashFlowData.netFlow >= 0 ? "#10b981" : "#ef4444" }}>
            {cashFlowData.netFlow >= 0 ? "+" : ""}
            {formatCurrency(cashFlowData.netFlow)}
          </span>
        </div>
      </div>

      {/* Horizontal stacked bar */}
      <div className="w-full max-w-xs">
        <div
          className="h-8 rounded-full overflow-hidden flex"
          style={{ backgroundColor: isDark ? "#1f2937" : "#f3f4f6" }}
        >
          <div
            className="h-full transition-all duration-1000 ease-out rounded-l-full flex items-center justify-center"
            style={{
              width: `${cashFlowData.incomePercent}%`,
              minWidth: cashFlowData.income > 0 ? "20px" : "0px",
              backgroundColor: incomeColor,
            }}
          >
            {cashFlowData.incomePercent > 25 && (
              <span className="text-[10px] font-bold text-white px-1 truncate">
                {Math.round(cashFlowData.incomePercent)}%
              </span>
            )}
          </div>
          <div
            className="h-full transition-all duration-1000 ease-out rounded-r-full flex items-center justify-center"
            style={{
              width: `${cashFlowData.expensePercent}%`,
              minWidth: cashFlowData.expenses > 0 ? "20px" : "0px",
              backgroundColor: expenseColor,
            }}
          >
            {cashFlowData.expensePercent > 25 && (
              <span className="text-[10px] font-bold text-white px-1 truncate">
                {Math.round(cashFlowData.expensePercent)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Income/Expense breakdown */}
      <div className="flex gap-8 text-sm">
        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: incomeColor }} />
            <span style={{ color: textColor }}>Income</span>
          </div>
          <div className="font-semibold text-emerald-500 mt-0.5">{formatCurrency(cashFlowData.income)}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: expenseColor }} />
            <span style={{ color: textColor }}>Expenses</span>
          </div>
          <div className="font-semibold text-red-500 mt-0.5">{formatCurrency(cashFlowData.expenses)}</div>
        </div>
      </div>
    </div>
  )

  if (!mounted || isLoading || (!data || data.length === 0)) {
    return (
      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="cashFlowIndicator" chartTitle={chartTitle} size="md" />
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
              emptyTitle={emptyTitle || "No cash flow data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see your cash flow."}
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
        <div className="h-full w-full min-h-[400px]">{renderGauge()}</div>
      </ChartFullscreenModal>

      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="cashFlowIndicator" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">{renderGauge()}</div>
        </CardContent>
      </Card>
    </>
  )
})

ChartCashFlowIndicator.displayName = "ChartCashFlowIndicator"
