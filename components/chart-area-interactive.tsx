"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
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

export const description = "An interactive area chart"

// Generate realistic financial data with monthly income and cumulative expenses
const generateChartData = () => {
  const data = []
  const monthlyIncome = 5000 // Income received once per month
  const startDate = new Date("2024-04-01")
  const endDate = new Date("2024-06-30")
  
  // Base expense patterns - realistic daily spending
  const expensePatterns = {
    // Rent payment on 1st of month
    rent: 1800,
    // Utilities on 5th of month
    utilities: 150,
    // Groceries - weekly pattern
    groceries: [120, 95, 110, 105],
    // Daily expenses (dining, transport, misc)
    daily: [45, 60, 35, 80, 50, 70, 40],
    // Weekend expenses (higher)
    weekend: [120, 150, 90],
  }
  
  let currentDate = new Date(startDate)
  let groceryIndex = 0
  let dailyIndex = 0
  let daysSinceGrocery = 0
  let cumulativeExpenses = 0 // Track cumulative expenses
  let currentMonth = -1 // Track month changes
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0]
    const day = currentDate.getDate()
    const month = currentDate.getMonth()
    const dayOfWeek = currentDate.getDay() // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isFirstOfMonth = day === 1
    
    // Reset cumulative expenses at the start of each month
    if (month !== currentMonth) {
      cumulativeExpenses = 0
      currentMonth = month
    }
    
    // Income: only on the 1st of each month
    const income = isFirstOfMonth ? monthlyIncome : 0
    
    // Daily expense amount: realistic daily spending patterns
    let dailyExpense = 0
    
    if (isFirstOfMonth) {
      // Rent payment on 1st
      dailyExpense = expensePatterns.rent
      daysSinceGrocery = 0
    } else if (day === 5) {
      // Utilities on 5th
      dailyExpense = expensePatterns.utilities
      daysSinceGrocery++
    } else if (daysSinceGrocery >= 6 && (dayOfWeek === 5 || dayOfWeek === 6)) {
      // Grocery shopping roughly weekly (every 6-7 days, prefer weekends)
      dailyExpense = expensePatterns.groceries[groceryIndex % expensePatterns.groceries.length]
      groceryIndex++
      daysSinceGrocery = 0
    } else if (isWeekend) {
      // Weekend spending (higher)
      dailyExpense = expensePatterns.weekend[Math.floor(Math.random() * expensePatterns.weekend.length)]
      daysSinceGrocery++
    } else {
      // Regular daily expenses
      dailyExpense = expensePatterns.daily[dailyIndex % expensePatterns.daily.length]
      dailyIndex++
      daysSinceGrocery++
    }
    
    // Add some natural variation (±20%)
    const variation = 1 + (Math.random() * 0.4 - 0.2)
    dailyExpense = Math.round(dailyExpense * variation)
    
    // Add to cumulative expenses (expenses pile up over time)
    cumulativeExpenses += dailyExpense
    
    data.push({
      date: dateStr,
      desktop: income,
      mobile: cumulativeExpenses, // Show cumulative expenses instead of daily
    })
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return data
}

const chartData = generateChartData()

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const { colorScheme, getPalette } = useColorScheme()
  const [timeRange, setTimeRange] = React.useState("90d")

  // Color scheme: colored uses custom palette, dark uses custom palette
  // Darker = more expensive (bigger peso)
  // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  // Expenses (darker) = more spending, Income (lighter) = less spending relative to expenses
  // Use lighter colors from palette for income, darker colors for expenses
  // Reversed palette: darkest at end, lightest at beginning
  const reversedPalette = [...palette].reverse()
  const incomeColor = reversedPalette[Math.min(1, reversedPalette.length - 1)] // Lighter for income
  const expensesColor = reversedPalette[reversedPalette.length - 1] // Darkest for expenses
  const incomeBorderColor = reversedPalette[0] // Lightest for border
  const expensesBorderColor = reversedPalette[reversedPalette.length - 1] // Darkest for border

  const chartConfig = {
    cashflow: {
      label: "Cash Flow",
    },
    desktop: {
      label: "Income",
      color: incomeColor,
    },
    mobile: {
      label: "Expenses",
      color: expensesColor,
    },
  } satisfies ChartConfig

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Income & Expenses Tracking</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Your cash flow for the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
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
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
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
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
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
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
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
      </CardContent>
    </Card>
  )
}
