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

interface ChartWeekendVsWeekdayProps {
  data: Array<{
    date: string
    amount: number
    category?: string
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartWeekendVsWeekday = memo(function ChartWeekendVsWeekday({
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartWeekendVsWeekdayProps) {
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

    let weekdayTotal = 0
    let weekdayCount = 0
    let weekendTotal = 0
    let weekendCount = 0

    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const date = new Date(tx.date)
      const dayOfWeek = date.getDay()
      const amount = Math.abs(tx.amount)

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendTotal += amount
        weekendCount++
      } else {
        weekdayTotal += amount
        weekdayCount++
      }
    })

    return [
      {
        type: "Weekday",
        total: weekdayTotal,
        average: weekdayCount > 0 ? weekdayTotal / weekdayCount : 0,
        count: weekdayCount,
        color: palette[0] || "#fe8339",
      },
      {
        type: "Weekend",
        total: weekendTotal,
        average: weekendCount > 0 ? weekendTotal / weekendCount : 0,
        count: weekendCount,
        color: palette[2] || "#3b82f6",
      },
    ]
  }, [data, palette])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const chartTitle = "Weekend vs Weekday"
  const chartDescription = "Compare your spending habits between weekdays (Mon-Fri) and weekends (Sat-Sun)."

  const chartDataForAI = useMemo(() => {
    if (chartData.length === 0) return {}
    return {
      weekdayTotal: chartData[0]?.total ?? 0,
      weekendTotal: chartData[1]?.total ?? 0,
      weekdayAvg: chartData[0]?.average ?? 0,
      weekendAvg: chartData[1]?.average ?? 0,
    }
  }, [chartData])

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          "Weekdays: Monday through Friday",
          "Weekends: Saturday and Sunday",
          "Shows total spending and average per transaction",
        ]}
      />
      <ChartAiInsightButton
        chartId="weekendVsWeekday"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={chartDataForAI}
        size="sm"
      />
    </div>
  )

  const renderChart = () => (
    <ResponsiveBar
      data={chartData}
      keys={["total"]}
      indexBy="type"
      margin={{ top: 20, right: 30, bottom: 50, left: 80 }}
      padding={0.5}
      colors={({ data: d }) => d.color as string}
      borderRadius={10}
      enableLabel={true}
      label={(d) => formatCurrency(d.value as number, { maximumFractionDigits: 0 })}
      labelSkipWidth={60}
      labelTextColor="#ffffff"
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 0,
        tickPadding: 16,
        tickRotation: 0,
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 8,
        tickRotation: 0,
        format: (v: number) => {
          if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
          if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
          return formatCurrency(v, { maximumFractionDigits: 0 })
        },
      }}
      enableGridY={true}
      gridYValues={5}
      theme={{
        text: { fill: textColor, fontSize: 12 },
        axis: { ticks: { text: { fill: textColor } } },
        grid: { line: { stroke: gridColor, strokeWidth: 1, strokeDasharray: "4 4" } },
      }}
      tooltip={({ data: d }) => (
        <NivoChartTooltip
          title={d.type as string}
          titleColor={d.color as string}
          value={formatCurrency(d.total as number)}
          subValue={`Avg: ${formatCurrency(d.average as number)} (${d.count} txns)`}
        />
      )}
      animate={true}
      motionConfig="gentle"
    />
  )

  if (!mounted || isLoading || !data || data.length === 0 || chartData.length === 0) {
    return (
      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="weekendVsWeekday" chartTitle={chartTitle} size="md" />
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
              emptyTitle={emptyTitle || "No spending data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to compare weekday vs weekend spending."}
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
            <ChartFavoriteButton chartId="weekendVsWeekday" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartWeekendVsWeekday.displayName = "ChartWeekendVsWeekday"
