"use client"

import { memo, useState, useEffect, useCallback } from "react"
import { Search, X, SlidersHorizontal, CalendarRange } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { demoFetch } from "@/lib/demo/demo-fetch"

interface PersonalTx {
    id: number
    date: string
    description: string
    amount: number
    category_name: string | null
    already_in_room: boolean
}

interface BrowseTransactionsStepProps {
    roomId: string
    onContinue: (selected: PersonalTx[]) => void
}

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debouncedValue
}

function formatDateRange(range: DateRange | undefined): string {
    if (!range?.from && !range?.to) return "Any date"
    if (range.from && range.to) {
        return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d, yyyy")}`
    }
    if (range.from) return `From ${format(range.from, "MMM d, yyyy")}`
    return "Any date"
}

export const BrowseTransactionsStep = memo(function BrowseTransactionsStep({
    roomId,
    onContinue,
}: BrowseTransactionsStepProps) {
    const { formatCurrency } = useCurrency()

    // Search
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebounce(search, 300)

    // Date range (lives inside Filters popover)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [showCalendar, setShowCalendar] = useState(false)

    // Category filter
    const [availableCategories, setAvailableCategories] = useState<string[]>([])
    const [categoriesLoading, setCategoriesLoading] = useState(true)
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())

    // Price range filter
    const [minAmount, setMinAmount] = useState("")
    const [maxAmount, setMaxAmount] = useState("")
    const debouncedMin = useDebounce(minAmount, 400)
    const debouncedMax = useDebounce(maxAmount, 400)

    // Filter popover
    const [filtersOpen, setFiltersOpen] = useState(false)

    // List state
    const [transactions, setTransactions] = useState<PersonalTx[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [selected, setSelected] = useState<Set<number>>(new Set())

    const fromStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""
    const toStr = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""

    const fetchTransactions = useCallback(async (newOffset = 0, append = false) => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({ limit: "50", offset: String(newOffset) })
            if (debouncedSearch) params.set("search", debouncedSearch)
            if (fromStr) params.set("from", fromStr)
            if (toStr) params.set("to", toStr)
            if (selectedCategories.size > 0) {
                params.set("categories", [...selectedCategories].join(","))
            }
            if (debouncedMin !== "") params.set("min_amount", debouncedMin)
            if (debouncedMax !== "") params.set("max_amount", debouncedMax)
            // Fetch available categories on the first page only
            if (newOffset === 0) params.set("include_categories", "1")

            const res = await demoFetch(`/api/rooms/${roomId}/transactions/browse?${params}`)
            if (!res.ok) return
            const json = await res.json()
            setTransactions(prev => append ? [...prev, ...json.data] : json.data)
            setTotal(json.meta.total)
            setOffset(newOffset)
            // Populate available categories from first-page response
            if (newOffset === 0 && Array.isArray(json.meta.availableCategories)) {
                setAvailableCategories(json.meta.availableCategories)
                setCategoriesLoading(false)
            }
        } finally {
            setIsLoading(false)
            setCategoriesLoading(false)
        }
    }, [roomId, debouncedSearch, fromStr, toStr, selectedCategories, debouncedMin, debouncedMax])

    useEffect(() => {
        fetchTransactions(0, false)
    }, [fetchTransactions])

    const toggleSelect = (id: number, alreadyInRoom: boolean) => {
        if (alreadyInRoom) return
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev => {
            const next = new Set(prev)
            if (next.has(cat)) next.delete(cat)
            else next.add(cat)
            return next
        })
    }

    const clearAllFilters = () => {
        setDateRange(undefined)
        setSelectedCategories(new Set())
        setMinAmount("")
        setMaxAmount("")
        setShowCalendar(false)
        setFiltersOpen(false)
    }

    const hasDateFilter = !!(dateRange?.from || dateRange?.to)
    const hasCategoryFilter = selectedCategories.size > 0
    const hasPriceFilter = minAmount !== "" || maxAmount !== ""

    // Count active filter groups for the badge
    const activeFilterCount =
        (hasDateFilter ? 1 : 0) +
        (hasCategoryFilter ? 1 : 0) +
        (hasPriceFilter ? 1 : 0)

    const hasAnyFilter = activeFilterCount > 0

    const selectedTxs = transactions.filter(t => selected.has(t.id))
    const selectedTotal = selectedTxs.reduce((s, t) => s + Math.abs(t.amount), 0)

    return (
        <div className="space-y-3">
            {/* Search + Filters button */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Popover open={filtersOpen} onOpenChange={(open) => { setFiltersOpen(open); if (!open) setShowCalendar(false) }}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "gap-1.5 shrink-0 h-10 relative",
                                hasAnyFilter && "border-primary text-primary"
                            )}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="text-xs">Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                        {/* Header */}
                        <div className="p-3 border-b flex items-center justify-between">
                            <p className="text-xs font-semibold">Filters</p>
                            {hasAnyFilter && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2 text-muted-foreground"
                                    onClick={clearAllFilters}
                                >
                                    Clear all
                                </Button>
                            )}
                        </div>

                        {/* ── Date range ── */}
                        <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date range</p>
                                {hasDateFilter && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-[10px] px-1.5 text-muted-foreground"
                                        onClick={() => { setDateRange(undefined); setShowCalendar(false) }}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "w-full justify-start gap-2 h-8 text-xs font-normal",
                                    hasDateFilter ? "text-foreground" : "text-muted-foreground"
                                )}
                                onClick={() => setShowCalendar(v => !v)}
                            >
                                <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                                {formatDateRange(dateRange)}
                            </Button>
                            {showCalendar && (
                                <div className="border rounded-lg overflow-hidden">
                                    <Calendar
                                        mode="range"
                                        selected={dateRange}
                                        onSelect={(range) => {
                                            setDateRange(range)
                                            if (range?.from && range?.to) setShowCalendar(false)
                                        }}
                                        defaultMonth={dateRange?.from ?? new Date()}
                                        numberOfMonths={1}
                                        captionLayout="label"
                                    />
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* ── Amount range ── */}
                        <div className="p-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount range</p>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">MIN</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={minAmount}
                                        onChange={e => setMinAmount(e.target.value)}
                                        className="pl-10 h-8 text-xs"
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">–</span>
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">MAX</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="∞"
                                        value={maxAmount}
                                        onChange={e => setMaxAmount(e.target.value)}
                                        className="pl-10 h-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* ── Category ── */}
                        <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</p>
                                {hasCategoryFilter && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-[10px] px-1.5 text-muted-foreground"
                                        onClick={() => setSelectedCategories(new Set())}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </div>
                            {categoriesLoading ? (
                                <p className="text-xs text-muted-foreground py-1">Loading categories…</p>
                            ) : availableCategories.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">No categories found.</p>
                            ) : (
                                <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                                    {availableCategories.map(cat => (
                                        <label
                                            key={cat}
                                            className="flex items-center gap-2 px-1 py-1.5 rounded cursor-pointer hover:bg-muted/40 transition-colors"
                                        >
                                            <Checkbox
                                                checked={selectedCategories.has(cat)}
                                                onCheckedChange={() => toggleCategory(cat)}
                                                className="shrink-0"
                                            />
                                            <span className="text-xs truncate">{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Active filter chips */}
            {hasAnyFilter && (
                <div className="flex flex-wrap gap-1.5">
                    {hasDateFilter && (
                        <Badge
                            variant="secondary"
                            className="gap-1 text-xs cursor-pointer pr-1.5"
                            onClick={() => setDateRange(undefined)}
                        >
                            <CalendarRange className="w-2.5 h-2.5" />
                            {formatDateRange(dateRange)}
                            <X className="w-2.5 h-2.5 ml-0.5" />
                        </Badge>
                    )}
                    {[...selectedCategories].map(cat => (
                        <Badge
                            key={cat}
                            variant="secondary"
                            className="gap-1 text-xs cursor-pointer pr-1.5"
                            onClick={() => toggleCategory(cat)}
                        >
                            {cat}
                            <X className="w-2.5 h-2.5" />
                        </Badge>
                    ))}
                    {hasPriceFilter && (
                        <Badge
                            variant="secondary"
                            className="gap-1 text-xs cursor-pointer pr-1.5"
                            onClick={() => { setMinAmount(""); setMaxAmount("") }}
                        >
                            {minAmount && maxAmount
                                ? `${minAmount} – ${maxAmount}`
                                : minAmount
                                    ? `≥ ${minAmount}`
                                    : `≤ ${maxAmount}`
                            }
                            <X className="w-2.5 h-2.5" />
                        </Badge>
                    )}
                </div>
            )}

            {/* Transaction list — ordered latest first from API */}
            <div className="space-y-0 max-h-[320px] overflow-y-auto border rounded-xl divide-y divide-border/30">
                {isLoading && transactions.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        Loading…
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No transactions found.
                    </div>
                ) : transactions.map(tx => {
                    const isSelected = selected.has(tx.id)
                    const disabled = tx.already_in_room
                    return (
                        <div
                            key={tx.id}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 transition-colors",
                                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/30"
                            )}
                            onClick={() => toggleSelect(tx.id, tx.already_in_room)}
                        >
                            <Checkbox
                                checked={isSelected}
                                disabled={disabled}
                                onCheckedChange={() => toggleSelect(tx.id, tx.already_in_room)}
                                className="shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{tx.description}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground tabular-nums">{tx.date}</span>
                                    {tx.category_name && (
                                        <Badge variant="outline" className="text-[10px] h-4">{tx.category_name}</Badge>
                                    )}
                                    {tx.already_in_room && (
                                        <Badge variant="secondary" className="text-[10px] h-4">Already added</Badge>
                                    )}
                                </div>
                            </div>
                            <span className={cn(
                                "text-sm font-semibold tabular-nums shrink-0",
                                tx.amount < 0 ? "text-rose-500" : "text-emerald-500"
                            )}>
                                {tx.amount < 0 ? "-" : "+"}{formatCurrency(Math.abs(tx.amount))}
                            </span>
                        </div>
                    )
                })}
                {transactions.length < total && (
                    <div className="px-4 py-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            disabled={isLoading}
                            onClick={() => fetchTransactions(offset + 50, true)}
                        >
                            {isLoading ? "Loading…" : `Load more (${total - transactions.length} remaining)`}
                        </Button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                    {selected.size > 0
                        ? `${selected.size} selected · ${formatCurrency(selectedTotal)}`
                        : `${total} transaction${total !== 1 ? "s" : ""} · latest first`
                    }
                </p>
                <Button
                    disabled={selected.size === 0}
                    onClick={() => onContinue(selectedTxs)}
                    size="sm"
                >
                    Import & Attribute →
                </Button>
            </div>
        </div>
    )
})

BrowseTransactionsStep.displayName = "BrowseTransactionsStep"
