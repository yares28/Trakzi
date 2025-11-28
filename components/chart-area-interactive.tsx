"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import Image from "next/image"
import { useTheme } from "next-themes"

import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
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

export const description = "An interactive area chart"

interface ChartAreaInteractiveProps {
  data?: Array<{
    date: string
    desktop: number
    mobile: number
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
}

export function ChartAreaInteractive({ data = [], categoryControls }: ChartAreaInteractiveProps) {
  const { colorScheme, getPalette } = useColorScheme()
  const { resolvedTheme } = useTheme()
  
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

  const renderInfoAction = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Income & Expenses Tracking"
        description="This chart visualizes your cash flow over time."
        details={[
          "The income line shows daily deposits, while the expense line accumulates your negative transactions.",
          "How it works: expenses stack up as they happen. Incoming cash reduces the cumulative expense line so you can see how quickly income offsets spending.",
          ...(categoryControls
            ? ["Use the toggles below to hide categories across every analytics chart."]
            : []),
        ]}
        ignoredFootnote="Positive transactions feed the Income series and negative transactions feed Expenses automatically."
        categoryControls={categoryControls}
      />
      <Image
        src={starImage}
        alt="Star"
        width={16}
        height={16}
        className="object-contain"
      />
    </div>
  )

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
          <CardAction>{renderInfoAction()}</CardAction>
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
        <CardAction>{renderInfoAction()}</CardAction>
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
