"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

type Phase = "idle" | "in-flight" | "door-open" | "absorbed" | "data-reveal"

const TIMING: { phase: Phase; at: number }[] = [
  { phase: "idle", at: 0 },
  { phase: "in-flight", at: 2200 },
  { phase: "door-open", at: 3200 },
  { phase: "absorbed", at: 4600 },
  { phase: "data-reveal", at: 5400 },
]
const CYCLE = 13000

function ReceiptCard() {
  return (
    <div className="bg-white rounded-[5px] px-2 py-1.5 font-mono shadow-lg border border-gray-200/60 w-[72px]">
      <div className="font-bold text-[6.5px] text-center text-gray-800 tracking-wide">FRESH MART</div>
      <div className="border-t border-dashed border-gray-200 my-0.5" />
      {[
        ["Milk 1L", "$4.99"],
        ["Chicken", "$12.49"],
        ["Spinach", "$3.29"],
        ["Yogurt", "$5.99"],
        ["Apples", "$4.19"],
      ].map(([name, price]) => (
        <div key={name} className="flex justify-between text-[5px] text-gray-600 leading-[1.4]">
          <span>{name}</span>
          <span>{price}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-gray-200 mt-0.5 pt-0.5">
        <div className="flex justify-between text-[5.5px] font-bold text-gray-700">
          <span>TOTAL</span>
          <span>$30.95</span>
        </div>
      </div>
      <div className="flex gap-[0.5px] justify-center mt-1 h-[9px]">
        {[2, 1, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 1, 2, 1, 3, 1, 1, 2].map((w, i) => (
          <div key={i} className="bg-gray-700 h-full" style={{ width: `${w}px` }} />
        ))}
      </div>
    </div>
  )
}

function Fridge3D({ phase }: { phase: Phase }) {
  const doorOpen = phase === "door-open" || phase === "absorbed"

  return (
    <motion.div
      animate={
        doorOpen
          ? { rotateY: 18, rotateX: 6, scale: 1.03 }
          : { rotateY: 10, rotateX: 4, scale: 1 }
      }
      transition={{ type: "spring", damping: 18, stiffness: 130 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        animate={phase === "idle" ? { y: [0, -4, 0] } : { y: 0 }}
        transition={
          phase === "idle"
            ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
        className="relative w-[162px] h-[252px]"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Back depth panel */}
        <div
          className="absolute inset-0 rounded-[23px] bg-gradient-to-br from-primary/55 to-primary/28"
          style={{
            transform: "translateZ(-26px)",
            boxShadow: "inset 0 0 28px rgba(0,0,0,0.45), 6px 6px 24px rgba(0,0,0,0.28)",
          }}
        />

        {/* Body */}
        <div
          className="absolute inset-0 rounded-[23px] border-[3px] border-white/15 shadow-2xl overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/88"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Gloss */}
          <div className="absolute top-5 left-8 right-10 h-[88px] rounded-[18px] bg-gradient-to-br from-white/45 via-white/12 to-transparent blur-[2px]" />
          <div className="absolute top-8 left-10 right-16 h-10 rounded-[14px] bg-white/22 blur-sm" />

          {/* Divider bar */}
          <div
            className="absolute inset-x-0 h-[7px] bg-gradient-to-r from-primary/65 via-background/30 to-primary/65 z-10"
            style={{
              top: "37%",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(255,255,255,0.12)",
            }}
          />

          {/* Interior */}
          <AnimatePresence>
            {doorOpen && (
              <motion.div
                key="interior"
                className="absolute inset-[10px] rounded-[15px] overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{
                  background: "linear-gradient(180deg, #dbeafe 0%, #eff6ff 50%, #bfdbfe 100%)",
                  transform: "translateZ(-3px)",
                }}
              >
                <div className="absolute inset-x-2 top-[29%] h-px bg-white/60 rounded" />
                <div className="absolute inset-x-2 top-[59%] h-px bg-white/60 rounded" />
                <motion.div
                  className="absolute inset-2 rounded-[12px] bg-gradient-to-b from-white/60 via-transparent to-sky-300/45 blur-xl"
                  animate={{ opacity: [0.3, 0.65, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <div className="absolute top-3 inset-x-2 flex gap-1.5 justify-around">
                  {["🥬", "🥛", "🧀", "🍎"].map((emoji, i) => (
                    <motion.span
                      key={emoji}
                      className="text-[10px] leading-none"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.07 + 0.15, type: "spring", stiffness: 220 }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top door */}
          <motion.div
            className="absolute top-0 left-0 right-0 overflow-visible origin-right"
            style={{ height: "37%", transformStyle: "preserve-3d" }}
            animate={{ rotateY: doorOpen ? 138 : 0 }}
            transition={{ duration: 0.75, ease: "easeInOut" }}
          >
            <div
              className="absolute inset-0 rounded-t-[21px] border-[3px] border-white/15 border-b-0 bg-gradient-to-br from-primary to-primary/95"
              style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.3), inset -2px 0 8px rgba(0,0,0,0.14)" }}
            >
              <div className="absolute top-1/2 left-3 -translate-y-1/2 w-[5px] h-10 bg-gradient-to-r from-white/30 via-white/70 to-white/30 rounded-full shadow" />
              <div className="absolute top-2 left-10 right-3 h-7 rounded-lg bg-white/22" />
            </div>
            <div
              className="absolute top-0 right-0 w-[14px] h-full bg-gradient-to-l from-primary/65 to-primary/80 rounded-tr-[21px]"
              style={{
                transform: "rotateY(-90deg) translateX(7px)",
                transformOrigin: "right center",
                boxShadow: "inset 2px 0 6px rgba(0,0,0,0.32)",
              }}
            />
          </motion.div>

          {/* Bottom door */}
          <motion.div
            className="absolute left-0 right-0 bottom-0 overflow-visible origin-right"
            style={{ top: "37%", transformStyle: "preserve-3d" }}
            animate={{ rotateY: doorOpen ? 138 : 0 }}
            transition={{ duration: 0.85, delay: 0.07, ease: "easeInOut" }}
          >
            <div
              className="absolute inset-0 rounded-b-[21px] border-[3px] border-white/15 border-t-0 bg-gradient-to-br from-primary to-primary/88"
              style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.3), inset -2px 0 8px rgba(0,0,0,0.14)" }}
            >
              <div className="absolute top-6 left-3 w-[5px] h-12 bg-gradient-to-r from-white/30 via-white/70 to-white/30 rounded-full shadow" />
              <div className="absolute top-3 left-10 right-3 h-12 rounded-lg bg-white/18" />
            </div>
            <div
              className="absolute top-0 right-0 w-[14px] h-full bg-gradient-to-l from-primary/55 to-primary/72 rounded-br-[21px]"
              style={{
                transform: "rotateY(-90deg) translateX(7px)",
                transformOrigin: "right center",
                boxShadow: "inset 2px 0 6px rgba(0,0,0,0.32)",
              }}
            />
          </motion.div>
        </div>

        {/* Right side face */}
        <div
          className="absolute top-0 right-0 rounded-r-[23px] bg-gradient-to-l from-primary/50 to-primary/72"
          style={{
            width: "26px",
            height: "252px",
            transform: "rotateY(-90deg) translateX(13px)",
            transformOrigin: "right center",
            boxShadow: "inset 2px 0 8px rgba(0,0,0,0.35)",
          }}
        />

        {/* Ground shadow */}
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-44 h-6 bg-black/28 rounded-full blur-xl"
          style={{ transform: "translateZ(-30px) scaleY(0.4)" }}
        />
      </motion.div>
    </motion.div>
  )
}

export function FridgeDataShowcase() {
  const [phase, setPhase] = useState<Phase>("idle")

  useEffect(() => {
    const run = () => {
      TIMING.forEach(({ phase, at }) => window.setTimeout(() => setPhase(phase), at))
      window.setTimeout(() => setPhase("idle"), CYCLE - 100)
    }
    run()
    const id = window.setInterval(run, CYCLE)
    return () => window.clearInterval(id)
  }, [])

  const inFlight = phase === "in-flight"
  const doorOpen = phase === "door-open" || phase === "absorbed"
  const showReceipt = phase === "door-open"
  const showData = phase === "data-reveal"

  return (
    <div
      className="relative w-full h-[300px] flex items-center justify-around gap-2 px-4 overflow-hidden"
      style={{ perspective: "1300px" }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-xl"
        animate={{
          background: doorOpen
            ? "radial-gradient(ellipse at 50% 50%, oklch(0.7 0.09 212 / 0.13) 0%, transparent 72%)"
            : showData
            ? "radial-gradient(ellipse at 75% 50%, oklch(0.67 0.14 48 / 0.10) 0%, transparent 70%)"
            : "radial-gradient(ellipse at 50% 50%, oklch(0.67 0.14 48 / 0.05) 0%, transparent 72%)",
        }}
        transition={{ duration: 1.2 }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.055] [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:16px_16px]" />

      {/* LEFT: Receipt stack */}
      <div className="relative w-[100px] h-[120px] shrink-0">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2"
            style={{ top: `${i * 7}px`, zIndex: 3 - i }}
            animate={{
              opacity: inFlight && i === 0 ? 0 : 1 - i * 0.28,
              x: inFlight && i === 0 ? 110 : -36 + i * -2,
              y: inFlight && i === 0 ? -24 : i * 2,
              rotateZ: inFlight && i === 0 ? -20 : -i * 2,
              scale: inFlight && i === 0 ? 0.55 : 1 - i * 0.05,
            }}
            transition={
              inFlight && i === 0
                ? { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
                : { duration: 0.4 }
            }
          >
            <ReceiptCard />
          </motion.div>
        ))}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap"
          animate={{ opacity: inFlight ? 0.3 : 0.7 }}
        >
          Grocery receipts
        </motion.div>
      </div>

      {/* Arrow left */}
      <motion.svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        className="shrink-0 text-primary"
        animate={{ opacity: inFlight ? 1 : 0.2, x: inFlight ? [0, 5, 0] : 0 }}
        transition={{ x: { duration: 0.6, repeat: inFlight ? Infinity : 0 } }}
      >
        <path
          d="M5 12h14M15 7l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>

      {/* CENTER: Fridge */}
      <div className="relative shrink-0" style={{ transformStyle: "preserve-3d" }}>
        <Fridge3D phase={phase} />

        {/* Receipt flying near door */}
        <AnimatePresence>
          {showReceipt && (
            <motion.div
              key="flying-receipt"
              className="absolute z-50"
              style={{ top: "28%", left: "-76px" }}
              initial={{ x: -36, y: -12, rotateZ: 14, opacity: 0, scale: 0.65 }}
              animate={{ x: 0, y: 0, rotateZ: [14, 0, 4], opacity: 1, scale: [0.65, 1.05, 0.95] }}
              exit={{ x: 18, y: 14, opacity: 0, rotateZ: 8, scale: 0.4 }}
              transition={{ duration: 1.5, ease: [0.25, 0.9, 0.3, 1.15] }}
            >
              <ReceiptCard />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing pulse */}
        <AnimatePresence>
          {phase === "absorbed" && (
            <motion.div
              key="pulse"
              className="absolute inset-0 rounded-[24px] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, times: [0, 0.2, 0.5, 0.7, 1] }}
              style={{ boxShadow: "0 0 48px 10px hsl(var(--primary) / 0.38)" }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Arrow right */}
      <motion.svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        className="shrink-0 text-primary"
        animate={{ opacity: showData ? 1 : 0.18 }}
        transition={{ duration: 0.5 }}
      >
        <path
          d="M5 12h14M15 7l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>

      {/* RIGHT: Data output */}
      <div className="w-[160px] shrink-0 h-full flex items-center">
        <AnimatePresence>
          {showData && (
            <motion.div
              className="w-full flex flex-col gap-2"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <motion.p
                className="text-[10px] font-semibold text-primary tracking-tight"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                🧾 Receipt analyzed
              </motion.p>

              <motion.div
                className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2"
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.35 }}
              >
                <div className="text-[8px] text-muted-foreground">Total spent</div>
                <div className="text-xl font-bold tabular-nums text-foreground">$30.95</div>
                <div className="text-[8px] text-muted-foreground">5 items · Fresh Mart</div>
              </motion.div>

              {[
                { label: "Produce", pct: 42, color: "#4ade80" },
                { label: "Dairy", pct: 31, color: "#60a5fa" },
                { label: "Protein", pct: 27, color: "#f87171" },
              ].map(({ label, pct, color }, i) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-1.5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.09 }}
                >
                  <span className="text-[8px] text-muted-foreground w-12 shrink-0">{label}</span>
                  <div
                    className="flex-1 h-[5px] rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.35 + i * 0.09, duration: 0.55, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[8px] text-muted-foreground shrink-0">{pct}%</span>
                </motion.div>
              ))}

              <motion.div
                className="rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5 text-[8px] text-muted-foreground leading-relaxed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62, duration: 0.38 }}
              >
                <span className="text-primary font-semibold">AI: </span>
                Produce up 18% vs. last week. Great healthy week!
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
