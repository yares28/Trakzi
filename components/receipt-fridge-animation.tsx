"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useMemo, useState } from "react"

type Phase = "closed" | "opening" | "open" | "receipt" | "closing" | "charts"

const PHASE_STEPS: { phase: Phase; at: number }[] = [
  { phase: "closed", at: 0 },
  { phase: "opening", at: 1800 },
  { phase: "open", at: 2600 },
  { phase: "receipt", at: 4300 },
  { phase: "closing", at: 6000 },
  { phase: "charts", at: 6900 },
]

const CYCLE_DURATION = 13000

export function ReceiptFridgeAnimation() {
  const [phase, setPhase] = useState<Phase>("closed")
  const [chartIndex, setChartIndex] = useState(0)

  useEffect(() => {
    const runCycle = () => {
      const timeouts: number[] = []
      PHASE_STEPS.forEach(({ phase, at }) => {
        timeouts.push(
          window.setTimeout(() => {
            setPhase(phase)
          }, at),
        )
      })
      timeouts.push(
        window.setTimeout(() => {
          setPhase("closed")
        }, CYCLE_DURATION - 50),
      )
    }

    runCycle()
    const interval = window.setInterval(runCycle, CYCLE_DURATION)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (phase !== "charts") return
    const id = window.setInterval(() => {
      setChartIndex((prev) => (prev + 1) % 3)
    }, 2200)
    return () => window.clearInterval(id)
  }, [phase])

  const isDoorOpen = phase === "opening" || phase === "open" || phase === "receipt"
  const isFridgeVisible = phase !== "charts"

  const fridgeTilt = useMemo(() => {
    switch (phase) {
      case "opening":
        return { rotateY: 15, rotateX: 6, scale: 1.02 }
      case "open":
        return { rotateY: 20, rotateX: 7, scale: 1.04 }
      case "receipt":
        return { rotateY: 18, rotateX: 7, scale: 1.05 }
      case "closing":
        return { rotateY: 12, rotateX: 5, scale: 1.01 }
      case "charts":
        return { rotateY: 0, rotateX: 0, scale: 1 }
      default:
        return { rotateY: 10, rotateX: 5, scale: 1 }
    }
  }, [phase])

  const { scale: fridgeScale, ...fridgeTiltTransforms } = fridgeTilt

  return (
    <div
      className="relative w-full h-[280px] flex items-center justify-center overflow-hidden"
      style={{ perspective: "1400px" }}
    >
      {/* Global glow */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        animate={{
          background:
            phase === "charts"
              ? "radial-gradient(circle at 50% 35%, oklch(0.78 0.18 60 / 0.45), transparent 70%)"
              : "radial-gradient(circle at 50% 60%, oklch(0.75 0.14 45 / 0.25), transparent 75%)",
          opacity: phase === "closed" ? 0.9 : 1,
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-soft-light [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:12px_12px]" />

      <AnimatePresence mode="wait">
        {isFridgeVisible && (
          <motion.div
            key="fridge"
            className="relative"
            initial={{ scale: 0.9, opacity: 0, rotateY: -25 }}
            animate={{ scale: fridgeScale, opacity: 1, ...fridgeTiltTransforms }}
            exit={{ scale: 0.8, opacity: 0, rotateY: 10 }}
            transition={{ type: "spring", damping: 18, stiffness: 140 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <motion.div
              className="relative w-[150px] h-[230px]"
              animate={{
                y: phase === "closed" ? [0, -3, 0] : 0,
              }}
              transition={
                phase === "closed"
                  ? { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                  : { duration: 0.4 }
              }
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-primary/60 via-primary/40 to-primary/25"
                style={{
                  transform: "translateZ(-24px)",
                  boxShadow: "inset 0 0 30px rgba(0,0,0,0.5)",
                  border: "2px solid rgba(0,0,0,0.2)",
                }}
              />

              {/* Fridge body (front frame) */}
              <div
                className="absolute inset-0 rounded-[22px] border-[3px] border-white/15 shadow-2xl bg-gradient-to-br from-primary via-primary to-primary/85 overflow-hidden"
                style={{ transform: "translateZ(0px)", transformStyle: "preserve-3d" }}
              >
                {/* Glossy streaks */}
                <div className="absolute top-4 left-7 right-10 h-20 rounded-[18px] bg-gradient-to-br from-white/45 via-white/15 to-transparent blur-[2px]" />
                <div className="absolute top-7 left-9 right-18 h-10 rounded-[16px] bg-white/25 blur-sm" />

                {/* Divider */}
                <div
                  className="absolute top-[35%] left-0 right-0 h-[7px] bg-gradient-to-r from-primary/70 via-background/30 to-primary/70 z-10"
                  style={{
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(255,255,255,0.15)",
                  }}
                />

                <FridgeDoor
                  top
                  phase={phase}
                  duration={0.75}
                  className="absolute top-0 left-0 right-0 h-[35%] rounded-t-[20px]"
                />

                <FridgeDoor
                  phase={phase}
                  duration={0.85}
                  delay={0.08}
                  className="absolute top-[35%] left-0 right-0 bottom-0 rounded-b-[20px]"
                />

                {/* INTERIOR - behind doors */}
                <AnimatePresence>
                  {isDoorOpen && (
                    <motion.div
                      key="interior"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-[9px] rounded-[16px] bg-gradient-to-b from-blue-50/95 via-blue-100/80 to-blue-200/70 dark:from-sky-900/60 dark:via-sky-950/50 dark:to-sky-900/40 shadow-inner overflow-hidden"
                      style={{ transform: "translateZ(-2px)" }}
                    >
                      <FridgeInterior phase={phase} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ground shadow */}
                <div
                  className="absolute -bottom-3 left-0 right-0 h-4 rounded-full bg-black/40 blur-xl"
                  style={{ transform: "translateZ(-26px) scale(1.2)" }}
                />
              </div>

              {/* Receipt */}
              <AnimatePresence>
                {phase === "receipt" && (
                  <motion.div
                    key="receipt"
                    className="absolute top-[32%] -left-6 w-20 h-24 z-50 origin-top-right bg-white dark:bg-slate-100 rounded-[6px] shadow-2xl"
                    initial={{ x: -40, y: -20, rotateZ: 12, opacity: 0, scale: 0.6 }}
                    animate={{
                      x: 0,
                      y: 0,
                      rotateZ: [-15, 0, 4],
                      opacity: 1,
                      scale: [0.6, 1.05, 0.95],
                    }}
                    exit={{ x: 20, y: 20, opacity: 0, rotateZ: 10, scale: 0.4 }}
                    transition={{
                      duration: 1.6,
                      ease: [0.25, 0.9, 0.3, 1.2],
                    }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <ReceiptContent />
                    <div className="absolute -bottom-[3px] left-0 right-0 flex justify-between px-[2px]">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="w-[4px] h-[3px] rounded-full bg-gray-200 dark:bg-gray-300" />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}

        {/* CHARTS PHASE */}
        {phase === "charts" && (
          <motion.div
            key="charts"
            className="relative w-[220px] h-[220px]"
            initial={{ scale: 0.7, opacity: 0, rotateY: -20 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="relative w-full h-full rounded-2xl border border-primary/35 bg-gradient-to-br from-card to-card/95 shadow-2xl overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

              <motion.div
                key={`chart-title-${chartIndex}`}
                className="relative z-10 mb-3 pt-2 text-[11px] font-semibold text-primary text-center tracking-tight"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {chartIndex === 0 && "Grocery Nutrition Snapshot"}
                {chartIndex === 1 && "Weekly Grocery Intake"}
                {chartIndex === 2 && "Meals by Category"}
              </motion.div>

              <ChartSparkles />

              <div className="relative z-10 h-[180px] px-3 pb-3 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {chartIndex === 0 && <DonutChart key="donut" />}
                  {chartIndex === 1 && <BarsChart key="bars" />}
                  {chartIndex === 2 && <StackedChart key="stacked" />}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Sub-components ---------- */

function FridgeDoor({
  phase,
  duration,
  delay = 0,
  top,
  className,
}: {
  phase: Phase
  duration: number
  delay?: number
  top?: boolean
  className: string
}) {
  const opening = phase === "opening" || phase === "open" || phase === "receipt"
  const closing = phase === "closing"

  return (
    <motion.div
      className={className + " origin-right overflow-visible"}
      animate={{
        rotateY: opening ? 140 : 0,
      }}
      transition={{
        duration: opening || closing ? duration : 0,
        ease: "easeInOut",
        delay: opening ? delay : 0,
      }}
      style={{ transformStyle: "preserve-3d", zIndex: opening ? 20 : 10 }}
    >
      {/* Door front face */}
      <div
        className={
          "absolute inset-0 border-[3px] border-white/15 bg-gradient-to-br from-primary via-primary to-primary/95 shadow-lg " +
          (top ? "rounded-t-[20px] border-b-0" : "rounded-b-[20px] border-t-0")
        }
        style={{
          boxShadow: "0 4px 12px rgba(0,0,0,0.3), inset -2px 0 8px rgba(0,0,0,0.18)",
          backfaceVisibility: "visible",
        }}
      >
        <div className={top ? "absolute top-1/2 left-3 -translate-y-1/2" : "absolute top-8 left-3"}>
          <div className="w-[4px] h-10 bg-gradient-to-r from-white/30 via-white/70 to-white/30 rounded-full shadow-lg" />
          <div className="absolute top-0 left-[6px] w-[4px] h-10 bg-gradient-to-r from-white/20 via-white/40 to-white/20 rounded-full" />
          <div className="absolute top-1 left-1 w-[4px] h-10 bg-black/20 rounded-full blur-[1px]" />
        </div>

        <div
          className={
            "absolute left-10 right-4 bg-gradient-to-b from-white/22 to-transparent rounded-lg " +
            (top ? "top-2 h-8" : "top-4 h-12")
          }
        />
      </div>

      <div
        className={
          "absolute top-0 right-0 w-[12px] h-full bg-gradient-to-l from-primary/75 via-primary/90 to-primary " +
          (top ? "rounded-tr-[20px]" : "rounded-br-[20px]")
        }
        style={{
          transform: "rotateY(-90deg) translateX(6px)",
          transformOrigin: "right center",
          boxShadow: "inset 2px 0 5px rgba(0,0,0,0.35)",
        }}
      />

      {/* Inner door face (visible when open) */}
      <div
        className={
          "absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 " +
          (top ? "rounded-t-[20px]" : "rounded-b-[20px]")
        }
        style={{
          transform: "rotateY(180deg) translateZ(1px)",
          backfaceVisibility: "hidden",
        }}
      >
        {/* Door shelves */}
        <div className="absolute inset-2 flex flex-col justify-around">
          <div className="h-2 mx-2 rounded bg-white/30 dark:bg-white/10" />
          <div className="h-2 mx-2 rounded bg-white/30 dark:bg-white/10" />
        </div>
      </div>
    </motion.div>
  )
}

function FridgeInterior({ phase }: { phase: Phase }) {
  const highlightPulse = phase === "open" || phase === "receipt"

  return (
    <div className="relative w-full h-full p-2">
      {/* Shelf lines */}
      <div className="absolute inset-x-2 top-[28%] border-t border-white/40" />
      <div className="absolute inset-x-2 top-[56%] border-t border-white/40" />

      {/* Cold glow */}
      {highlightPulse && (
        <motion.div
          className="absolute inset-1 rounded-[14px] bg-gradient-to-b from-white/50 via-transparent to-sky-300/40 blur-xl"
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      )}

      {/* TOP SHELF – Vegetables */}
      <div className="relative flex gap-2 mb-1 items-end pt-1 px-2 justify-between">
        {/* Lettuce */}
        <motion.div
          className="relative w-6 h-5"
          initial={{ scale: 0, rotateZ: -15, y: 4 }}
          animate={{ scale: 1, rotateZ: 0, y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 18 }}
          title="Lettuce"
        >
          <div className="w-6 h-5 rounded-full bg-green-500 overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-700 opacity-90" />
            <div className="absolute top-1 left-1.5 w-2.5 h-2.5 rounded-full bg-green-300/90" />
          </div>
        </motion.div>

        {/* Broccoli */}
        <motion.div
          className="relative w-5 h-6"
          initial={{ scale: 0, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.28, type: "spring", stiffness: 210, damping: 16 }}
          title="Broccoli"
        >
          <div className="absolute bottom-0 mx-auto left-0 right-0 w-2.5 h-2.5 bg-emerald-800 rounded-[3px]" />
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-around">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-inner" />
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-inner" />
          </div>
        </motion.div>

        {/* Carrot */}
        <motion.div
          className="relative w-4 h-6"
          initial={{ scale: 0, y: -4 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.36, type: "spring", stiffness: 210, damping: 16 }}
          title="Carrot"
        >
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-5 bg-orange-500 shadow-sm"
            style={{ clipPath: "polygon(50% 100%, 0% 30%, 100% 30%)" }}
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-600">
            <div className="absolute -top-1 left-0 w-1 h-2 bg-green-600 -rotate-12" />
            <div className="absolute -top-1 right-0 w-1 h-2 bg-green-600 rotate-12" />
          </div>
        </motion.div>

        {/* Apple */}
        <motion.div
          className="relative w-5 h-5"
          initial={{ scale: 0, rotateZ: 20 }}
          animate={{ scale: 1, rotateZ: 0 }}
          transition={{ delay: 0.44, type: "spring", stiffness: 200, damping: 18 }}
          title="Apple"
        >
          <div className="w-5 h-5 rounded-full bg-red-500 overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-700" />
            <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-200/70" />
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-800" />
          </div>
        </motion.div>
      </div>

      {/* MIDDLE SHELF – Protein & Dairy */}
      <div className="relative flex gap-2 mb-1 items-center pt-7 px-2 justify-between">
        {/* Steak */}
        <motion.div
          className="relative w-9 h-5 rounded-md overflow-hidden"
          initial={{ scale: 0, x: -10 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ delay: 0.52, type: "spring", stiffness: 180, damping: 16 }}
          title="Steak"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-800 to-red-900" />
          <div className="absolute inset-[2px] rounded bg-gradient-to-br from-red-500/60 via-red-600/40 to-transparent" />
          <div className="absolute top-1 left-1 w-3 h-1 bg-pink-200/50 rounded-full" />
        </motion.div>

        {/* Cheese */}
        <motion.div
          className="relative w-6 h-5"
          initial={{ scale: 0, rotateZ: -10 }}
          animate={{ scale: 1, rotateZ: 0 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 18 }}
          title="Cheese"
        >
          <div
            className="w-6 h-5 bg-yellow-400 shadow-sm"
            style={{ clipPath: "polygon(0% 100%, 100% 100%, 100% 20%, 50% 0%, 0% 20%)" }}
          >
            <div className="absolute top-2 left-1 w-1.5 h-1.5 rounded-full bg-yellow-600/50" />
            <div className="absolute top-3 right-2 w-1 h-1 rounded-full bg-yellow-600/50" />
          </div>
        </motion.div>

        {/* Milk */}
        <motion.div
          className="relative w-5 h-7"
          initial={{ scale: 0, y: 5 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.68, type: "spring", stiffness: 200, damping: 18 }}
          title="Milk"
        >
          <div className="w-5 h-7 bg-white rounded-[3px] shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-blue-500 rounded-t-[3px]" />
            <div className="absolute top-2 left-1 right-1 bottom-1 bg-gradient-to-b from-blue-100 to-white" />
          </div>
        </motion.div>
      </div>

      {/* BOTTOM SHELF – Drinks & Condiments */}
      <div className="relative flex gap-2 items-end pt-7 px-2 justify-between">
        {/* Orange Juice */}
        <motion.div
          className="relative w-5 h-8"
          initial={{ scale: 0, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.76, type: "spring", stiffness: 190, damping: 17 }}
          title="Orange Juice"
        >
          <div className="w-5 h-8 bg-orange-400 rounded-[3px] shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-600 rounded-t-[3px]" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-orange-200/70" />
          </div>
        </motion.div>

        {/* Water Bottle */}
        <motion.div
          className="relative w-4 h-9"
          initial={{ scale: 0, rotateZ: 5 }}
          animate={{ scale: 1, rotateZ: 0 }}
          transition={{ delay: 0.84, type: "spring", stiffness: 200, damping: 18 }}
          title="Water"
        >
          <div className="w-4 h-9 bg-sky-200/80 rounded-[4px] shadow-sm overflow-hidden">
            <div className="absolute top-0 left-1 right-1 h-2 bg-sky-400 rounded-t-[2px]" />
            <div className="absolute inset-1 bg-gradient-to-b from-white/60 to-sky-100/40" />
          </div>
        </motion.div>

        {/* Soda Can */}
        <motion.div
          className="relative w-4 h-6"
          initial={{ scale: 0, x: 8 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ delay: 0.92, type: "spring", stiffness: 210, damping: 16 }}
          title="Soda"
        >
          <div className="w-4 h-6 bg-red-600 rounded-[3px] shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400 rounded-t-[3px]" />
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-1 bg-white/80 rounded-full" />
          </div>
        </motion.div>

        {/* Ketchup */}
        <motion.div
          className="relative w-4 h-7"
          initial={{ scale: 0, rotateZ: -8 }}
          animate={{ scale: 1, rotateZ: 0 }}
          transition={{ delay: 1.0, type: "spring", stiffness: 200, damping: 18 }}
          title="Ketchup"
        >
          <div className="w-4 h-7 bg-red-700 rounded-t-[6px] rounded-b-[3px] shadow-sm overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-900 rounded-t-full" />
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/30 rounded-full" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function ReceiptContent() {
  return (
    <div className="p-1.5 text-[5px] text-gray-700 dark:text-gray-800 font-mono leading-tight bg-white dark:bg-slate-100 h-full w-full rounded-[6px]">
      {/* Store Header */}
      <div className="text-center mb-1">
        <div className="font-bold text-[7px] tracking-wide">FRESH MART</div>
        <div className="text-[4px] text-gray-500">123 Market Street</div>
        <div className="text-[4px] text-gray-500">Tel: (555) 123-4567</div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-gray-300 my-1" />

      {/* Date & Receipt Info */}
      <div className="flex justify-between text-[4px] text-gray-500 mb-1">
        <span>12/05/2025 14:32</span>
        <span>#0847</span>
      </div>

      {/* Items */}
      <div className="space-y-[2px]">
        <div className="flex justify-between">
          <span>Organic Spinach</span>
          <span>$4.99</span>
        </div>
        <div className="flex justify-between">
          <span>Chicken Breast</span>
          <span>$12.49</span>
        </div>
        <div className="flex justify-between">
          <span>Greek Yogurt x2</span>
          <span>$6.98</span>
        </div>
        <div className="flex justify-between">
          <span>Whole Milk 1gal</span>
          <span>$5.29</span>
        </div>
        <div className="flex justify-between">
          <span>Orange Juice</span>
          <span>$4.99</span>
        </div>
        <div className="flex justify-between">
          <span>Tomatoes lb</span>
          <span>$3.49</span>
        </div>
      </div>

      {/* Subtotal & Tax */}
      <div className="border-t border-dashed border-gray-300 mt-1 pt-1 space-y-[2px]">
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>$38.23</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Tax (8.5%)</span>
          <span>$3.25</span>
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-gray-400 mt-1 pt-1">
        <div className="flex justify-between font-bold text-[6px]">
          <span>TOTAL</span>
          <span>$41.48</span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="text-[4px] text-gray-500 mt-1 text-center">
        <div>VISA ****4582</div>
        <div>APPROVED</div>
      </div>

      {/* Barcode - more realistic */}
      <div className="mt-1.5 flex flex-col items-center">
        <div className="flex gap-[1px] h-5">
          {[2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 1, 3, 1, 2].map((w, i) => (
            <div key={i} className="bg-gray-800 dark:bg-gray-900" style={{ width: `${w}px`, height: "100%" }} />
          ))}
        </div>
        <div className="text-[4px] text-gray-500 mt-0.5 tracking-widest">4 89521 35847 2</div>
      </div>

      {/* Footer */}
      <div className="text-[4px] text-gray-400 text-center mt-1">
        <div>Thank you for shopping!</div>
        <div>Save receipt for returns</div>
      </div>
    </div>
  )
}

function ChartSparkles() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/60"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 1.5 + Math.random(),
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.3,
          }}
        />
      ))}
    </>
  )
}

/* ---- Chart Components with Nutrition Data ---- */

function DonutChart() {
  const data = [
    { label: "Vegetables", value: 35, color: "#22c55e" },
    { label: "Meat", value: 25, color: "#ef4444" },
    { label: "Dairy", value: 20, color: "#eab308" },
    { label: "Drinks", value: 20, color: "#3b82f6" },
  ]

  let cumulativePercent = 0

  return (
    <motion.div
      className="relative w-full h-full flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5 }}
    >
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        {data.map((item, i) => {
          const startPercent = cumulativePercent
          cumulativePercent += item.value
          const startAngle = startPercent * 3.6
          const endAngle = cumulativePercent * 3.6
          const largeArc = item.value > 50 ? 1 : 0

          const startX = 50 + 35 * Math.cos((Math.PI * (startAngle - 90)) / 180)
          const startY = 50 + 35 * Math.sin((Math.PI * (startAngle - 90)) / 180)
          const endX = 50 + 35 * Math.cos((Math.PI * (endAngle - 90)) / 180)
          const endY = 50 + 35 * Math.sin((Math.PI * (endAngle - 90)) / 180)

          return (
            <motion.path
              key={i}
              d={`M 50 50 L ${startX} ${startY} A 35 35 0 ${largeArc} 1 ${endX} ${endY} Z`}
              fill={item.color}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            />
          )
        })}
        <circle cx="50" cy="50" r="18" className="fill-card" />
      </svg>

      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 text-[8px]">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.value}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function BarsChart() {
  const data = [
    { day: "Mon", vegetables: 45, meat: 30, dairy: 25 },
    { day: "Tue", vegetables: 35, meat: 40, dairy: 20 },
    { day: "Wed", vegetables: 55, meat: 25, dairy: 30 },
    { day: "Thu", vegetables: 40, meat: 35, dairy: 25 },
    { day: "Fri", vegetables: 50, meat: 45, dairy: 35 },
    { day: "Sat", vegetables: 60, meat: 50, dairy: 40 },
    { day: "Sun", vegetables: 45, meat: 35, dairy: 30 },
  ]

  const maxValue = 70

  return (
    <motion.div
      className="relative w-full h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex-1 flex items-end justify-around gap-1 px-2 pb-4">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="flex gap-[2px] items-end h-24">
              <motion.div
                className="w-2 bg-green-500 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${(item.vegetables / maxValue) * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              />
              <motion.div
                className="w-2 bg-red-500 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${(item.meat / maxValue) * 100}%` }}
                transition={{ delay: i * 0.05 + 0.1, duration: 0.4 }}
              />
              <motion.div
                className="w-2 bg-yellow-500 rounded-t"
                initial={{ height: 0 }}
                animate={{ height: `${(item.dairy / maxValue) * 100}%` }}
                transition={{ delay: i * 0.05 + 0.2, duration: 0.4 }}
              />
            </div>
            <span className="text-[7px] text-muted-foreground">{item.day}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 text-[8px] pb-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-green-500" />
          <span className="text-muted-foreground">Veg</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500" />
          <span className="text-muted-foreground">Meat</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-yellow-500" />
          <span className="text-muted-foreground">Dairy</span>
        </div>
      </div>
    </motion.div>
  )
}

function StackedChart() {
  const data = [
    { meal: "Breakfast", vegetables: 20, meat: 15, dairy: 30, drinks: 35 },
    { meal: "Lunch", vegetables: 35, meat: 30, dairy: 15, drinks: 20 },
    { meal: "Dinner", vegetables: 30, meat: 40, dairy: 10, drinks: 20 },
    { meal: "Snacks", vegetables: 15, meat: 5, dairy: 25, drinks: 55 },
  ]

  return (
    <motion.div
      className="relative w-full h-full flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex-1 flex flex-col justify-center gap-2 px-3">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[8px] text-muted-foreground w-14 text-right">{item.meal}</span>
            <div className="flex-1 h-5 flex rounded overflow-hidden">
              <motion.div
                className="bg-green-500"
                initial={{ width: 0 }}
                animate={{ width: `${item.vegetables}%` }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              />
              <motion.div
                className="bg-red-500"
                initial={{ width: 0 }}
                animate={{ width: `${item.meat}%` }}
                transition={{ delay: i * 0.1 + 0.1, duration: 0.4 }}
              />
              <motion.div
                className="bg-yellow-500"
                initial={{ width: 0 }}
                animate={{ width: `${item.dairy}%` }}
                transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
              />
              <motion.div
                className="bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${item.drinks}%` }}
                transition={{ delay: i * 0.1 + 0.3, duration: 0.4 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-2 text-[8px] pb-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-green-500" />
          <span className="text-muted-foreground">Veg</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500" />
          <span className="text-muted-foreground">Meat</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-yellow-500" />
          <span className="text-muted-foreground">Dairy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-blue-500" />
          <span className="text-muted-foreground">Drinks</span>
        </div>
      </div>
    </motion.div>
  )
}
