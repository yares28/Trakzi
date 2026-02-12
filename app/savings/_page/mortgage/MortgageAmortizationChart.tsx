"use client"

import { memo, useMemo, useCallback } from "react"
import {
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipProps,
} from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import type { AmortizationYearData } from "./types"

interface MortgageAmortizationChartProps {
  data: AmortizationYearData[]
}

export const MortgageAmortizationChart = memo(function MortgageAmortizationChart({
  data,
}: MortgageAmortizationChartProps) {
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()

  const palette = getPalette()
  const colors = useMemo(() => ({
    annualTax: palette[0] ?? "#e96464",
    interest: palette[2] ?? "#cdb195",
    principal: palette[5] ?? "#5254b1",
    remainingBalance: palette[7] ?? "#639bff",
  }), [palette])

  const chartConfig: ChartConfig = useMemo(() => ({
    annualTax: { label: "Annual Tax (IBI)", color: colors.annualTax },
    interest: { label: "Interest", color: colors.interest },
    principal: { label: "Principal", color: colors.principal },
    remainingBalance: { label: "Remaining Balance", color: colors.remainingBalance },
  }), [colors])

  const renderTooltip = useCallback(
    ({ active, payload, label }: TooltipProps<number, string>) => {
      if (!active || !payload?.length) return null
      return (
        <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
          <p className="mb-1.5 font-medium">{label}</p>
          <div className="grid gap-1">
            {payload.map((entry) => {
              const key = String(entry.dataKey ?? entry.name ?? "")
              const config = chartConfig[key as keyof typeof chartConfig]
              return (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: entry.color ?? entry.stroke ?? "" }}
                    />
                    <span className="text-muted-foreground">
                      {config?.label ?? key}
                    </span>
                  </div>
                  <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(Number(entry.value ?? 0), { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )
    },
    [chartConfig, formatCurrency]
  )

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Enter mortgage details to see the amortization schedule.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <ComposedChart
        data={data}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          fontSize={11}
        />
        {/* Left Y-axis: remaining balance (line) */}
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            formatCurrency(v, { maximumFractionDigits: 0 })
          }
          width={70}
          fontSize={11}
        />
        {/* Right Y-axis: stacked bars (principal + interest + annual tax) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            formatCurrency(v, { maximumFractionDigits: 0 })
          }
          width={70}
          fontSize={11}
        />
        <Tooltip
          content={renderTooltip}
          cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
        />
        <ChartLegend content={<ChartLegendContent />} />

        {/* Stacked bars on the RIGHT Y-axis */}
        <Bar
          yAxisId="right"
          dataKey="annualTax"
          stackId="costs"
          fill={colors.annualTax}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          yAxisId="right"
          dataKey="interest"
          stackId="costs"
          fill={colors.interest}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          yAxisId="right"
          dataKey="principal"
          stackId="costs"
          fill={colors.principal}
          radius={[2, 2, 0, 0]}
        />

        {/* Remaining balance line on the LEFT Y-axis */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="remainingBalance"
          stroke={colors.remainingBalance}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </ComposedChart>
    </ChartContainer>
  )
})

MortgageAmortizationChart.displayName = "MortgageAmortizationChart"
