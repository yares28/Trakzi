"use client"

import { memo, useRef, useState, useEffect, useMemo } from "react"
import { m, useInView } from "framer-motion"
import { useTheme } from "next-themes"
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ResponsivePie } from "@nivo/pie"
import { ResponsiveBar } from "@nivo/bar"
import { ResponsiveLine } from "@nivo/line"
import { ResponsiveRadar } from "@nivo/radar"
import { FollowerPointerCard } from "./following-pointer"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"

// Only show the first N charts on mobile (1-column layout) — the rest
// are accessible via the "And a lot more charts" CTA underneath.
const MOBILE_CHART_LIMIT = 5

// Sunset palette chart colors
const palette = ["#fe680e", "#fe8339", "#fe9e64", "#feb98f", "#ffd4bb", "#b44401", "#893401", "#df5501"]

// ─── Chart Components (pure visuals, no legends/tooltips/prices) ──────────

const MockStackedArea = memo(function MockStackedArea() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"]
    return months.map((m, i) => ({
      month: m,
      income: 3200 + Math.sin(i * 0.8) * 800 + i * 150,
      expenses: 2400 + Math.cos(i * 0.6) * 600 + i * 80,
      savings: 800 + Math.sin(i * 1.2) * 300 + i * 70,
    }))
  }, [])

  const chartData = mounted ? data : data.map(d => ({ ...d, income: 0, expenses: 0, savings: 0 }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={false} />
          <YAxis hide />
          <Area type="monotone" dataKey="income" stackId="1" stroke={palette[0]} fill={palette[0]} fillOpacity={0.6} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
          <Area type="monotone" dataKey="expenses" stackId="1" stroke={palette[2]} fill={palette[2]} fillOpacity={0.6} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
          <Area type="monotone" dataKey="savings" stackId="1" stroke={palette[4]} fill={palette[4]} fillOpacity={0.6} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
})

const MockPieChart = memo(function MockPieChart() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const data = useMemo(() => [
    { id: "Rent", label: "Rent", value: 3200, color: palette[0] },
    { id: "Food", label: "Food", value: 1800, color: palette[1] },
    { id: "Transport", label: "Transport", value: 900, color: palette[2] },
    { id: "Shopping", label: "Shopping", value: 650, color: palette[3] },
    { id: "Bills", label: "Bills", value: 450, color: palette[4] },
  ], [])

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
        animate={true}
        motionConfig="gentle"
      />
    </div>
  )
})

const MockGroupedBar = memo(function MockGroupedBar() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const data = useMemo(() => [
    { month: "Jan", a: 420, b: 280, c: 190 },
    { month: "Feb", a: 380, b: 310, c: 220 },
    { month: "Mar", a: 450, b: 260, c: 180 },
    { month: "Apr", a: 390, b: 290, c: 240 },
    { month: "May", a: 410, b: 270, c: 200 },
  ], [])

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
        animate={true}
        motionConfig="gentle"
      />
    </div>
  )
})

const MockBurndownLine = memo(function MockBurndownLine() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const data = useMemo(() => {
    const actual: Array<{ x: number; y: number }> = []
    const ideal: Array<{ x: number; y: number }> = []
    for (let i = 0; i <= 30; i++) {
      ideal.push({ x: i, y: 3000 - (3000 / 30) * i })
      actual.push({ x: i, y: Math.max(0, 3000 - (3000 / 30) * i - Math.random() * 150 + (i > 15 ? 200 : 0)) })
    }
    return [
      { id: "Budget", data: ideal },
      { id: "Spent", data: actual },
    ]
  }, [])

  return (
    <div className="w-full h-full">
      <ResponsiveLine
        data={data}
        margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
        xScale={{ type: "linear", min: 0, max: 30 }}
        yScale={{ type: "linear", min: 0, max: 3500 }}
        curve="monotoneX"
        colors={[isDark ? "#4b5563" : "#9ca3af", palette[0]]}
        lineWidth={2}
        enablePoints={false}
        enableGridX={false}
        enableGridY={false}
        enableArea={true}
        areaOpacity={0.08}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        axisLeft={null}
        tooltip={() => null}
        animate={true}
        motionConfig="gentle"
        theme={{
          text: { fill: textColor, fontSize: 10 },
          axis: { ticks: { text: { fill: textColor } } },
          grid: { line: { stroke: gridColor, strokeWidth: 1 } },
        }}
      />
    </div>
  )
})

const MockRadarChart = memo(function MockRadarChart() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const data = useMemo(() => [
    { category: "Income", "2025": 85, "2024": 70 },
    { category: "Food", "2025": 65, "2024": 80 },
    { category: "Rent", "2025": 90, "2024": 75 },
    { category: "Transport", "2025": 45, "2024": 60 },
    { category: "Bills", "2025": 55, "2024": 50 },
    { category: "Shopping", "2025": 70, "2024": 55 },
  ], [])

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
        animate={true}
        motionConfig="gentle"
      />
    </div>
  )
})

const MockHorizontalBar = memo(function MockHorizontalBar() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const data = useMemo(() => [
    { category: "Groceries", amount: 1850 },
    { category: "Rent", amount: 3200 },
    { category: "Transport", amount: 780 },
    { category: "Dining", amount: 620 },
    { category: "Shopping", amount: 450 },
    { category: "Bills", amount: 920 },
  ], [])

  return (
    <div className="w-full h-full">
      <ResponsiveBar
        data={data}
        keys={["amount"]}
        indexBy="category"
        layout="horizontal"
        margin={{ top: 5, right: 10, bottom: 5, left: 55 }}
        padding={0.4}
        colors={({ index }) => palette[index % palette.length]}
        borderRadius={4}
        enableLabel={false}
        axisBottom={null}
        axisLeft={{ tickSize: 0, tickPadding: 6 }}
        enableGridX={false}
        tooltip={() => null}
        theme={{
          text: { fill: textColor, fontSize: 9 },
          axis: { ticks: { text: { fill: textColor } } },
        }}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  )
})

const MockDualArea = memo(function MockDualArea() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    return months.map((m, i) => ({
      month: m,
      income: 3500 + Math.sin(i) * 500,
      expenses: 2800 + Math.cos(i) * 400,
    }))
  }, [])

  const chartData = mounted ? data : data.map(d => ({ ...d, income: 0, expenses: 0 }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="mockGradIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={palette[0]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={palette[0]} stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="mockGradExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={palette[2]} stopOpacity={0.6} />
              <stop offset="95%" stopColor={palette[2]} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={false} />
          <YAxis hide />
          <Area type="monotone" dataKey="income" stroke={palette[0]} fill="url(#mockGradIncome)" strokeWidth={1.5} isAnimationActive={true} animationDuration={1000} />
          <Area type="monotone" dataKey="expenses" stroke={palette[2]} fill="url(#mockGradExpenses)" strokeWidth={1.5} isAnimationActive={true} animationDuration={1000} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
})

const MockStackedBar = memo(function MockStackedBar() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = getChartAxisLineColor(isDark)

  const data = useMemo(() => [
    { month: "Jan", income: 4200, expenses: 3100 },
    { month: "Feb", income: 3800, expenses: 2900 },
    { month: "Mar", income: 4500, expenses: 3400 },
    { month: "Apr", income: 4100, expenses: 3000 },
    { month: "May", income: 4300, expenses: 3200 },
    { month: "Jun", income: 4600, expenses: 3100 },
  ], [])

  return (
    <div className="w-full h-full">
      <ResponsiveBar
        data={data}
        keys={["income", "expenses"]}
        indexBy="month"
        margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
        padding={0.25}
        groupMode="stacked"
        colors={[palette[0], palette[2]]}
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
        animate={true}
        motionConfig="gentle"
      />
    </div>
  )
})

const MockSparkline = memo(function MockSparkline() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  const data = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      day: i,
      value: 1200 + Math.sin(i * 0.5) * 400 + i * 80,
    }))
  }, [])

  const chartData = mounted ? data : data.map(d => ({ ...d, value: 1200 }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <Line type="monotone" dataKey="value" stroke={palette[0]} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1500} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})

const MockRechartsBar = memo(function MockRechartsBar() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    return months.map((m, i) => ({
      month: m,
      value: 300 + Math.sin(i * 1.1) * 150 + i * 40,
    }))
  }, [])

  const chartData = mounted ? data : data.map(d => ({ ...d, value: 0 }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={false} />
          <YAxis hide />
          <Bar dataKey="value" fill={palette[0]} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

const MockNivoLine = memo(function MockNivoLine() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const data = useMemo(() => {
    const points1: Array<{ x: number; y: number }> = []
    const points2: Array<{ x: number; y: number }> = []
    for (let i = 0; i < 12; i++) {
      points1.push({ x: i, y: 50 + Math.sin(i * 0.6) * 30 + i * 3 })
      points2.push({ x: i, y: 40 + Math.cos(i * 0.8) * 25 + i * 2 })
    }
    return [
      { id: "Trend A", data: points1 },
      { id: "Trend B", data: points2 },
    ]
  }, [])

  return (
    <div className="w-full h-full">
      <ResponsiveLine
        data={data}
        margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
        xScale={{ type: "linear", min: 0, max: 11 }}
        curve="natural"
        colors={[palette[0], palette[3]]}
        lineWidth={2}
        enablePoints={false}
        enableGridX={false}
        enableGridY={false}
        enableArea={true}
        areaOpacity={0.15}
        axisBottom={{ tickSize: 0, tickPadding: 8 }}
        axisLeft={null}
        tooltip={() => null}
        animate={true}
        motionConfig="gentle"
        theme={{
          text: { fill: textColor, fontSize: 10 },
          axis: { ticks: { text: { fill: textColor } } },
        }}
      />
    </div>
  )
})

const MockRechartsMultiLine = memo(function MockRechartsMultiLine() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])

  const data = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
    return months.map((m, i) => ({
      month: m,
      line1: 200 + Math.sin(i * 0.9) * 80 + i * 25,
      line2: 180 + Math.cos(i * 0.7) * 60 + i * 15,
      line3: 150 + Math.sin(i * 1.3) * 50 + i * 10,
    }))
  }, [])

  const chartData = mounted ? data : data.map(d => ({ ...d, line1: 0, line2: 0, line3: 0 }))

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={false} />
          <YAxis hide />
          <Line type="monotone" dataKey="line1" stroke={palette[0]} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1200} />
          <Line type="monotone" dataKey="line2" stroke={palette[2]} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1200} />
          <Line type="monotone" dataKey="line3" stroke={palette[4]} strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1200} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})

// ─── Chart Config ──────────────────────────────────────────────────────────
// 12 cards total → clean 4 rows × 3 columns on sm+

const chartSlots = [
  { key: "stacked-area", title: "Stacked Area", height: 380, Component: MockStackedArea },
  { key: "pie", title: "Expense Breakdown", height: 280, Component: MockPieChart },
  { key: "grouped-bar", title: "Spending by Category", height: 300, Component: MockGroupedBar },
  { key: "burndown", title: "Budget Burndown", height: 340, Component: MockBurndownLine },
  { key: "radar", title: "Financial Health", height: 300, Component: MockRadarChart },
  { key: "h-bar", title: "Top Categories", height: 260, Component: MockHorizontalBar },
  { key: "dual-area", title: "Cash Flow", height: 320, Component: MockDualArea },
  { key: "stacked-bar", title: "Monthly Overview", height: 300, Component: MockStackedBar },
  { key: "sparkline", title: "Net Savings", height: 180, Component: MockSparkline },
  { key: "recharts-bar", title: "Weekly Trend", height: 280, Component: MockRechartsBar },
  { key: "nivo-line", title: "Spending Trends", height: 300, Component: MockNivoLine },
  { key: "multi-line", title: "Category Lines", height: 320, Component: MockRechartsMultiLine },
] as const

// ─── Main Component ────────────────────────────────────────────────────────

export function ChartsShowcase() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport so we can render a 1-column layout with only the first
  // few charts visible, and surface the rest behind the CTA underneath.
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(max-width: 639px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const visibleSlots = isMobile ? chartSlots.slice(0, MOBILE_CHART_LIMIT) : chartSlots
  const hiddenCount = chartSlots.length - visibleSlots.length

  return (
    <section ref={ref} className="py-48 px-4 relative overflow-hidden">
      <div className="bg-primary absolute -top-10 left-1/2 h-16 w-44 -translate-x-1/2 rounded-full opacity-40 blur-3xl select-none pointer-events-none"></div>
      <div className="via-primary/50 absolute top-0 left-1/2 h-px w-3/5 -translate-x-1/2 bg-gradient-to-r from-transparent to-transparent pointer-events-none"></div>
      <div className="max-w-7xl mx-auto p-6 lg:p-12">
        {/* Header */}
        <m.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className={cn(
              "mb-4 text-center text-4xl font-semibold tracking-tighter text-foreground md:text-[54px] md:leading-[60px]",
              geist.className,
            )}
          >
            Scattered financial
            <br />
            data into visual insights
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Trakzi brings flexibility to your analysis. From detailed transaction tables to dynamic charts, visualize
            your spending exactly the way you need.
          </p>
        </m.div>

        {/* Mobile: 1 column of full-width chart cards. Desktop: masonry grid. */}
        <FollowerPointerCard
          title={
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>You</span>
            </div>
          }
        >
          <div className="cursor-none">
            {/* Mobile: stacked single column */}
            <div className="flex flex-col gap-3 sm:hidden">
              {visibleSlots.map((slot, index) => {
                const ChartComponent = slot.Component
                return (
                  <m.div
                    key={slot.key}
                    className="rounded-lg border border-border overflow-hidden hover:border-foreground/20 transition-all duration-200 group"
                    style={{ backgroundColor: "var(--card)" }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                  >
                    <div className="p-4 pb-2">
                      <span className="text-xs font-medium text-muted-foreground">{slot.title}</span>
                    </div>
                    <div className="px-4 pb-4" style={{ height: 240 }}>
                      <ChartComponent />
                    </div>
                  </m.div>
                )
              })}
            </div>

            {/* Desktop: masonry grid */}
            <div className="hidden sm:grid sm:grid-cols-3 auto-rows-[20px] gap-3">
              {chartSlots.map((slot, index) => {
                const ChartComponent = slot.Component
                const spanRows = Math.ceil(slot.height / 20)
                return (
                  <m.div
                    key={slot.key}
                    className="rounded-lg border border-border overflow-hidden hover:border-foreground/20 transition-all duration-200 group"
                    style={{
                      gridRowEnd: `span ${spanRows}`,
                      backgroundColor: "var(--card)",
                    }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                  >
                    <div className="p-4 pb-2">
                      <span className="text-xs font-medium text-muted-foreground">{slot.title}</span>
                    </div>
                    <div className="px-4 pb-4" style={{ height: "calc(100% - 40px)" }}>
                      <ChartComponent />
                    </div>
                  </m.div>
                )
              })}
            </div>
          </div>
        </FollowerPointerCard>

        <div className="flex justify-center mt-12">
          <button
            type="button"
            className="group relative z-[60] mx-auto rounded-full border border-white/20 bg-white/5 px-6 py-2 text-sm backdrop-blur transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-100"
          >
            <div className="absolute inset-x-0 -top-px mx-auto h-0.5 w-1/2 bg-gradient-to-r from-transparent via-[#e78a53] to-transparent shadow-2xl transition-all duration-500 group-hover:w-3/4"></div>
            <div className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-1/2 bg-gradient-to-r from-transparent via-[#e78a53] to-transparent shadow-2xl transition-all duration-500 group-hover:h-px"></div>
            <span className="relative text-white">
              {isMobile && hiddenCount > 0
                ? `And ${hiddenCount} more charts`
                : "And a lot more charts"}
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
