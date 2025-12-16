"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { IconGripVertical } from "@tabler/icons-react"

import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
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

export type DayOfWeekSpendDatum = {
  day: string
  spend: number
}

interface ChartDayOfWeekShoppingFridgeProps {
  data?: DayOfWeekSpendDatum[]
}

export function ChartDayOfWeekShoppingFridge({ data = [] }: ChartDayOfWeekShoppingFridgeProps) {
  const { getPalette } = useColorScheme()
  const { formatCurrency, symbol } = useCurrency()
  const palette = getPalette().filter((color) => color !== "#c3c3c3")
  const barColor = palette[palette.length - 1] || "#8884d8"

  const chartConfig = {
    spend: {
      label: "Spend",
      color: barColor,
    },
  } satisfies ChartConfig

  const infoAction = (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Best Shopping Days"
        description="See which weekdays drive the most grocery spend."
        details={[
          "Totals are summed across receipts in the selected time filter.",
          "Use this to spot routine trip patterns (e.g., weekend stock-ups).",
        ]}
        ignoredFootnote="Spend totals are based on receipt totals (tax included)."
      />
      <ChartAiInsightButton
        chartId="fridge:day-of-week"
        chartTitle="Best Shopping Days"
        chartDescription="Total grocery spend by day of week."
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

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="gridstack-drag-handle -m-1 inline-flex cursor-grab touch-none select-none items-center justify-center rounded p-1 active:cursor-grabbing">
            <IconGripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <CardTitle>Best Shopping Days</CardTitle>
        </div>
        <CardDescription>Total grocery spend by weekday</CardDescription>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {infoAction}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <BarChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `${symbol}${v}`} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `Day: ${value}`}
                  formatter={(value) => (
                    <div className="flex flex-1 items-center justify-between">
                      <span className="text-muted-foreground">Spend</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {formatCurrency(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="spend" fill="var(--color-spend)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
