"use client"

import { memo, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCurrency } from "@/components/currency-provider"
import { categoryColorCss } from "@/lib/colors/category-color"
import { toast } from "sonner"

interface Category {
  id: number
  name: string
  color: string | null
}

interface BudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCategoryName?: string
  defaultCap?: number
  avgMonthly?: number
  onSaved: () => void
}

// Accepts "$50", "1,500", "1k", "1.5k", "300" → number (NaN on failure)
function parseCurrencyInput(raw: string): number {
  const cleaned = raw.trim().replace(/[$,\s]/g, "").toLowerCase()
  if (!cleaned) return NaN
  const kMatch = cleaned.match(/^([\d.]+)k$/)
  if (kMatch) return parseFloat(kMatch[1]) * 1000
  return parseFloat(cleaned)
}

export const BudgetDialog = memo(function BudgetDialog({
  open,
  onOpenChange,
  defaultCategoryName,
  defaultCap,
  avgMonthly,
  onSaved,
}: BudgetDialogProps) {
  const { formatCurrency } = useCurrency()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryName, setCategoryName] = useState(defaultCategoryName ?? "")
  const [cap, setCap] = useState(
    defaultCap !== undefined ? String(defaultCap) : ""
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCategoryName(defaultCategoryName ?? "")
    setCap(defaultCap !== undefined ? String(defaultCap) : "")
  }, [defaultCategoryName, defaultCap, open])

  useEffect(() => {
    if (!open) return
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) =>
        setCategories(Array.isArray(data) ? data : [])
      )
      .catch(() => setCategories([]))
  }, [open])

  const quickFills = useMemo(() => {
    if (!avgMonthly || avgMonthly <= 0) return []
    return [
      { label: "Match avg", value: Math.round(avgMonthly) },
      { label: "Avg +10%", value: Math.ceil((avgMonthly * 1.1) / 5) * 5 },
      { label: "Avg +25%", value: Math.ceil((avgMonthly * 1.25) / 5) * 5 },
    ]
  }, [avgMonthly])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.name === categoryName),
    [categories, categoryName]
  )

  async function handleSave() {
    const trimmed = categoryName.trim()
    const amount = parseCurrencyInput(cap)
    if (!trimmed) return toast.error("Please select a category")
    if (!Number.isFinite(amount) || amount < 0)
      return toast.error("Please enter a valid budget amount")

    setSaving(true)
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName: trimmed, budget: amount }),
      })
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}))
        toast.error(data.error ?? "Failed to save budget")
        return
      }
      toast.success(`Budget set for ${trimmed}`)
      onSaved()
      onOpenChange(false)
    } catch {
      toast.error("Network error — could not save budget")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-5 gap-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-medium tracking-tight">
            Set monthly budget
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground/80 tracking-tight">
            Cap your spending per category.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="budget-category"
              className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium"
            >
              Category
            </Label>
            <Select value={categoryName} onValueChange={setCategoryName}>
              <SelectTrigger
                id="budget-category"
                className="h-8 text-[13px] tracking-tight"
              >
                <span className="flex items-center gap-2 min-w-0">
                  {selectedCategory && (
                    <span
                      aria-hidden="true"
                      className="inline-block size-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: categoryColorCss(
                          selectedCategory.color
                        ),
                      }}
                    />
                  )}
                  <SelectValue placeholder="Select a category…" />
                </span>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name} className="text-[13px]">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block size-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: categoryColorCss(c.color) }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cap */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label
                htmlFor="budget-cap"
                className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium"
              >
                Monthly cap
              </Label>
              {avgMonthly !== undefined && avgMonthly > 0 && (
                <span className="text-[10px] tabular-nums text-muted-foreground/60">
                  avg {formatCurrency(avgMonthly)}/mo
                </span>
              )}
            </div>
            <Input
              id="budget-cap"
              type="text"
              inputMode="decimal"
              placeholder="300"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave()
              }}
              className="h-8 text-[13px] tabular-nums"
              autoFocus
            />

            {quickFills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickFills.map((qf) => (
                  <button
                    key={qf.label}
                    type="button"
                    onClick={() => setCap(String(qf.value))}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-border/40 text-muted-foreground hover:border-border hover:text-foreground transition-colors tabular-nums tracking-tight"
                  >
                    {qf.label} · {formatCurrency(qf.value)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-stretch">
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full h-8 text-[12px] font-medium tracking-tight"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

BudgetDialog.displayName = "BudgetDialog"
