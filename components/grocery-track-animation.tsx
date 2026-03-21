"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { Camera, Check, BarChart3 } from "lucide-react"

type Phase = "idle" | "scanning" | "extracted" | "charting" | "done"

export function GroceryTrackAnimation() {
  const [phase, setPhase] = useState<Phase>("idle")

  useEffect(() => {
    const cycle = () => {
      setPhase("idle")
      setTimeout(() => setPhase("scanning"), 800)
      setTimeout(() => setPhase("extracted"), 2800)
      setTimeout(() => setPhase("charting"), 4200)
      setTimeout(() => setPhase("done"), 5500)
    }

    cycle()
    const interval = setInterval(cycle, 9000)
    return () => clearInterval(interval)
  }, [])

  const categories = [
    { name: "Produce", pct: 35, color: "rgba(231,138,83,0.9)" },
    { name: "Dairy", pct: 25, color: "rgba(231,138,83,0.7)" },
    { name: "Meat", pct: 20, color: "rgba(231,138,83,0.5)" },
    { name: "Household", pct: 20, color: "rgba(231,138,83,0.3)" },
  ]

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 h-full min-h-[300px]">
      {/* Receipt scanning */}
      <motion.div
        className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 p-5 relative overflow-hidden"
        animate={{
          borderColor: phase === "scanning" ? "rgba(231,138,83,0.5)" : "rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-4 w-4 text-[#e78a53]" />
          <span className="text-xs text-muted-foreground">
            {phase === "idle" && "Point camera at receipt"}
            {phase === "scanning" && "Scanning..."}
            {(phase === "extracted" || phase === "charting" || phase === "done") && "Receipt scanned"}
          </span>
          {phase === "done" && <Check className="h-3 w-3 text-emerald-400 ml-auto" />}
        </div>

        {/* Receipt mockup */}
        <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
          {["Tomatoes x4", "Whole Milk 1L", "Chicken Breast", "Olive Oil 500ml", "Bread (whole grain)"].map((item, i) => (
            <motion.div
              key={item}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== "idle" ? 1 : 0.2 }}
              transition={{ delay: phase === "scanning" ? i * 0.4 : 0, duration: 0.3 }}
              className="flex items-center justify-between text-[10px]"
            >
              <span className="text-white/60">{item}</span>
              <span className="text-white/40">
                {["€3.20", "€1.45", "€6.80", "€4.50", "€1.80"][i]}
              </span>
            </motion.div>
          ))}
          <div className="border-t border-white/10 pt-1.5 mt-1.5 flex items-center justify-between text-[10px]">
            <span className="text-white font-medium">Total</span>
            <motion.span
              className="text-[#e78a53] font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== "idle" ? 1 : 0 }}
              transition={{ delay: 1.5 }}
            >
              €17.75
            </motion.span>
          </div>
        </div>

        {/* Scan line animation */}
        {phase === "scanning" && (
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-[#e78a53]/60"
            initial={{ top: "30%" }}
            animate={{ top: ["30%", "80%", "30%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      {/* Category chart */}
      <AnimatePresence>
        {(phase === "charting" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-[#e78a53]" />
              <span className="text-xs text-muted-foreground">This week</span>
            </div>
            <div className="space-y-2.5">
              {categories.map((cat, i) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/60">{cat.name}</span>
                    <span className="text-white/40">{cat.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
