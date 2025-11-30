"use client"

import * as React from "react"
import ReactECharts from "echarts-for-react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2Icon, Minimize2Icon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ChartDayOfWeekCategoryProps {
  dateFilter?: string | null
  isExpanded?: boolean
  onToggleExpand?: () => void
}

type DayOfWeekData = {
  category: string
  dayOfWeek: number
  total: number
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function ChartDayOfWeekCategory({ dateFilter, isExpanded = false, onToggleExpand }: ChartDayOfWeekCategoryProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [mounted, setMounted] = React.useState(false)
  const [data, setData] = React.useState<DayOfWeekData[]>([])
  const [availableDays, setAvailableDays] = React.useState<number[]>([])
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch available days first (without selected day) when dateFilter changes
  React.useEffect(() => {
    const fetchAvailableDays = async () => {
      try {
        const params = new URLSearchParams()
        if (dateFilter) {
          params.append("filter", dateFilter)
        }
        
        const response = await fetch(`/api/analytics/day-of-week-category?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch available days")
        }
        
        const result = await response.json()
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
        
        const response = await fetch(`/api/analytics/day-of-week-category?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }
        
        const result = await response.json()
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
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Day of Week Category Spending</CardTitle>
            <CardDescription>Compare spending across categories by day</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
            {onToggleExpand && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="ml-auto"
                onClick={onToggleExpand}
                aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
              >
                {isExpanded ? (
                  <Minimize2Icon className="h-4 w-4" />
                ) : (
                  <Maximize2Icon className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          Loading chart...
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Day of Week Category Spending</CardTitle>
            <CardDescription>Compare spending across categories by day</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
            {onToggleExpand && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="ml-auto"
                onClick={onToggleExpand}
                aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
              >
                {isExpanded ? (
                  <Minimize2Icon className="h-4 w-4" />
                ) : (
                  <Maximize2Icon className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          Loading data...
        </CardContent>
      </Card>
    )
  }

  if (!availableDays.length || selectedDay === null) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Day of Week Category Spending</CardTitle>
            <CardDescription>Compare spending across categories by day</CardDescription>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
            {onToggleExpand && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="ml-auto"
                onClick={onToggleExpand}
                aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
              >
                {isExpanded ? (
                  <Minimize2Icon className="h-4 w-4" />
                ) : (
                  <Maximize2Icon className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
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
          {onToggleExpand && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="ml-auto"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
            >
              {isExpanded ? (
                <Minimize2Icon className="h-4 w-4" />
              ) : (
                <Maximize2Icon className="h-4 w-4" />
              )}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="h-[420px]">
        {option && data.length > 0 ? (
          <div className="h-full w-full flex flex-col">
            <div className="mb-2 text-sm font-medium text-foreground text-center">
              Total: ${data.reduce((sum, item) => sum + item.total, 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex-1 min-h-0">
              <ReactECharts
                option={option}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "svg" }}
              />
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
