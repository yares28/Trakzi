"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Area, CartesianGrid, XAxis, Line, ComposedChart, YAxis, Tooltip } from "recharts"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useTheme } from "next-themes"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useCurrency } from "@/components/currency-provider"
import { formatDateForDisplay } from "@/lib/date"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconChartLine } from "@tabler/icons-react"
// Chart card UI components - matching analytics page pattern
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useDragHandle } from "@/components/sortable-grid"

export const description = "A savings accumulation chart with moving averages"

interface ChartSavingsAccumulationProps {
  data?: Array<{
    date: string
    savings: number
    income: number
    expenses: number
  }>
  isLoading?: boolean
}

// Calculate moving average
function calculateMA(data: { date: string; savings: number }[], period: number): { date: string; value: number | null }[] {
  return data.map((item, index) => {
    if (index < period - 1) {
      return { date: item.date, value: null }
    }
    const slice = data.slice(index - period + 1, index + 1)
    const sum = slice.reduce((acc, curr) => acc + curr.savings, 0)
    return { date: item.date, value: sum / period }
  })
}

export const ChartSavingsAccumulation = React.memo(function ChartSavingsAccumulation({ data: chartData = [], isLoading = false }: ChartSavingsAccumulationProps) {
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const [show7DayMA, setShow7DayMA] = React.useState(false)
  const [show30DayMA, setShow30DayMA] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [tooltipPayload, setTooltipPayload] = React.useState<{
    date: string
    savings: number
    ma7: number | null
    ma30: number | null
  } | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)
  const chartWrapperRef = React.useRef<HTMLDivElement>(null)
  const mousePositionRef = React.useRef<{ x: number; y: number } | null>(null)

  // Full-header drag functionality
  const { setActivatorNodeRef, listeners, attributes, isDragging } = useDragHandle()
  const gradientId = `fillSavings-${React.useId().replace(/:/g, "")}`

  const isDark = resolvedTheme === "dark"
  const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"

  // Color scheme for savings
  const palette = getPalette()
  const reversedPalette = [...palette].reverse()
  const savingsColor = reversedPalette[Math.min(2, reversedPalette.length - 1)]
  const savingsBorderColor = reversedPalette[Math.min(1, reversedPalette.length - 1)]

  // MA line colors
  const ma7Color = "#3b82f6"
  const ma30Color = "#f59e0b"

  const chartConfig = {
    savings: { label: "Savings", color: savingsColor },
    ma7: { label: "7-Day MA", color: ma7Color },
    ma30: { label: "30-Day MA", color: ma30Color },
  } satisfies ChartConfig

  // Data is pre-filtered by bundle (global date filter). Only add MA series (CHARTS_CLONE_SPEC Step 20).
  const filteredData = React.useMemo(() => {
    if (!chartData.length) return []
    const ma7Data = calculateMA(chartData, 7)
    const ma30Data = calculateMA(chartData, 30)
    return chartData.map((item, index) => ({
      ...item,
      ma7: ma7Data[index]?.value ?? null,
      ma30: ma30Data[index]?.value ?? null,
    }))
  }, [chartData])

  const renderInfoTrigger = (forFullscreen?: boolean) => (
    <>
      <ChartInfoPopover
        title="Savings Accumulation"
        description="Track your cumulative savings over time."
        details={[
          "Shows the total savings accumulated day by day",
          "Toggle moving averages to see trends",
          "Time period follows the global date filter in the header.",
        ]}
      />
      <ChartAiInsightButton
        chartId="savingsAccumulation"
        chartTitle="Savings Accumulation"
        chartDescription="Track your cumulative savings over time with daily aggregates and moving averages."
        chartData={filteredData}
        size={forFullscreen ? "sm" : "sm"}
      />
    </>
  )

  const renderChart = (withExternalTooltip = true) => (
    <div
      ref={withExternalTooltip ? chartWrapperRef : undefined}
      className="relative h-full w-full"
      onMouseMove={(e) => {
        if (!withExternalTooltip) return
        const pos = { x: e.clientX, y: e.clientY }
        mousePositionRef.current = pos
        if (tooltipPayload) setTooltipPosition(pos)
      }}
      onMouseLeave={() => {
        setTooltipPayload(null)
        setTooltipPosition(null)
        mousePositionRef.current = null
      }}
    >
      <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
        <ComposedChart data={filteredData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-savings)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-savings)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={gridStrokeColor} strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(value) => formatDateForDisplay(String(value), "en-US", { month: "short", day: "numeric" })}
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            cursor={{ stroke: gridStrokeColor, strokeWidth: 1 }}
            content={({ active, payload, coordinate }) => {
              if (!active || !payload?.length || !coordinate) {
                queueMicrotask(() => {
                  setTooltipPayload(null)
                  setTooltipPosition(null)
                })
                return null
              }
              const rect = chartWrapperRef.current?.getBoundingClientRect()
              queueMicrotask(() => {
                const p = payload[0]?.payload as { date: string; savings: number; ma7: number | null; ma30: number | null }
                if (p) {
                  setTooltipPayload({ date: p.date, savings: p.savings, ma7: p.ma7 ?? null, ma30: p.ma30 ?? null })
                  setTooltipPosition(
                    mousePositionRef.current ?? (rect && coordinate?.x != null && coordinate?.y != null ? { x: rect.left + coordinate.x, y: rect.top + coordinate.y } : null)
                  )
                }
              })
              return null
            }}
          />
          <Area
            dataKey="savings"
            type="natural"
            fill={`url(#${gradientId})`}
            stroke={savingsBorderColor}
            strokeWidth={2}
          />
        {show7DayMA && (
          <Line dataKey="ma7" type="monotone" stroke={ma7Color} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
        )}
        {show30DayMA && (
          <Line dataKey="ma30" type="monotone" stroke={ma30Color} strokeWidth={2} strokeDasharray="8 4" dot={false} connectNulls />
        )}
      </ComposedChart>
    </ChartContainer>
      {withExternalTooltip &&
        tooltipPayload &&
        tooltipPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl"
            style={{
              left: tooltipPosition.x + 12,
              top: tooltipPosition.y + 12,
            }}
          >
            <div className="font-medium text-foreground mb-1.5">
              {formatDateForDisplay(tooltipPayload.date, "en-US", { month: "short", day: "numeric" })}
            </div>
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Savings</span>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {formatCurrency(tooltipPayload.savings, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              {show7DayMA && tooltipPayload.ma7 != null && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">7-Day MA</span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {formatCurrency(tooltipPayload.ma7, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {show30DayMA && tooltipPayload.ma30 != null && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">30-Day MA</span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {formatCurrency(tooltipPayload.ma30, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )

  // Empty/Loading state — Card content-sized so skeleton lines up with card (no h-full)
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="@container/card flex w-full flex-col self-start">
        <CardHeader
          ref={setActivatorNodeRef}
          className="flex flex-row items-center justify-between gap-2 pb-2 cursor-grab touch-none"
          {...attributes}
          {...listeners}
        >
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton chartId="savingsAccumulation" chartTitle="Savings Accumulation" size="md" />
            <CardTitle>Savings Accumulation</CardTitle>
          </div>
          <CardAction className="flex items-center gap-2">
            <ChartInfoPopover
              title="Savings Accumulation"
              description="Track your cumulative savings over time."
              details={[
                "Shows total savings accumulated day by day",
                "Toggle moving averages to see trends",
              ]}
            />
            <ChartAiInsightButton
              chartId="savingsAccumulation"
              chartTitle="Savings Accumulation"
              chartDescription="Track savings over time"
              chartData={[]}
              size="sm"
            />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] min-h-0 w-full overflow-hidden">
            <ChartLoadingState
              isLoading={isLoading}
              skeletonType="area"
              height="h-full"
              emptyTitle="No savings data yet"
              emptyDescription="Import statements with Savings category to see accumulation over time"
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
        title="Savings Accumulation"
        description="Track your cumulative savings over time with daily aggregates and moving averages."
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]">
          {renderChart(false)}
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card flex w-full flex-col self-start">
        {/* CardHeader - entire header is draggable */}
        <CardHeader
        ref={setActivatorNodeRef}
        className="flex flex-row items-center justify-between gap-2 pb-2 cursor-grab touch-none select-none"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isDragging ? 0.85 : 1
        }}
        {...attributes}
        {...listeners}
      >
        {/* Left: Drag handle + Expand + Favorite + Title (CHARTS_CLONE_SPEC Step 9) */}
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartExpandButton onClick={() => setIsFullscreen(true)} />
          <ChartFavoriteButton
            chartId="savingsAccumulation"
            chartTitle="Savings Accumulation"
            size="md"
          />
          <CardTitle className="text-base font-medium">Savings Accumulation</CardTitle>
        </div>

        {/* Right: Info + AI Insight + MA Toggle (time period from global date filter, not on card) */}
        <CardAction className="flex items-center gap-2">
          {renderInfoTrigger()}

          {/* Moving Average Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <IconChartLine className="h-4 w-4" />
                <span className="sr-only">Chart options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Moving Averages</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={show7DayMA} onCheckedChange={setShow7DayMA}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ma7Color }} />
                  7-Day MA
                </span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={show30DayMA} onCheckedChange={setShow30DayMA}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ma30Color }} />
                  30-Day MA
                </span>
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="h-[250px] min-h-0 w-full">
          {renderChart()}

        </div>
        {/* Legend for active MAs */}
        {(show7DayMA || show30DayMA) && (
          <div className="mt-3 flex shrink-0 items-center justify-center gap-4 text-xs text-muted-foreground">
            {show7DayMA && (
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ backgroundColor: ma7Color }} />
                7-Day Moving Average
              </span>
            )}
            {show30DayMA && (
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ backgroundColor: ma30Color }} />
                30-Day Moving Average
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  )
})

ChartSavingsAccumulation.displayName = "ChartSavingsAccumulation"
