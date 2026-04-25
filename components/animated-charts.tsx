"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { ResponsivePie } from "@nivo/pie"
import { ResponsiveBar } from "@nivo/bar"
import { ResponsiveRadar } from "@nivo/radar"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"

// Sunset palette — matches charts-showcase.tsx so the look is consistent
const palette = ["#fe680e", "#fe8339", "#fe9e64", "#feb98f", "#ffd4bb", "#b44401", "#893401", "#df5501"]

// ─── Stacked Area (income / expenses / savings) ─────────────────────────────
const StackedAreaChart = memo(function StackedAreaChart() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]
    return months.map((m, i) => ({
      month: m,
      income: 3200 + Math.sin(i * 0.8) * 800 + i * 150,
      expenses: 2400 + Math.cos(i * 0.6) * 600 + i * 80,
      savings: 800 + Math.sin(i * 1.2) * 300 + i * 70,
    }))
  }, [])

  const chartData = mounted ? data : data.map((d) => ({ ...d, income: 0, expenses: 0, savings: 0 }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={false} />
          <YAxis hide />
          <Area
            type="monotone"
            dataKey="income"
            stackId="1"
            stroke={palette[0]}
            fill={palette[0]}
            fillOpacity={0.6}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stackId="1"
            stroke={palette[2]}
            fill={palette[2]}
            fillOpacity={0.6}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="savings"
            stackId="1"
            stroke={palette[4]}
            fill={palette[4]}
            fillOpacity={0.6}
            isAnimationActive
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
})

// ─── Donut Pie ──────────────────────────────────────────────────────────────
const DonutPieChart = memo(function DonutPieChart() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const data = useMemo(
    () => [
      { id: "Rent", label: "Rent", value: 3200, color: palette[0] },
      { id: "Food", label: "Food", value: 1800, color: palette[1] },
      { id: "Transport", label: "Transport", value: 900, color: palette[2] },
      { id: "Shopping", label: "Shopping", value: 650, color: palette[3] },
      { id: "Bills", label: "Bills", value: 450, color: palette[4] },
    ],
    [],
  )

  return (
    <div className="w-full h-full">
      <ResponsivePie
        data={data}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        innerRadius={0.55}
        padAngle={1}
        cornerRadius={3}
        activeOuterRadiusOffset={6}
        colors={{ datum: "data.color" }}
        borderWidth={0}
        enableArcLinkLabels={false}
        enableArcLabels={false}
        tooltip={() => null}
        theme={{ text: { fill: textColor, fontSize: 11 } }}
        animate
        motionConfig="gentle"
      />
    </div>
  )
})

// ─── Grouped Bars ───────────────────────────────────────────────────────────
const GroupedBarsChart = memo(function GroupedBarsChart() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const data = useMemo(
    () => [
      { month: "Jan", a: 420, b: 280, c: 190 },
      { month: "Feb", a: 380, b: 310, c: 220 },
      { month: "Mar", a: 450, b: 260, c: 180 },
      { month: "Apr", a: 390, b: 290, c: 240 },
      { month: "May", a: 410, b: 270, c: 200 },
    ],
    [],
  )

  return (
    <div className="w-full h-full">
      <ResponsiveBar
        data={data}
        keys={["a", "b", "c"]}
        indexBy="month"
        margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
        padding={0.3}
        groupMode="grouped"
        colors={[palette[0], palette[2], palette[4]]}
        borderRadius={4}
        enableLabel={false}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        axisLeft={null}
        enableGridY={false}
        tooltip={() => null}
        theme={{
          text: { fill: textColor, fontSize: 10 },
          axis: { ticks: { text: { fill: textColor } } },
          grid: { line: { stroke: gridColor, strokeWidth: 1, strokeDasharray: "4 4" } },
        }}
        animate
        motionConfig="gentle"
      />
    </div>
  )
})

// ─── Radar (financial health) ───────────────────────────────────────────────
const RadarComparisonChart = memo(function RadarComparisonChart() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const data = useMemo(
    () => [
      { category: "Income", "2025": 85, "2024": 70 },
      { category: "Food", "2025": 65, "2024": 80 },
      { category: "Rent", "2025": 90, "2024": 75 },
      { category: "Transport", "2025": 45, "2024": 60 },
      { category: "Bills", "2025": 55, "2024": 50 },
      { category: "Shopping", "2025": 70, "2024": 55 },
    ],
    [],
  )

  return (
    <div className="w-full h-full">
      <ResponsiveRadar
        data={data}
        keys={["2025", "2024"]}
        indexBy="category"
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        gridLabelOffset={10}
        dotSize={5}
        dotColor={{ theme: "background" }}
        dotBorderWidth={2}
        colors={[palette[0], palette[2]]}
        blendMode="normal"
        fillOpacity={0.5}
        gridLevels={4}
        gridShape="linear"
        sliceTooltip={() => null}
        theme={{
          text: { fill: textColor, fontSize: 9 },
          grid: { line: { stroke: getChartAxisLineColor(isDark), strokeWidth: 1 } },
        }}
        animate
        motionConfig="gentle"
      />
    </div>
  )
})

// ─── Multi line trends ──────────────────────────────────────────────────────
const MultiLineChart = memo(function MultiLineChart() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
    return months.map((m, i) => ({
      month: m,
      line1: 200 + Math.sin(i * 0.9) * 80 + i * 25,
      line2: 180 + Math.cos(i * 0.7) * 60 + i * 15,
      line3: 150 + Math.sin(i * 1.3) * 50 + i * 10,
    }))
  }, [])

  const chartData = mounted ? data : data.map((d) => ({ ...d, line1: 0, line2: 0, line3: 0 }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={false} />
          <YAxis hide />
          <Line
            type="monotone"
            dataKey="line1"
            stroke={palette[0]}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={1200}
          />
          <Line
            type="monotone"
            dataKey="line2"
            stroke={palette[2]}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={1200}
          />
          <Line
            type="monotone"
            dataKey="line3"
            stroke={palette[4]}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={1200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})

// ─── Recharts bar (weekly trend) ────────────────────────────────────────────
const WeeklyTrendBar = memo(function WeeklyTrendBar() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    return months.map((m, i) => ({
      month: m,
      value: 300 + Math.sin(i * 1.1) * 150 + i * 40,
    }))
  }, [])

  const chartData = mounted ? data : data.map((d) => ({ ...d, value: 0 }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={false} />
          <YAxis hide />
          <Bar
            dataKey="value"
            fill={palette[0]}
            radius={[4, 4, 0, 0]}
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// ─── Cycle config ───────────────────────────────────────────────────────────
const charts = [
  { id: "stacked-area", label: "Cash Flow", Component: StackedAreaChart },
  { id: "donut", label: "Breakdown", Component: DonutPieChart },
  { id: "grouped-bar", label: "By Category", Component: GroupedBarsChart },
  { id: "radar", label: "Health", Component: RadarComparisonChart },
  { id: "multi-line", label: "Trends", Component: MultiLineChart },
  { id: "weekly-bar", label: "Weekly", Component: WeeklyTrendBar },
] as const

export function AnimatedCharts() {
  const [activeChart, setActiveChart] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveChart((prev) => (prev + 1) % charts.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const ActiveChartComponent = charts[activeChart].Component

  return (
    <div className="flex flex-col gap-3 w-full h-full">
      <div className="h-[220px] sm:h-[240px] flex items-center justify-center px-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeChart}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <ActiveChartComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Chart type indicators */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 px-2">
        {charts.map((chart, index) => (
          <button
            key={chart.id}
            type="button"
            onClick={() => setActiveChart(index)}
            className={`px-2.5 py-1 text-[11px] sm:text-xs rounded-full transition-all ${
              activeChart === index
                ? "bg-[#e78a53] text-white"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {chart.label}
          </button>
        ))}
      </div>
    </div>
  )
}
