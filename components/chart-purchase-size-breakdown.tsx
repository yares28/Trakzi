"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
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
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"

interface ChartPurchaseSizeBreakdownProps {
  data: Array<{
    date: string
    amount: number
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartPurchaseSizeBreakdown = memo(function ChartPurchaseSizeBreakdown({
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartPurchaseSizeBreakdownProps) {
  const { resolvedTheme } = useTheme()
  const { colorScheme, getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    const monthlyData = new Map<string, { small: number; medium: number; large: number }>()

    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const month = tx.date.slice(0, 7)
      const amount = Math.abs(tx.amount)
      const existing = monthlyData.get(month) || { small: 0, medium: 0, large: 0 }

      if (amount < 25) existing.small += amount
      else if (amount < 100) existing.medium += amount
      else existing.large += amount

      monthlyData.set(month, existing)
    })

    return Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, d]) => ({
        month,
        "Small (<25)": d.small,
        "Medium (25-100)": d.medium,
        "Large (100+)": d.large,
      }))
  }, [data])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const chartTitle = "Purchase Size Breakdown"
  const chartDescription = "See how your spending is distributed between small, medium, and large purchases each month."

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={["Small: under $25", "Medium: $25 - $100", "Large: over $100", "Stacked by month"]}
      />
      <ChartAiInsightButton
        chartId="purchaseSizeBreakdown"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={{ months: chartData }}
        size="sm"
      />
    </div>
  )

  const barKeys = ["Small (<25)", "Medium (25-100)", "Large (100+)"]

  const renderChart = () => (
    <ResponsiveBar
      data={chartData}
      keys={barKeys}
      indexBy="month"
      margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
      padding={0.3}
      groupMode="stacked"
      colors={[palette[2] || "#3b82f6", palette[1] || "#10b981", palette[0] || "#fe8339"]}
      borderRadius={4}
      enableLabel={false}
      axisBottom={{
        tickSize: 0,
        tickPadding: 8,
        format: (v: string) => {
          const [, month] = v.split("-")
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          return months[parseInt(month) - 1]
        },
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 8,
        format: (v: number) => {
          if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
          if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
          return formatCurrency(v, { maximumFractionDigits: 0 })
        },
      }}
      enableGridY={true}
      gridYValues={5}
      theme={{
        text: { fill: textColor, fontSize: 11 },
        axis: { ticks: { text: { fill: textColor } } },
        grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
      }}
      tooltip={({ id, value, indexValue, color }) => (
        <NivoChartTooltip
          title={String(id)}
          titleColor={color}
          value={formatCurrency(value as number)}
          subValue={indexValue as string}
        />
      )}
      animate={true}
      motionConfig="gentle"
    />
  )

  if (!mounted || isLoading || chartData.length === 0) {
    return (
      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="purchaseSizeBreakdown" chartTitle={chartTitle} size="md" />
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
              skeletonType="bar"
              emptyTitle={emptyTitle || "No purchase data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see your purchase size breakdown."}
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
            <ChartFavoriteButton chartId="purchaseSizeBreakdown" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[210px]" key={colorScheme}>
            {renderChart()}
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pb-2 text-xs flex-wrap">
            {barKeys.map((key, i) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: [palette[2] || "#3b82f6", palette[1] || "#10b981", palette[0] || "#fe8339"][i] }} />
                <span style={{ color: textColor }}>{key}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartPurchaseSizeBreakdown.displayName = "ChartPurchaseSizeBreakdown"
