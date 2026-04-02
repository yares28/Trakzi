"use client"

import { useEffect, useMemo, useState } from "react"
import { useCurrency } from "@/components/currency-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type {
  OwnedPropertyMetadata,
  PocketItemWithTotals,
  PocketsBundleResponse,
  VehicleMetadata,
} from "@/lib/types/pockets"
import type { DebtAccountSummary } from "@/lib/types/debts"
import type { GoalComposerDefaults } from "@/components/chat/goal-wizard-card"
import { computeDefaultNetWorth, computePropertyEquity, computeVehicleEquity, estimateRemainingMortgage, getLatestBalanceSnapshot } from "@/lib/net-worth"
import { cn } from "@/lib/utils"
import {
  Plus,
  Trash2,
} from "lucide-react"

type SavingsTransaction = {
  date: string
  amount: number
  balance?: number | null
}

type TrackedItemSection = "Core" | "Properties" | "Vehicles" | "Other" | "Debts"

type TrackedItem = {
  id: string
  label: string
  description: string
  amount: number
  section: TrackedItemSection
  defaultSelected: boolean
}

type ManualNetWorthItem = {
  id: string
  description: string
  amount: string
  kind: "asset" | "debt"
  included: boolean
}

const TRACKED_SELECTION_STORAGE_KEY = "net-worth-calculator-tracked-selection"
const MANUAL_ITEMS_STORAGE_KEY = "net-worth-calculator-manual-items"

function parseInputAmount(value: string) {
  const parsed = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : 0
}

function createManualItem(): ManualNetWorthItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    amount: "",
    kind: "asset",
    included: true,
  }
}

function NetWorthRow({
  item,
  checked,
  onCheckedChange,
  formatCurrency,
  onCreateGoal,
}: {
  item: TrackedItem
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  formatCurrency: (value: number, options?: Intl.NumberFormatOptions) => string
  onCreateGoal?: (item: TrackedItem) => void
}) {
  return (
    <div
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition-colors",
        checked
          ? "border-border/80 bg-card text-foreground shadow-sm"
          : "border-transparent bg-muted/20 text-muted-foreground hover:border-border/50 hover:bg-muted/30"
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm">{item.label}</span>
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              item.amount < 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground"
            )}
          >
            {formatCurrency(item.amount)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
      </div>
      {onCreateGoal && (item.section === "Properties" || item.section === "Vehicles") ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-full px-3 text-xs"
          onClick={() => onCreateGoal(item)}
        >
          Goal
        </Button>
      ) : null}
    </div>
  )
}

export function NetWorthCalculatorPanel({
  transactions,
  savingsTotal,
  pocketsData,
  debts,
  onCreatePocketGoal,
  isLoading = false,
}: {
  transactions: SavingsTransaction[]
  savingsTotal: number
  pocketsData?: PocketsBundleResponse
  debts: DebtAccountSummary[]
  onCreatePocketGoal?: (defaults: GoalComposerDefaults) => void
  isLoading?: boolean
}) {
  const { formatCurrency } = useCurrency()
  const [selectedTrackedIds, setSelectedTrackedIds] = useState<string[] | null>(null)
  const [manualItems, setManualItems] = useState<ManualNetWorthItem[]>([])

  const latestBalanceEntry = useMemo(() => {
    return getLatestBalanceSnapshot(transactions)
  }, [transactions])

  const trackedItems = useMemo<TrackedItem[]>(() => {
    const latestBalanceDate = latestBalanceEntry?.date ? latestBalanceEntry.date.split("T")[0] : null

    const coreItems: TrackedItem[] = [
      {
        id: "core:savings-total",
        label: "Total savings",
        description: "Savings total from the current savings bundle.",
        amount: savingsTotal,
        section: "Core",
        defaultSelected: true,
      },
      {
        id: "core:latest-balance",
        label: "Latest balance snapshot",
        description: latestBalanceDate
          ? `Imported balance snapshot from ${latestBalanceDate}. Keep off if it overlaps with savings.`
          : "Imported balance snapshot when a balance exists on transactions.",
        amount: latestBalanceEntry?.balance ?? 0,
        section: "Core",
        defaultSelected: false,
      },
    ]

    const propertyItems: TrackedItem[] = (pocketsData?.properties ?? [])
      .filter((pocket) => {
        const metadata = pocket.metadata as Partial<OwnedPropertyMetadata>
        return metadata.propertyType === "owned"
      })
      .map((pocket) => {
        const metadata = pocket.metadata as Partial<OwnedPropertyMetadata>
        const mortgageLeft = estimateRemainingMortgage(metadata.mortgage)
        return {
          id: `property:${pocket.id}`,
          label: pocket.name,
          description:
            mortgageLeft > 0
              ? `Estimated value minus remaining mortgage of ${formatCurrency(mortgageLeft)}.`
              : "Estimated equity from this property pocket.",
          amount: computePropertyEquity(pocket),
          section: "Properties" as const,
          defaultSelected: true,
        }
      })

    const vehicleItems: TrackedItem[] = (pocketsData?.vehicles ?? []).map((pocket) => {
      const metadata = pocket.metadata as Partial<VehicleMetadata>
      const loanRemaining = metadata.financing?.loanRemaining ?? 0
      return {
        id: `vehicle:${pocket.id}`,
        label: pocket.name,
        description:
          loanRemaining > 0
            ? `Purchase value with ${formatCurrency(loanRemaining)} financing removed.`
            : "Tracked vehicle value from the pocket.",
        amount: computeVehicleEquity(pocket),
        section: "Vehicles" as const,
        defaultSelected: true,
      }
    })

    const otherItems: TrackedItem[] = (pocketsData?.otherPockets ?? []).map((pocket) => ({
      id: `other:${pocket.id}`,
      label: pocket.name,
      description: "Tracked using the amount invested in this pocket.",
      amount: pocket.totalInvested,
      section: "Other" as const,
      defaultSelected: true,
    }))

    const debtItems: TrackedItem[] = debts
      .filter((debt) => debt.origin_kind === "standalone")
      .map((debt) => ({
      id: `debt:${debt.id}`,
      label: debt.name,
      description:
        debt.lender_name
          ? debt.lender_name
          : "Standalone debt.",
      amount: -Math.max(0, debt.current_balance),
      section: "Debts" as const,
      defaultSelected: true,
    }))

    return [...coreItems, ...propertyItems, ...vehicleItems, ...otherItems, ...debtItems]
  }, [debts, formatCurrency, latestBalanceEntry, pocketsData?.otherPockets, pocketsData?.properties, pocketsData?.vehicles, savingsTotal])

  useEffect(() => {
    try {
      const savedTrackedSelection = localStorage.getItem(TRACKED_SELECTION_STORAGE_KEY)
      if (savedTrackedSelection) {
        const parsed = JSON.parse(savedTrackedSelection)
        if (Array.isArray(parsed)) {
          setSelectedTrackedIds(parsed.filter((item): item is string => typeof item === "string"))
        } else {
          setSelectedTrackedIds([])
        }
      } else {
        setSelectedTrackedIds(null)
      }

      const savedManualItems = localStorage.getItem(MANUAL_ITEMS_STORAGE_KEY)
      if (savedManualItems) {
        const parsed = JSON.parse(savedManualItems)
        if (Array.isArray(parsed)) {
          setManualItems(
            parsed.filter((item): item is ManualNetWorthItem => {
              return (
                item &&
                typeof item.id === "string" &&
                typeof item.description === "string" &&
                typeof item.amount === "string" &&
                typeof item.included === "boolean" &&
                (item.kind === "asset" || item.kind === "debt")
              )
            })
          )
        }
      }
    } catch (error) {
      console.error("[Net Worth Calculator] Failed to load saved state:", error)
      setSelectedTrackedIds(null)
    }
  }, [])

  useEffect(() => {
    setSelectedTrackedIds((previous) => {
      const validIds = new Set(trackedItems.map((item) => item.id))

      if (previous === null) {
        return trackedItems.filter((item) => item.defaultSelected).map((item) => item.id)
      }

      return previous.filter((id) => validIds.has(id))
    })
  }, [trackedItems])

  useEffect(() => {
    if (selectedTrackedIds === null) return

    try {
      localStorage.setItem(TRACKED_SELECTION_STORAGE_KEY, JSON.stringify(selectedTrackedIds))
    } catch (error) {
      console.error("[Net Worth Calculator] Failed to save selection:", error)
    }
  }, [selectedTrackedIds])

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_ITEMS_STORAGE_KEY, JSON.stringify(manualItems))
    } catch (error) {
      console.error("[Net Worth Calculator] Failed to save manual items:", error)
    }
  }, [manualItems])

  const selectedIdSet = useMemo(() => new Set(selectedTrackedIds ?? []), [selectedTrackedIds])

  const trackedTotal = useMemo(() => {
    return trackedItems.reduce((sum, item) => {
      return selectedIdSet.has(item.id) ? sum + item.amount : sum
    }, 0)
  }, [selectedIdSet, trackedItems])

  const selectedTrackedCount = useMemo(() => {
    return trackedItems.filter((item) => selectedIdSet.has(item.id)).length
  }, [selectedIdSet, trackedItems])

  const customAssetsTotal = useMemo(() => {
    return manualItems.reduce((sum, item) => {
      if (!item.included || item.kind !== "asset") return sum
      return sum + parseInputAmount(item.amount)
    }, 0)
  }, [manualItems])

  const customDebtsTotal = useMemo(() => {
    return manualItems.reduce((sum, item) => {
      if (!item.included || item.kind !== "debt") return sum
      return sum + parseInputAmount(item.amount)
    }, 0)
  }, [manualItems])

  const defaultNetWorth = useMemo(() => {
    return computeDefaultNetWorth({
      transactions,
      savingsTotal,
      pocketsData,
      debts,
    })
  }, [debts, pocketsData, savingsTotal, transactions])

  const netWorthTotal = trackedTotal + customAssetsTotal - customDebtsTotal

  const sections: Array<{
    key: TrackedItemSection
    title: string
    items: TrackedItem[]
    empty: string
  }> = [
    {
      key: "Core",
      title: "Core",
      items: trackedItems.filter((item) => item.section === "Core"),
      empty: "No core balances available yet.",
    },
    {
      key: "Properties",
      title: "Properties",
      items: trackedItems.filter((item) => item.section === "Properties"),
      empty: "No owned properties available to include.",
    },
    {
      key: "Vehicles",
      title: "Vehicles",
      items: trackedItems.filter((item) => item.section === "Vehicles"),
      empty: "No vehicle pockets available to include.",
    },
    {
      key: "Other",
      title: "Other pockets",
      items: trackedItems.filter((item) => item.section === "Other"),
      empty: "No other pockets available to include.",
    },
    {
      key: "Debts",
      title: "Standalone debts",
      items: trackedItems.filter((item) => item.section === "Debts"),
      empty: "No standalone debts available to include.",
    },
  ]

  const sectionMeta = useMemo(() => {
    return new Map(
      sections.map((section) => [
        section.key,
        {
          total: section.items.length,
          selected: section.items.filter((item) => selectedIdSet.has(item.id)).length,
        },
      ])
    )
  }, [selectedIdSet, sections])

  const toggleTrackedItem = (id: string, checked: boolean) => {
    setSelectedTrackedIds((previous) => {
      const safePrevious = previous ?? []
      if (checked) {
        return safePrevious.includes(id) ? safePrevious : [...safePrevious, id]
      }
      return safePrevious.filter((itemId) => itemId !== id)
    })
  }

  const updateManualItem = (id: string, patch: Partial<ManualNetWorthItem>) => {
    setManualItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
  }

  const selectAllTracked = () => {
    setSelectedTrackedIds(trackedItems.map((item) => item.id))
  }

  const clearAllTracked = () => {
    setSelectedTrackedIds([])
  }

  return (
    <Card className="@container/card h-full flex flex-col border-border/50 bg-card">
      <CardHeader className="gap-3 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Net Worth Calculator</CardTitle>
            <CardDescription>Choose what counts and review the total instantly.</CardDescription>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-left lg:min-w-[250px] lg:text-right">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Net Worth</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(netWorthTotal)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {selectedTrackedCount} tracked items selected
              {isLoading ? " • Updating…" : ""}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" className="h-8 rounded-full" onClick={selectAllTracked}>
            Select all
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 rounded-full" onClick={clearAllTracked}>
            Clear all
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-0">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
            {sections.map((section) => (
              <section key={section.key} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {section.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sectionMeta.get(section.key)?.selected ?? 0}/{sectionMeta.get(section.key)?.total ?? 0}
                  </div>
                </div>
                {section.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                    {section.empty}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <NetWorthRow
                        key={item.id}
                        item={item}
                        checked={selectedIdSet.has(item.id)}
                        onCheckedChange={(checked) => toggleTrackedItem(item.id, checked)}
                        formatCurrency={formatCurrency}
                        onCreateGoal={(trackedItem) => {
                          if (!onCreatePocketGoal) return
                          const [type, id] = trackedItem.id.split(":")
                          if ((type !== "property" && type !== "vehicle") || !id) return
                          onCreatePocketGoal({
                            goalKind: "pocket_funding",
                            category: type === "property" ? "Property Reserve" : "Vehicle Reserve",
                            label: `${trackedItem.label} Reserve`,
                            linkedPocketId: Number.parseInt(id, 10),
                            linkedPocketType: type,
                          })
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <aside className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Breakdown</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Tracked</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(trackedTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Default app model</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(defaultNetWorth.total)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Manual assets</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(customAssetsTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Manual debts</span>
                  <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">-{formatCurrency(customDebtsTotal)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <Separator />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Manual</div>
              <p className="mt-1 text-sm text-muted-foreground">Add things outside the app.</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full px-3"
              onClick={() => setManualItems((previous) => [...previous, createManualItem()])}
            >
              <Plus className="size-4" />
              Add item
            </Button>
          </div>

          {manualItems.length === 0 ? (
            <div className="py-2 text-sm text-muted-foreground">No manual items.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {manualItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 py-3 lg:grid-cols-[auto_120px_minmax(0,1fr)_140px_40px]"
                >
                  <div className="flex items-center justify-center pt-2 lg:pt-0">
                    <Checkbox
                      checked={item.included}
                      onCheckedChange={(checked) => updateManualItem(item.id, { included: checked === true })}
                    />
                  </div>

                  <Select
                    value={item.kind}
                    onValueChange={(value: "asset" | "debt") => updateManualItem(item.id, { kind: value })}
                  >
                    <SelectTrigger className="w-full border-0 bg-muted/30 shadow-none">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset</SelectItem>
                      <SelectItem value="debt">Debt</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    value={item.description}
                    onChange={(event) => updateManualItem(item.id, { description: event.target.value })}
                    placeholder="Description"
                    className="border-0 bg-muted/30 shadow-none"
                  />

                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={item.amount}
                    onChange={(event) => updateManualItem(item.id, { amount: event.target.value })}
                    placeholder="Amount"
                    className="border-0 bg-muted/30 shadow-none"
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 self-center text-muted-foreground hover:text-destructive"
                    onClick={() => setManualItems((previous) => previous.filter((manualItem) => manualItem.id !== item.id))}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

      </CardContent>
    </Card>
  )
}
