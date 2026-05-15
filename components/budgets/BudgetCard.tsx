"use client"

import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { toast } from "sonner"
import type { BudgetCategoryRow } from "@/lib/types/budgets"
import { Pencil } from "lucide-react"

const MAX_DOTS = 12

interface BudgetCardProps {
  row: BudgetCategoryRow
  monthsElapsed: number
  onBudgetSaved: () => void
}

export const BudgetCard = memo(function BudgetCard({ row, monthsElapsed, onBudgetSaved }: BudgetCardProps) {
  const { formatCurrency } = useCurrency()
  const [editing, setEditing] = useState(false)
  const [capInput, setCapInput] = useState(String(row.monthlyCap ?? ""))
  const [saving, setSaving] = useState(false)
  const [optimisticCap, setOptimisticCap] = useState<number | null>(null)

  const displayCap = optimisticCap ?? row.monthlyCap

  const progressPct = displayCap
    ? Math.min(150, (row.avgMonthly / displayCap) * 100)
    : 0

  const progressColor =
    row.status === 'over' ? 'bg-red-500' :
    row.status === 'warning' ? 'bg-yellow-500' :
    row.status === 'unset' ? 'bg-muted' :
    'bg-emerald-500'

  const overPct =
    displayCap && displayCap > 0
      ? Math.abs(row.overByMonthly / displayCap) * 100
      : 0

  const dots = row.monthlySpends.slice(-MAX_DOTS)
  const showEllipsis = row.monthlySpends.length > MAX_DOTS

  async function handleSaveCap() {
    const amount = parseFloat(capInput)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid amount")
      return
    }

    // Optimistic update: close editor immediately and show new value
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
        const data = await res.json().catch(() => ({})) as { error?: string }
        toast.error(data.error ?? "Failed to update budget")
        // Rollback: reset optimistic value and reopen editor
        setOptimisticCap(null)
        setCapInput(String(amount))
        setEditing(true)
        return
      }
      onBudgetSaved()
      setOptimisticCap(null) // will be overwritten by parent refetch
    } catch {
      toast.error("Network error")
      // Rollback on network error
      setOptimisticCap(null)
      setCapInput(String(amount))
      setEditing(true)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void handleSaveCap()
    if (e.key === "Escape") {
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
              className="h-7 w-24 text-right text-sm"
              autoFocus
            />
            <span className="text-xs text-muted-foreground">/mo</span>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void handleSaveCap()} disabled={saving}>
              {saving ? "…" : "Save"}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            onClick={() => { setCapInput(String(displayCap ?? "")); setEditing(true) }}
          >
            {displayCap !== null ? `${formatCurrency(displayCap)}/mo` : "Set budget"}
            <Pencil className="size-3" />
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
        <span className="font-semibold">{formatCurrency(row.avgMonthly)}/mo avg</span>
        {displayCap !== null && (
          <span className={cn("ml-2 text-xs",
            row.status === 'over' ? 'text-red-500' :
            row.status === 'warning' ? 'text-yellow-600' : 'text-emerald-600'
          )}>
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
                      s.amount === 0 ? "bg-muted" : isOver ? "bg-red-500" : "bg-emerald-500"
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
