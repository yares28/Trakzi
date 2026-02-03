"use client"

import { useState, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveAreaBump } from "@nivo/bump"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
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

export const ChartCategoryFlow = memo(function ChartCategoryFlow({
  data = [],
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartCategoryFlowProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isMobile = useIsMobile()

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

  // Info trigger - in fullscreen mode, show category controls for filtering
  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Spending Category Rankings"
        description="This chart tracks how your spending categories rank relative to each other over time."
        details={[
          "Each colored area represents a spending category; the higher it sits, the larger its share that month.",
          "How it works: we calculate each category's percentage of total spend per month so you can see priorities rise or fall.",
          forFullscreen ? "Use the checkboxes below to show/hide specific categories." : "",
        ].filter(Boolean)}
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
              skeletonType="flow"
              emptyTitle={emptyTitle || "No spending data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see category rankings"}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Chart render function for FULLSCREEN (left labels only, abbreviated months)
  const renderFullChart = () => (
    <ResponsiveAreaBump
      data={data}
      margin={{ top: 20, right: 15, bottom: 20, left: 85 }}
      spacing={10}
      colors={colorConfig}
      blendMode="normal"
      startLabel={(serie) => {
        const label = serie.id as string
        return label.length > 12 ? label.slice(0, 11) + '…' : label
      }}
      endLabel={false}
      startLabelTextColor={textColor}
      startLabelPadding={8}
      interpolation="smooth"
      axisTop={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: "",
        legendPosition: "middle",
        legendOffset: -36,
        format: (value) => getMonthAbbreviation(String(value)),
      }}
      axisBottom={null}
      theme={{
        text: {
          fill: textColor,
          fontSize: 11,
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
          <NivoChartTooltip
            title={serie.id}
            titleColor={serie.color}
            value={`${share.toFixed(1)}% of spending`}
          />
        )
      }}
    />
  )

  // Month abbreviation helper - converts various formats to "Jan'25" style
  const getMonthAbbreviation = (monthStr: string): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Handle YYYY-MM format (e.g., "2025-02")
    const yyyyMmMatch = monthStr.match(/^(\d{4})-(\d{1,2})$/)
    if (yyyyMmMatch) {
      const year = yyyyMmMatch[1].slice(-2) // Get last 2 digits of year
      const monthIndex = parseInt(yyyyMmMatch[2], 10) - 1
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${monthNames[monthIndex]}'${year}`
      }
    }
    
    // Handle MM format (e.g., "01", "02")
    const mmMatch = monthStr.match(/^(\d{1,2})$/)
    if (mmMatch) {
      const monthIndex = parseInt(mmMatch[1], 10) - 1
      if (monthIndex >= 0 && monthIndex < 12) {
        return monthNames[monthIndex]
      }
    }
    
    // Handle month name formats (e.g., "Jan 2025", "January", "jan")
    const monthNameMap: Record<string, number> = {
      'jan': 0, 'january': 0,
      'feb': 1, 'february': 1,
      'mar': 2, 'march': 2,
      'apr': 3, 'april': 3,
      'may': 4,
      'jun': 5, 'june': 5,
      'jul': 6, 'july': 6,
      'aug': 7, 'august': 7,
      'sep': 8, 'september': 8,
      'oct': 9, 'october': 9,
      'nov': 10, 'november': 10,
      'dec': 11, 'december': 11,
    }
    
    const lowerMonth = monthStr.toLowerCase().trim()
    
    // Try to match month name and extract year if present (e.g., "Jan 2025")
    for (const [key, monthIndex] of Object.entries(monthNameMap)) {
      if (lowerMonth.startsWith(key)) {
        // Check if there's a year after the month name
        const yearMatch = monthStr.match(/\d{4}/)
        if (yearMatch) {
          const year = yearMatch[0].slice(-2)
          return `${monthNames[monthIndex]}'${year}`
        }
        return monthNames[monthIndex]
      }
    }
    
    // Fallback: return original string
    return monthStr
  }

  // Chart render function for MOBILE (optimized: no labels, abbreviated months)
  const renderMobileChart = () => (
    <ResponsiveAreaBump
      data={data}
      margin={{ top: 24, right: 10, bottom: 24, left: 10 }}
      spacing={8}
      colors={colorConfig}
      blendMode="normal"
      startLabel={false}
      endLabel={false}
      interpolation="smooth"
      axisTop={{
        tickSize: 3,
        tickPadding: 3,
        tickRotation: 0,
        legend: "",
        legendPosition: "middle",
        legendOffset: -20,
        format: (value) => getMonthAbbreviation(String(value)),
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
          <NivoChartTooltip
            title={serie.id}
            titleColor={serie.color}
            value={`${share.toFixed(1)}%`}
          />
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
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full">
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
})

ChartCategoryFlow.displayName = "ChartCategoryFlow"
