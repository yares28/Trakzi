"use client"

import { memo, useState, useEffect, useCallback } from "react"
import { Search, Calendar } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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

export const BrowseTransactionsStep = memo(function BrowseTransactionsStep({
    roomId,
    onContinue,
}: BrowseTransactionsStepProps) {
    const { formatCurrency } = useCurrency()
    const [search, setSearch] = useState("")
    const [from, setFrom] = useState("")
    const [to, setTo] = useState("")
    const [transactions, setTransactions] = useState<PersonalTx[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [selected, setSelected] = useState<Set<number>>(new Set())

    const debouncedSearch = useDebounce(search, 300)

    const fetchTransactions = useCallback(async (newOffset = 0, append = false) => {
        setIsLoading(true)
        try {
            const params = new URLSearchParams({ limit: "50", offset: String(newOffset) })
            if (debouncedSearch) params.set("search", debouncedSearch)
            if (from) params.set("from", from)
            if (to) params.set("to", to)

            const res = await demoFetch(`/api/rooms/${roomId}/transactions/browse?${params}`)
            if (!res.ok) return
            const json = await res.json()
            setTransactions(prev => append ? [...prev, ...json.data] : json.data)
            setTotal(json.meta.total)
            setOffset(newOffset)
        } finally {
            setIsLoading(false)
        }
    }, [roomId, debouncedSearch, from, to])

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

    const selectedTxs = transactions.filter(t => selected.has(t.id))
    const selectedTotal = selectedTxs.reduce((s, t) => s + Math.abs(t.amount), 0)

    return (
        <div className="space-y-3">
            {/* Search and date filters */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search transactions..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>
            <div className="flex gap-2 items-center">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                    type="date"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="From"
                />
                <span className="text-muted-foreground text-xs">–</span>
                <Input
                    type="date"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="To"
                />
            </div>

            {/* Transaction list */}
            <div className="space-y-0 max-h-[320px] overflow-y-auto border rounded-xl divide-y divide-border/30">
                {isLoading && transactions.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        Loading...
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
                                    <span className="text-xs text-muted-foreground">{tx.date}</span>
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
                {/* Load more */}
                {transactions.length < total && (
                    <div className="px-4 py-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            disabled={isLoading}
                            onClick={() => fetchTransactions(offset + 50, true)}
                        >
                            {isLoading ? "Loading..." : `Load more (${total - transactions.length} remaining)`}
                        </Button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                    {selected.size > 0
                        ? `${selected.size} selected (${formatCurrency(selectedTotal)})`
                        : "Select transactions to import"
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
