"use client"

import { useState, useMemo, useCallback } from "react"
import { m, AnimatePresence } from "framer-motion"
import { Check, ChevronRight, Target, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type WizardStep = "category" | "amount" | "deadline" | "confirm" | "done"

const PRESET_CATEGORIES = [
  "Emergency Fund",
  "Vacation",
  "New Car",
  "Home Down Payment",
  "Education",
  "Gadget / Tech",
  "Wedding",
  "Other",
]

interface GoalWizardCardProps {
  onDismiss: () => void
  onSaved?: (goalId: number) => void
}

function calcMonthsUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.max(
    1,
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  )
}

export function GoalWizardCard({ onDismiss, onSaved }: GoalWizardCardProps) {
  const [step, setStep] = useState<WizardStep>("category")
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [savedId, setSavedId] = useState<number | null>(null)

  const effectiveCategory = category === "Other" ? customCategory : category
  const targetAmount = parseFloat(amount) || 0
  const monthsLeft = deadline ? calcMonthsUntil(deadline) : 1
  const monthlyAllocation = useMemo(
    () => (targetAmount > 0 && monthsLeft > 0 ? Math.ceil(targetAmount / monthsLeft) : 0),
    [targetAmount, monthsLeft]
  )

  const minDeadline = useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().split("T")[0]
  }, [])

  const handleSave = useCallback(async () => {
    if (!effectiveCategory || targetAmount <= 0 || !deadline) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/chat/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: effectiveCategory,
          target_amount: targetAmount,
          deadline,
          monthly_allocation: monthlyAllocation,
          label: effectiveCategory,
        }),
      })
      if (res.ok) {
        const data = await res.json() as { id: number }
        setSavedId(data.id)
        setStep("done")
        onSaved?.(data.id)
      }
    } catch { /* ignore */ }
    finally { setIsSaving(false) }
  }, [effectiveCategory, targetAmount, deadline, monthlyAllocation, onSaved])

  const STEPS: WizardStep[] = ["category", "amount", "deadline", "confirm"]
  const stepIdx = STEPS.indexOf(step === "done" ? "confirm" : step)

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-auto max-w-md w-full rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm shadow-md overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Set a Savings Goal</span>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground/50 hover:text-foreground transition-colors p-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step indicators */}
      {step !== "done" && (
        <div className="flex gap-1 px-4 pt-3 pb-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i <= stepIdx ? "bg-primary" : "bg-border/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4 min-h-[160px]">
        <AnimatePresence mode="wait" initial={false}>
          {step === "category" && (
            <m.div
              key="category"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-sm font-medium mb-3">What are you saving for?</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs border transition-all duration-150",
                      category === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/50 hover:border-primary/40 hover:bg-muted/50"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {category === "Other" && (
                <input
                  autoFocus
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Describe your goal…"
                  className="w-full rounded-xl border border-border/50 bg-background/80 px-3 py-2 text-sm outline-none focus:border-primary/50 mb-2"
                  maxLength={100}
                />
              )}
              <Button
                size="sm"
                disabled={!effectiveCategory.trim()}
                onClick={() => setStep("amount")}
                className="w-full mt-1"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </m.div>
          )}

          {step === "amount" && (
            <m.div
              key="amount"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-sm font-medium mb-3">How much do you need?</p>
              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  autoFocus
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5,000"
                  min="1"
                  className="w-full rounded-xl border border-border/50 bg-background/80 pl-7 pr-3 py-2 text-sm outline-none focus:border-primary/50"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStep("category")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={targetAmount <= 0}
                  onClick={() => setStep("deadline")}
                  className="flex-1"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </m.div>
          )}

          {step === "deadline" && (
            <m.div
              key="deadline"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-sm font-medium mb-3">When do you want to reach it?</p>
              <input
                autoFocus
                type="date"
                value={deadline}
                min={minDeadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-background/80 px-3 py-2 text-sm outline-none focus:border-primary/50 mb-3"
              />
              {deadline && (
                <p className="text-xs text-muted-foreground mb-3">
                  That&apos;s <span className="font-semibold text-foreground">{monthsLeft} months</span> away —
                  save about <span className="font-semibold text-primary">${monthlyAllocation.toLocaleString()}/mo</span>
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStep("amount")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={!deadline}
                  onClick={() => setStep("confirm")}
                  className="flex-1"
                >
                  Review <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </m.div>
          )}

          {step === "confirm" && (
            <m.div
              key="confirm"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-sm font-medium mb-3">Review your goal</p>
              <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-sm mb-3 space-y-1.5">
                <Row label="Goal" value={effectiveCategory} />
                <Row label="Target" value={`$${targetAmount.toLocaleString()}`} />
                <Row label="Deadline" value={new Date(deadline + "T00:00:00").toLocaleDateString()} />
                <Row
                  label="Monthly"
                  value={`$${monthlyAllocation.toLocaleString()}/mo`}
                  highlight
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStep("deadline")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="flex-1"
                >
                  {isSaving ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…</>
                  ) : (
                    <>Save Goal <Check className="h-3.5 w-3.5 ml-1" /></>
                  )}
                </Button>
              </div>
            </m.div>
          )}

          {step === "done" && (
            <m.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="flex flex-col items-center justify-center text-center py-4 gap-2"
            >
              <div className="h-12 w-12 rounded-full bg-green-500/15 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-sm font-semibold">Goal saved!</p>
              <p className="text-xs text-muted-foreground">
                Save <span className="text-foreground font-medium">${monthlyAllocation.toLocaleString()}</span>/mo
                to reach your <span className="text-foreground font-medium">{effectiveCategory}</span> goal by {new Date(deadline + "T00:00:00").toLocaleDateString()}.
              </p>
              <Button size="sm" variant="outline" onClick={onDismiss} className="mt-1">
                Done
              </Button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", highlight && "text-primary")}>{value}</span>
    </div>
  )
}
