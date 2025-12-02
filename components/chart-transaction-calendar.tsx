"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import ReactECharts from "echarts-for-react"
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

interface ChartTransactionCalendarProps {
  data?: Array<{
    day: string
    value: number
  }>
}

const getRangeForFilter = (filter: string) => {
  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  switch (filter) {
    case "last7days": {
      const start = new Date(today)
      start.setDate(start.getDate() - 7)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    case "last30days": {
      const start = new Date(today)
      start.setDate(start.getDate() - 30)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    case "last3months": {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 3)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    case "last6months": {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 6)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    case "lastyear": {
      const start = new Date(today)
      start.setFullYear(start.getFullYear() - 1)
      return { fromDate: formatDate(start), toDate: formatDate(today) }
    }
    default: {
      if (/^\d{4}$/.test(filter)) {
        return {
          fromDate: `${filter}-01-01`,
          toDate: `${filter}-12-31`,
        }
      }
      return null
    }
  }
}

const formatFilterLabel = (filter: string | null) => {
  if (!filter) return "All Time"
  switch (filter) {
    case "last7days":
      return "Last 7 Days"
    case "last30days":
      return "Last 30 Days"
    case "last3months":
      return "Last 3 Months"
    case "last6months":
      return "Last 6 Months"
    case "lastyear":
      return "Last Year"
    default:
      return filter
  }
}

export function ChartTransactionCalendar({ data: propData }: ChartTransactionCalendarProps) {
  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Daily Transaction Activity"
      description="Your spending patterns throughout the year - darker means more transactions"
      details={[
        "Each cell represents a day, colored by the total amount you spent.",
        "We pull expense-only data from /api/transactions/daily so income, transfers, and savings moves are excluded."
      ]}
      ignoredFootnote="The API filters to negative transactions only and trims out internal transfers and savings deposits."
    />
  )

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)
  const [allData, setAllData] = useState<Array<{ day: string; value: number }>>(propData || [])
  const [isLoading, setIsLoading] = useState(!propData)
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const chartRef = React.useRef<any>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Check if YTD is selected
  const isYTD = selectedYear === "YTD"
  const isGlobalFilterActive = Boolean(dateFilter)

  // Listen for global date filter changes
  useEffect(() => {
    if (propData) return
    if (typeof window === "undefined") return

    const saved = window.localStorage.getItem("dateFilter")
    setDateFilter(saved || null)

    const handleFilterChange = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (typeof detail === "string" || detail === null) {
        setDateFilter(detail)
      } else {
        setDateFilter(null)
      }
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)
    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [propData])

  // Fetch data from Neon database
  useEffect(() => {
    // If data is provided as prop, use it and don't fetch
    if (propData) {
      setAllData(propData)
      setIsLoading(false)
      return
    }

    const fetchDailyTransactions = async () => {
      try {
        setIsLoading(true)
        const url = dateFilter
          ? `/api/transactions/daily?filter=${encodeURIComponent(dateFilter)}`
          : "/api/transactions/daily"
        const data = await deduplicatedFetch<Array<{ day: string; value: number }>>(url)
        if (Array.isArray(data)) {
          setAllData(data)
        } else {
          console.error("[ChartTransactionCalendar] Invalid data format:", data)
          setAllData([])
        }
      } catch (error) {
        console.error("[ChartTransactionCalendar] Error fetching daily transactions:", error)
        setAllData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDailyTransactions()
  }, [propData, dateFilter])

  useEffect(() => {
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

  // Generate list of available years from data, or use current year if no data
  const availableYears = React.useMemo(() => {
    const years = new Set<number>()
    allData.forEach(item => {
      const year = new Date(item.day).getFullYear()
      years.add(year)
    })
    // If no data, default to current year
    if (years.size === 0) {
      years.add(currentYear)
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [allData, currentYear])

  // Calculate date range based on global filter or local year selection
  const { fromDate, toDate, enforcedByFilter } = useMemo(() => {
    if (dateFilter) {
      const range = getRangeForFilter(dateFilter)
      if (range) {
        return { ...range, enforcedByFilter: true }
      }
    }

    if (isYTD) {
      const today = new Date()
      const oneYearAgo = new Date(today)
      oneYearAgo.setDate(oneYearAgo.getDate() - 365)
      return {
        fromDate: oneYearAgo.toISOString().split('T')[0],
        toDate: today.toISOString().split('T')[0],
        enforcedByFilter: false
      }
    }

    return {
      fromDate: `${selectedYear}-01-01`,
      toDate: `${selectedYear}-12-31`,
      enforcedByFilter: false
    }
  }, [dateFilter, isYTD, selectedYear])

  // Filter data based on selection, excluding days with value 0 and future dates
  const filteredData = allData.filter((item) => {
    const itemDate = item.day
    const today = new Date().toISOString().split('T')[0]

    if (item.value <= 0 || itemDate > today) return false
    if (fromDate && itemDate < fromDate) return false
    if (toDate && itemDate > toDate) return false
    return true
  })

  // Format data for ECharts: [date, value] format
  const chartData = useMemo(() => {
    return filteredData.map((item) => [item.day, item.value])
  }, [filteredData])

  // Calculate max value for visualMap
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 10000
    return Math.max(...chartData.map(([, value]) => value as number), 100)
  }, [chartData])

  const isDark = resolvedTheme === "dark"

  // Get colors from color scheme provider
  // Filter out #c3c3c3 (empty color) and reverse so darker colors are at the end (for high spending)
  const palette = useMemo(() => {
    const colors = getPalette().filter(color => color !== "#c3c3c3")
    return [...colors].reverse() // Reverse so darkest colors are at the end for high spending
  }, [getPalette])


  // ECharts option configuration
  const option = useMemo(() => ({
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          const param = params[0]
          return `${param.data[0]}<br/>$${param.data[1]} in expenses`
        }
        return `${params.data[0]}<br/>$${params.data[1]} in expenses`
      }
    },
    title: {
      show: false
    },
    visualMap: {
      min: 0,
      max: maxValue,
      show: false, // Hide the default legend
      inRange: {
        color: palette
      }
    },
    calendar: {
      top: 30,
      left: 30,
      right: 30,
      bottom: 30,
      cellSize: ['auto', 13],
      range: [fromDate, toDate],
      itemStyle: {
        borderWidth: 0.5,
        borderColor: isDark ? '#374151' : '#e5e7eb'
      },
      yearLabel: { show: false },
      dayLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 11
      },
      monthLabel: {
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 11
      }
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: chartData
    }
  }), [chartData, maxValue, fromDate, toDate, isDark, palette])

  if (!mounted || isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Daily Transaction Activity</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/card:block">
              Your spending patterns throughout the year - darker means more transactions
            </span>
            <span className="@[540px]/card:hidden">Transaction heatmap</span>
          </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          {renderInfoTrigger()}
          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
            disabled={isGlobalFilterActive}
          >
            <SelectTrigger
              className="w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select year"
            >
              <SelectValue placeholder={selectedYear === "YTD" ? "YTD" : currentYear.toString()} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="YTD" className="rounded-lg">
                YTD
              </SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()} className="rounded-lg">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isGlobalFilterActive && (
            <span className="text-xs text-muted-foreground">
              Showing {formatFilterLabel(dateFilter)}
            </span>
          )}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Daily Transaction Activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Your spending patterns throughout the year - darker means more transactions
          </span>
          <span className="@[540px]/card:hidden">Transaction heatmap</span>
        </CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          {renderInfoTrigger()}
          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
            disabled={isGlobalFilterActive}
          >
            <SelectTrigger
              className="w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select year"
            >
              <SelectValue placeholder={currentYear.toString()} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="YTD" className="rounded-lg">
                YTD
              </SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()} className="rounded-lg">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isGlobalFilterActive && (
            <span className="text-xs text-muted-foreground">
              Showing {formatFilterLabel(dateFilter)}
            </span>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div ref={containerRef} className="h-[250px] w-full" style={{ minHeight: 0, minWidth: 0 }}>
          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge={true}
          />
        </div>
        {/* Color Legend */}
        <div className="mt-4 flex items-center justify-center gap-3 px-2 sm:px-6">
          <span className="text-xs text-muted-foreground">Less</span>
          <div className="flex h-4 items-center gap-0.5">
            {palette.map((color, index) => (
              <div
                key={index}
                className="h-full w-3 rounded-sm"
                style={{ backgroundColor: color }}
                title={`Expense level ${index + 1}`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  )
}

