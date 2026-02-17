"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { CHART_GRID_COLOR } from "@/lib/chart-colors"

interface SpendingPyramidDataItem {
  category: string
  userTotal: number
  userPercent: number
  avgTotal: number
  avgPercent: number
}

interface ChartSpendingPyramidProps {
  data?: SpendingPyramidDataItem[]
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

interface PyramidRow {
  category: string
  you: number
  average: number
  userTotal: number
  avgTotal: number
  userPercent: number
  avgPercent: number
}

interface RechartsTooltipEntry {
  dataKey?: string | number
  color?: string
  payload?: PyramidRow
}

function CustomTooltip({
  active,
  payload,
  formatCurrencyFn,
}: {
  active?: boolean
  payload?: RechartsTooltipEntry[]
  formatCurrencyFn: (v: number, opts?: object) => string
}) {
  if (!active || !payload || payload.length === 0) return null

  const row = payload[0]?.payload as PyramidRow | undefined
  if (!row) return null

  const youEntry = payload.find((p) => p.dataKey === "you")
  const avgEntry = payload.find((p) => p.dataKey === "average")

  return (
    <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
      <div className="font-medium text-foreground mb-1.5">{row.category}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: youEntry?.color }}
            />
            <span className="text-muted-foreground">You</span>
          </span>
          <span className="font-mono font-semibold text-foreground">
            {formatCurrencyFn(row.userTotal)} ({row.userPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: avgEntry?.color }}
            />
            <span className="text-muted-foreground">Avg User</span>
          </span>
          <span className="font-mono font-semibold text-foreground">
            {formatCurrencyFn(row.avgTotal)} ({row.avgPercent.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  )
}

// Overhead in px: card header (~56) + legend (~28) + x-axis (~24) + padding (~16)
const CHART_OVERHEAD_PX = 124
// Approximate height per bar row in px (bar + gap)
const BAR_ROW_HEIGHT_PX = 36
const MIN_CATEGORIES = 3
const MAX_CATEGORIES = 20
const DEFAULT_CATEGORIES = 8

function computeVisibleCategories(containerHeight: number): number {
  if (containerHeight <= 0) return DEFAULT_CATEGORIES
  const available = containerHeight - CHART_OVERHEAD_PX
  const count = Math.floor(available / BAR_ROW_HEIGHT_PX)
  return Math.max(MIN_CATEGORIES, Math.min(MAX_CATEGORIES, count))
}

export const ChartSpendingPyramid = memo(function ChartSpendingPyramid({
  data = [],
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartSpendingPyramidProps) {
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(DEFAULT_CATEGORIES)
  const cardRef = useRef<HTMLDivElement>(null)

  // Observe card height to dynamically adjust visible category count
  const updateVisibleCount = useCallback((height: number) => {
    setVisibleCount(computeVisibleCategories(height))
  }, [])

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) updateVisibleCount(entry.contentRect.height)
    })
    ro.observe(el)
    // Initial measurement
    updateVisibleCount(el.clientHeight)
    return () => ro.disconnect()
  }, [updateVisibleCount])

  const palette = useMemo(() => getPalette(), [getPalette])

  // Left bars (You): use a color from the beginning of the palette
  // Right bars (Average): use a color from the end of the palette
  const youColor = palette[1] || palette[0] || "#6ea1c7"
  const avgColor = palette[palette.length - 2] || palette[palette.length - 1] || "#ed7485"

  const chartConfig = {
    you: {
      label: "You",
      theme: { light: youColor, dark: youColor },
    },
    average: {
      label: "Avg User",
      theme: { light: avgColor, dark: avgColor },
    },
  } satisfies ChartConfig

  // Transform all data into pyramid rows
  const allPyramidData: PyramidRow[] = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map((item) => ({
      category: item.category,
      you: -item.userPercent,
      average: item.avgPercent,
      userTotal: item.userTotal,
      avgTotal: item.avgTotal,
      userPercent: item.userPercent,
      avgPercent: item.avgPercent,
    }))
  }, [data])

  // Slice to visible count for the card view (dynamic based on container height)
  const pyramidData = useMemo(
    () => allPyramidData.slice(0, visibleCount),
    [allPyramidData, visibleCount]
  )

  // Compute max percent from whichever dataset is passed to renderChart
  const getMaxPercent = useCallback((rows: PyramidRow[]) => {
    if (rows.length === 0) return 10
    let max = 0
    rows.forEach((row) => {
      max = Math.max(max, Math.abs(row.you), row.average)
    })
    return Math.ceil(max * 1.1)
  }, [])

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title="Spending Pyramid"
        description="Compare your spending distribution against the average across all users."
        details={[
          "Left bars (You) show what percentage of your total spending goes to each category.",
          "Right bars (Avg User) show the platform-wide average percentage for that category.",
          "Categories are sorted by your highest spending first.",
          "Resize the chart to reveal more or fewer categories.",
        ]}
      />
      <ChartAiInsightButton
        chartId="spendingPyramid"
        chartTitle="Spending Pyramid"
        chartDescription="Compares user spending distribution vs platform average by category"
        size="sm"
      />
    </div>
  )

  const renderChart = (height: string, rows: PyramidRow[] = pyramidData) => {
    const maxPct = getMaxPercent(rows)
    return (
      <ChartContainer config={chartConfig} className={`w-full ${height}`}>
        <BarChart
          data={rows}
          layout="vertical"
          stackOffset="sign"
          barCategoryGap={4}
          margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
        >
          <XAxis
            type="number"
            domain={[-maxPct, maxPct]}
            tickFormatter={(val: number) => `${Math.abs(val).toFixed(0)}%`}
            stroke={CHART_GRID_COLOR}
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            width={100}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            stroke={CHART_GRID_COLOR}
          />
          <ReferenceLine x={0} stroke={CHART_GRID_COLOR} strokeWidth={1} />
          <Tooltip
            content={({ active, payload }) => (
              <CustomTooltip
                active={active}
                payload={payload as unknown as RechartsTooltipEntry[]}
                formatCurrencyFn={formatCurrency}
              />
            )}
            cursor={{ fill: "transparent" }}
          />
          <Legend
            verticalAlign="top"
            align="center"
            wrapperStyle={{ paddingBottom: 8 }}
            formatter={(value: string) => (
              <span className="text-xs text-muted-foreground">{value === "you" ? "You" : "Avg User"}</span>
            )}
          />
          <Bar
            dataKey="you"
            stackId="pyramid"
            name="you"
            radius={[4, 0, 0, 4]}
            maxBarSize={28}
          >
            {rows.map((_, index) => (
              <Cell key={`you-${index}`} fill={youColor} />
            ))}
          </Bar>
          <Bar
            dataKey="average"
            stackId="pyramid"
            name="average"
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
          >
            {rows.map((_, index) => (
              <Cell key={`avg-${index}`} fill={avgColor} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="@container/card h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="spendingPyramid"
              chartTitle="Spending Pyramid"
              size="md"
            />
            <CardTitle className="text-base font-medium">Spending Pyramid</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1">
          <ChartLoadingState
            isLoading={isLoading}
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Spending Pyramid"
        description="Your spending vs the average user"
        headerActions={renderInfoTrigger(true)}
      >
        {renderChart("min-h-[500px]", allPyramidData)}
      </ChartFullscreenModal>

      <Card ref={cardRef} className="@container/card h-full flex flex-col">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="spendingPyramid"
              chartTitle="Spending Pyramid"
              size="md"
            />
            <CardTitle className="text-base font-medium">Spending Pyramid</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          {renderChart("h-full")}
        </CardContent>
      </Card>
    </>
  )
})

ChartSpendingPyramid.displayName = "ChartSpendingPyramid"
