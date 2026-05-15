"use client"

import { memo, useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
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
import { toast } from "sonner"

interface Category {
  id: number
  name: string
  color: string | null
}

interface BudgetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCategoryName?: string
  defaultCap?: number
  avgMonthly?: number
  onSaved: () => void
}

export const BudgetSheet = memo(function BudgetSheet({
  open,
  onOpenChange,
  defaultCategoryName,
  defaultCap,
  avgMonthly,
  onSaved,
}: BudgetSheetProps) {
  const { formatCurrency } = useCurrency()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryName, setCategoryName] = useState(defaultCategoryName ?? "")
  const [cap, setCap] = useState(defaultCap !== undefined ? String(defaultCap) : "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCategoryName(defaultCategoryName ?? "")
    setCap(defaultCap !== undefined ? String(defaultCap) : "")
  }, [defaultCategoryName, defaultCap, open])

  useEffect(() => {
    if (!open) return
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
  }, [open])

  async function handleSave() {
    const trimmed = categoryName.trim()
    const amount = parseFloat(cap)
    if (!trimmed) return toast.error("Please select a category")
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Please enter a valid budget amount")

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Set monthly budget</SheetTitle>
          <SheetDescription>
            Choose a category and set the maximum you want to spend per month.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 py-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-category">Category</Label>
            <Select value={categoryName} onValueChange={setCategoryName}>
              <SelectTrigger id="budget-category">
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-cap">Monthly cap</Label>
            <Input
              id="budget-cap"
              type="number"
              min={0}
              step={1}
              placeholder="e.g. 300"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSave() }}
            />
            {avgMonthly !== undefined && avgMonthly > 0 && (
              <p className="text-xs text-muted-foreground">
                You&apos;ve averaged {formatCurrency(avgMonthly)}/mo here over the current period.
              </p>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button onClick={() => void handleSave()} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save budget"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
})

BudgetSheet.displayName = "BudgetSheet"
