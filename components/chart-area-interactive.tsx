"use client"

import { useState, useRef, useEffect, memo, useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, TooltipProps } from "recharts"
import { useTheme } from "next-themes"

import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { type ChartId } from "@/lib/chart-card-sizes.config"
import { formatDateForDisplay } from "@/lib/date"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"
import { ChartLoadingState } from "@/components/chart-loading-state"
export const description = "An interactive area chart"

interface ChartAreaInteractiveProps {
  data?: Array<{
    date: string
    desktop: number
    mobile: number
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
  chartId?: ChartId
  /** Custom title for the chart card. Defaults to "Income & Expenses Cumulative Tracking" */
  title?: string
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

const DEFAULT_CHART_TITLE = "Income & Expenses Cumulative Tracking"

export const ChartAreaInteractive = memo(function ChartAreaInteractive({
  data = [],
  categoryControls,
  chartId = "incomeExpensesTracking1",
  title = DEFAULT_CHART_TITLE,
  isLoading = false,
  emptyTitle,
  emptyDescription
}: ChartAreaInteractiveProps) {
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const [tooltip, setTooltip] = useState<{ date: string; income: number; expenses: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number | undefined; y: number | undefined } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Track if we should use real data - starts false to force animation by showing empty data first
  const [useRealData, setUseRealData] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null)
  const isDark = resolvedTheme === "dark"
  const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"

  // Force animation by delaying when we switch from empty data to real data
  // Recharts animates when data changes, so we start with [] then switch to real data
  useEffect(() => {
    // Use requestAnimationFrame to ensure the empty-data render happens first
    const rafId = requestAnimationFrame(() => {
      setUseRealData(true)
    })
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Palette is ordered dark → light. For better contrast:
  // - Dark mode: skip first color (darkest) so areas are visible against dark background
  // - Light mode: skip last color (lightest) so areas are visible against light background
  const palette = useMemo(() => {
    const base = getPalette().filter(color => color !== "#c3c3c3")
    if (isDark) {
      return base.slice(1)
    }
    return base.slice(0, -1)
  }, [getPalette, isDark])

  // Income uses a fixed brand color, expenses uses the darkest available palette color
  const incomeColor = "#fe8339"
  // For expenses: use darkest color from the theme-adjusted palette
  const expensesColor = palette[palette.length - 1] || "#D88C6C"

  // Use theme-based colors for proper CSS variable generation
  const chartConfig = {
    cashflow: {
      label: "Cash Flow",
    },
    desktop: {
      label: "Income",
      theme: {
        light: incomeColor,
        dark: incomeColor,
      },
    },
    mobile: {
      label: "Expenses",
      theme: {
        light: expensesColor,
        dark: expensesColor,
      },
    },
  } satisfies ChartConfig

  // For stroke colors, use the theme-aware colors
  const incomeBorderColor = incomeColor
  const expensesBorderColor = expensesColor

  const filteredData = data

  // Format currency value using user's preferred currency
  const valueFormatter = {
    format: (value: number) => formatCurrency(value)
  }

  // Track mouse movement so the tooltip position animates smoothly with the cursor
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
      mousePositionRef.current = position
      if (tooltip) {
        setTooltipPosition(position)
      }
    }

    const handleMouseLeave = () => {
      setTooltip(null)
      setTooltipPosition(null)
      mousePositionRef.current = null
    }

    container.addEventListener("mousemove", handleMouseMove)
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      container.removeEventListener("mousemove", handleMouseMove)
      container.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [tooltip])

  const renderInfoAction = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title={title}
        description="This chart visualizes your cash flow over time."
        details={[
          "The income line shows daily deposits, while the expense line accumulates your negative transactions.",
          "How it works: expenses stack up as they happen. Incoming cash reduces the cumulative expense line so you can see how quickly income offsets spending.",
          ...(categoryControls
            ? ["Use the toggles below to hide categories across every analytics chart."]
            : []),
        ]}
        ignoredFootnote="Positive transactions feed the Income series and negative transactions feed Expenses automatically."
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId={chartId}
        chartTitle={title}
        chartDescription="This chart visualizes your cumulative cash flow over time, showing income and expenses."
        chartData={{
          totalIncome: filteredData.reduce((sum, d) => sum + (d.desktop || 0), 0),
          totalExpenses: filteredData.reduce((sum, d) => sum + (d.mobile || 0), 0),
          dataPoints: filteredData.length,
          dateRange: filteredData.length > 0 ? {
            start: filteredData[0].date,
            end: filteredData[filteredData.length - 1].date
          } : null
        }}
        size="sm"
      />
    </div>
  )

  // The data to pass to the chart - empty initially, then real data after mount
  // This forces Recharts to see a data change and trigger animation
  const chartData = useRealData ? filteredData : []

  // Show loading/empty state only when loading or no data available
  if (isLoading || !data || data.length === 0 || filteredData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId={chartId}
              chartTitle={title}
              size="md"
            />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoAction()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] w-full">
            <ChartLoadingState
              isLoading={isLoading}
              skeletonType="area"
              emptyTitle={emptyTitle || "No financial data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see your cash flow"}
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
        title={title}
        description="Cumulative cash flow over time"
        headerActions={renderInfoAction(true)}
      >
        <div className="h-full w-full min-h-[400px]">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillDesktopFS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillMobileFS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
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
              <Area dataKey="desktop" type="natural" fill="url(#fillDesktopFS)" stroke={incomeBorderColor} strokeWidth={1} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
              <Area dataKey="mobile" type="natural" fill="url(#fillMobileFS)" stroke={expensesBorderColor} strokeWidth={1} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
            </AreaChart>
          </ChartContainer>
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId={chartId}
              chartTitle={title}
              size="md"
            />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoAction()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-w-0">
          <div ref={containerRef} className="relative">
            <div ref={chartContainerRef}>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full min-w-0"
              >
                <AreaChart
                  data={chartData}
                >
                  <defs>
                    <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-desktop)"
                        stopOpacity={1.0}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-desktop)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-mobile)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-mobile)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={gridStrokeColor} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value) => {
                      return formatDateForDisplay(String(value), "en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }}
                  />
                  <Tooltip
                    cursor={false}
                    content={(props: TooltipProps<number, string>) => {
                      const { active, payload, coordinate } = props

                      // Avoid calling setState while React is in the render phase.
                      // Recharts tooltip `content` sometimes runs during render,
                      // which can trigger "Cannot update a component while rendering"
                      // warnings if we call setTooltip / setTooltipPosition here.
                      if (!active || !payload || !payload.length || !coordinate) {
                        // Defer clearing tooltip to the microtask queue so it
                        // happens after the current render commit.
                        queueMicrotask(() => {
                          setTooltip(null)
                          setTooltipPosition(null)
                        })
                        return null
                      }

                      const data = payload[0].payload
                      const date = data.date
                      const income = data.desktop || 0
                      const expenses = data.mobile || 0

                      if (containerRef.current && coordinate) {
                        const basePosition = mousePositionRef.current ?? {
                          x: coordinate.x,
                          y: coordinate.y,
                        }

                        // Defer state updates to avoid violating React's render rules.
                        queueMicrotask(() => {
                          setTooltipPosition(basePosition)
                          setTooltip({
                            date,
                            income,
                            expenses,
                          })
                        })
                      }

                      return null
                    }}
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="url(#fillDesktop)"
                    stroke={incomeBorderColor}
                    strokeWidth={1}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="url(#fillMobile)"
                    stroke={expensesBorderColor}
                    strokeWidth={1}
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ChartContainer>
            </div>
            {tooltip && tooltipPosition && (
              <div
                className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${(tooltipPosition.x ?? 0) + 16}px`,
                  top: `${(tooltipPosition.y ?? 0) - 16}px`,
                  transform: 'translate(0, -100%)',
                }}
              >
                <div className="font-medium text-foreground mb-2 whitespace-nowrap">
                  {formatDateForDisplay(tooltip.date, "en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-border/50"
                    style={{ backgroundColor: incomeBorderColor, borderColor: incomeBorderColor }}
                  />
                  <span className="text-foreground/80">Income:</span>
                  <span className="font-mono text-[0.7rem] text-foreground font-medium">
                    {valueFormatter.format(tooltip.income)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-border/50"
                    style={{ backgroundColor: expensesBorderColor, borderColor: expensesBorderColor }}
                  />
                  <span className="text-foreground/80">Expenses:</span>
                  <span className="font-mono text-[0.7rem] text-foreground font-medium">
                    {valueFormatter.format(tooltip.expenses)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartAreaInteractive.displayName = "ChartAreaInteractive"
