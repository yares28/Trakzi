"use client"

import * as React from "react"
import { useMemo } from "react"
import { useTheme } from "next-themes"
import ReactECharts from "echarts-for-react"
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

interface ChartBarCategoryProps {
  data?: Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>
  dateFilter?: string | null
}

export function ChartBarCategory({ data = [], dateFilter = null }: ChartBarCategoryProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const palette = getPalette()
  const isDark = resolvedTheme === "dark"

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Spending by Day of Week"
      description="See which day of the week you spend the most"
      details={[
        "Each bar represents spending for a specific category on a day of the week.",
        "Compare your spending patterns across different days to identify trends.",
      ]}
    />
  )

  // Day names (Monday = 0, Sunday = 6)
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Process data to group by day of week and category
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        categories: [] as string[],
        daysOfWeek: dayNames,
        series: [] as Array<{ name: string; data: number[]; type: string }>,
        dailyTotals: [0, 0, 0, 0, 0, 0, 0],
        remainingBarSeries: null
      }
    }

    // Filter transactions to only expenses
    const expenses = data.filter(tx => {
      const amount = Number(tx.amount) || 0
      return amount < 0
    })

    // Group by day of week and category
    // dayOfWeekMap: Map<dayIndex (0-6), Map<category, totalAmount>>
    const dayOfWeekMap = new Map<number, Map<string, number>>()
    const categoriesSet = new Set<string>()

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayOfWeekMap.set(i, new Map<string, number>())
    }

    expenses.forEach(tx => {
      const date = new Date(tx.date)
      // JavaScript's getDay() returns 0 = Sunday, 6 = Saturday
      // Convert to Monday-based week: (getDay() + 6) % 7 gives 0 = Monday, 6 = Sunday
      const dayOfWeek = (date.getDay() + 6) % 7 // 0 = Monday, 6 = Sunday
      const category = (tx.category || "Other").trim()
      const amount = Math.abs(Number(tx.amount) || 0)

      categoriesSet.add(category)

      const categoryMap = dayOfWeekMap.get(dayOfWeek)!
      const currentTotal = categoryMap.get(category) || 0
      categoryMap.set(category, currentTotal + amount)
    })

    // Get sorted categories (by total amount across all days)
    const categoryTotals = new Map<string, number>()
    dayOfWeekMap.forEach((categoryMap) => {
      categoryMap.forEach((amount, category) => {
        const current = categoryTotals.get(category) || 0
        categoryTotals.set(category, current + amount)
      })
    })

    const sortedCategories = Array.from(categoriesSet).sort((a, b) => {
      const totalA = categoryTotals.get(a) || 0
      const totalB = categoryTotals.get(b) || 0
      return totalB - totalA
    })

    // Limit to top 10 categories to avoid clutter
    const topCategories = sortedCategories.slice(0, 10)

    // Build series data for each category
    const series = topCategories.map((category) => {
      const data = dayNames.map((_, dayIndex) => {
        const categoryMap = dayOfWeekMap.get(dayIndex)
        return categoryMap ? (categoryMap.get(category) || 0) : 0
      })

      return {
        name: category,
        type: 'bar',
        data,
        emphasis: {
          focus: 'series'
        }
      }
    })

    // Calculate total spending for each day (sum of ALL categories, not just top 10)
    const dailyTotals = dayNames.map((_, dayIndex) => {
      const categoryMap = dayOfWeekMap.get(dayIndex)
      if (!categoryMap) return 0
      let total = 0
      // Sum all categories for this day
      categoryMap.forEach((amount) => {
        total += amount
      })
      return total
    })

    return {
      categories: topCategories,
      daysOfWeek: dayNames,
      series,
      dailyTotals
    }
  }, [data])

  // ECharts option configuration
  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        label: {
          show: true,
          formatter: (params: any) => {
            // params.value is the category value (day name string)
            // Find the index of this day in the daysOfWeek array
            const dayIndex = chartData.daysOfWeek.indexOf(params.value)
            if (dayIndex === -1) return ''
            const total = chartData.dailyTotals[dayIndex] || 0
            return `Total: $${total.toFixed(2)}`
          },
          backgroundColor: isDark ? 'rgba(55, 65, 81, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? '#6b7280' : '#d1d5db',
          borderWidth: 1,
          color: isDark ? '#e5e7eb' : '#374151',
          padding: [6, 10],
          borderRadius: 4
        }
      },
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          let result = `${params[0].axisValue}<br/>`
          params.forEach((param: any) => {
            result += `${param.marker}${param.seriesName}: $${param.value.toFixed(2)}<br/>`
          })
          return result
        }
        return `${params.axisValue}<br/>${params.marker}${params.seriesName}: $${params.value.toFixed(2)}`
      }
    },
    legend: {
      data: chartData.categories,
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      textStyle: {
        color: isDark ? '#e5e7eb' : '#374151'
      }
    },
    grid: {
      top: 120,
      bottom: 80,
      left: 60,
      right: 30
    },
    xAxis: {
      type: 'category',
      data: chartData.daysOfWeek,
      axisLabel: {
        color: isDark ? '#9ca3af' : '#6b7280'
      },
      axisLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        formatter: (value: number) => {
          if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}k`
          }
          return `$${value.toFixed(0)}`
        }
      },
      axisLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#e5e7eb'
        }
      },
      splitLine: {
        lineStyle: {
          color: isDark ? '#374151' : '#1f2937',
          type: 'dashed'
        }
      }
    },
    series: chartData.series.map((seriesItem, index) => ({
      ...seriesItem,
      itemStyle: {
        color: palette[index % palette.length]
      }
    }))
  }), [chartData, isDark, palette])

  if (chartData.series.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Spending by Day of Week</CardTitle>
          <CardDescription>
            See which day of the week you spend the most
          </CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[400px] w-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">
              No expense data available for the selected period.
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Spending by Day of Week</CardTitle>
        <CardDescription>
          See which day of the week you spend the most
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="h-[400px] w-full">
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
