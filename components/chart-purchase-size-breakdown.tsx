"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import {
  ChartCardFloatingMeta,
  ChartCardTopRightControl,
} from "@/components/chart-card-overlay-controls"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"
import { formatCompactAxisMagnitude } from "@/lib/chart-axis-compact"
import { HoverableBar } from "@/components/chart-hoverable-bar"

interface ChartPurchaseSizeBreakdownProps {
  data: Array<{
    date: string
    amount: number
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

type PurchaseSizeViewMode = "month" | "quarter" | "year"

type BarChartDatum = {
  period: string
  "Small (<25)": number
  "Medium (25-100)": number
  "Large (100+)": number
}

// ─── Extracted sub-components ────────────────────────────────────────────────

const CHART_TITLE = "Purchase Size Breakdown"
const CHART_DESCRIPTION =
  "See how spending is split between small, medium, and large purchases by month, quarter, or year."
const BAR_KEYS = ["Small (<25)", "Medium (25-100)", "Large (100+)"] as const

function addExpenseToBuckets(
  map: Map<string, { small: number; medium: number; large: number }>,
  period: string,
  expenseAmount: number,
) {
  const existing = map.get(period) || { small: 0, medium: 0, large: 0 }
  if (expenseAmount < 25) existing.small += expenseAmount
  else if (expenseAmount < 100) existing.medium += expenseAmount
  else existing.large += expenseAmount
  map.set(period, existing)
}

function mapToChartData(
  periodMap: Map<string, { small: number; medium: number; large: number }>,
): BarChartDatum[] {
  return Array.from(periodMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, d]) => ({
      period,
      "Small (<25)": d.small,
      "Medium (25-100)": d.medium,
      "Large (100+)": d.large,
    }))
}

interface PurchaseSizeInfoTriggerProps {
  forFullscreen?: boolean
  chartData: BarChartDatum[]
  viewMode: PurchaseSizeViewMode
}

const PurchaseSizeInfoTrigger = memo(function PurchaseSizeInfoTrigger({
  forFullscreen = false,
  chartData,
  viewMode,
}: PurchaseSizeInfoTriggerProps) {
  if (!forFullscreen) {
    return (
      <ChartCardFloatingMeta
        insight={
          <ChartAiInsightButton
            chartId="purchaseSizeBreakdown"
            chartTitle={CHART_TITLE}
            chartDescription={CHART_DESCRIPTION}
            chartData={{ periods: chartData, viewMode }}
            size="sm"
          />
        }
        info={
          <ChartInfoPopover
            title={CHART_TITLE}
            description={CHART_DESCRIPTION}
            details={[
              "Small: under $25",
              "Medium: $25 - $100",
              "Large: over $100",
              "Stacked bars by month, quarter, or year (pill toggle)",
            ]}
          />
        }
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ChartAiInsightButton
        chartId="purchaseSizeBreakdown"
        chartTitle={CHART_TITLE}
        chartDescription={CHART_DESCRIPTION}
        chartData={{ periods: chartData, viewMode }}
        size="sm"
      />
      <ChartInfoPopover
        title={CHART_TITLE}
        description={CHART_DESCRIPTION}
        details={[
          "Small: under $25",
          "Medium: $25 - $100",
          "Large: over $100",
          "Stacked bars by month, quarter, or year (pill toggle)",
        ]}
      />
    </div>
  )
})
PurchaseSizeInfoTrigger.displayName = "PurchaseSizeInfoTrigger"

interface PurchaseSizeBarChartProps {
  chartData: BarChartDatum[]
  viewMode: PurchaseSizeViewMode
  palette: string[]
  textColor: string
  gridColor: string
  formatCurrency: (v: number, opts?: object) => string
}

const PurchaseSizeBarChart = memo(function PurchaseSizeBarChart({
  chartData,
  viewMode,
  palette,
  textColor,
  gridColor,
  formatCurrency,
}: PurchaseSizeBarChartProps) {
  const bottomRotation = viewMode === "year" ? 0 : -45
  return (
    <ResponsiveBar
      data={chartData}
      keys={BAR_KEYS as unknown as string[]}
      indexBy="period"
      margin={{ top: 20, right: 20, bottom: viewMode === "year" ? 40 : 52, left: 60 }}
      padding={0.3}
      groupMode="stacked"
      innerPadding={4}
      colors={[palette[2] || "#3b82f6", palette[1] || "#10b981", palette[0] || "#fe8339"]}
      borderRadius={10}
      enableLabel={false}
      axisBottom={{
        tickSize: 0,
        tickPadding: 8,
        tickRotation: bottomRotation,
        format: (v: string) => {
          if (viewMode === "year" || viewMode === "quarter") return v
          const [, month] = v.split("-")
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
          return months[parseInt(month, 10) - 1] ?? v
        },
      }}
      axisLeft={{
        tickSize: 0,
        tickPadding: 8,
        format: (v: number) =>
          formatCompactAxisMagnitude(v, {
            belowThreshold: (x) => formatCurrency(x, { maximumFractionDigits: 0 }),
          }),
      }}
      enableGridY={true}
      gridYValues={5}
      theme={{
        text: { fill: textColor, fontSize: 11 },
        axis: { ticks: { text: { fill: textColor } } },
        grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
      }}
      tooltip={({ id, value, color }) => (
        <NivoChartTooltip
          title={String(id)}
          titleColor={color}
          value={formatCurrency(value as number)}
        />
      )}
      animate={true}
      motionConfig="gentle"
      barComponent={HoverableBar}
    />
  )
})
PurchaseSizeBarChart.displayName = "PurchaseSizeBarChart"

// ─── Main component ───────────────────────────────────────────────────────────

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
  const [viewMode, setViewMode] = useState<PurchaseSizeViewMode>("month")

  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const monthlyChartData = useMemo(() => {
    if (!data || data.length === 0) return []
    const periodMap = new Map<string, { small: number; medium: number; large: number }>()
    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const period = tx.date.slice(0, 7)
      addExpenseToBuckets(periodMap, period, Math.abs(tx.amount))
    })
    const rows = mapToChartData(periodMap)
    return rows.slice(-12)
  }, [data])

  const quarterlyChartData = useMemo(() => {
    if (!data || data.length === 0) return []
    const periodMap = new Map<string, { small: number; medium: number; large: number }>()
    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const day = tx.date.slice(0, 10)
      const parts = day.split("-")
      const y = parseInt(parts[0] ?? "", 10)
      const m = parseInt(parts[1] ?? "", 10)
      if (!y || !m) return
      const q = Math.floor((m - 1) / 3) + 1
      const period = `${y} Q${q}`
      addExpenseToBuckets(periodMap, period, Math.abs(tx.amount))
    })
    const rows = mapToChartData(periodMap)
    return rows.slice(-8)
  }, [data])

  const yearlyChartData = useMemo(() => {
    if (!data || data.length === 0) return []
    const periodMap = new Map<string, { small: number; medium: number; large: number }>()
    data.forEach((tx) => {
      if (tx.amount >= 0) return
      const period = tx.date.slice(0, 4)
      addExpenseToBuckets(periodMap, period, Math.abs(tx.amount))
    })
    const rows = mapToChartData(periodMap)
    return rows.slice(-5)
  }, [data])

  const chartData =
    viewMode === "month"
      ? monthlyChartData
      : viewMode === "quarter"
        ? quarterlyChartData
        : yearlyChartData

  const hasAnySeries =
    monthlyChartData.length > 0 ||
    quarterlyChartData.length > 0 ||
    yearlyChartData.length > 0

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const viewSwitchControl = (
    <div
      className="flex shrink-0 items-center justify-start text-center rounded-full bg-muted p-px text-xs leading-tight"
      role="group"
      aria-label="Purchase size period"
    >
      <button
        type="button"
        className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setViewMode("month")}
      >
        Month
      </button>
      <button
        type="button"
        className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "quarter" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setViewMode("quarter")}
      >
        Quarter
      </button>
      <button
        type="button"
        className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "year" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        onClick={() => setViewMode("year")}
      >
        Year
      </button>
    </div>
  )

  const mobileViewSwitchControl = (
    <div className="flex justify-center px-2 pb-2 md:hidden">
      {viewSwitchControl}
    </div>
  )

  if (!mounted || isLoading || !hasAnySeries) {
    return (
      <Card className="@container/card h-full relative" suppressHydrationWarning>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="purchaseSizeBreakdown" chartTitle={CHART_TITLE} size="md" />
            <CardTitle>{CHART_TITLE}</CardTitle>
          </div>
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
        <PurchaseSizeInfoTrigger chartData={chartData} viewMode={viewMode} />
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={CHART_TITLE}
        description={CHART_DESCRIPTION}
        headerActions={<PurchaseSizeInfoTrigger forFullscreen chartData={chartData} viewMode={viewMode} />}
      >
        <div className="flex h-full min-h-[400px] flex-col gap-2" key={`${viewMode}-${colorScheme}`}>
          <div className="flex justify-center">{viewSwitchControl}</div>
          <div className="min-h-0 flex-1">
            <PurchaseSizeBarChart
              chartData={chartData}
              viewMode={viewMode}
              palette={palette}
              textColor={textColor}
              gridColor={gridColor}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card h-full relative">
        <ChartCardTopRightControl className="hidden md:block">
          {viewSwitchControl}
        </ChartCardTopRightControl>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="purchaseSizeBreakdown" chartTitle={CHART_TITLE} size="md" />
            <CardTitle>{CHART_TITLE}</CardTitle>
          </div>
        </CardHeader>
        {mobileViewSwitchControl}
        <CardContent className="px-2 pt-0 sm:px-6 sm:pt-2 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[180px] sm:min-h-[210px]" key={`${viewMode}-${colorScheme}`}>
            <PurchaseSizeBarChart
              chartData={chartData}
              viewMode={viewMode}
              palette={palette}
              textColor={textColor}
              gridColor={gridColor}
              formatCurrency={formatCurrency}
            />
          </div>
          {/* Legend */}
          <div className="mt-1 mb-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:mt-2 sm:mb-2">
            {BAR_KEYS.map((key, i) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: [palette[2] || "#3b82f6", palette[1] || "#10b981", palette[0] || "#fe8339"][i],
                  }}
                />
                <span className="font-medium text-foreground truncate max-w-[120px]" title={key}>
                  {key}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
        <PurchaseSizeInfoTrigger chartData={chartData} viewMode={viewMode} />
      </Card>
    </>
  )
})

ChartPurchaseSizeBreakdown.displayName = "ChartPurchaseSizeBreakdown"
