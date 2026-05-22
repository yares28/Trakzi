"use client"

import { memo, useMemo } from "react"
import { ResponsiveBar } from "@nivo/bar"
import { useTheme } from "next-themes"
import { useCurrency } from "@/components/currency-provider"
import {
  getChartTextColor,
  getChartAxisLineColor,
} from "@/lib/chart-colors"
import { HoverableBar } from "@/components/chart-hoverable-bar"
import { NivoChartTooltip } from "@/components/chart-tooltip"

interface MonthlyTotal {
  month: string
  cap: number
  spent: number
}

interface ChartBudgetVsSpendTrendProps {
  data: MonthlyTotal[]
}

const BAR_KEYS = ["spent", "cap"] as const
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

export const ChartBudgetVsSpendTrend = memo(function ChartBudgetVsSpendTrend({
  data,
}: ChartBudgetVsSpendTrendProps) {
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  // Literal oklch mirrors of --primary and --chart-1 (SVG fill can't evaluate var()).
  const spentColor = isDark
    ? "oklch(0.7214 0.1337 49.9802)"
    : "oklch(0.6716 0.1368 48.513)"
  const capColor = "oklch(0.594 0.0443 196.0233)"

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        month: d.month.slice(0, 7),
        spent: d.spent,
        cap: d.cap,
      })),
    [data]
  )

  if (data.length === 0) return null

  return (
    <div className="w-full h-48 flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveBar
          data={chartData}
          keys={BAR_KEYS as unknown as string[]}
          indexBy="month"
          margin={{ top: 12, right: 16, bottom: 28, left: 48 }}
          padding={0.3}
          innerPadding={2}
          groupMode="grouped"
          colors={[spentColor, capColor]}
          borderRadius={4}
          enableLabel={false}
          // ── Axes ──────────────────────────────────────────────────────
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            format: (v: string) => {
              const parts = String(v).split("-")
              const m = parseInt(parts[1] ?? "0", 10)
              return MONTH_LABELS[m - 1] ?? String(v)
            },
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
            format: (v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
          }}
          // ── Grid ──────────────────────────────────────────────────────
          enableGridY={true}
          gridYValues={4}
          // ── Theme ─────────────────────────────────────────────────────
          theme={{
            text: { fill: textColor, fontSize: 11 },
            axis: { ticks: { text: { fill: textColor } } },
            grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
          }}
          // ── Tooltip (portal-based, spec-compliant) ────────────────────
          tooltip={({ id, value, indexValue, color }) => (
            <NivoChartTooltip
              title={String(id) === "spent" ? "Spent" : "Cap"}
              titleColor={color}
              value={formatCurrency(value as number)}
              subValue={String(indexValue)}
            />
          )}
          // ── Animations ────────────────────────────────────────────────
          animate={true}
          motionConfig="gentle"
          // ── Hover zoom + mount stagger ────────────────────────────────
          barComponent={HoverableBar}
        />
      </div>

      {/* Legend below — required by spec for bar charts */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: spentColor }}
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">Spent</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: capColor }}
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">Cap</span>
        </span>
      </div>
    </div>
  )
})

ChartBudgetVsSpendTrend.displayName = "ChartBudgetVsSpendTrend"
