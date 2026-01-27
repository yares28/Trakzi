"use client"

import { useMemo, useState, memo } from "react"
import { PolarBarTooltipProps, ResponsivePolarBar } from "@nivo/polar-bar"
import { useTheme } from "next-themes"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

interface ChartPolarBarProps {
  data?: Array<Record<string, string | number>> | { data: Array<Record<string, string | number>>; keys: string[] }
  keys?: string[]
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartPolarBar = memo(function ChartPolarBar({
  data: dataProp = [],
  keys: keysProp,
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartPolarBarProps) {
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // In dark mode, use lighter colors (reverse the palette so lightest colors come first)
  const chartColors = useMemo(() => {
    const palette = getPalette()
    return resolvedTheme === "dark" ? [...palette].reverse() : palette
  }, [getPalette, resolvedTheme])

  // Handle both old format (array) and new format (object with data and keys)
  const chartData = Array.isArray(dataProp) ? dataProp : dataProp.data || []
  const chartKeys = keysProp || (Array.isArray(dataProp) ? [] : dataProp.keys) || []
  const sanitizedChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    return chartData.map(row => {
      const sanitized: Record<string, string | number> = {}
      Object.entries(row).forEach(([key, value]) => {
        if (key === "month") {
          sanitized[key] = String(value ?? "")
        } else {
          sanitized[key] = toNumericValue(value)
        }
      })
      return sanitized
    })
  }, [chartData])

  // If no keys provided and data is array, extract keys from first data item (excluding 'month')
  const finalKeys = chartKeys.length > 0
    ? chartKeys
    : (sanitizedChartData.length > 0
      ? Object.keys(sanitizedChartData[0]).filter(key => key !== 'month')
      : [])

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Household Spend Mix"
        description="Track monthly expenses across your top categories in a circular stacked chart."
        details={[
          "Each ring shows one month, while the colored bars show how much you spent per category.",
          "Only expense categories are included, and we cap the legend to the five highest spenders for readability."
        ]}
        ignoredFootnote="Transactions tagged as income or transfers are removed, and we only render the five categories with the highest spend."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="householdSpendMix"
        chartTitle="Household Spend Mix"
        chartDescription="Track monthly expenses across your top categories in a circular stacked chart."
        chartData={{
          months: sanitizedChartData.map(d => d.month as string),
          categories: finalKeys,
          dataPoints: sanitizedChartData.length
        }}
        size="sm"
      />
    </div>
  )
  const infoButton = (forFullscreen = false) => (
    <div className={forFullscreen ? "flex items-center gap-2" : "absolute top-3 right-3 z-20 hidden md:block"}>
      {renderInfoTrigger(forFullscreen)}
    </div>
  )
  const legendItemWidth = useMemo(() => {
    if (!finalKeys.length) return 70
    const longest = finalKeys.reduce((max, key) => Math.max(max, key.length), 0)
    const baseWidth = Math.min(Math.max(longest * 9, 90), 200)
    return Math.max(baseWidth - 20, 70)
  }, [finalKeys])
  // Use muted-foreground colors for consistency with other charts
  const monthLabelColor = resolvedTheme === "dark"
    ? "oklch(0.6268 0 0)"  // --muted-foreground in dark mode
    : "oklch(0.551 0.0234 264.3637)"  // --muted-foreground in light mode
  const polarTheme = useMemo(
    () => ({
      axis: {
        ticks: {
          text: {
            fill: monthLabelColor,
          },
        },
      },
      legends: {
        text: {
          fill: monthLabelColor,
        },
      },
    }),
    [monthLabelColor]
  )

  if (!sanitizedChartData || sanitizedChartData.length === 0 || finalKeys.length === 0) {
    return (
      <Card className="@container/card relative">
        {infoButton()}
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="householdSpendMix"
              chartTitle="Household Spend Mix"
              size="md"
            />
            <CardTitle>Household Spend Mix</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading={isLoading}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  // Render chart function for reuse
  const renderChart = () => (
    <ResponsivePolarBar
      data={sanitizedChartData}
      keys={finalKeys}
      indexBy="month"
      valueSteps={5}
      valueFormat=">-$.0f"
      margin={{ top: 30, right: 20, bottom: 70, left: 20 }}
      innerRadius={0.25}
      cornerRadius={4}
      borderWidth={1}
      borderColor={resolvedTheme === "dark" ? "#4b5563" : "#d1d5db"}
      arcLabelsSkipRadius={28}
      radialAxis={{ angle: 180, tickSize: 5, tickPadding: 5, tickRotation: 0, ticksPosition: 'after' }}
      circularAxisOuter={{ tickSize: 5, tickPadding: 15, tickRotation: 0 }}
      colors={chartColors}
      tooltip={({ arc }) => (
        <NivoChartTooltip
          title={arc.key}
          titleColor={arc.color}
          value={formatCurrency(Number(arc.value))}
        />
      )}
      theme={polarTheme}
      legends={[{ anchor: "bottom", direction: "row", translateY: 50, itemWidth: legendItemWidth, itemHeight: 16, symbolShape: "circle" }]}
    />
  )

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Household Spend Mix"
        description="Track monthly expenses across key categories"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]">
          {renderChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="relative">
        {infoButton()}
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="householdSpendMix"
              chartTitle="Household Spend Mix"
              size="md"
            />
            <CardTitle>Household Spend Mix</CardTitle>
          </div>
          <CardDescription>Track monthly expenses across key categories</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 chart-polar-bar h-[250px]">
          <div className="h-full w-full">
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartPolarBar.displayName = "ChartPolarBar"
