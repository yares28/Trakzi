// components/budgets/BudgetsPanel.tsx
"use client"

import { memo, useState, useCallback } from "react"
import { useBudgetsBundleData } from "@/hooks/use-dashboard-data"
import { BudgetCard } from "@/components/budgets/BudgetCard"
import { BudgetSheet } from "@/components/budgets/BudgetSheet"
import { ChartBudgetVsSpendTrend } from "@/components/budgets/chart-budget-vs-spend-trend"
import { LazyChart } from "@/components/lazy-chart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrency } from "@/components/currency-provider"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BudgetCategoryRow } from "@/lib/types/budgets"

export const BudgetsPanel = memo(function BudgetsPanel() {
  const { data, isLoading, refetch } = useBudgetsBundleData()
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
            label="Over by"
            value={overBy > 0 ? `+${formatCurrency(overBy)}` : formatCurrency(overBy)}
            className={overBy > 0 ? "border-red-400/40 text-red-500" : "border-emerald-400/40 text-emerald-600"}
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

      {/* Insufficient data warning */}
      {!isLoading && data && data.monthsElapsed < 0.1 && (
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
        <div className="flex flex-col gap-3">
          {data.categories.map((row) => (
            <BudgetCard
              key={row.categoryId}
              row={row}
              monthsElapsed={data.monthsElapsed}
              onBudgetSaved={handleSaved}
            />
          ))}
        </div>
      )}

      {/* Suggestions — unbudgeted top spenders */}
      {!isLoading && data && data.suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60">Suggested</p>
          {data.suggestions.map((row) => (
            <SuggestionTile key={row.categoryId} row={row} onAdd={openSheet} formatCurrency={formatCurrency} />
          ))}
        </div>
      )}

      {/* Add custom category */}
      {!isLoading && (
        <button
          type="button"
          onClick={() => openSheet()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/40 bg-muted/10 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/20 transition-colors"
        >
          <Plus className="size-4" /> Add category budget
        </button>
      )}

      <BudgetSheet
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

function Pill({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-full border border-border/60 bg-card/80 px-4 py-1.5 text-sm shadow-sm", className)}>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-semibold">{value}</span>
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
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/40 bg-muted/10 px-5 py-3">
      <div>
        <p className="text-sm font-medium" style={{ color: row.color }}>{row.name}</p>
        <p className="text-xs text-muted-foreground">{formatCurrency(row.avgMonthly)}/mo avg — no budget set</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full shrink-0 text-xs"
        onClick={() => onAdd({ categoryName: row.name, avgMonthly: row.avgMonthly })}
      >
        Set budget
      </Button>
    </div>
  )
}
