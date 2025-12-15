"use client"

import type React from "react"

import { motion, useInView } from "framer-motion"
import { useRef, useState, useEffect } from "react"
import { TrendingUp, BarChart3, PieChart, ScatterChart, AreaChart, Grid3X3 } from "lucide-react"
import { FollowerPointerCard } from "./following-pointer"
import { geist } from "@/lib/fonts"
import { cn } from "@/lib/utils"

// Orange color palette
const orangeColors = {
  primary: "#e78a53",
  secondary: "#eba274",
  tertiary: "#f0bc98",
  light: "#f5d5bc",
  dark: "#d4723c",
}

// Line Chart Component
function LineChartAnimation() {
  const [animate, setAnimate] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-50px" })

  useEffect(() => {
    if (isInView) {
      setAnimate(true)
    }
  }, [isInView])

  const line1Points = [
    { x: 0, y: 60 },
    { x: 40, y: 45 },
    { x: 80, y: 55 },
    { x: 120, y: 30 },
    { x: 160, y: 40 },
    { x: 200, y: 20 },
    { x: 240, y: 35 },
  ]

  const line2Points = [
    { x: 0, y: 80 },
    { x: 40, y: 70 },
    { x: 80, y: 75 },
    { x: 120, y: 55 },
    { x: 160, y: 60 },
    { x: 200, y: 45 },
    { x: 240, y: 50 },
  ]

  const pathD1 = `M ${line1Points.map((p) => `${p.x},${p.y}`).join(" L ")}`
  const pathD2 = `M ${line2Points.map((p) => `${p.x},${p.y}`).join(" L ")}`

  return (
    <div
      ref={ref}
      className="w-full h-full p-4 cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: orangeColors.primary }} />
          <span className="text-muted-foreground">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: orangeColors.tertiary }} />
          <span className="text-muted-foreground">Last Month</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-3 text-sm font-semibold">
        <span style={{ color: orangeColors.primary }}>$4,250</span>
        <span style={{ color: orangeColors.tertiary }}>$3,890</span>
      </div>
      <svg viewBox="0 0 240 100" className="w-full h-24">
        <motion.path
          d={pathD2}
          fill="none"
          stroke={orangeColors.tertiary}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={animate ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <motion.path
          d={pathD1}
          fill="none"
          stroke={orangeColors.primary}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={animate ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
        {line1Points.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            fill={orangeColors.primary}
            initial={{ scale: 0, r: 3 }}
            animate={
              animate
                ? {
                    scale: 1,
                    r: isHovering ? 5 : 3,
                    y: isHovering ? point.y - 3 : point.y,
                  }
                : { scale: 0 }
            }
            transition={{ delay: isHovering ? i * 0.05 : 0.3 + i * 0.1, duration: 0.3 }}
          />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>Jan</span>
        <span>Feb</span>
        <span>Today</span>
      </div>
    </div>
  )
}

// Bar Chart Component
function BarChartAnimation() {
  const [animate, setAnimate] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-50px" })

  useEffect(() => {
    if (isInView) {
      setAnimate(true)
    }
  }, [isInView])

  const data = [
    { month: "Jan", groceries: 85, utilities: 60, transport: 45 },
    { month: "Feb", groceries: 70, utilities: 80, transport: 55 },
    { month: "Mar", groceries: 90, utilities: 50, transport: 70 },
  ]

  return (
    <div
      ref={ref}
      className="w-full h-full p-4 cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: orangeColors.primary }} />
          <span className="text-muted-foreground">Groceries</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: orangeColors.secondary }} />
          <span className="text-muted-foreground">Utilities</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: orangeColors.tertiary }} />
          <span className="text-muted-foreground">Transport</span>
        </div>
      </div>
      <div className="flex items-end justify-around h-28 gap-2">
        {data.map((item, monthIndex) => (
          <div key={item.month} className="flex flex-col items-center gap-1">
            <div className="flex items-end gap-1">
              <motion.div
                className="w-4 rounded-t"
                style={{ backgroundColor: orangeColors.primary }}
                initial={{ height: 0 }}
                animate={
                  animate
                    ? {
                        height: isHovering ? item.groceries + 10 : item.groceries,
                        scaleX: isHovering ? 1.1 : 1,
                      }
                    : { height: 0 }
                }
                transition={{ duration: 0.4, delay: monthIndex * 0.15, ease: "easeOut" }}
              />
              <motion.div
                className="w-4 rounded-t"
                style={{ backgroundColor: orangeColors.secondary }}
                initial={{ height: 0 }}
                animate={
                  animate
                    ? {
                        height: isHovering ? item.utilities + 10 : item.utilities,
                        scaleX: isHovering ? 1.1 : 1,
                      }
                    : { height: 0 }
                }
                transition={{ duration: 0.4, delay: monthIndex * 0.15 + 0.1, ease: "easeOut" }}
              />
              <motion.div
                className="w-4 rounded-t"
                style={{ backgroundColor: orangeColors.tertiary }}
                initial={{ height: 0 }}
                animate={
                  animate
                    ? {
                        height: isHovering ? item.transport + 10 : item.transport,
                        scaleX: isHovering ? 1.1 : 1,
                      }
                    : { height: 0 }
                }
                transition={{ duration: 0.4, delay: monthIndex * 0.15 + 0.2, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-1">{item.month}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Pie/Donut Chart Component
function PieChartAnimation() {
  const [animate, setAnimate] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-50px" })

  useEffect(() => {
    if (isInView) {
      setAnimate(true)
    }
  }, [isInView])

  const data = [
    { label: "Rent", percentage: 45, color: orangeColors.primary },
    { label: "Food", percentage: 25, color: orangeColors.secondary },
    { label: "Bills", percentage: 18, color: orangeColors.tertiary },
    { label: "Other", percentage: 12, color: orangeColors.light },
  ]

  const radius = 40
  const circumference = 2 * Math.PI * radius
  let currentOffset = 0

  return (
    <div
      ref={ref}
      className="w-full h-full p-4 cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center gap-3 mb-3 text-xs flex-wrap">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">
              {item.label} {item.percentage}%
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <motion.svg
          viewBox="0 0 100 100"
          className="w-28 h-28"
          animate={{ rotate: isHovering ? 360 : 0 }}
          transition={{ duration: 20, ease: "linear", repeat: isHovering ? Number.POSITIVE_INFINITY : 0 }}
        >
          {data.map((item, index) => {
            const strokeDasharray = (item.percentage / 100) * circumference
            const strokeDashoffset = -currentOffset
            currentOffset += strokeDasharray

            return (
              <motion.circle
                key={item.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${strokeDasharray} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={
                  animate
                    ? {
                        opacity: 1,
                        scale: isHovering ? 1.05 : 1,
                      }
                    : { opacity: 0, scale: 0.8 }
                }
                transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              />
            )
          })}
        </motion.svg>
      </div>
    </div>
  )
}

// Scatter Chart Component
function ScatterChartAnimation() {
  const [animate, setAnimate] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-50px" })

  useEffect(() => {
    if (isInView) {
      setAnimate(true)
    }
  }, [isInView])

  const datasets = [
    {
      label: "Spending",
      color: orangeColors.primary,
      points: [
        { x: 20, y: 30 },
        { x: 35, y: 45 },
        { x: 50, y: 25 },
        { x: 75, y: 55 },
        { x: 90, y: 40 },
      ],
    },
    {
      label: "Savings",
      color: orangeColors.secondary,
      points: [
        { x: 25, y: 60 },
        { x: 45, y: 70 },
        { x: 60, y: 50 },
        { x: 80, y: 75 },
        { x: 95, y: 65 },
      ],
    },
    {
      label: "Investments",
      color: orangeColors.tertiary,
      points: [
        { x: 15, y: 80 },
        { x: 40, y: 85 },
        { x: 55, y: 78 },
        { x: 70, y: 90 },
        { x: 85, y: 82 },
      ],
    },
  ]

  return (
    <div
      ref={ref}
      className="w-full h-full p-4 cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
        {datasets.map((ds) => (
          <div key={ds.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ds.color }} />
            <span className="text-muted-foreground">{ds.label}</span>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 100 100" className="w-full h-24">
        {[20, 40, 60, 80].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        ))}
        {datasets.map((ds, dsIndex) =>
          ds.points.map((point, i) => (
            <motion.circle
              key={`${ds.label}-${i}`}
              cx={point.x}
              cy={point.y}
              fill={ds.color}
              initial={{ scale: 0, opacity: 0, r: 4 }}
              animate={
                animate
                  ? {
                      scale: 1,
                      opacity: 0.85,
                      r: isHovering ? [4, 6, 4] : 4,
                    }
                  : { scale: 0, opacity: 0 }
              }
              transition={{
                delay: dsIndex * 0.2 + i * 0.08,
                duration: isHovering ? 1 : 0.4,
                ease: "backOut",
                repeat: isHovering ? Number.POSITIVE_INFINITY : 0,
              }}
            />
          )),
        )}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>$0</span>
        <span>$500</span>
        <span>$1000</span>
      </div>
    </div>
  )
}

// Area Chart Component
function AreaChartAnimation() {
  const [animate, setAnimate] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-50px" })

  useEffect(() => {
    if (isInView) {
      setAnimate(true)
    }
  }, [isInView])

  const areas = [
    {
      label: "Rent",
      color: orangeColors.primary,
      points: "0,90 40,75 80,80 120,65 160,70 200,55 240,60 240,100 0,100",
      hoverPoints: "0,85 40,68 80,72 120,55 160,60 200,45 240,50 240,100 0,100",
    },
    {
      label: "Food",
      color: orangeColors.secondary,
      points: "0,70 40,60 80,65 120,50 160,55 200,45 240,48 240,100 0,100",
      hoverPoints: "0,62 40,50 80,55 120,38 160,42 200,32 240,35 240,100 0,100",
    },
    {
      label: "Entertainment",
      color: orangeColors.tertiary,
      points: "0,50 40,45 80,50 120,38 160,42 200,35 240,38 240,100 0,100",
      hoverPoints: "0,42 40,35 80,40 120,25 160,30 200,22 240,25 240,100 0,100",
    },
  ]

  return (
    <div
      ref={ref}
      className="w-full h-full p-4 cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
        {areas.map((area) => (
          <div key={area.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: area.color }} />
            <span className="text-muted-foreground">{area.label}</span>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 240 100" className="w-full h-24">
        {areas.map((area, index) => (
          <motion.polygon
            key={area.label}
            fill={area.color}
            fillOpacity={0.6}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={
              animate
                ? {
                    opacity: 1,
                    scaleY: 1,
                    points: isHovering ? area.hoverPoints : area.points,
                  }
                : { opacity: 0, scaleY: 0 }
            }
            style={{ transformOrigin: "bottom" }}
            transition={{ duration: 0.8, delay: index * 0.2, ease: "easeOut" }}
          />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Week 1</span>
        <span>Week 2</span>
        <span>Week 3</span>
        <span>Week 4</span>
      </div>
    </div>
  )
}

// Heat Map Component
function HeatMapAnimation() {
  const [animate, setAnimate] = useState(false)
  const [heatData, setHeatData] = useState<number[]>([])
  const [mounted, setMounted] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-50px" })

  useEffect(() => {
    setMounted(true)
    // Generate data only on client to avoid hydration mismatch
    setHeatData(Array.from({ length: 24 }, () => Math.random()))
  }, [])

  useEffect(() => {
    if (isInView) {
      setAnimate(true)
    }
  }, [isInView])

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

  const getColor = (value: number) => {
    if (value > 0.8) return orangeColors.primary
    if (value > 0.6) return orangeColors.secondary
    if (value > 0.4) return orangeColors.tertiary
    if (value > 0.2) return orangeColors.light
    return "rgba(249, 115, 22, 0.15)"
  }

  return (
    <div ref={ref} className="w-full h-full p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Total Spending</span>
        <span className="text-sm font-semibold" style={{ color: orangeColors.primary }}>
          $12,450
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="grid grid-cols-6 gap-1.5 w-full max-w-full">
          {mounted && heatData.length > 0 ? (
            heatData.map((value, index) => (
              <motion.div
                key={index}
                className="w-full h-4 rounded-sm cursor-pointer"
                style={{ backgroundColor: getColor(value) }}
                initial={{ scale: 0, opacity: 0 }}
                animate={animate ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.3 }}
                transition={{
                  delay: index * 0.02,
                  duration: 0.3,
                  ease: "backOut",
                }}
              />
            ))
          ) : (
            // Placeholder during SSR to match structure
            Array.from({ length: 24 }).map((_, index) => (
              <div
                key={index}
                className="w-full h-4 rounded-sm"
                style={{ backgroundColor: "rgba(249, 115, 22, 0.15)", opacity: 0 }}
              />
            ))
          )}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  )
}

// Chart Card Component
function ChartCard({
  title,
  description,
  icon: Icon,
  children,
  delay,
}: {
  title: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  children: React.ReactNode
  delay: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="h-48 bg-background/30">{children}</div>
      <div className="p-5 border-t border-border/30">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: orangeColors.primary }} />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  )
}

export function ChartsShowcase() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const charts = [
    {
      title: "Line Chart",
      description:
        "Track income growth and spending trends over time with clear trend lines that highlight your financial progress.",
      icon: TrendingUp,
      component: <LineChartAnimation />,
    },
    {
      title: "Bar Chart",
      description:
        "Compare spending categories side by side. Perfect for visualizing monthly expenses, budget allocations, and savings goals.",
      icon: BarChart3,
      component: <BarChartAnimation />,
    },
    {
      title: "Pie Chart",
      description:
        "Break down your budget with clarity. See how each category contributes to your overall financial picture.",
      icon: PieChart,
      component: <PieChartAnimation />,
    },
    {
      title: "Scatter Chart",
      description:
        "Explore relationships between spending and saving patterns. Identify correlations and outliers in your transactions.",
      icon: ScatterChart,
      component: <ScatterChartAnimation />,
    },
    {
      title: "Area Chart",
      description:
        "Show cumulative expense trends over time. Highlight growth patterns in your spending across multiple categories.",
      icon: AreaChart,
      component: <AreaChartAnimation />,
    },
    {
      title: "Heat Map",
      description:
        "Spot spending patterns instantly. Visualize transaction intensity across time and detect areas that need attention.",
      icon: Grid3X3,
      component: <HeatMapAnimation />,
    },
  ]

  return (
    <section ref={ref} className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className={cn(
              "via-foreground mb-4 bg-gradient-to-b from-zinc-800 to-zinc-700 bg-clip-text text-center text-4xl font-semibold tracking-tighter text-transparent md:text-[54px] md:leading-[60px]",
              geist.className,
            )}
          >
            Scattered financial
            <br />
            data into visual insights
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Fullet brings flexibility to your analysis. From detailed transaction tables to dynamic charts, visualize
            your spending exactly the way you need.
          </p>
        </motion.div>

        {/* Charts Grid */}
        <FollowerPointerCard
          title={
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>You</span>
            </div>
          }
        >
          <div className="cursor-none">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {charts.map((chart, index) => (
                <ChartCard
                  key={chart.title}
                  title={chart.title}
                  description={chart.description}
                  icon={chart.icon}
                  delay={index * 0.1}
                >
                  {chart.component}
                </ChartCard>
              ))}
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
            <span className="relative text-white">And a lot more charts</span>
          </button>
        </div>
      </div>
    </section>
  )
}
