"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import Image from "next/image"
import { useTheme } from "next-themes"

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
import { IconInfoCircle } from "@tabler/icons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export const description = "An interactive area chart"

interface ChartAreaInteractiveProps {
  data?: Array<{
    date: string
    desktop: number
    mobile: number
  }>
}

export function ChartAreaInteractive({ data = [] }: ChartAreaInteractiveProps) {
  const { colorScheme, getPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  const [isInfoOpen, setIsInfoOpen] = React.useState(false)
  
  // Determine which star image to use based on theme
  const starImage = resolvedTheme === "dark" ? "/starW.png" : "/starB.png"

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

  const filteredData = data

  // Show empty state if no data
  if (!data || data.length === 0 || filteredData.length === 0) {
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
            <div className="flex flex-col items-center gap-2">
              <Popover open={isInfoOpen} onOpenChange={setIsInfoOpen}>
                <PopoverTrigger asChild>
                  <button 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onMouseEnter={() => setIsInfoOpen(true)}
                    onMouseLeave={() => setIsInfoOpen(false)}
                  >
                    <IconInfoCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80" 
                  align="end"
                  onMouseEnter={() => setIsInfoOpen(true)}
                  onMouseLeave={() => setIsInfoOpen(false)}
                >
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Income & Expenses Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      This chart visualizes your cash flow over time. The income line shows daily income amounts, while the expense line shows cumulative expenses that accumulate over time.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>How it works:</strong> Expenses add up as they occur. When income comes in, it reduces the accumulated expense total, showing how income offsets your spending.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
              <Image 
                src={starImage} 
                alt="Star" 
                width={16} 
                height={16}
                className="object-contain"
              />
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

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
          <div className="flex flex-col items-center gap-2">
            <Popover open={isInfoOpen} onOpenChange={setIsInfoOpen}>
              <PopoverTrigger asChild>
                <button 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onMouseEnter={() => setIsInfoOpen(true)}
                  onMouseLeave={() => setIsInfoOpen(false)}
                >
                  <IconInfoCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80" 
                align="end"
                onMouseEnter={() => setIsInfoOpen(true)}
                onMouseLeave={() => setIsInfoOpen(false)}
              >
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Income & Expenses Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    This chart visualizes your cash flow over time. The income line shows daily income amounts, while the expense line shows cumulative expenses that accumulate over time.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>How it works:</strong> Expenses add up as they occur. When income comes in, it reduces the accumulated expense total, showing how income offsets your spending.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
            <Image 
              src={starImage} 
              alt="Star" 
              width={16} 
              height={16}
              className="object-contain"
            />
          </div>
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
