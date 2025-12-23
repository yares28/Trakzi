"use client"

import { useState, useRef, useEffect } from "react"
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
  isLoading?: boolean
}

export function ChartAreaInteractive({ data = [], categoryControls, chartId = "incomeExpensesTracking1", isLoading = false }: ChartAreaInteractiveProps) {
  const { colorScheme, getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const [tooltip, setTooltip] = useState<{ date: string; income: number; expenses: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number | undefined; y: number | undefined } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null)
  const isDark = resolvedTheme === "dark"
  const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"

  // Color scheme: colored uses custom palette, dark uses custom palette
  // Darker = more expensive (bigger peso)
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  // Expenses (darker) = more spending, Income (lighter) = less spending relative to expenses
  // Use lighter colors from palette for income, darker colors for expenses
  // Reversed palette: darkest at end, lightest at beginning
  const reversedPalette = [...palette].reverse()

  // Apply custom colors only for dark color palette
  const incomeColor = "#fe8339" // Income color set to "#fe8339"
  let expensesColorLight = reversedPalette[reversedPalette.length - 1] // Darkest for expenses (light mode)

  // Determine income and expense colors for light and dark modes
  let incomeColorLight = incomeColor
  let incomeColorDark = incomeColor
  let expensesColorDark = "#D88C6C" // Dark mode: expenses color to "#D88C6C"

  if (colorScheme === "dark") {
    // For dark color scheme
    incomeColorLight = "#fe8339"
    incomeColorDark = "#fe8339"
    expensesColorLight = "#151515"
    expensesColorDark = "#D88C6C"
  } else {
    // For other color schemes, use palette colors for light mode
    expensesColorLight = reversedPalette[reversedPalette.length - 1]
  }

  // Use theme-based colors for proper CSS variable generation
  const chartConfig = {
    cashflow: {
      label: "Cash Flow",
    },
    desktop: {
      label: "Income",
      theme: {
        light: incomeColorLight,
        dark: incomeColorDark,
      },
    },
    mobile: {
      label: "Expenses",
      theme: {
        light: expensesColorLight,
        dark: expensesColorDark,
      },
    },
  } satisfies ChartConfig

  // For stroke colors, use current theme colors
  const incomeBorderColor = isDark ? incomeColorDark : incomeColorLight
  const expensesBorderColor = isDark ? expensesColorDark : expensesColorLight

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
        title="Income & Expenses Tracking"
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
        chartTitle="Income & Expenses Tracking"
        chartDescription="This chart visualizes your cash flow over time, showing income and expenses."
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

  // Show loading state if loading, or empty state if no data
  if (!data || data.length === 0 || filteredData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId={chartId}
              chartTitle="Income & Expenses Tracking"
              size="md"
            />
            <CardTitle>Income & Expenses Tracking</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoAction()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] w-full">
            <ChartLoadingState isLoading={isLoading} />
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
        title="Income & Expenses Tracking"
        description="Cash flow over time"
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
              <Area dataKey="desktop" type="natural" fill="url(#fillDesktopFS)" stroke={incomeBorderColor} strokeWidth={1} />
              <Area dataKey="mobile" type="natural" fill="url(#fillMobileFS)" stroke={expensesBorderColor} strokeWidth={1} />
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
              chartTitle="Income & Expenses Tracking"
              size="md"
            />
            <CardTitle>Income & Expenses Tracking</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoAction()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-w-0 overflow-hidden">
          <div ref={containerRef} className="relative">
            <div ref={chartContainerRef}>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full min-w-0"
              >
                <AreaChart
                  data={filteredData}
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
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="url(#fillMobile)"
                    stroke={expensesBorderColor}
                    strokeWidth={1}
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
}
