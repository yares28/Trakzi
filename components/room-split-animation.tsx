"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { Users, Receipt, Check } from "lucide-react"

type Phase = "room" | "adding" | "expense" | "balance" | "done"

const MEMBERS = [
  { name: "You", color: "#e78a53" },
  { name: "Alex", color: "#6366f1" },
  { name: "Sam", color: "#10b981" },
]

export function RoomSplitAnimation() {
  const [phase, setPhase] = useState<Phase>("room")
  const [visibleMembers, setVisibleMembers] = useState(0)
  const [expenseAdded, setExpenseAdded] = useState(false)

  useEffect(() => {
    const cycle = () => {
      setPhase("room")
      setVisibleMembers(0)
      setExpenseAdded(false)

      setTimeout(() => setPhase("adding"), 1200)
      setTimeout(() => setVisibleMembers(1), 1800)
      setTimeout(() => setVisibleMembers(2), 2400)
      setTimeout(() => setPhase("expense"), 3200)
      setTimeout(() => setExpenseAdded(true), 4000)
      setTimeout(() => setPhase("balance"), 4500)
      setTimeout(() => setPhase("done"), 5800)
    }

    cycle()
    const interval = setInterval(cycle, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 h-full min-h-[300px]">
      {/* Room card */}
      <motion.div
        className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 p-5"
        animate={{ borderColor: phase === "room" ? "rgba(231,138,83,0.3)" : "rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-[#e78a53]" />
          <span className="text-sm font-semibold text-white">Apartment</span>
          <span className="text-xs text-muted-foreground ml-auto">Room</span>
        </div>

        {/* Members */}
        <div className="space-y-2">
          {MEMBERS.slice(0, Math.max(1, visibleMembers)).map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: i * 0.4, duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: member.color }}>
                {member.name[0]}
              </div>
              <span className="text-xs text-white/70">{member.name}</span>
              {i === 0 && <span className="text-[10px] text-muted-foreground ml-auto">You</span>}
            </motion.div>
          ))}
          {visibleMembers < 2 && phase === "adding" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-white/20" />
              <span className="text-xs text-muted-foreground">Adding...</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Expense card */}
      <AnimatePresence>
        {(phase === "expense" || phase === "balance" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-[#e78a53]" />
              <span className="text-xs text-muted-foreground">New Expense</span>
              {expenseAdded && <Check className="h-3 w-3 text-emerald-400 ml-auto" />}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Groceries</p>
                <p className="text-xs text-muted-foreground">Split equally</p>
              </div>
              <p className="text-lg font-bold text-white">€45.00</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance preview */}
      <AnimatePresence>
        {(phase === "balance" || phase === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-xs text-muted-foreground mb-3">Balances</p>
            {MEMBERS.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: member.color }}>
                    {member.name[0]}
                  </div>
                  <span className="text-xs text-white/70">{member.name}</span>
                </div>
                <span className={`text-xs font-medium ${i === 0 ? "text-emerald-400" : "text-[#e78a53]"}`}>
                  {i === 0 ? "+€30.00" : "-€15.00"}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
