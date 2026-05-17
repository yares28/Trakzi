"use client"

import { memo, useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { toast } from "sonner"
import type { BudgetCategoryRow } from "@/lib/types/budgets"
import { Pencil, BarChart2 } from "lucide-react"

const MAX_DOTS = 12

interface BudgetCardProps {
  row: BudgetCategoryRow
  monthsElapsed: number
  onBudgetSaved: () => void
}

function MonthlyMiniChart({
  spends,
  cap,
  formatCurrency,
}: {
  spends: { month: string; amount: number }[]
  cap: number | null
  formatCurrency: (v: number) => string
}) {
  const recent = spends.slice(-8)
  const max = Math.max(...recent.map((s) => s.amount), cap ?? 0, 1)
  const CHART_H = 56

  if (recent.length === 0) return <p className="text-xs text-muted-foreground">No spending data yet</p>

  return (
    <div className="flex flex-col gap-2 w-48">
      <p className="text-xs font-medium">Monthly spending</p>
      <div className="relative flex items-end gap-0.5" style={{ height: CHART_H }}>
        {cap && cap > 0 && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-orange-400/60 pointer-events-none"
            style={{ bottom: `${(cap / max) * CHART_H}px` }}
          />
        )}
        {recent.map((s) => {
          const isOver = cap !== null && cap > 0 && s.amount > cap
          const barH = s.amount > 0 ? Math.max(2, (s.amount / max) * CHART_H) : 0
          return (
            <div key={s.month} className="flex flex-col items-center gap-0.5 flex-1">
              <div
                className="w-full rounded-sm"
                style={{
                  height: barH,
                  backgroundColor: s.amount === 0 ? "transparent" : isOver ? "#ef4444" : "#f97316",
                }}
              />
              <span className="text-[9px] text-muted-foreground/70 leading-none">
                {new Date(s.month + "T00:00:00").toLocaleString("default", { month: "short" })}
              </span>
            </div>
          )
        })}
      </div>
      {cap && cap > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="w-4 border-t border-dashed border-orange-400/60" />
          <span className="text-[10px] text-muted-foreground">cap: {formatCurrency(cap)}</span>
        </div>
      )}
    </div>
  )
}

export const BudgetCard = memo(function BudgetCard({ row, monthsElapsed, onBudgetSaved }: BudgetCardProps) {
  const { formatCurrency } = useCurrency()
  const [editing, setEditing] = useState(false)
  const [capInput, setCapInput] = useState(String(row.monthlyCap ?? ""))
  const [saving, setSaving] = useState(false)
  const [optimisticCap, setOptimisticCap] = useState<number | null>(null)
  const cancelRef = useRef(false)

  const displayCap = optimisticCap ?? row.monthlyCap

  const progressPct = displayCap ? Math.min(150, (row.avgMonthly / displayCap) * 100) : 0

  const progressColor =
    row.status === "over"
      ? "bg-red-500"
      : row.status === "warning"
      ? "bg-amber-400"
      : row.status === "unset"
      ? "bg-muted"
      : "bg-teal-500"

  const overPct =
    displayCap && displayCap > 0 ? Math.abs(row.overByMonthly / displayCap) * 100 : 0

  const dots = row.monthlySpends.slice(-MAX_DOTS)
  const showEllipsis = row.monthlySpends.length > MAX_DOTS

  async function handleSaveCap() {
    if (cancelRef.current) {
      cancelRef.current = false
      return
    }
    const amount = parseFloat(capInput)
    if (!Number.isFinite(amount)) {
      setCapInput(String(row.monthlyCap ?? ""))
      setEditing(false)
      return
    }
    if (amount < 0) {
      toast.error("Budget must be a positive amount")
      setCapInput(String(row.monthlyCap ?? ""))
      setEditing(false)
      return
    }
    if (amount === (row.monthlyCap ?? null)) {
      setEditing(false)
      return
    }

    setOptimisticCap(amount)
    setEditing(false)
    setSaving(true)

    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName: row.name, budget: amount }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(data.error ?? "Failed to update budget")
        setOptimisticCap(null)
        setCapInput(String(amount))
        setEditing(true)
        return
      }
      onBudgetSaved()
      setOptimisticCap(null)
    } catch {
      toast.error("Network error")
      setOptimisticCap(null)
      setCapInput(String(amount))
      setEditing(true)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      cancelRef.current = false
      void handleSaveCap()
    }
    if (e.key === "Escape") {
      cancelRef.current = true
      setCapInput(String(row.monthlyCap ?? ""))
      setEditing(false)
    }
  }

  const periodCap = displayCap !== null ? displayCap * monthsElapsed : null

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 px-5 py-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate" style={{ color: row.color }}>
          {row.name}
        </span>
        {editing ? (
          <div className="flex items-center gap-1 shrink-0">
            <Input
              type="number"
              min={0}
              step={1}
              value={capInput}
              onChange={(e) => setCapInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => void handleSaveCap()}
              className="h-7 w-24 text-right text-sm"
              autoFocus
            />
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onClick={() => {
              setCapInput(String(displayCap ?? ""))
              setEditing(true)
            }}
          >
            {saving ? (
              <span className="text-xs">saving…</span>
            ) : (
              <>
                {displayCap !== null ? `${formatCurrency(displayCap)}/mo` : "Set budget"}
                <Pencil className="size-3" />
              </>
            )}
          </button>
        )}
      </div>

      {displayCap !== null && (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", progressColor)}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      )}

      <p className="text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1 focus:outline-none group">
                <span className="font-semibold">{formatCurrency(row.avgMonthly)}/mo avg</span>
                <BarChart2 className="size-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="p-3">
              <MonthlyMiniChart
                spends={row.monthlySpends}
                cap={displayCap}
                formatCurrency={formatCurrency}
              />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {displayCap !== null && (
          <span
            className={cn(
              "ml-2 text-xs",
              row.status === "over"
                ? "text-red-500"
                : row.status === "warning"
                ? "text-amber-500"
                : "text-teal-600"
            )}
          >
            {row.overByMonthly > 0 ? `+${overPct.toFixed(0)}% over` : `-${overPct.toFixed(0)}% under`}
          </span>
        )}
      </p>

      {displayCap !== null && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span>
            {formatCurrency(row.totalSpent)} spent
            {periodCap !== null && ` / ${formatCurrency(periodCap)} cap`}
            {" "}• {Math.round(monthsElapsed)} mo
          </span>
          {row.monthlySpends.length > 0 && (
            <div className="flex items-center gap-1">
              <span>Over in {row.overBudgetMonths} of {row.monthlySpends.length} months</span>
              {showEllipsis && <span className="opacity-50">…</span>}
              {dots.map((s) => {
                const isOver = displayCap !== null && s.amount > displayCap
                return (
                  <span
                    key={s.month}
                    className={cn(
                      "inline-block size-2 rounded-full",
                      s.amount === 0 ? "bg-muted" : isOver ? "bg-red-500" : "bg-teal-500"
                    )}
                    title={`${s.month}: ${formatCurrency(s.amount)}`}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

BudgetCard.displayName = "BudgetCard"
