"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { Sparkles, Send, TrendingUp } from "lucide-react"

type Phase = "idle" | "typing" | "thinking" | "response" | "chart" | "done"

const QUESTION = "How much did I spend on groceries last month?"

export function AiChatDemo() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [typedChars, setTypedChars] = useState(0)

  useEffect(() => {
    const cycle = () => {
      setPhase("idle")
      setTypedChars(0)

      setTimeout(() => setPhase("typing"), 600)
      setTimeout(() => setPhase("thinking"), 3000)
      setTimeout(() => setPhase("response"), 4500)
      setTimeout(() => setPhase("chart"), 5500)
      setTimeout(() => setPhase("done"), 7000)
    }

    cycle()
    const interval = setInterval(cycle, 11000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (phase === "typing") {
      const interval = setInterval(() => {
        setTypedChars((prev) => {
          if (prev >= QUESTION.length) {
            clearInterval(interval)
            return prev
          }
          return prev + 1
        })
      }, 50)
      return () => clearInterval(interval)
    }
  }, [phase])

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 h-full min-h-[300px]">
      {/* Chat container */}
      <div className="w-full max-w-xs space-y-3">
        {/* User message */}
        <AnimatePresence>
          {(phase === "typing" || phase === "thinking" || phase === "response" || phase === "chart" || phase === "done") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end"
            >
              <div className="max-w-[85%] rounded-xl rounded-br-sm bg-[#e78a53]/10 border border-[#e78a53]/20 px-3 py-2">
                <p className="text-xs text-white/80">
                  {QUESTION.slice(0, typedChars)}
                  {phase === "typing" && typedChars < QUESTION.length && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="inline-block w-0.5 h-3 bg-[#e78a53] ml-0.5 align-middle"
                    />
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thinking indicator */}
        <AnimatePresence>
          {phase === "thinking" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="rounded-xl rounded-bl-sm bg-white/5 border border-white/10 px-3 py-2 flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-[#e78a53]" />
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#e78a53]/60"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI response */}
        <AnimatePresence>
          {(phase === "response" || phase === "chart" || phase === "done") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[90%] rounded-xl rounded-bl-sm bg-white/5 border border-white/10 px-3 py-2.5">
                <p className="text-xs text-white/70 leading-relaxed">
                  Last month you spent <span className="text-[#e78a53] font-medium">€342.50</span> on groceries. That&apos;s <span className="text-emerald-400 font-medium">12% less</span> than the previous month. Your top store was Mercadona at €156.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chart card */}
        <AnimatePresence>
          {(phase === "chart" || phase === "done") && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex justify-start"
            >
              <div className="max-w-[90%] rounded-xl rounded-bl-sm bg-white/5 border border-white/10 p-3 w-full">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3 w-3 text-[#e78a53]" />
                  <span className="text-[10px] text-muted-foreground">Grocery spending</span>
                </div>
                <div className="flex items-end gap-1 h-12">
                  {[60, 80, 45, 70, 55, 40].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        background: `linear-gradient(180deg, rgba(231,138,83,${0.8 - i * 0.1}) 0%, rgba(231,138,83,${0.4 - i * 0.05}) 100%)`,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1 text-[8px] text-muted-foreground">
                  <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <div className="w-full max-w-xs rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#e78a53] flex-shrink-0" />
        <span className="text-xs text-muted-foreground flex-1 truncate">
          {phase === "typing" ? QUESTION.slice(0, typedChars) : "Ask about your spending..."}
        </span>
        <motion.div
          animate={{ opacity: phase === "typing" ? 1 : 0.4 }}
          className="flex-shrink-0"
        >
          <Send className="h-3.5 w-3.5 text-[#e78a53]" />
        </motion.div>
      </div>
    </div>
  )
}
