"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
interface ChartExpensesPieProps {
  data?: Array<{
    id: string
    label: string
    value: number
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
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

export const ChartExpensesPie = memo(function ChartExpensesPie({
  data: baseData = [],
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartExpensesPieProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const sanitizedBaseData = useMemo(() => baseData.map(item => ({
    ...item,
    value: toNumericValue(item.value)
  })), [baseData])

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
  }, [baseData, colorScheme, getPalette])

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

  // Format currency value using user's preferred currency
  const valueFormatter = useMemo(() => ({
    format: (value: number) => formatCurrency(value)
  }), [formatCurrency])

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Expense Breakdown"
        description="This pie chart shows how your total expenses are distributed across spending categories."
        details={[
          "Slices are sorted by spend so the largest categories stand out.",
          "Income entries and zero-dollar adjustments are filtered out so only real expenses appear.",
        ]}
        ignoredFootnote="Only negative (expense) transactions are plotted. Positive cash flow is excluded from this view."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="expenseBreakdown"
        chartTitle="Expense Breakdown"
        chartDescription="This pie chart shows how your total expenses are distributed across spending categories."
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

  // Render chart function for reuse
  const renderChart = (isCompact = false) => (
    <ResponsivePie
      data={data}
      margin={isCompact ? { top: 20, right: 20, bottom: 20, left: 20 } : { top: 40, right: 40, bottom: 40, left: 40 }}
      innerRadius={0.5}
      padAngle={0.7}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      borderWidth={0}
      enableArcLinkLabels={false}
      arcLabelsSkipAngle={15}
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
      theme={{ text: { fill: textColor, fontSize: 12 } }}
    />
  )

  // Custom legend component
  const renderLegend = () => (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
      {data.slice(0, 6).map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium text-foreground truncate max-w-[80px]" title={item.label}>{item.label}</span>
          <span className="text-[0.7rem]">
            {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : '0%'}
          </span>
        </div>
      ))}
      {data.length > 6 && (
        <span className="text-[0.65rem] text-muted-foreground">+{data.length - 6} more</span>
      )}
    </div>
  )

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="expenseBreakdown"
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
          <div className="h-full w-full min-h-[180px] md:min-h-[250px]" />
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
              chartId="expenseBreakdown"
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
          <div className="h-full w-full min-h-[180px] md:min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading}
              skeletonType="pie"
              emptyTitle={emptyTitle}
              emptyDescription={emptyDescription}
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
        title="Expense Breakdown"
        description="Expenses distributed across spending categories"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]" key={colorScheme}>
          {renderChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="expenseBreakdown"
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
            {renderChart(true)}
          </div>
          {renderLegend()}
        </CardContent>
      </Card>
    </>
  )
})

ChartExpensesPie.displayName = "ChartExpensesPie"
