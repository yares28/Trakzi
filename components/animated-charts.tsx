"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Funnel Chart Component
function FunnelChart() {
  const data = [
    { label: "Income", value: 100, width: 100 },
    { label: "Groceries", value: 75, width: 80 },
    { label: "Utilities", value: 50, width: 60 },
    { label: "Transport", value: 30, width: 40 },
    { label: "Savings", value: 15, width: 25 },
  ]

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      {data.map((item, index) => (
        <motion.div
          key={item.label}
          className="relative flex items-center justify-center"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: `${item.width}%`, opacity: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <div
            className="h-8 rounded-sm flex items-center justify-center text-xs font-medium text-white"
            style={{
              width: "100%",
              background: `linear-gradient(90deg, rgba(231, 138, 83, ${1 - index * 0.15}) 0%, rgba(231, 138, 83, ${0.7 - index * 0.1}) 100%)`,
            }}
          >
            {item.label}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Area Bump Chart Component
function AreaBumpChart() {
  const lines = [
    { id: 1, points: [20, 40, 30, 60, 45, 70], color: "rgba(231, 138, 83, 1)" },
    { id: 2, points: [40, 25, 50, 35, 60, 40], color: "rgba(231, 138, 83, 0.7)" },
    { id: 3, points: [60, 55, 40, 50, 30, 55], color: "rgba(231, 138, 83, 0.4)" },
  ]

  const createPath = (points: number[]) => {
    const width = 200
    const height = 120
    const stepX = width / (points.length - 1)

    let path = `M 0 ${height - (points[0] / 100) * height}`

    for (let i = 1; i < points.length; i++) {
      const x = i * stepX
      const y = height - (points[i] / 100) * height
      const prevX = (i - 1) * stepX
      const prevY = height - (points[i - 1] / 100) * height
      const cpX = (prevX + x) / 2
      path += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`
    }

    return path
  }

  return (
    <svg viewBox="0 0 200 120" className="w-full h-full">
      {lines.map((line, lineIndex) => (
        <motion.path
          key={line.id}
          d={createPath(line.points)}
          fill="none"
          stroke={line.color}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: lineIndex * 0.2 }}
        />
      ))}
      {lines.map((line) =>
        line.points.map((point, i) => (
          <motion.circle
            key={`${line.id}-${i}`}
            cx={(i * 200) / (line.points.length - 1)}
            cy={120 - (point / 100) * 120}
            r="4"
            fill={line.color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
          />
        )),
      )}
    </svg>
  )
}

// TreeMap Chart Component
function TreeMapChart() {
  const data = [
    { id: 1, size: 35, x: 0, y: 0, w: 55, h: 50 },
    { id: 2, size: 25, x: 57, y: 0, w: 43, h: 50 },
    { id: 3, size: 20, x: 0, y: 52, w: 40, h: 48 },
    { id: 4, size: 12, x: 42, y: 52, w: 28, h: 48 },
    { id: 5, size: 8, x: 72, y: 52, w: 28, h: 28 },
    { id: 6, size: 5, x: 72, y: 82, w: 28, h: 18 },
  ]

  return (
    <div className="relative w-full h-full" style={{ aspectRatio: "1" }}>
      {data.map((item, index) => (
        <motion.div
          key={item.id}
          className="absolute rounded-md flex items-center justify-center text-xs font-semibold text-white"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            width: `${item.w}%`,
            height: `${item.h}%`,
            background: `rgba(231, 138, 83, ${1 - index * 0.12})`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          {item.size}%
        </motion.div>
      ))}
    </div>
  )
}

// Radial/Donut Chart Component
function RadialChart() {
  const segments = [
    { value: 35, color: "rgba(231, 138, 83, 1)" },
    { value: 25, color: "rgba(231, 138, 83, 0.8)" },
    { value: 20, color: "rgba(231, 138, 83, 0.6)" },
    { value: 15, color: "rgba(231, 138, 83, 0.4)" },
    { value: 5, color: "rgba(231, 138, 83, 0.25)" },
  ]

  let cumulativePercent = 0

  const createArcPath = (startPercent: number, endPercent: number) => {
    const start = startPercent * 3.6 - 90
    const end = endPercent * 3.6 - 90
    const startRad = (start * Math.PI) / 180
    const endRad = (end * Math.PI) / 180
    const radius = 45
    const innerRadius = 25
    const cx = 50
    const cy = 50

    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    const x3 = cx + innerRadius * Math.cos(endRad)
    const y3 = cy + innerRadius * Math.sin(endRad)
    const x4 = cx + innerRadius * Math.cos(startRad)
    const y4 = cy + innerRadius * Math.sin(startRad)

    const largeArc = endPercent - startPercent > 50 ? 1 : 0

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`
  }

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {segments.map((segment, index) => {
        const startPercent = cumulativePercent
        cumulativePercent += segment.value
        const endPercent = cumulativePercent

        return (
          <motion.path
            key={index}
            d={createArcPath(startPercent, endPercent)}
            fill={segment.color}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{ transformOrigin: "50% 50%" }}
          />
        )
      })}
      <motion.text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-[#e78a53] text-xs font-bold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        100%
      </motion.text>
    </svg>
  )
}

// Stacked Bar Chart Component
function StackedBarChart() {
  const data = [
    { label: "Q1", segments: [30, 25, 20] },
    { label: "Q2", segments: [35, 30, 15] },
    { label: "Q3", segments: [25, 35, 25] },
    { label: "Q4", segments: [40, 20, 30] },
  ]

  const colors = ["rgba(231, 138, 83, 1)", "rgba(231, 138, 83, 0.65)", "rgba(231, 138, 83, 0.35)"]

  return (
    <div className="flex items-end gap-3 h-full w-full justify-center">
      {data.map((bar, barIndex) => (
        <div key={bar.label} className="flex flex-col items-center gap-1">
          <div className="flex flex-col-reverse h-32">
            {bar.segments.map((value, segIndex) => (
              <motion.div
                key={segIndex}
                className="w-10 rounded-sm"
                style={{ backgroundColor: colors[segIndex] }}
                initial={{ height: 0 }}
                animate={{ height: `${value}%` }}
                transition={{ duration: 0.5, delay: barIndex * 0.15 + segIndex * 0.1 }}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

const charts = [
  { id: "funnel", component: FunnelChart, label: "Funnel" },
  { id: "areabump", component: AreaBumpChart, label: "Trends" },
  { id: "treemap", component: TreeMapChart, label: "TreeMap" },
  { id: "radial", component: RadialChart, label: "Radial" },
  { id: "stacked", component: StackedBarChart, label: "Stacked" },
]

export function AnimatedCharts() {
  const [activeChart, setActiveChart] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveChart((prev) => (prev + 1) % charts.length)
    }, 5000) // Slowed down from 3000ms to 5000ms
    return () => clearInterval(interval)
  }, [])

  const ActiveChartComponent = charts[activeChart].component

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="h-[200px] flex items-center justify-center p-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeChart}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }} // Slightly slower transition
            className="w-full h-full flex items-center justify-center"
          >
            <ActiveChartComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Chart type indicators */}
      <div className="flex justify-center gap-2">
        {charts.map((chart, index) => (
          <button
            key={chart.id}
            onClick={() => setActiveChart(index)}
            className={`px-3 py-1 text-xs rounded-full transition-all ${
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
