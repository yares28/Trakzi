"use client"

import { useEffect, useMemo, useState, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"

import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { NeedsWantsCategoryEditor } from "@/components/needs-wants-category-editor"
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
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

interface ChartNeedsWantsPieProps {
  data?: Array<{
    id: string
    label: string
    value: number
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
  // These props are passed by the draggable analytics layout but sizing is handled outside this component.
  isExpanded?: boolean
  onToggleExpand?: () => void
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

export const ChartNeedsWantsPie = memo(function ChartNeedsWantsPie({
  data: baseData = [],
  categoryControls,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartNeedsWantsPieProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const sanitizedBaseData = useMemo(
    () =>
      baseData.map((item) => ({
        ...item,
        value: toNumericValue(item.value),
      })),
    [baseData],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // We only ever have up to 3 slices (Essentials, Mandatory, Wants)
  // Assign colors from the current palette, using darker colors for larger values.
  const dataWithColors = useMemo(() => {
    const palette = getPalette().filter((color) => color !== "#c3c3c3")
    const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value)
    const reversedPalette = [...palette].reverse()
    const colors = reversedPalette.slice(0, Math.max(sorted.length, 3))

    return sorted.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }))
  }, [sanitizedBaseData, getPalette])

  const data = dataWithColors

  const total = useMemo(() => {
    return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0)
  }, [sanitizedBaseData])

  const colorConfig = { datum: "data.color" as const }

  const isDark = resolvedTheme === "dark"

  const textColor = isDark ? "#9ca3af" : "#4b5563"

  // Format currency value using user's preferred currency
  const valueFormatter = useMemo(() => ({
    format: (value: number) => formatCurrency(value)
  }), [formatCurrency])

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Needs vs Wants"
        description="Groups your spending into essentials, mandatory obligations, and discretionary wants."
        details={[
          "Essentials include day-to-day living costs like groceries, housing, core utilities, and basic transport.",
          "Mandatory covers recurring obligations such as insurance, taxes and similar non‑negotiable commitments.",
          "Wants capture lifestyle and discretionary categories like shopping, entertainment, and travel.",
        ]}
        ignoredFootnote="Only expense (negative) transactions are included, and hidden categories are excluded from the totals."
        categoryControls={categoryControls}
        extraContent={<NeedsWantsCategoryEditor />}
      />
      <ChartAiInsightButton
        chartId="needsWantsBreakdown"
        chartTitle="Needs vs Wants Breakdown"
        chartDescription="Groups your spending into essentials, mandatory obligations, and discretionary wants."
        chartData={{
          total: total,
          categories: data.map(d => ({ name: d.label, amount: d.value })),
          needsAmount: data.find(d => d.label.toLowerCase().includes("essential") || d.label.toLowerCase().includes("mandatory"))?.value || 0,
          wantsAmount: data.find(d => d.label.toLowerCase().includes("want"))?.value || 0
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
      padAngle={0.6}
      cornerRadius={2}
      activeOuterRadiusOffset={8}
      enableArcLinkLabels={false}
      arcLabelsSkipAngle={15}
      arcLabelsTextColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
      valueFormat={(value) => formatCurrency(toNumericValue(value))}
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
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
      {data.map((item) => (
        <div key={item.id} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-medium text-foreground">{item.label}</span>
          <span className="text-[0.7rem]">
            {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : '0%'}
          </span>
        </div>
      ))}
    </div>
  )

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="needsWantsBreakdown"
              chartTitle="Needs vs Wants"
              size="md"
            />
            <CardTitle>Needs vs Wants</CardTitle>
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

  if (!sanitizedBaseData || sanitizedBaseData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="needsWantsBreakdown"
              chartTitle="Needs vs Wants"
              size="md"
            />
            <CardTitle>Needs vs Wants</CardTitle>
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
        title="Needs vs Wants"
        description="Essentials, mandatory, and discretionary spending"
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
              chartId="needsWantsBreakdown"
              chartTitle="Needs vs Wants"
              size="md"
            />
            <CardTitle>Needs vs Wants</CardTitle>
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

ChartNeedsWantsPie.displayName = "ChartNeedsWantsPie"
