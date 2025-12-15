"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveFunnel } from "@nivo/funnel"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
interface ChartSpendingFunnelProps {
  data?: Array<{
    id: string
    value: number
    label: string
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
  maxExpenseCategories?: number
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

export function ChartSpendingFunnel({ data = [], categoryControls, maxExpenseCategories = 2, isLoading = false }: ChartSpendingFunnelProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)
  const sanitizedData = useMemo(() => data.map(item => ({
    ...item,
    value: toNumericValue(item.value)
  })), [data])

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"
  const textColor = isDark ? "#9ca3af" : "#6b7280"
  
  // Use nivo scheme for colored, custom dark palette for dark styling
  // More money = darker color (bigger peso = darker)
  // Each layer is 2 shades lighter than the previous
  // Income ($5,430) = darkest, Savings ($800) = lightest
  // Max 7 layers
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  const numLayers = Math.min(data.length, 7)
  
  // Reverse palette so darkest colors are first (for highest income)
  // Income (largest) gets darkest color, Savings (smallest) gets lightest color
  // Start from position 2 (index 1) to use darker colors
  const reversedPalette = [...palette].reverse()
  // Create a palette without the first color (index 0) to use darker colors from position 2 onwards
  const darkerPalette = reversedPalette.slice(1)
  let colorConfig = darkerPalette.slice(0, numLayers)
  
  // If we need more colors than available, cycle through the darker palette
  while (colorConfig.length < numLayers) {
    colorConfig.push(...darkerPalette.slice(0, numLayers - colorConfig.length))
  }
  colorConfig = colorConfig.slice(0, numLayers)

  // Format currency value
  const valueFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Money Flow"
        description="This funnel shows how income cascades through major expense categories before landing in savings."
        details={[
          "Each layer represents a top expense category. Wider bands mean that category consumed more of your paycheck.",
          `The top ${maxExpenseCategories} categories by spending are shown individually, with all remaining categories grouped into 'Others'.`,
        ]}
        ignoredFootnote={`Only the top ${maxExpenseCategories} expense categories are shown individually. All other categories are aggregated into 'Others'.`}
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="moneyFlow"
        chartTitle="Money Flow"
        chartDescription="This funnel shows how income cascades through major expense categories before landing in savings."
        chartData={{
          categories: sanitizedData.map(d => ({ name: d.label, amount: d.value })),
          totalAmount: sanitizedData.reduce((sum, d) => sum + d.value, 0),
          topCategory: sanitizedData[0]?.label
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
              chartId="moneyFlow"
              chartTitle="Money Flow"
              size="md"
            />
            <CardTitle>Money Flow</CardTitle>
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
  if (!sanitizedData || sanitizedData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="moneyFlow"
              chartTitle="Money Flow"
              size="md"
            />
            <CardTitle>Money Flow</CardTitle>
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
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartFavoriteButton
            chartId="moneyFlow"
            chartTitle="Money Flow"
            size="md"
          />
          <CardTitle>Money Flow</CardTitle>
        </div>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Visualize how your income flows through expenses to savings
          </span>
          <span className="@[540px]/card:hidden">Income to savings flow</span>
        </CardDescription>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
        <div className="h-full w-full min-h-[250px]">
          <ResponsiveFunnel
          data={sanitizedData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            valueFormat=">-$,.0f"
            colors={colorConfig}
            borderWidth={20}
            labelColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
            beforeSeparatorLength={100}
            beforeSeparatorOffset={20}
            afterSeparatorLength={100}
            afterSeparatorOffset={20}
            currentPartSizeExtension={10}
            currentBorderWidth={40}
            theme={{
              text: {
                fill: textColor,
                fontSize: 12,
              },
            }}
            tooltip={({ part }) => {
              return (
                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-border/50"
                      style={{ backgroundColor: part.color, borderColor: part.color }}
                    />
                    <span className="font-medium text-foreground whitespace-nowrap">
                      {(part.data.label || part.data.id) as string}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                    {valueFormatter.format(Number(part.data.value))}
                  </div>
                </div>
              )
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
