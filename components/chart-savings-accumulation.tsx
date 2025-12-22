"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, Line, ComposedChart, YAxis } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useTheme } from "next-themes"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatDateForDisplay } from "@/lib/date"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
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

export function ChartSavingsAccumulation({ data: chartData = [], isLoading = false }: ChartSavingsAccumulationProps) {
  const isMobile = useIsMobile()
  const { getPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const [timeRange, setTimeRange] = React.useState("90d")
  const [show7DayMA, setShow7DayMA] = React.useState(false)
  const [show30DayMA, setShow30DayMA] = React.useState(false)

  // Full-header drag functionality
  const { setActivatorNodeRef, listeners, attributes, isDragging } = useDragHandle()

  const isDark = resolvedTheme === "dark"
  const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"

  // Color scheme for savings
  const palette = getPalette().filter(color => color !== "#c3c3c3")
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

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  const filteredData = React.useMemo(() => {
    const filtered = chartData.filter((item) => {
      const date = new Date(item.date)
      const referenceDate = new Date("2024-06-30")
      let daysToSubtract = 90
      if (timeRange === "30d") daysToSubtract = 30
      else if (timeRange === "7d") daysToSubtract = 7
      const startDate = new Date(referenceDate)
      startDate.setDate(startDate.getDate() - daysToSubtract)
      return date >= startDate
    })

    const ma7Data = calculateMA(filtered, 7)
    const ma30Data = calculateMA(filtered, 30)

    return filtered.map((item, index) => ({
      ...item,
      ma7: ma7Data[index]?.value ?? null,
      ma30: ma30Data[index]?.value ?? null,
    }))
  }, [chartData, timeRange])

  // Empty/Loading state
  if (!chartData || chartData.length === 0 || filteredData.length === 0) {
    return (
      <Card className="@container/card h-full flex flex-col">
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
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1">
          <div className="h-[250px] w-full">
            <ChartLoadingState isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card h-full flex flex-col">
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
        {/* Left: Drag handle + Favorite + Title */}
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartFavoriteButton
            chartId="savingsAccumulation"
            chartTitle="Savings Accumulation"
            size="md"
          />
          <CardTitle className="text-base font-medium">Savings Accumulation</CardTitle>
        </div>

        {/* Right: Info + AI Insight + MA Toggle + Time Range */}
        <CardAction className="flex items-center gap-2">
          <ChartInfoPopover
            title="Savings Accumulation"
            description="Track your cumulative savings over time."
            details={[
              "Shows the total savings accumulated day by day",
              "Toggle moving averages to see trends",
              "Use the time range selector to focus on different periods",
            ]}
          />
          <ChartAiInsightButton
            chartId="savingsAccumulation"
            chartTitle="Savings Accumulation"
            chartDescription="Track your cumulative savings over time with daily aggregates and moving averages."
            chartData={filteredData}
            size="sm"
          />

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

          {/* Time Range - Desktop */}
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>

          {/* Time Range - Mobile */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm">
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <ComposedChart data={filteredData}>
            <defs>
              <linearGradient id="fillSavings" x1="0" y1="0" x2="0" y2="1">
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
            <YAxis hide domain={['auto', 'auto']} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDateForDisplay(String(value), "en-US", { month: "short", day: "numeric" })}
                  indicator="dot"
                  formatter={(value, name) => {
                    const numValue = Number(value)
                    const label = name === "ma7" ? "7-Day MA" : name === "ma30" ? "30-Day MA" : "Savings"
                    return `${label}: $${numValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  }}
                />
              }
            />
            <Area
              dataKey="savings"
              type="natural"
              fill="url(#fillSavings)"
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

        {/* Legend for active MAs */}
        {(show7DayMA || show30DayMA) && (
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
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
  )
}
