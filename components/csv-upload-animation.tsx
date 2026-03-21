"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { FileSpreadsheet, BarChart3, Check } from "lucide-react"

type Phase = "idle" | "uploading" | "parsing" | "charting" | "done"

const ROWS = [
  { date: "2026-03-01", desc: "Mercadona", cat: "Groceries", amt: "-€47.30" },
  { date: "2026-03-02", desc: "Metro Madrid", cat: "Transport", amt: "-€2.50" },
  { date: "2026-03-03", desc: "Netflix", cat: "Entertainment", amt: "-€13.99" },
  { date: "2026-03-04", desc: "Salary", cat: "Income", amt: "+€2,800" },
  { date: "2026-03-05", desc: "Lidl", cat: "Groceries", amt: "-€32.10" },
]

export function CsvUploadAnimation() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [visibleRows, setVisibleRows] = useState(0)
  const [barHeights, setBarHeights] = useState<number[]>([0, 0, 0, 0])

  useEffect(() => {
    const cycle = () => {
      setPhase("idle")
      setVisibleRows(0)
      setBarHeights([0, 0, 0, 0])

      setTimeout(() => setPhase("uploading"), 800)
      setTimeout(() => setPhase("parsing"), 2200)
      setTimeout(() => {
        setPhase("charting")
        setBarHeights([75, 30, 20, 90])
      }, 3800)
      setTimeout(() => setPhase("done"), 5000)
    }

    cycle()
    const interval = setInterval(cycle, 9000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (phase === "parsing") {
      const timers = ROWS.map((_, i) =>
        setTimeout(() => setVisibleRows(i + 1), i * 250)
      )
      return () => timers.forEach(clearTimeout)
    }
  }, [phase])

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 h-full min-h-[300px]">
      {/* Upload area */}
      <motion.div
        className="w-full max-w-xs rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-6 flex flex-col items-center gap-3"
        animate={{
          borderColor: phase === "uploading" ? "rgba(231,138,83,0.6)" : "rgba(255,255,255,0.2)",
        }}
      >
        <motion.div
          animate={{ y: phase === "uploading" ? [0, -8, 0] : 0 }}
          transition={{ duration: 0.8, repeat: phase === "uploading" ? Infinity : 0 }}
        >
          <FileSpreadsheet className="h-8 w-8 text-[#e78a53]" />
        </motion.div>
        <p className="text-xs text-muted-foreground">
          {phase === "idle" && "Drop your CSV here"}
          {phase === "uploading" && "Uploading..."}
          {phase === "parsing" && "Parsing columns..."}
          {phase === "charting" && "Generating charts..."}
          {phase === "done" && "Ready!"}
        </p>
      </motion.div>

      {/* Data table preview */}
      <AnimatePresence>
        {(phase === "parsing" || phase === "charting" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 overflow-hidden"
          >
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-1.5 px-2 text-left text-muted-foreground">Desc</th>
                  <th className="py-1.5 px-2 text-left text-muted-foreground">Cat</th>
                  <th className="py-1.5 px-2 text-right text-muted-foreground">Amt</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.slice(0, visibleRows).map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="border-b border-white/5"
                  >
                    <td className="py-1 px-2 text-white/70">{row.desc}</td>
                    <td className="py-1 px-2 text-[#e78a53]">{row.cat}</td>
                    <td className={`py-1 px-2 text-right ${row.amt.startsWith("+") ? "text-emerald-400" : "text-white/70"}`}>
                      {row.amt}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart preview */}
      <AnimatePresence>
        {(phase === "charting" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-[#e78a53]" />
              <span className="text-xs text-muted-foreground">Auto-generated</span>
              {phase === "done" && <Check className="h-3 w-3 text-emerald-400 ml-auto" />}
            </div>
            <div className="flex items-end justify-between gap-2 h-16">
              {["Groceries", "Transport", "Entertain.", "Income"].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                  <motion.div
                    className="w-full rounded-sm"
                    style={{
                      background: `linear-gradient(180deg, rgba(231,138,83,${0.9 - i * 0.15}) 0%, rgba(231,138,83,${0.5 - i * 0.1}) 100%)`,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeights[i]}%` }}
                    transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                  />
                  <span className="text-[8px] text-muted-foreground truncate w-full text-center">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
