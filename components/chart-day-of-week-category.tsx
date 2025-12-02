"use client"

import * as React from "react"
import ReactECharts from "echarts-for-react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ChartDayOfWeekCategoryProps {
  dateFilter?: string | null
}

type DayOfWeekData = {
  category: string
  dayOfWeek: number
  total: number
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function ChartDayOfWeekCategory({ dateFilter }: ChartDayOfWeekCategoryProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [mounted, setMounted] = React.useState(false)
  const [data, setData] = React.useState<DayOfWeekData[]>([])
  const [availableDays, setAvailableDays] = React.useState<number[]>([])
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)
  const chartRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
    return () => {
      // Cleanup on unmount - handle React Strict Mode double-mounting
      if (chartRef.current) {
        try {
          const instance = chartRef.current.getEchartsInstance()
          if (instance && !instance.isDisposed()) {
            instance.dispose()
          }
        } catch (e) {
          // Ignore disposal errors (common in React Strict Mode)
        }
        chartRef.current = null
      }
    }
  }, [])

  // Fetch available days first (without selected day) when dateFilter changes
  React.useEffect(() => {
    const fetchAvailableDays = async () => {
      try {
        const params = new URLSearchParams()
        if (dateFilter) {
          params.append("filter", dateFilter)
        }
        
        const result = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          `/api/analytics/day-of-week-category?${params.toString()}`
        )
        const days = result.availableDays || []
        setAvailableDays(days)
        
        // Reset selected day to first available when date filter changes
        if (days.length > 0) {
          setSelectedDay((prev) => {
            // Only update if current selection is not in the new list
            if (prev === null || !days.includes(prev)) {
              return days[0]
            }
            return prev
          })
        } else {
          setSelectedDay(null)
        }
      } catch (error) {
        console.error("Error fetching available days:", error)
        setAvailableDays([])
        setSelectedDay(null)
      }
    }

    if (mounted) {
      fetchAvailableDays()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, mounted])

  // Fetch data when selectedDay changes
  React.useEffect(() => {
    const fetchData = async () => {
      if (selectedDay === null) {
        setData([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (dateFilter) {
          params.append("filter", dateFilter)
        }
        params.append("dayOfWeek", selectedDay.toString())
        
        const result = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          `/api/analytics/day-of-week-category?${params.toString()}`
        )
        setData(result.data || [])
      } catch (error) {
        console.error("Error fetching day of week category data:", error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    if (mounted && selectedDay !== null) {
      fetchData()
    }
  }, [selectedDay, dateFilter, mounted])

  const palette = React.useMemo(() => {
    const base = getPalette().filter((color) => color !== "#c3c3c3")
    if (!base.length) {
      return ["#0f766e", "#14b8a6", "#22c55e", "#84cc16", "#eab308"]
    }
    return base
  }, [getPalette])

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Day of Week Category Spending"
      description="Compare spending across categories for a selected day of the week."
      details={[
        "Each bar represents total spending in a category for the selected day of the week.",
        "Only the most spent categories are shown for each day.",
        "Use the day selector to switch between different days of the week.",
      ]}
      ignoredFootnote="Only expense transactions (amount < 0) are included."
    />
  )

  const option = React.useMemo(() => {
    if (!data.length || selectedDay === null) return null

    // Data is already filtered to selected day and sorted by total descending
    // Get top categories (already sorted by API)
    const topCategories = data.slice(0, 10) // Show top 10 categories
    
    if (!topCategories.length) return null

    // Build dataset source
    const datasetSource: any[] = [["category", "Amount"]]
    topCategories.forEach((item) => {
      datasetSource.push([item.category, item.total])
    })

    const backgroundColor =
      resolvedTheme === "dark" ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"

    return {
      backgroundColor,
      legend: {
        show: false,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params
          const category = param.name || ""
          // For dataset, value might be an array [category, amount] or just the amount
          let value = 0
          if (Array.isArray(param.value)) {
            value = param.value[1] || param.value[0] || 0
          } else if (param.data && Array.isArray(param.data)) {
            value = param.data[1] || 0
          } else {
            value = param.value || 0
          }
          const formattedValue = `$${value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
          return `<div style="border-radius: 0.375rem; border: 1px solid hsl(var(--border)); background: hsl(var(--popover)); padding: 0.5rem 0.75rem; font-size: 0.875rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
            <div style="font-weight: 500;">${category}: ${formattedValue}</div>
          </div>`
        },
        backgroundColor: "transparent",
        borderWidth: 0,
        padding: 0,
      },
      dataset: {
        source: datasetSource,
      },
      xAxis: {
        type: "category",
        axisLabel: {
          rotate: 45,
          interval: 0,
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => `$${value.toLocaleString()}`,
        },
      },
      series: [
        {
          type: "bar",
          itemStyle: {
            color: (params: any) => {
              const index = params.dataIndex
              return palette[index % palette.length]
            },
          },
        },
      ],
    }
  }, [data, selectedDay, palette, resolvedTheme])

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div>
            <CardTitle>Day of Week Category Spending</CardTitle>
            <CardDescription>Compare spending across categories by day</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex items-center justify-center text-muted-foreground">
          Loading chart...
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div>
            <CardTitle>Day of Week Category Spending</CardTitle>
            <CardDescription>Compare spending across categories by day</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex items-center justify-center text-muted-foreground">
          Loading data...
        </CardContent>
      </Card>
    )
  }

  if (!availableDays.length || selectedDay === null) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div>
            <CardTitle>Day of Week Category Spending</CardTitle>
            <CardDescription>Compare spending across categories by day</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div>
          <CardTitle>Day of Week Category Spending</CardTitle>
          <CardDescription>Compare spending across categories by day</CardDescription>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
          <Select
            value={selectedDay !== null ? selectedDay.toString() : ""}
            onValueChange={(value) => setSelectedDay(parseInt(value, 10))}
          >
            <SelectTrigger
              className="w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select day of week"
            >
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableDays.map((day) => (
                <SelectItem key={day} value={day.toString()} className="rounded-lg">
                  {DAY_NAMES[day]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        {option && data.length > 0 ? (
          <div className="h-full w-full flex flex-col">
            <div className="mb-2 text-sm font-medium text-foreground text-center">
              Total: ${data.reduce((sum, item) => sum + item.total, 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div ref={containerRef} className="flex-1 min-h-0" style={{ minHeight: 0, minWidth: 0 }}>
              {option && (
                <ReactECharts
                  ref={chartRef}
                  option={option}
                  style={{ height: "100%", width: "100%" }}
                  opts={{ renderer: "svg" }}
                  notMerge={true}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No data for selected day
          </div>
        )}
      </CardContent>
    </Card>
  )
}
