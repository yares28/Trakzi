"use client"

import * as React from "react"
import ReactECharts from "echarts-for-react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

type DayOfWeekSpendDatum = {
  day: string
  spend: number
}

interface ChartDayOfWeekSpendingFridgeProps {
  data?: DayOfWeekSpendDatum[]
  dayOfWeekSpendingData?: Array<{ dayOfWeek: number; total: number; count: number }>
  isLoading?: boolean
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export const ChartDayOfWeekSpendingFridge = React.memo(function ChartDayOfWeekSpendingFridge({ data = [], dayOfWeekSpendingData, isLoading = false }: ChartDayOfWeekSpendingFridgeProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency, symbol } = useCurrency()
  const [mounted, setMounted] = React.useState(false)
  const chartRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = React.useState<{ label: string; value: number; color: string } | null>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)
  const mousePositionRef = React.useRef<{ x: number; y: number } | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const palette = React.useMemo(() => {
    const base = getPalette().filter((color) => color !== "#c3c3c3")
    return base.length > 0 ? base : ["#0f766e", "#14b8a6", "#22c55e", "#84cc16", "#eab308"]
  }, [getPalette])

  const valueFormatter = {
    format: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 })
  }

  // Use bundle data if available
  const chartData = React.useMemo(() => {
    if (dayOfWeekSpendingData && dayOfWeekSpendingData.length > 0) {
      return dayOfWeekSpendingData.map(d => {
        // Convert dayOfWeek from SQL (0=Sun) to Mon-Sun order
        const dayIndex = d.dayOfWeek === 0 ? 6 : d.dayOfWeek - 1
        return { day: DAY_NAMES_SHORT[dayIndex], spend: d.total }
      })
    }
    return data
  }, [data, dayOfWeekSpendingData])

  const handleChartMouseOver = React.useCallback(
    (params: any) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      let mouseX = 0
      let mouseY = 0
      const ecEvent = (params && (params.event?.event || params.event)) as
        | (MouseEvent & { offsetX?: number; offsetY?: number })
        | undefined

      if (ecEvent) {
        if (
          typeof ecEvent.clientX === "number" &&
          typeof ecEvent.clientY === "number"
        ) {
          mouseX = ecEvent.clientX - rect.left
          mouseY = ecEvent.clientY - rect.top
        } else if (
          typeof ecEvent.offsetX === "number" &&
          typeof ecEvent.offsetY === "number"
        ) {
          mouseX = ecEvent.offsetX
          mouseY = ecEvent.offsetY
        }
      }

      const position = { x: mouseX, y: mouseY }
      mousePositionRef.current = position
      setTooltipPosition(position)

      if (params && params.name) {
        const day = params.name || ""
        let value = 0
        if (Array.isArray(params.value)) {
          value = params.value[1] || params.value[0] || 0
        } else if (params.data && Array.isArray(params.data)) {
          value = params.data[1] || 0
        } else {
          value = params.value || 0
        }
        const index = params.dataIndex || 0
        const color = palette[index % palette.length]

        setTooltip({
          label: day,
          value,
          color,
        })
      }
    },
    [palette],
  )

  const handleChartMouseOut = React.useCallback(() => {
    setTooltip(null)
    setTooltipPosition(null)
    mousePositionRef.current = null
  }, [])

  const chartEvents = React.useMemo(
    () => ({
      mouseover: handleChartMouseOver,
      mouseout: handleChartMouseOut,
      globalout: handleChartMouseOut,
    }),
    [handleChartMouseOver, handleChartMouseOut],
  )

  React.useEffect(() => {
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

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [tooltip])

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Day of Week Spending"
        description="Compare total spending across different days of the week."
        details={[
          "Each bar represents total spending for that day of the week.",
          "Shows spending patterns across the week.",
        ]}
        ignoredFootnote="Only expense transactions are included."
      />
      <ChartAiInsightButton
        chartId="fridge:day-of-week-spending"
        chartTitle="Day of Week Spending"
        chartDescription="Compare total spending across different days of the week."
        chartData={{
          totals: data,
          topDay: data.reduce(
            (best, cur) => (cur.spend > best.spend ? cur : best),
            { day: "", spend: 0 }
          ),
        }}
        size="sm"
      />
    </div>
  )

  const option = React.useMemo(() => {
    if (!chartData.length) return null

    // Sort data by day order (Monday = 0, Sunday = 6)
    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const sortedData = [...chartData].sort((a, b) => {
      const aIndex = dayOrder.indexOf(a.day)
      const bIndex = dayOrder.indexOf(b.day)
      return aIndex - bIndex
    })

    if (!sortedData.length) return null

    const barColor = palette[palette.length - 1] || "#8884d8"

    const datasetSource: any[] = [["day", "Spend"]]
    sortedData.forEach((item) => {
      datasetSource.push([item.day, item.spend])
    })

    const backgroundColor =
      resolvedTheme === "dark" ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"

    const textColor = resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"

    return {
      backgroundColor,
      textStyle: {
        color: textColor,
      },
      legend: {
        show: false,
      },
      tooltip: {
        show: false,
      },
      dataset: {
        source: datasetSource,
      },
      xAxis: {
        type: "category",
        axisLabel: {
          color: textColor,
        },
        axisTick: {
          lineStyle: {
            color: textColor,
          },
        },
        axisLine: {
          lineStyle: {
            color: textColor,
          },
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 }),
          color: textColor,
        },
        axisTick: {
          lineStyle: {
            color: textColor,
          },
        },
        axisLine: {
          lineStyle: {
            color: textColor,
          },
        },
        splitLine: {
          lineStyle: {
            color: resolvedTheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          },
        },
      },
      series: [
        {
          type: "bar",
          itemStyle: {
            color: barColor,
          },
        },
      ],
    }
  }, [data, palette, resolvedTheme])

  React.useEffect(() => {
    if (!chartRef.current) return
    const instance = chartRef.current.getEchartsInstance?.()
    if (!instance || !instance.getZr) return

    const zr = instance.getZr()
    const handleGlobalOut = () => {
      setTooltip(null)
      setTooltipPosition(null)
      mousePositionRef.current = null
    }

    zr.on("globalout", handleGlobalOut)
    return () => {
      zr.off("globalout", handleGlobalOut)
    }
  }, [])

  const chartElement = React.useMemo(() => {
    if (!option) return null
    return (
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "svg" }}
        notMerge={true}
        onEvents={chartEvents}
      />
    )
  }, [option, chartEvents])

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="fridge:day-of-week-spending"
              chartTitle="Day of Week Spending"
              size="md"
            />
            <CardTitle>Day of Week Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState isLoading />
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="fridge:day-of-week-spending"
              chartTitle="Day of Week Spending"
              size="md"
            />
            <CardTitle>Day of Week Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState isLoading />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GridStackCardDragHandle />
          <ChartFavoriteButton
            chartId="fridge:day-of-week-spending"
            chartTitle="Day of Week Spending"
            size="md"
          />
          <CardTitle>Day of Week Spending</CardTitle>
        </div>
        <CardDescription>Compare spending across days of the week</CardDescription>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        {option && data.length > 0 ? (
          <div className="h-full w-full flex flex-col">
            <div className="mb-2 text-sm font-medium text-foreground text-center">
              Total: {formatCurrency(data.reduce((sum, item) => sum + item.spend, 0))}
            </div>
            <div ref={containerRef} className="relative flex-1 min-h-0" style={{ minHeight: 0, minWidth: 0 }}>
              {chartElement}
              {tooltip && tooltipPosition && (
                <div
                  className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: Math.min(Math.max(tooltipPosition.x + 16, 8), (containerRef.current?.clientWidth || 800) - 8),
                    top: Math.min(Math.max(tooltipPosition.y - 16, 8), (containerRef.current?.clientHeight || 250) - 8),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-border/50"
                      style={{ backgroundColor: tooltip.color, borderColor: tooltip.color }}
                    />
                    <span className="font-medium text-foreground whitespace-nowrap">{tooltip.label}</span>
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                    {valueFormatter.format(tooltip.value)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  )
})

ChartDayOfWeekSpendingFridge.displayName = "ChartDayOfWeekSpendingFridge"












