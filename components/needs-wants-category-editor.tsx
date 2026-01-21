"use client"

import { useEffect, useState } from "react"

import { clearResponseCache } from "@/lib/request-deduplication"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type SpendingTier = "Essentials" | "Mandatory" | "Wants"

type CategoryTier = {
  id: number
  name: string
  tier: SpendingTier | null
}

const TIER_LABELS: Record<SpendingTier, string> = {
  Essentials: "Essentials (needs)",
  Mandatory: "Mandatory",
  Wants: "Wants",
}

export function NeedsWantsCategoryEditor() {
  const [categories, setCategories] = useState<CategoryTier[] | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setIsLoading(true)
        const res = await fetch("/api/categories/needs-wants", {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        })
        if (!res.ok) {
          throw new Error(await res.text())
        }
        const payload = (await res.json()) as CategoryTier[]
        if (!cancelled) {
          setCategories(payload)
        }
      } catch (error) {
        console.error("[NeedsWantsCategoryEditor] Failed to load categories:", error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleTierChange = async (id: number, tier: SpendingTier) => {
    setUpdatingId(id)
    // Optimistic update
    setCategories((prev) =>
      prev
        ? prev.map((cat) => (cat.id === id ? { ...cat, tier } : cat))
        : prev,
    )

    try {
      const res = await fetch("/api/categories/needs-wants", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ id, tier }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "Failed to update category tier")
      }

      // Clear in-memory fetch cache for analytics so the next load sees fresh data
      clearResponseCache()

      toast.success("Updated category group for Needs vs Wants")
    } catch (error) {
      console.error("[NeedsWantsCategoryEditor] Failed to update tier:", error)
      toast.error("Could not update category group. Please try again.")
    } finally {
      setUpdatingId(null)
    }
  }

  if (isLoading && !categories) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2 text-[0.7rem] text-muted-foreground">
        Loading categories…
      </div>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-2 text-[0.7rem] text-muted-foreground">
        No categories available yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="space-y-0.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            Category groups
          </span>
          <p className="text-[0.7rem] text-muted-foreground/80">
            See how each category is grouped and change it for Needs vs Wants.
          </p>
        </div>
      </div>
      <div className="mt-1 space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-2 py-1"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Badge
                variant="outline"
                className="text-[0.65rem] px-1.5 py-0.5 max-w-[130px] truncate"
              >
                {cat.name}
              </Badge>
            </div>
            <Select
              value={cat.tier ?? "Wants"}
              onValueChange={(value) => handleTierChange(cat.id, value as SpendingTier)}
              disabled={updatingId === cat.id}
            >
              <SelectTrigger className={cn("h-7 w-[130px] px-2 py-0 text-[0.7rem]", updatingId === cat.id && "opacity-70")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Essentials" className="text-[0.75rem]">
                  {TIER_LABELS.Essentials}
                </SelectItem>
                <SelectItem value="Mandatory" className="text-[0.75rem]">
                  {TIER_LABELS.Mandatory}
                </SelectItem>
                <SelectItem value="Wants" className="text-[0.75rem]">
                  {TIER_LABELS.Wants}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}

