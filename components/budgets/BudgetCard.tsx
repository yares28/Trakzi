"use client"

import { memo, useRef, useState } from "react"
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
  const inputRef = useRef<HTMLInputElement>(null)

  const progressPct = row.monthlyCap
    ? Math.min(150, (row.avgMonthly / row.monthlyCap) * 100)
    : 0

  const progressColor =
    row.status === 'over' ? 'bg-red-500' :
    row.status === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'

  const overPct =
    row.monthlyCap && row.monthlyCap > 0
      ? Math.abs(row.overByMonthly / row.monthlyCap) * 100
      : 0

  const dots = row.monthlySpends.slice(-MAX_DOTS)
  const showEllipsis = row.monthlySpends.length > MAX_DOTS

  async function handleSaveCap() {
    const amount = parseFloat(capInput)
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid amount")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName: row.name, budget: amount }),
      })
      if (!res.ok) {
        toast.error("Failed to update budget")
        return
      }
      onBudgetSaved()
      setEditing(false)
    } catch {
      toast.error("Network error")
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

  const periodCap = row.monthlyCap !== null ? row.monthlyCap * monthsElapsed : null

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 px-5 py-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate" style={{ color: row.color }}>
          {row.name}
        </span>
        {editing ? (
          <div className="flex items-center gap-1 shrink-0">
            <Input
              ref={inputRef}
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
            onClick={() => { setCapInput(String(row.monthlyCap ?? "")); setEditing(true) }}
          >
            {row.monthlyCap !== null ? `${formatCurrency(row.monthlyCap)}/mo` : "Set budget"}
            <Pencil className="size-3" />
          </button>
        )}
      </div>

      {row.monthlyCap !== null && (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", progressColor)}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      )}

      <p className="text-sm">
        <span className="font-semibold">{formatCurrency(row.avgMonthly)}/mo avg</span>
        {row.monthlyCap !== null && (
          <span className={cn("ml-2 text-xs",
            row.status === 'over' ? 'text-red-500' :
            row.status === 'warning' ? 'text-yellow-600' : 'text-emerald-600'
          )}>
            {row.overByMonthly > 0 ? `+${overPct.toFixed(0)}% over` : `${(100 - progressPct).toFixed(0)}% under`}
          </span>
        )}
      </p>

      {row.monthlyCap !== null && (
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span>
            {formatCurrency(row.totalSpent)} spent
            {periodCap !== null && ` / ${formatCurrency(periodCap)} cap`}
            {" "}• {monthsElapsed.toFixed(0)} mo
          </span>
          {row.monthlySpends.length > 0 && (
            <div className="flex items-center gap-1">
              <span>Over in {row.overBudgetMonths} of {row.monthlySpends.length} months</span>
              {showEllipsis && <span className="opacity-50">…</span>}
              {dots.map((s, i) => {
                const isOver = row.monthlyCap !== null && s.amount > row.monthlyCap
                return (
                  <span
                    key={i}
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
