"use client"

import { memo, useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { useCurrency } from "@/components/currency-provider"
import { useTheme } from "next-themes"

interface MonthlyTotal {
  month: string
  cap: number
  spent: number
}

interface ChartBudgetVsSpendTrendProps {
  data: MonthlyTotal[]
}

export const ChartBudgetVsSpendTrend = memo(function ChartBudgetVsSpendTrend({
  data,
}: ChartBudgetVsSpendTrendProps) {
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: d.month.slice(0, 7), // YYYY-MM
      })),
    [data]
  )

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"
  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"

  if (data.length === 0) return null

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={2}>
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: axisColor }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: axisColor }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
            }
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "spent" ? "Spent" : "Cap",
            ]}
            contentStyle={{
              borderRadius: 8,
              fontSize: 12,
              backgroundColor: isDark ? "hsl(240 10% 10%)" : "hsl(0 0% 100%)",
              color: isDark ? "hsl(0 0% 95%)" : "hsl(0 0% 10%)",
              border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
            }}
          />
          <Bar
            dataKey="spent"
            name="spent"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="cap"
            name="cap"
            fill="transparent"
            stroke="#10b981"
            strokeWidth={1.5}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

ChartBudgetVsSpendTrend.displayName = "ChartBudgetVsSpendTrend"
