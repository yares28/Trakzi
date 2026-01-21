"use client"

import { useEffect, useState } from "react"

type SpendingTier = "Essentials" | "Mandatory" | "Wants"

type CategoryTier = {
  id: number
  name: string
  tier: SpendingTier | null
}

const TIER_LABELS: Record<SpendingTier, string> = {
  Essentials: "Needs",
  Mandatory: "Mandatory",
  Wants: "Wants",
}

export function NeedsWantsCategoryEditor() {
  const [categories, setCategories] = useState<CategoryTier[] | null>(null)
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
      <div className="mt-1 space-y-1.5 max-h-[180px] overflow-y-auto pr-1 text-[0.7rem]">
        {(["Essentials", "Mandatory", "Wants"] as SpendingTier[]).map((tier) => {
          const tierCategories = categories.filter((c) => (c.tier ?? "Wants") === tier)
          if (tierCategories.length === 0) return null

          return (
            <div key={tier} className="space-y-0.5">
              <div className="font-semibold text-xs">{TIER_LABELS[tier]}</div>
              <div className="flex flex-wrap gap-1.5">
                {tierCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[0.65rem]"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[0.65rem] text-muted-foreground/80">
        To change how categories are grouped, go to the Data Library and edit the{" "}
        <span className="font-semibold">Broad type</span> column in the Categories table.
      </p>
    </div>
  )
}

