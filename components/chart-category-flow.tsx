"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { ResponsiveAreaBump } from "@nivo/bump"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
interface ChartCategoryFlowProps {
  data?: Array<{
    id: string
    data: Array<{
      x: string
      y: number
    }>
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export function ChartCategoryFlow({
  data = [],
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartCategoryFlowProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isDark = resolvedTheme === "dark"
  // Use muted-foreground color to match ChartAreaInteractive
  // Light mode: oklch(0.556 0 0) ≈ #6b7280 (gray-500)
  // Dark mode: oklch(0.708 0 0) ≈ #9ca3af (gray-400)
  const textColor = isDark ? "#9ca3af" : "#6b7280"
  const borderColor = isDark ? "#e5e7eb" : "#e5e7eb"

  // Use custom palette for colored, custom dark palette for dark styling
  // Palettes are ordered from darkest to lightest
  // For light mode: use palette in order (darker colors for higher spending categories)
  // For dark mode: reverse palette for better contrast
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  const numCategories = data.length

  // For light mode: use palette in order (darker = higher spending)
  // For dark mode: reverse palette for better visual contrast
  const orderedPalette = isDark ? [...palette].reverse() : palette
  let colorConfig = orderedPalette.slice(0, numCategories)

  // Cycle if needed
  while (colorConfig.length < numCategories) {
    colorConfig.push(...orderedPalette.slice(0, numCategories - colorConfig.length))
  }
  colorConfig = colorConfig.slice(0, numCategories)

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Spending Category Rankings"
        description="This chart tracks how your spending categories rank relative to each other over time."
        details={[
          "Each colored area represents a spending category; the higher it sits, the larger its share that month.",
          "How it works: we calculate each category's percentage of total spend per month so you can see priorities rise or fall.",
        ]}
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="spendingCategoryRankings"
        chartTitle="Spending Category Rankings"
        chartDescription="This chart tracks how your spending categories rank relative to each other over time."
        chartData={{
          categories: data.map(d => d.id),
          categoryCount: data.length,
          dataPoints: data[0]?.data?.length || 0
        }}
        size="sm"
      />
    </div>
  )

  // Don't render chart if data is empty
  if (!data || data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="spendingCategoryRankings"
              chartTitle="Spending Category Rankings"
              size="md"
            />
            <CardTitle>Spending Category Rankings</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading}
              emptyTitle={emptyTitle || "No spending data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see category rankings"}
            />
          </div>
        </CardContent>
      </Card>
    )
  }


  const isMobile = useIsMobile()

  // Chart render function for FULLSCREEN (full fidelity)
  const renderFullChart = () => (
    <ResponsiveAreaBump
      data={data}
      margin={{ top: 40, right: 120, bottom: 40, left: 140 }}
      spacing={12}
      colors={colorConfig}
      blendMode="normal"
      startLabel={(serie) => serie.id}
      endLabel={(serie) => serie.id}
      startLabelTextColor={textColor}
      endLabelTextColor={textColor}
      startLabelPadding={12}
      endLabelPadding={12}
      interpolation="smooth"
      axisTop={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: "",
        legendPosition: "middle",
        legendOffset: -36,
      }}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: "",
        legendPosition: "middle",
        legendOffset: 32,
      }}
      theme={{
        text: {
          fill: textColor,
          fontSize: 12,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        },
        axis: {
          domain: { line: { stroke: borderColor, strokeWidth: 1 } },
          ticks: { line: { stroke: borderColor, strokeWidth: 1 } },
        },
        grid: { line: { stroke: borderColor, strokeWidth: 0.5 } },
      }}
      tooltip={({ serie }) => {
        const originalSerie = data.find((d) => d.id === serie.id)
        const lastPoint = originalSerie?.data[originalSerie.data.length - 1]
        const share = lastPoint?.y ?? 0
        return (
          <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-border/50" style={{ backgroundColor: serie.color, borderColor: serie.color }} />
              <span className="font-medium text-foreground whitespace-nowrap">{serie.id}</span>
            </div>
            <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{share.toFixed(1)}% of spending</div>
          </div>
        )
      }}
    />
  )

  // Chart render function for MOBILE (optimized: reduced margins, right labels only, smaller font)
  const renderMobileChart = () => (
    <ResponsiveAreaBump
      data={data}
      margin={{ top: 24, right: 70, bottom: 24, left: 20 }}
      spacing={8}
      colors={colorConfig}
      blendMode="normal"
      startLabel={false}
      endLabel={(serie) => {
        // Truncate long labels for mobile
        const label = serie.id as string
        return label.length > 10 ? label.slice(0, 9) + '…' : label
      }}
      endLabelTextColor={textColor}
      endLabelPadding={6}
      interpolation="smooth"
      axisTop={{
        tickSize: 3,
        tickPadding: 3,
        tickRotation: 0,
        legend: "",
        legendPosition: "middle",
        legendOffset: -20,
      }}
      axisBottom={null}
      theme={{
        text: {
          fill: textColor,
          fontSize: 9,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        },
        axis: {
          domain: { line: { stroke: borderColor, strokeWidth: 1 } },
          ticks: { line: { stroke: borderColor, strokeWidth: 1 } },
        },
        grid: { line: { stroke: borderColor, strokeWidth: 0.5 } },
      }}
      tooltip={({ serie }) => {
        const originalSerie = data.find((d) => d.id === serie.id)
        const lastPoint = originalSerie?.data[originalSerie.data.length - 1]
        const share = lastPoint?.y ?? 0
        return (
          <div className="rounded-md border border-border/60 bg-background/95 px-2 py-1.5 text-xs shadow-lg">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: serie.color }} />
              <span className="font-medium text-foreground">{serie.id}</span>
            </div>
            <div className="mt-0.5 font-mono text-[0.65rem] text-foreground/80">{share.toFixed(1)}%</div>
          </div>
        )
      }}
    />
  )

  // Legend component for mobile (since labels are hidden/truncated)
  const renderMobileLegend = () => (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-2 pt-2 pb-1 text-[10px] text-muted-foreground">
      {data.slice(0, 8).map((serie, index) => (
        <div key={serie.id} className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: colorConfig[index] }}
          />
          <span className="truncate max-w-[80px]">{serie.id}</span>
        </div>
      ))}
      {data.length > 8 && (
        <span className="text-muted-foreground/70">+{data.length - 8} more</span>
      )}
    </div>
  )

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Spending Category Rankings"
        description="Track how your spending priorities shift over time"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]">
          {renderFullChart()}
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="spendingCategoryRankings"
              chartTitle="Spending Category Rankings"
              size="md"
            />
            <CardTitle>Spending Category Rankings</CardTitle>
          </div>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Track how your spending priorities shift over time
            </span>
            <span className="@[540px]/card:hidden">Category flow over 6 months</span>
          </CardDescription>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="relative h-full w-full min-h-[250px]">
            {isMobile ? renderMobileChart() : renderFullChart()}
          </div>
          {/* Mobile legend below chart */}
          {isMobile && renderMobileLegend()}
        </CardContent>
      </Card>
    </>
  )
}

