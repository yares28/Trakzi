"use client"

import { memo } from "react"
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

const chartConfig = {
  progress: { label: "Score" },
}

interface ScoreRadialChartProps {
  progress: number
  fill: string
}

export const ScoreRadialChart = memo(function ScoreRadialChart({
  progress,
  fill,
}: ScoreRadialChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[120px] w-[120px]">
      <RadialBarChart
        data={[{ progress, fill }]}
        innerRadius={42}
        outerRadius={55}
        barSize={10}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          angleAxisId={0}
          tick={false}
          axisLine={false}
        />
        <RadialBar
          dataKey="progress"
          background
          cornerRadius={10}
          fill={fill}
          angleAxisId={0}
          animationDuration={1500}
        />
      </RadialBarChart>
    </ChartContainer>
  )
})

ScoreRadialChart.displayName = "ScoreRadialChart"
