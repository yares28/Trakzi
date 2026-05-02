"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useMemo, memo } from "react"
import {
  AreaChart, Area,
  LineChart, Line,
  ResponsiveContainer,
} from "recharts"
import { ResponsivePie } from "@nivo/pie"
import { ResponsiveBar } from "@nivo/bar"
import { useTheme } from "next-themes"
import { getChartTextColor } from "@/lib/chart-colors"

type Phase = "idle" | "scanning" | "complete"

const SCAN_DELAY_MS = 700
const SCAN_DURATION_MS = 5200
const CYCLE_MS = 12500

const ITEMS = [
  { name: "Organic Spinach", price: "$3.29", cat: "Produce", color: "#4ade80", emoji: "🥬" },
  { name: "Chicken Breast", price: "$12.49", cat: "Protein", color: "#f87171", emoji: "🍗" },
  { name: "Greek Yogurt ×2", price: "$6.98", cat: "Dairy", color: "#60a5fa", emoji: "🥛" },
  { name: "Whole Milk 1gal", price: "$5.29", cat: "Dairy", color: "#60a5fa", emoji: "🥛" },
  { name: "Tomatoes lb", price: "$3.49", cat: "Produce", color: "#4ade80", emoji: "🥬" },
  { name: "Olive Oil 750ml", price: "$9.99", cat: "Pantry", color: "#fbbf24", emoji: "🫙" },
]

const GROCERY_PALETTE = ["#fe680e", "#fe8339", "#fe9e64", "#feb98f"]

// ─── Mini Charts Panel ────────────────────────────────────────────────────

const GroceryInsightsCharts = memo(function GroceryInsightsCharts() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setMounted(true)) }, [])
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const catData = useMemo(() => [
    { id: "Produce",  label: "Produce",  value: 6.78,  color: "#fe680e" },
    { id: "Protein",  label: "Protein",  value: 12.49, color: "#fe8339" },
    { id: "Dairy",    label: "Dairy",    value: 12.27, color: "#fe9e64" },
    { id: "Pantry",   label: "Pantry",   value: 9.99,  color: "#feb98f" },
  ], [])

  const weeklyData = useMemo(() => [
    { w: "W1", v: 38.5 },
    { w: "W2", v: 51.2 },
    { w: "W3", v: 42.8 },
    { w: "W4", v: 41.5 },
  ], [])

  const trendData = useMemo(() => [
    { m: "Sep", v: 180 },
    { m: "Oct", v: 213 },
    { m: "Nov", v: 192 },
    { m: "Dec", v: 174 },
  ], [])

  const barData = useMemo(() => [
    { cat: "Protein", v: 12.49 },
    { cat: "Dairy",   v: 12.27 },
    { cat: "Pantry",  v: 9.99  },
    { cat: "Produce", v: 6.78  },
  ], [])

  const card = "rounded-lg border border-border overflow-hidden bg-card"
  const label = "block text-[9px] font-medium text-muted-foreground px-2.5 pt-2 pb-0.5"

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
      {/* Category donut — nivo */}
      <div className={card}>
        <span className={label}>Category Split</span>
        <div className="h-[calc(100%-24px)]">
          <ResponsivePie
            data={catData}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            innerRadius={0.55}
            padAngle={1}
            cornerRadius={3}
            activeOuterRadiusOffset={6}
            colors={{ datum: "data.color" }}
            borderWidth={0}
            enableArcLinkLabels={false}
            enableArcLabels={false}
            tooltip={() => null}
            theme={{ text: { fill: textColor, fontSize: 10 } }}
            animate={true}
            motionConfig="gentle"
          />
        </div>
      </div>

      {/* Weekly spend line */}
      <div className={card}>
        <span className={label}>Weekly Spend</span>
        <div className="h-[calc(100%-24px)]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mounted ? weeklyData : weeklyData.map(d => ({ ...d, v: 0 }))}
              margin={{ top: 6, right: 8, bottom: 4, left: 8 }}
            >
              <Line
                type="monotone"
                dataKey="v"
                stroke="#fe680e"
                strokeWidth={2}
                dot={{ fill: "#fe680e", r: 2.5, strokeWidth: 0 }}
                isAnimationActive={mounted}
                animationDuration={900}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly trend area */}
      <div className={card}>
        <span className={label}>Monthly Trend</span>
        <div className="h-[calc(100%-24px)]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={mounted ? trendData : trendData.map(d => ({ ...d, v: 0 }))}
              margin={{ top: 6, right: 8, bottom: 4, left: 8 }}
            >
              <defs>
                <linearGradient id="grocTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#fe680e" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#fe680e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="#fe680e"
                fill="url(#grocTrend)"
                strokeWidth={1.5}
                isAnimationActive={mounted}
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar by category — nivo */}
      <div className={card}>
        <span className={label}>By Category</span>
        <div className="h-[calc(100%-24px)]">
          <ResponsiveBar
            data={barData}
            keys={["v"]}
            indexBy="cat"
            margin={{ top: 6, right: 8, bottom: 20, left: 8 }}
            padding={0.35}
            colors={({ index }) => GROCERY_PALETTE[index % GROCERY_PALETTE.length]}
            borderRadius={4}
            enableLabel={false}
            axisBottom={{ tickSize: 0, tickPadding: 6 }}
            axisLeft={null}
            enableGridY={false}
            tooltip={() => null}
            theme={{
              text: { fill: textColor, fontSize: 9 },
              axis: { ticks: { text: { fill: textColor } } },
            }}
            animate={true}
            motionConfig="gentle"
          />
        </div>
      </div>
    </div>
  )
})

// ─── Main Component ───────────────────────────────────────────────────────

export function ReceiptScannerAnimation() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [scannedCount, setScannedCount] = useState(0)

  useEffect(() => {
    const allTimers: number[] = []

    const run = () => {
      setScannedCount(0)
      setPhase("idle")

      allTimers.push(window.setTimeout(() => setPhase("scanning"), SCAN_DELAY_MS))

      ITEMS.forEach((_, i) => {
        const delay = SCAN_DELAY_MS + ((i + 1) / ITEMS.length) * SCAN_DURATION_MS * 0.88
        allTimers.push(window.setTimeout(() => setScannedCount(i + 1), delay))
      })

      allTimers.push(
        window.setTimeout(() => setPhase("complete"), SCAN_DELAY_MS + SCAN_DURATION_MS),
      )
      allTimers.push(
        window.setTimeout(() => {
          setScannedCount(0)
          setPhase("idle")
        }, CYCLE_MS - 120),
      )
    }

    run()
    const interval = window.setInterval(run, CYCLE_MS)

    return () => {
      allTimers.forEach((t) => window.clearTimeout(t))
      window.clearInterval(interval)
    }
  }, [])

  const totalAmount = useMemo(
    () => ITEMS.reduce((s, item) => s + parseFloat(item.price.replace("$", "")), 0).toFixed(2),
    [],
  )

  const categories = useMemo(() => {
    const map: Record<string, { total: number; color: string; emoji: string }> = {}
    ITEMS.forEach((item) => {
      if (!map[item.cat]) map[item.cat] = { total: 0, color: item.color, emoji: item.emoji }
      map[item.cat].total += parseFloat(item.price.replace("$", ""))
    })
    const total = parseFloat(totalAmount)
    return Object.entries(map).map(([name, d]) => ({
      name,
      color: d.color,
      emoji: d.emoji,
      pct: Math.round((d.total / total) * 100),
    }))
  }, [totalAmount])

  const scanning = phase === "scanning"
  const complete = phase === "complete"

  return (
    <div className="relative w-full min-h-[340px] md:h-[340px] flex flex-col md:flex-row md:items-stretch gap-6 md:gap-4 px-2 md:px-4">
      {/* Ambient glow — covers both panels */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-xl"
        animate={{
          background: scanning
            ? "radial-gradient(ellipse at 20% 50%, hsl(var(--primary) / 0.08) 0%, transparent 65%)"
            : complete
              ? "radial-gradient(ellipse at 45% 50%, hsl(var(--primary) / 0.07) 0%, transparent 65%)"
              : "radial-gradient(ellipse at 30% 50%, hsl(var(--primary) / 0.03) 0%, transparent 70%)",
        }}
        transition={{ duration: 1.2 }}
      />

      {/* ── LEFT PANEL: Receipt + dots + tags/summary ── */}
      {/* On mobile, stack receipt on top and summary below so neither gets squashed. */}
      <div className="relative md:flex-[3] flex flex-col md:flex-row items-center md:justify-center gap-4 md:gap-6 min-w-0 w-full">
        {/* Receipt paper */}
        <div className="relative flex-shrink-0">
          <motion.div
            className="relative w-[165px] bg-white rounded-lg shadow-2xl overflow-hidden"
            style={{ minHeight: "300px" }}
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 text-center">
              <div className="text-[10px] font-bold tracking-[0.15em] text-gray-800">FRESH MART</div>
              <div className="text-[7.5px] text-gray-400 mt-0.5">123 Market Street · (555) 123-4567</div>
            </div>

            {/* Date */}
            <div className="px-4 pt-2 pb-1 flex justify-between text-[7.5px] text-gray-400">
              <span>12/05/2025 14:32</span>
              <span>#0847</span>
            </div>
            <div className="border-t border-dashed border-gray-200 mx-3" />

            {/* Items */}
            <div className="px-4 py-1.5">
              {ITEMS.map((item, i) => {
                const isScanned = scannedCount > i
                const isActive = scannedCount === i + 1 && scanning
                return (
                  <motion.div
                    key={item.name}
                    className="flex justify-between py-[3.5px] text-[8.5px] font-mono rounded-sm px-0.5 transition-colors duration-150"
                    animate={{
                      backgroundColor: isActive ? "rgba(231, 138, 83, 0.10)" : "transparent",
                    }}
                  >
                    <span
                      className="transition-all duration-300"
                      style={{
                        color: isScanned ? "#9ca3af" : "#374151",
                        textDecoration: isScanned ? "line-through" : "none",
                        opacity: isScanned ? 0.55 : 1,
                      }}
                    >
                      {item.name}
                    </span>
                    <span style={{ color: isScanned ? "#9ca3af" : "#374151", opacity: isScanned ? 0.55 : 1 }}>
                      {item.price}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            <div className="border-t border-dashed border-gray-200 mx-3 mt-1" />

            {/* Total */}
            <div className="px-4 pt-1.5 pb-2 flex justify-between text-[9px] font-bold text-gray-800">
              <span>TOTAL</span>
              <span>${totalAmount}</span>
            </div>

            {/* Barcode */}
            <div className="flex justify-center pb-3 mt-1 gap-[0.8px]">
              {[2, 1, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 2, 1, 3, 1, 1, 2, 1, 2, 3, 1].map((w, i) => (
                <div key={i} className="bg-gray-700 h-5" style={{ width: `${w}px` }} />
              ))}
            </div>

            {/* Scanner beam */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  key="beam"
                  className="absolute left-0 right-0 pointer-events-none z-10"
                  style={{ top: "52px" }}
                  initial={{ y: 0 }}
                  animate={{ y: 220 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: SCAN_DURATION_MS / 1000, ease: "linear" }}
                >
                  <div
                    className="h-7 w-full -mt-7"
                    style={{ background: "linear-gradient(to top, hsl(var(--primary) / 0.18), transparent)" }}
                  />
                  <div
                    className="h-[2px] w-full"
                    style={{
                      background: "linear-gradient(to right, transparent 0%, hsl(var(--primary)) 25%, hsl(var(--primary)) 75%, transparent 100%)",
                      boxShadow: "0 0 12px 3px hsl(var(--primary) / 0.55), 0 0 4px 1px hsl(var(--primary) / 0.9)",
                    }}
                  />
                  <div
                    className="h-7 w-full"
                    style={{ background: "linear-gradient(to bottom, hsl(var(--primary) / 0.18), transparent)" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Complete overlay */}
            <AnimatePresence>
              {complete && (
                <motion.div
                  key="done"
                  className="absolute inset-0 flex items-center justify-center z-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(3px)" }}
                >
                  <motion.div
                    className="flex flex-col items-center gap-2"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 20 }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: "hsl(var(--primary) / 0.12)",
                        border: "2px solid hsl(var(--primary) / 0.35)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="hsl(var(--primary))" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <div className="text-[10px] font-semibold text-primary">Analyzed</div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Torn bottom edge */}
          <div
            className="h-2 bg-white w-[165px]"
            style={{
              clipPath:
                "polygon(0% 0%, 100% 0%, 96% 100%, 92% 50%, 88% 100%, 84% 50%, 80% 100%, 76% 50%, 72% 100%, 68% 50%, 64% 100%, 60% 50%, 56% 100%, 52% 50%, 48% 100%, 44% 50%, 40% 100%, 36% 50%, 32% 100%, 28% 50%, 24% 100%, 20% 50%, 16% 100%, 12% 50%, 8% 100%, 4% 50%, 0% 100%)",
            }}
          />
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/18 rounded-full blur-lg" />
        </div>

        {/* Dot connector — vertical on desktop. Hidden on mobile (stacked layout). */}
        <motion.div
          className="hidden md:flex flex-col items-center gap-1.5 shrink-0"
          animate={{ opacity: scanning || complete ? 1 : 0.18 }}
          transition={{ duration: 0.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-[5px] h-[5px] rounded-full"
              style={{ backgroundColor: "hsl(var(--primary))" }}
              animate={
                scanning
                  ? { opacity: [0.25, 1, 0.25], scale: [0.8, 1.2, 0.8] }
                  : { opacity: 1, scale: 1 }
              }
              transition={
                scanning
                  ? { duration: 0.9, delay: i * 0.22, repeat: Infinity }
                  : { duration: 0.3 }
              }
            />
          ))}
        </motion.div>

        {/* Tags / Summary — full width on mobile, flex-1 on desktop */}
        <div className="w-full md:flex-1 min-w-0 md:h-full flex flex-col justify-center gap-2">
          <AnimatePresence mode="wait">
            {!complete ? (
              <motion.div
                key="tags"
                className="flex flex-col gap-1.5"
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
              >
                <motion.div
                  className="text-[9px] font-medium text-muted-foreground mb-0.5"
                  animate={{ opacity: scanning ? 1 : 0.4 }}
                >
                  {scanning ? "Extracting items…" : "Ready to scan"}
                </motion.div>

                {ITEMS.slice(0, scannedCount).map((item, i) => (
                  <motion.div
                    key={`${item.name}-${i}`}
                    className="flex items-center gap-2 px-3 py-[5px] rounded-full text-[10px] font-medium w-fit max-w-full"
                    style={{
                      border: `1px solid ${item.color}55`,
                      backgroundColor: `${item.color}18`,
                      color: item.color,
                    }}
                    initial={{ opacity: 0, x: -18, scale: 0.82 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  >
                    <span className="text-base leading-none">{item.emoji}</span>
                    <span className="truncate">{item.name}</span>
                    <span className="ml-auto shrink-0 text-[9px] font-mono" style={{ opacity: 0.65 }}>
                      {item.price}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="summary"
                className="flex flex-col gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {/* Total card */}
                <motion.div
                  className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 w-full"
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.35 }}
                >
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total spent</div>
                  <div className="text-2xl font-bold tabular-nums text-foreground leading-tight">${totalAmount}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{ITEMS.length} items · Fresh Mart</div>
                </motion.div>

                {/* Category bars */}
                <div className="flex flex-col gap-1.5 px-1">
                  {categories.map(({ name, color, emoji, pct }, i) => (
                    <motion.div
                      key={name}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.22 + i * 0.08 }}
                    >
                      <span className="text-[11px] leading-none w-4 shrink-0">{emoji}</span>
                      <span className="text-[10px] text-muted-foreground w-16 shrink-0 truncate">{name}</span>
                      <div className="flex-1 h-[5px] rounded-full overflow-hidden bg-white/10 min-w-0">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.28 + i * 0.08, duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{pct}%</span>
                    </motion.div>
                  ))}
                </div>

                {/* AI insight */}
                <motion.div
                  className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed w-full"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.52 }}
                >
                  <span className="text-primary font-semibold">AI: </span>
                  Produce up 18% vs. last week. Olive oil adds 24% of this week&apos;s cost.
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Vertical divider ── */}
      <div className="hidden md:block w-px bg-border/40 shrink-0 my-6" />

      {/* ── RIGHT PANEL: Mini charts grid ── */}
      <div className="hidden md:flex flex-[2] min-w-0 py-2">
        <GroceryInsightsCharts />
      </div>
    </div>
  )
}
