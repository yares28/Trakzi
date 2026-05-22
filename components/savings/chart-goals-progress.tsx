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
import type { DerivedGoal } from "@/lib/goals"

interface ChartGoalsProgressProps {
  goals: DerivedGoal[]
  maxRows?: number
}

const BAR_KEYS = ["current", "target"] as const

function targetFor(goal: DerivedGoal): number {
  return goal.goalKind === "debt_payoff" ? goal.startingAmount : goal.targetAmount
}

function currentFor(goal: DerivedGoal): number {
  if (goal.goalKind === "debt_payoff") {
    return Math.max(0, goal.startingAmount - goal.currentValue)
  }
  return goal.currentValue
}

export const ChartGoalsProgress = memo(function ChartGoalsProgress({
  goals,
  maxRows = 6,
}: ChartGoalsProgressProps) {
  const { formatCurrency } = useCurrency()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const currentColor = isDark
    ? "oklch(0.7214 0.1337 49.9802)"
    : "oklch(0.6716 0.1368 48.513)"
  const targetColor = "oklch(0.594 0.0443 196.0233)"

  const chartData = useMemo(() => {
    const ranked = [...goals]
      .filter((g) => targetFor(g) > 0)
      .sort((a, b) => b.rankingScore - a.rankingScore)
      .slice(0, maxRows)
      .reverse()
    return ranked.map((g) => ({
      goal: g.displayLabel.length > 22 ? `${g.displayLabel.slice(0, 21)}…` : g.displayLabel,
      current: Math.round(currentFor(g)),
      target: Math.round(targetFor(g)),
    }))
  }, [goals, maxRows])

  if (chartData.length === 0) return null

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveBar
          data={chartData}
          keys={BAR_KEYS as unknown as string[]}
          indexBy="goal"
          layout="horizontal"
          margin={{ top: 8, right: 16, bottom: 28, left: 120 }}
          padding={0.32}
          innerPadding={2}
          groupMode="grouped"
          colors={[currentColor, targetColor]}
          borderRadius={4}
          enableLabel={false}
          axisBottom={{
            tickSize: 0,
            tickPadding: 8,
            format: (v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
          }}
          axisLeft={{
            tickSize: 0,
            tickPadding: 6,
          }}
          enableGridX={true}
          gridXValues={4}
          theme={{
            text: { fill: textColor, fontSize: 11 },
            axis: { ticks: { text: { fill: textColor } } },
            grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
          }}
          tooltip={({ id, value, indexValue, color }) => (
            <NivoChartTooltip
              title={String(id) === "current" ? "Current" : "Target"}
              titleColor={color}
              value={formatCurrency(value as number)}
              subValue={String(indexValue)}
            />
          )}
          animate={true}
          motionConfig="gentle"
          barComponent={HoverableBar}
        />
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mt-1">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: currentColor }}
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">Current</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: targetColor }}
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">Target</span>
        </span>
      </div>
    </div>
  )
})

ChartGoalsProgress.displayName = "ChartGoalsProgress"
