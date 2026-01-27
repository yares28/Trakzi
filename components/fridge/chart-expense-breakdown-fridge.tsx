"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
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

// Dark colors that require white text
const darkColors = ["#696969", "#464646", "#2F2F2F", "#252525"]

// Gold palette colors that require white text (black and brown)
const goldDarkColors = ["#000000", "#361c1b", "#754232", "#cd894a"]

// Helper function to determine text color based on slice color
const getTextColor = (sliceColor: string, colorScheme?: string): string => {
  if (colorScheme === "gold") {
    return goldDarkColors.includes(sliceColor) ? "#ffffff" : "#000000"
  }
  return darkColors.includes(sliceColor) ? "#ffffff" : "#000000"
}

export const ChartExpenseBreakdownFridge = memo(function ChartExpenseBreakdownFridge({ data: baseData = [], categorySpendingData, categoryControls, isLoading = false }: ChartExpenseBreakdownFridgeProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
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
    const palette = getPalette().filter(color => color !== "#c3c3c3")

    // Sort by value descending (highest first) and assign colors
    // Darker colors go to higher values, lighter colors to lower values
    const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value)
    // Reverse palette so darkest colors are first (for highest values)
    const reversedPalette = [...palette].reverse().slice(0, numParts)
    return sorted.map((item, index) => ({
      ...item,
      color: reversedPalette[index % reversedPalette.length]
    }))
  }, [sanitizedBaseData, colorScheme, getPalette])

  const data = dataWithColors

  // Calculate total for percentage calculations
  const total = useMemo(() => {
    return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0)
  }, [sanitizedBaseData])

  const colorConfig = colorScheme === "colored"
    ? { datum: "data.color" as const }
    : { datum: "data.color" as const } // Use assigned colors from darkDataWithColors

  const isDark = resolvedTheme === "dark"

  const textColor = isDark ? "#9ca3af" : "#4b5563"
  const arcLinkLabelColor = isDark ? "#d1d5db" : "#374151"

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
            <ChartLoadingState isLoading={isLoading} />
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
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            <ResponsivePie
              data={data}
              margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              borderWidth={0}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor={arcLinkLabelColor}
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: "color" }}
              arcLabelsSkipAngle={20}
              arcLabelsTextColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
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
        </CardContent>
      </Card>
    </>
  )
})

ChartExpenseBreakdownFridge.displayName = "ChartExpenseBreakdownFridge"













