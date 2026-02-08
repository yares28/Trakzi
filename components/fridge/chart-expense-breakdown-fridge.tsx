"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { getContrastTextColor, getChartTextColor } from "@/lib/chart-colors"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { NivoChartTooltip } from "@/components/chart-tooltip"

interface ChartExpenseBreakdownFridgeProps {
  data?: Array<{
    id: string
    label: string
    value: number
  }>
  categorySpendingData?: Array<{ category: string; total: number; color: string | null }>
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
}

export const ChartExpenseBreakdownFridge = memo(function ChartExpenseBreakdownFridge({ data: baseData = [], categorySpendingData, categoryControls, isLoading = false }: ChartExpenseBreakdownFridgeProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Use bundle data if available
  const chartBaseData = useMemo(() => {
    if (categorySpendingData && categorySpendingData.length > 0) {
      return categorySpendingData.map(d => ({
        id: d.category,
        label: d.category,
        value: d.total
      }))
    }
    return baseData
  }, [baseData, categorySpendingData])

  const sanitizedBaseData = useMemo(() => chartBaseData.map(item => ({
    ...item,
    value: toNumericValue(item.value)
  })), [chartBaseData])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Dynamically assign colors based on number of parts (max 7)
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const dataWithColors = useMemo(() => {
    const numParts = Math.min(sanitizedBaseData.length, 7)
    const palette = getShuffledPalette()
    const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value)
    const colors = palette.slice(0, numParts)
    return sorted.map((item, index) => ({
      ...item,
      color: colors[index % colors.length]
    }))
  }, [sanitizedBaseData, colorScheme, getShuffledPalette])

  const data = dataWithColors

  // Calculate total for percentage calculations
  const total = useMemo(() => {
    return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0)
  }, [sanitizedBaseData])

  const colorConfig = colorScheme === "colored"
    ? { datum: "data.color" as const }
    : { datum: "data.color" as const } // Use assigned colors from darkDataWithColors

  const isDark = resolvedTheme === "dark"

  const textColor = getChartTextColor(isDark)

  // Format currency value using user's preferred currency
  const valueFormatter = useMemo(() => ({
    format: (value: number) => formatCurrency(value)
  }), [formatCurrency])

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Expense Breakdown"
        description="This pie chart shows how your total grocery expenses are distributed across receipt categories."
        details={[
          "Slices are sorted by spend so the largest categories stand out.",
          "Categories are based on receipt line items from your uploaded receipts.",
        ]}
        ignoredFootnote="Only receipt transactions with assigned categories are included in this view."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="fridge:expenseBreakdown"
        chartTitle="Expense Breakdown"
        chartDescription="This pie chart shows how your total grocery expenses are distributed across receipt categories."
        chartData={{
          totalExpenses: total,
          categories: data.map(d => ({ name: d.label, amount: d.value })),
          topCategory: data[0]?.label,
          topCategoryAmount: data[0]?.value
        }}
        size="sm"
      />
    </div>
  )

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="fridge:expenseBreakdown"
              chartTitle="Expense Breakdown"
              size="md"
            />
            <CardTitle>Expense Breakdown</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" />
        </CardContent>
      </Card>
    )
  }

  // Don't render chart if data is empty
  if (!sanitizedBaseData || sanitizedBaseData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="fridge:expenseBreakdown"
              chartTitle="Expense Breakdown"
              size="md"
            />
            <CardTitle>Expense Breakdown</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState isLoading={isLoading} skeletonType="pie" />
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
        title="Expense Breakdown"
        description="Grocery expenses by receipt category"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
          Fullscreen view - Expense breakdown pie chart
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="fridge:expenseBreakdown"
              chartTitle="Expense Breakdown"
              size="md"
            />
            <CardTitle>Expense Breakdown</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-[140px] md:min-h-[200px]" key={colorScheme}>
            <ResponsivePie
              data={data}
              margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
              innerRadius={0.5}
              padAngle={0.6}
              cornerRadius={2}
              activeOuterRadiusOffset={8}
              enableArcLinkLabels={false}
              arcLabelsSkipAngle={15}
              arcLabelsTextColor={(d: { color: string }) => getContrastTextColor(d.color)}
              valueFormat={(value) => formatCurrency(value)}
              colors={colorConfig}
              tooltip={({ datum }) => {
                const percentage = total > 0 ? (Number(datum.value) / total) * 100 : 0

                return (
                  <NivoChartTooltip
                    title={datum.label as string}
                    titleColor={datum.color as string}
                    value={valueFormatter.format(Number(datum.value))}
                    subValue={`${percentage.toFixed(1)}%`}
                  />
                )
              }}
              theme={{
                text: {
                  fill: textColor,
                  fontSize: 12,
                },
              }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
            {data.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-foreground truncate max-w-[80px]" title={item.label}>{item.label}</span>
                <span className="text-[0.7rem]">
                  {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : "0%"}
                </span>
              </div>
            ))}
            {data.length > 6 && (
              <span className="text-[0.65rem] text-muted-foreground">+{data.length - 6} more</span>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartExpenseBreakdownFridge.displayName = "ChartExpenseBreakdownFridge"













