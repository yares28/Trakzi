"use client"

import { useEffect, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useTheme } from "next-themes"

import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
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
import { DateFilterType } from "@/components/date-filter"
import { formatDateForDisplay } from "@/lib/date"
import { deduplicatedFetch } from "@/lib/request-deduplication"

interface ChartCategoryTrendProps {
  categoryName: string
}

interface Transaction {
  id: number
  date: string
  description: string
  amount: number
  balance: number | null
  category: string
}

interface ChartDataPoint {
  date: string
  value: number
}

export function ChartCategoryTrend({ categoryName }: ChartCategoryTrendProps) {
  const { colorScheme, getPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const [dateFilter, setDateFilter] = useState<DateFilterType | null>(null)
  const isDark = resolvedTheme === "dark"
  const gridStrokeColor = isDark ? "#e5e7eb" : "#e5e7eb"
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Listen for date filter changes from SiteHeader
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent<DateFilterType | null>) => {
      setDateFilter(event.detail)
    }

    // Load initial filter from localStorage
    if (typeof window !== "undefined") {
      const savedFilter = localStorage.getItem("dateFilter")
      if (savedFilter) {
        setDateFilter(savedFilter as DateFilterType)
      }
    }

    window.addEventListener("dateFilterChanged", handleFilterChange as EventListener)

    return () => {
      window.removeEventListener("dateFilterChanged", handleFilterChange as EventListener)
    }
  }, [])

  // Fetch and process transaction data
  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Build API URL with filter
        const url = dateFilter
          ? `/api/transactions?filter=${encodeURIComponent(dateFilter)}`
          : "/api/transactions"

        const transactions = await deduplicatedFetch<Transaction[]>(url)

        if (!isMounted) return

        // Filter transactions for this category and expenses only
        const categoryTransactions = transactions.filter(
          (tx) => tx.category === categoryName && tx.amount < 0
        )

        // Group by date and sum amounts
        const dailyTotals = new Map<string, number>()

        categoryTransactions.forEach((tx) => {
          const date = tx.date.split("T")[0] // Get YYYY-MM-DD
          const currentTotal = dailyTotals.get(date) || 0
          dailyTotals.set(date, currentTotal + Math.abs(tx.amount))
        })

        // Convert to array and sort by date
        const data: ChartDataPoint[] = Array.from(dailyTotals.entries())
          .map(([date, value]) => ({
            date,
            value: Math.round(value * 100) / 100, // Round to 2 decimals
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        if (isMounted) {
          setChartData(data)
        }
      } catch (error) {
        console.error(`[ChartCategoryTrend] Failed to fetch data for ${categoryName}:`, error)
        if (isMounted) {
          setChartData([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [categoryName, dateFilter])

  // Get color from palette
  const palette = getPalette().filter((color) => color !== "#c3c3c3")
  const reversedPalette = [...palette].reverse()
  // Use a color from the palette based on category name hash for consistency
  const categoryColorIndex =
    categoryName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    reversedPalette.length
  const categoryColor = reversedPalette[categoryColorIndex] || reversedPalette[reversedPalette.length - 1]
  const categoryBorderColor = reversedPalette[Math.max(0, categoryColorIndex - 1)] || reversedPalette[0]

  const chartConfig = {
    value: {
      label: categoryName,
      color: categoryColor,
    },
  } satisfies ChartConfig

  const renderInfoAction = () => (
    <ChartInfoPopover
      title={`${categoryName} Spending Trend`}
      description={`Daily spending for ${categoryName} over time.`}
      details={[
        "This chart shows your daily expenses for this category.",
        "Only negative transactions (expenses) are included.",
      ]}
    />
  )

  // Show loading state
  if (isLoading) {
    return (
      <Card className="@container/card h-full w-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>{categoryName}</CardTitle>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoAction()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  // Hide chart if no data for the selected timeframe
  if (!chartData || chartData.length === 0) {
    return null
  }

  return (
    <Card className="@container/card h-full w-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>{categoryName}</CardTitle>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoAction()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-w-0 overflow-hidden flex-1 min-h-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full w-full min-w-0"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`fill-${categoryName.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={categoryColor}
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor={categoryColor}
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
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return formatDateForDisplay(String(value), "en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="value"
              type="natural"
              fill={`url(#fill-${categoryName.replace(/\s+/g, "-")})`}
              stroke={categoryBorderColor}
              strokeWidth={1}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
