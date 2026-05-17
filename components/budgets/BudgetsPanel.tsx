// components/budgets/BudgetsPanel.tsx
"use client"

import { memo, useState, useCallback } from "react"
import { useBudgetsBundleData } from "@/hooks/use-dashboard-data"
import { BudgetCard } from "@/components/budgets/BudgetCard"
import { BudgetDialog } from "@/components/budgets/BudgetDialog"
import { ChartBudgetVsSpendTrend } from "@/components/budgets/chart-budget-vs-spend-trend"
import { LazyChart } from "@/components/lazy-chart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrency } from "@/components/currency-provider"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { categoryColorCss } from "@/lib/colors/category-color"
import type { BudgetCategoryRow } from "@/lib/types/budgets"

export const BudgetsPanel = memo(function BudgetsPanel() {
  const { data, isLoading, refetch, error } = useBudgetsBundleData()
  const { formatCurrency } = useCurrency()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetDefaults, setSheetDefaults] = useState<{
    categoryName?: string
    cap?: number
    avgMonthly?: number
  }>({})

  const openSheet = useCallback((defaults: typeof sheetDefaults = {}) => {
    setSheetDefaults(defaults)
    setSheetOpen(true)
  }, [])

  const handleSaved = useCallback(() => {
    void refetch()
  }, [refetch])

  const totalCap = data
    ? data.categories.reduce((s, c) => s + (c.monthlyCap ?? 0) * data.monthsElapsed, 0)
    : 0
  const totalSpent = data
    ? data.categories.reduce((s, c) => s + c.totalSpent, 0)
    : 0
  const overBy = totalSpent - totalCap

  const isEmpty = !isLoading && data && data.categories.length === 0 && data.suggestions.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Summary pills */}
      {!isLoading && data && data.categories.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Pill label="Total cap" value={formatCurrency(totalCap)} />
          <Pill label="Total spent" value={formatCurrency(totalSpent)} />
          <Pill
            label={overBy > 0 ? "Over by" : "Under by"}
            value={overBy > 0 ? `+${formatCurrency(overBy)}` : formatCurrency(Math.abs(overBy))}
            style={{
              color: overBy > 0 ? "var(--destructive)" : "var(--chart-1)",
              borderColor:
                overBy > 0
                  ? "color-mix(in oklch, var(--destructive) 40%, transparent)"
                  : "color-mix(in oklch, var(--chart-1) 40%, transparent)",
            }}
          />
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <p className="text-sm text-muted-foreground text-center">
          Failed to load budgets. Please try again.
        </p>
      )}

      {/* Insufficient data warning */}
      {!isLoading && data && data.monthsElapsed < 0.1 && !isEmpty && (
        <p className="text-sm text-muted-foreground text-center">
          Insufficient data — pick a longer date range.
        </p>
      )}

      {/* Trend chart */}
      {!isLoading && data && data.monthlyTotals.length > 1 && (
        <LazyChart title="Spend vs Budget" height={192}>
          <ChartBudgetVsSpendTrend data={data.monthlyTotals} />
        </LazyChart>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/15 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No budgets set yet. Start by capping your biggest spending categories.</p>
          <Button onClick={() => openSheet()} size="sm" className="rounded-full">
            <Plus className="mr-1 size-4" /> Set your first budget
          </Button>
        </div>
      )}

      {/* Budget cards — budgeted categories */}
      {!isLoading && data && data.categories.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.categories.map((row) => (
            <BudgetCard
              key={row.categoryId}
              row={row}
              onBudgetSaved={handleSaved}
            />
          ))}
        </div>
      )}

      {/* Suggestions — unbudgeted top spenders */}
      {!isLoading && data && data.suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60">Suggested</p>
          {data.suggestions.slice(0, 5).map((row) => (
            <SuggestionTile key={row.categoryId} row={row} onAdd={openSheet} formatCurrency={formatCurrency} />
          ))}
        </div>
      )}

      {/* Add custom category */}
      {!isLoading && !isEmpty && (
        <button
          type="button"
          onClick={() => openSheet()}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/30 px-4 py-2 text-[12px] text-muted-foreground/80 hover:text-foreground hover:border-border/60 transition-colors tracking-tight"
        >
          <Plus className="size-3" /> Add category budget
        </button>
      )}

      <BudgetDialog
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultCategoryName={sheetDefaults.categoryName}
        defaultCap={sheetDefaults.cap}
        avgMonthly={sheetDefaults.avgMonthly}
        onSaved={handleSaved}
      />
    </div>
  )
})

BudgetsPanel.displayName = "BudgetsPanel"

function Pill({
  label,
  value,
  className,
  style,
}: {
  label: string
  value: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={cn(
        "rounded-full border border-border/40 px-3 py-1 text-[11px] tracking-tight",
        className
      )}
      style={style}
    >
      <span className="text-muted-foreground/80 uppercase tracking-wider text-[10px]">
        {label}
      </span>
      <span className="ml-1.5 font-medium tabular-nums">{value}</span>
    </div>
  )
}

function SuggestionTile({
  row,
  onAdd,
  formatCurrency,
}: {
  row: BudgetCategoryRow
  onAdd: (defaults: { categoryName: string; avgMonthly: number }) => void
  formatCurrency: (v: number) => string
}) {
  const swatchColor = categoryColorCss(row.color)
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 px-4 py-2 hover:border-border/60 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: swatchColor }}
        />
        <div className="min-w-0 flex items-baseline gap-2">
          <p className="text-[13px] font-medium tracking-tight truncate text-foreground">
            {row.name}
          </p>
          <p className="text-[11px] tabular-nums text-muted-foreground/70 shrink-0">
            {formatCurrency(row.avgMonthly)} avg
          </p>
        </div>
      </div>
      <button
        type="button"
        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0 tracking-tight"
        onClick={() => onAdd({ categoryName: row.name, avgMonthly: row.avgMonthly })}
      >
        Set cap →
      </button>
    </div>
  )
}
