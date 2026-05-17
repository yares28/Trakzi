"use client"

import { memo, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import { useCurrency } from "@/components/currency-provider"
import { toast } from "sonner"
import type { BudgetCategoryRow } from "@/lib/types/budgets"
import { categoryColorCss } from "@/lib/colors/category-color"
import { Pencil, TrendingUp, TrendingDown, Minus } from "lucide-react"

const CHART_H = 64 // px of bar area inside the popover chart

interface BudgetCardProps {
  row: BudgetCategoryRow
  onBudgetSaved: () => void
}

// 80th percentile — more realistic cap suggestion than max×1.1
function p80(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length * 0.8)] ?? sorted[sorted.length - 1]
}

// Accepts "$50", "1,500", "1k", "1.5k", "300" → number (NaN on failure)
function parseCurrencyInput(raw: string): number {
  const cleaned = raw.trim().replace(/[$,\s]/g, "").toLowerCase()
  if (!cleaned) return NaN
  const kMatch = cleaned.match(/^([\d.]+)k$/)
  if (kMatch) return parseFloat(kMatch[1]) * 1000
  return parseFloat(cleaned)
}

interface SpendingChartProps {
  spends: { month: string; amount: number }[]
  cap: number | null
  avg: number
  formatCurrency: (v: number) => string
  onPickAmount: (amount: number) => void
}

function SpendingChart({
  spends,
  cap,
  avg,
  formatCurrency,
  onPickAmount,
}: SpendingChartProps) {
  const recent = spends.slice(-6)
  const nonZero = recent.filter((s) => s.amount > 0).map((s) => s.amount)
  const maxAmount = Math.max(...recent.map((s) => s.amount), cap ?? 0, 1)
  const high = nonZero.length > 0 ? Math.max(...nonZero) : 0
  const low = nonZero.length > 0 ? Math.min(...nonZero) : 0
  const overCount = cap ? recent.filter((s) => s.amount > cap).length : 0

  // Trend: avg of last 2 months vs 2 before that
  const last2 = recent.slice(-2).map((s) => s.amount)
  const prev2 = recent.slice(-4, -2).map((s) => s.amount)
  const avgLast =
    last2.length > 0 ? last2.reduce((a, b) => a + b, 0) / last2.length : 0
  const avgPrev =
    prev2.length > 0 ? prev2.reduce((a, b) => a + b, 0) / prev2.length : 0
  const trendPct = avgPrev > 0 ? ((avgLast - avgPrev) / avgPrev) * 100 : 0
  const trendDir =
    Math.abs(trendPct) < 5 ? "flat" : trendPct > 0 ? "up" : "down"

  if (recent.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No spending data yet for this category.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Monthly spending</span>
        {trendDir !== "flat" && nonZero.length >= 3 && (
          <span
            className="flex items-center gap-0.5 text-[10px]"
            style={{
              color:
                trendDir === "up" ? "var(--destructive)" : "var(--chart-1)",
            }}
          >
            {trendDir === "up" ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {Math.abs(trendPct).toFixed(0)}% vs prior 2 mo
          </span>
        )}
        {trendDir === "flat" && nonZero.length >= 3 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Minus className="size-3" /> Stable
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground -mt-1">
        Click a month to use it as your cap.
      </p>

      <div className="relative" style={{ height: CHART_H + 28 }}>
        {cap && cap > 0 && (
          <>
            <div
              className="absolute pointer-events-none border-t border-dashed"
              style={{
                left: 0,
                right: 20,
                bottom: 18 + (cap / maxAmount) * CHART_H,
                borderColor: "var(--primary)",
                opacity: 0.6,
              }}
            />
            <span
              className="absolute text-muted-foreground leading-none"
              style={{
                fontSize: 8,
                right: 0,
                bottom: 18 + (cap / maxAmount) * CHART_H,
              }}
            >
              cap
            </span>
          </>
        )}

        <div
          className="absolute inset-x-0 bottom-0 flex gap-1"
          style={{ height: CHART_H + 28 }}
        >
          {recent.map((s) => {
            const isOver = cap !== null && cap > 0 && s.amount > cap
            const barH =
              s.amount > 0 ? Math.max(3, (s.amount / maxAmount) * CHART_H) : 2
            const monthLabel = new Date(
              s.month + "T00:00:00"
            ).toLocaleString("default", { month: "short" })
            const barColor =
              s.amount === 0
                ? "var(--muted)"
                : isOver
                ? "var(--destructive)"
                : "var(--primary)"
            const disabled = s.amount === 0

            return (
              <button
                type="button"
                key={s.month}
                disabled={disabled}
                onClick={() => onPickAmount(Math.round(s.amount))}
                aria-label={`Use ${formatCurrency(Math.round(s.amount))} from ${monthLabel} as cap`}
                className="relative flex-1 group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
              >
                {s.amount > 0 && (
                  <span
                    className="absolute inset-x-0 text-center text-muted-foreground leading-none group-hover:text-foreground transition-colors"
                    style={{
                      fontSize: 8,
                      bottom: 18 + barH + 3,
                      overflow: "hidden",
                    }}
                  >
                    {formatCurrency(Math.round(s.amount))}
                  </span>
                )}
                <div
                  className="absolute inset-x-0 rounded-sm transition-all group-hover:brightness-110 group-disabled:opacity-50"
                  style={{ bottom: 18, height: barH, backgroundColor: barColor }}
                />
                <span
                  className="absolute inset-x-0 text-center text-muted-foreground leading-none"
                  style={{ fontSize: 9, bottom: 3 }}
                >
                  {monthLabel}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {nonZero.length > 0 && (
        <div
          className="grid gap-1 border-t pt-2"
          style={{
            gridTemplateColumns: "repeat(3, 1fr)",
            borderColor: "var(--border)",
          }}
        >
          {[
            { label: "Avg", value: avg },
            { label: "High", value: high },
            { label: "Low", value: low },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span
                className="text-muted-foreground uppercase tracking-wider"
                style={{ fontSize: 9 }}
              >
                {label}
              </span>
              <span className="text-xs font-semibold">
                {formatCurrency(Math.round(value))}
              </span>
            </div>
          ))}
        </div>
      )}

      {cap && cap > 0 && (
        <p
          className="text-muted-foreground border-t pt-2"
          style={{ fontSize: 10, borderColor: "var(--border)" }}
        >
          {overCount === 0
            ? `All ${recent.length} months within cap ✓`
            : `Over cap ${overCount} of ${recent.length} months`}
        </p>
      )}
    </div>
  )
}

export const BudgetCard = memo(function BudgetCard({
  row,
  onBudgetSaved,
}: BudgetCardProps) {
  const { formatCurrency } = useCurrency()
  const [editing, setEditing] = useState(false)
  const [capInput, setCapInput] = useState(String(row.monthlyCap ?? ""))
  const [saving, setSaving] = useState(false)
  const [optimisticCap, setOptimisticCap] = useState<number | null>(null)
  const cancelRef = useRef(false)
  const suppressBlurRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayCap = optimisticCap ?? row.monthlyCap

  // Optimistic status — recomputed locally so the progress bar reflects the new
  // cap immediately instead of waiting for the refetch round-trip.
  const optimisticStatus: BudgetCategoryRow["status"] =
    displayCap === null
      ? "unset"
      : row.avgMonthly > displayCap
      ? "over"
      : row.avgMonthly > displayCap * 0.8
      ? "warning"
      : "under"

  const progressPct = displayCap
    ? Math.min(150, (row.avgMonthly / displayCap) * 100)
    : 0

  const progressBgColor =
    optimisticStatus === "over"
      ? "var(--destructive)"
      : optimisticStatus === "warning"
      ? "var(--primary)"
      : optimisticStatus === "unset"
      ? "var(--muted)"
      : "var(--chart-1)"

  const statusTextColor =
    optimisticStatus === "over"
      ? "var(--destructive)"
      : optimisticStatus === "warning"
      ? "var(--primary)"
      : "var(--chart-1)"

  const overByMonthly =
    displayCap !== null ? row.avgMonthly - displayCap : row.overByMonthly
  const overPct =
    displayCap && displayCap > 0
      ? Math.abs(overByMonthly / displayCap) * 100
      : 0

  // Stats used by the quick-fill chips
  const recent = row.monthlySpends.slice(-6)
  const nonZeroRecent = recent.filter((s) => s.amount > 0).map((s) => s.amount)
  const quickFills = useMemo(() => {
    if (nonZeroRecent.length === 0) return []
    const avg = row.avgMonthly
    const high = Math.max(...nonZeroRecent)
    const p = Math.ceil(p80(nonZeroRecent) / 5) * 5
    const avgPlus10 = Math.ceil((avg * 1.1) / 5) * 5
    return [
      { label: "Match avg", value: Math.round(avg) },
      { label: "Match high", value: Math.round(high) },
      { label: "80th pct", value: p },
      { label: "Avg +10%", value: avgPlus10 },
    ]
  }, [row.avgMonthly, nonZeroRecent])

  // Live coverage hint — "covers N of M months at this cap"
  const previewAmount = parseCurrencyInput(capInput)
  const coverage = useMemo(() => {
    if (!Number.isFinite(previewAmount) || previewAmount <= 0) return null
    if (recent.length === 0) return null
    const covered = recent.filter(
      (s) => s.amount > 0 && s.amount <= previewAmount
    ).length
    const total = recent.filter((s) => s.amount > 0).length
    if (total === 0) return null
    return { covered, total }
  }, [previewAmount, recent])

  async function handleSaveCap() {
    if (cancelRef.current) {
      cancelRef.current = false
      return
    }
    const amount = parseCurrencyInput(capInput)
    if (!Number.isFinite(amount)) {
      // Empty or non-numeric — silently cancel
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

  function handleInputBlur() {
    if (suppressBlurRef.current) {
      // Click was inside popover — keep editing, restore focus
      suppressBlurRef.current = false
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }
    void handleSaveCap()
  }

  function handlePopoverOpenChange(open: boolean) {
    // Radix tells us the popover closed (outside click). Commit save unless cancelled.
    if (!open && editing) {
      if (cancelRef.current) {
        cancelRef.current = false
        setCapInput(String(row.monthlyCap ?? ""))
        setEditing(false)
      } else {
        void handleSaveCap()
      }
    }
  }

  function handlePickAmount(amount: number) {
    setCapInput(String(amount))
    // Re-focus the input so Enter/Escape continue to work after a pick
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function enterEditMode() {
    setCapInput(String(displayCap ?? ""))
    setEditing(true)
  }

  const swatchColor = categoryColorCss(row.color)

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 px-4 py-2.5 flex flex-col gap-2 hover:border-border/70 transition-colors">
      {/* Header: name + cap editor */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="inline-block size-1.5 rounded-full shrink-0"
            style={{ backgroundColor: swatchColor }}
          />
          <span className="text-[13px] font-medium tracking-tight truncate text-foreground">
            {row.name}
          </span>
        </span>

        <Popover open={editing} onOpenChange={handlePopoverOpenChange}>
          <PopoverAnchor asChild>
            <div className="flex items-center shrink-0">
              {editing ? (
                <Input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleInputBlur}
                  className="h-6 w-20 text-right text-[12px] tabular-nums px-2"
                  placeholder="300"
                  aria-label={`Monthly cap for ${row.name}`}
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={enterEditMode}
                  aria-label={`Edit monthly cap for ${row.name}`}
                  className={`flex items-center gap-1 text-[12px] tabular-nums transition-colors ${
                    displayCap !== null
                      ? "text-foreground/80 hover:text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  } ${saving ? "opacity-50" : ""}`}
                >
                  {displayCap !== null
                    ? formatCurrency(displayCap)
                    : "Set cap"}
                  <Pencil className="size-2.5 opacity-50" />
                </button>
              )}
            </div>
          </PopoverAnchor>

          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="w-72 p-3"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => {
              // Pointer-down on the input itself shouldn't close the popover
              if (inputRef.current?.contains(e.target as Node)) {
                e.preventDefault()
              }
            }}
            // Any pointerdown inside the popover marks "suppress blur" so the
            // input's onBlur doesn't fire a premature save when focus shifts.
            onPointerDown={() => {
              suppressBlurRef.current = true
            }}
          >
            <div className="flex flex-col gap-3">
              <SpendingChart
                spends={row.monthlySpends}
                cap={displayCap}
                avg={row.avgMonthly}
                formatCurrency={formatCurrency}
                onPickAmount={handlePickAmount}
              />

              {quickFills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickFills.map((qf) => (
                    <button
                      key={qf.label}
                      type="button"
                      onClick={() => handlePickAmount(qf.value)}
                      className="px-2 py-1 rounded-full text-[10px] font-medium border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 transition-colors"
                    >
                      {qf.label}: {formatCurrency(qf.value)}
                    </button>
                  ))}
                </div>
              )}

              {coverage && (
                <p
                  className="text-[10px] text-muted-foreground border-t pt-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  Covers <span className="font-semibold text-foreground">{coverage.covered}</span>{" "}
                  of {coverage.total} months at {formatCurrency(previewAmount)}
                </p>
              )}

              <p
                className="text-[10px] text-muted-foreground/70 border-t pt-2"
                style={{ borderColor: "var(--border)" }}
              >
                Press Enter to save, Esc to cancel.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Hairline progress bar */}
      {displayCap !== null && (
        <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, progressPct)}%`,
              backgroundColor: progressBgColor,
            }}
          />
        </div>
      )}

      {/* Compact meta line: avg on left, status on right */}
      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground/80">
        <span>{formatCurrency(row.avgMonthly)} avg</span>
        {displayCap !== null ? (
          <span style={{ color: statusTextColor }}>
            {overByMonthly > 0
              ? `+${overPct.toFixed(0)}% over`
              : `${overPct.toFixed(0)}% under`}
          </span>
        ) : (
          <span className="opacity-60">no cap</span>
        )}
      </div>
    </div>
  )
})

BudgetCard.displayName = "BudgetCard"
