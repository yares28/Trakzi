"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveCalendar } from "@nivo/calendar"
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

export function ChartTransactionCalendar({ data: allData = [] }: ChartTransactionCalendarProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const { resolvedTheme } = useTheme()
  const { colorScheme, getPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  // Filter data for selected year, excluding days with value 0
  // Days with value 0 will use emptyColor (#c3c3c3)
  const filteredData = allData.filter((item) => {
    const itemYear = new Date(item.day).getFullYear()
    return itemYear === parseInt(selectedYear) && item.value > 0
  })

  // Use Nivo default colors like TimeRange example
  const isDark = resolvedTheme === "dark"
  
  // Color scheme: colored uses custom colors, dark uses Nivo greys
  // Use #c3c3c3 only for days with zero transactions (emptyColor)
  const emptyColor = "#c3c3c3" // Use #c3c3c3 for days with no transactions
  const textColor = isDark ? "#9ca3af" : "#6b7280"
  const borderColor = "#ffffff"
  
  // Use custom colors for colored scheme, custom dark palette for dark scheme
  // Darker = more spending (black), lighter = less spending
  // For all palettes: lighter colors (beginning) = low spending, darker colors (end) = high spending
  // Filter out #c3c3c3 from the palette - it's only used for empty days
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  // Reverse palette so darkest colors are at the end (for high spending)
  // This ensures: light colors (low indices) = low spending, dark colors (high indices) = high spending
  const colors = [...palette].reverse()

  if (!mounted) {
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
          <CardAction>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger
                className="w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
                size="sm"
                aria-label="Select year"
              >
                <SelectValue placeholder={currentYear.toString()} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="rounded-lg">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[200px] w-full" />
          {/* Color Legend */}
          <div className="mt-4 flex items-center justify-center gap-3 px-2 sm:px-6">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex h-4 items-center gap-0.5">
              {colors.map((color, index) => (
                <div
                  key={index}
                  className="h-full w-3 rounded-sm"
                  style={{ backgroundColor: color }}
                  title={`Transaction level ${index + 1}`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
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
        <CardAction>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger
              className="w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              aria-label="Select year"
            >
              <SelectValue placeholder={currentYear.toString()} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()} className="rounded-lg">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="h-[200px] w-full">
          <ResponsiveCalendar
            data={filteredData}
            from={`${selectedYear}-01-01`}
            to={`${selectedYear}-12-31`}
            emptyColor={emptyColor}
            colors={colors}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            yearSpacing={40}
            monthBorderColor={borderColor}
            dayBorderWidth={2}
            dayBorderColor={borderColor}
            theme={{
              text: {
                fill: textColor,
                fontSize: 11,
              },
              tooltip: {
                container: {
                  background: "#ffffff",
                  color: "#000000",
                  fontSize: 12,
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  padding: "8px 12px",
                  border: "1px solid #e2e8f0",
                },
              },
            }}
            legends={[
              {
                anchor: "bottom-right",
                direction: "row",
                translateY: 36,
                itemCount: 4,
                itemWidth: 42,
                itemHeight: 36,
                itemsSpacing: 14,
                itemDirection: "right-to-left",
              },
            ]}
            tooltip={({ day, value }) => (
              <div
                style={{
                  background: "#ffffff",
                  color: "#000000",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>{day}</div>
                <div style={{ color: "#64748b" }}>
                  ${value} in transactions
                </div>
              </div>
            )}
          />
        </div>
        {/* Color Legend */}
        <div className="mt-4 flex items-center justify-center gap-3 px-2 sm:px-6">
          <span className="text-xs text-muted-foreground">Less</span>
          <div className="flex h-4 items-center gap-0.5">
            {colors.map((color, index) => (
              <div
                key={index}
                className="h-full w-3 rounded-sm"
                style={{ backgroundColor: color }}
                title={`Transaction level ${index + 1}`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  )
}

