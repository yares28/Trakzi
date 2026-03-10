"use client"

import { memo, useState, useEffect, useCallback, useRef } from "react"
import { Search, ChevronRight, ChevronDown, Receipt, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { demoFetch } from "@/lib/demo/demo-fetch"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReceiptSummary {
    id: string
    store_name: string | null
    receipt_date: string | null
    total_amount: number
    currency: string
    item_count: number
}

interface ReceiptItem {
    id: number
    description: string
    quantity: number
    total_price: number
    category_name: string | null
}

export interface RoomMemberForReceipts {
    user_id: string
    display_name: string
    avatar_url: string | null
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BrowseReceiptsStepProps {
    roomId: string
    members: RoomMemberForReceipts[]
    currentUserId: string
    onSaved: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
    const [dv, setDv] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setDv(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])
    return dv
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BrowseReceiptsStep = memo(function BrowseReceiptsStep({
    roomId,
    members,
    currentUserId,
    onSaved,
}: BrowseReceiptsStepProps) {
    const { formatCurrency } = useCurrency()

    // ── Search ────────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebounce(search, 300)

    // ── Receipt list ──────────────────────────────────────────────────────────
    const [receipts, setReceipts] = useState<ReceiptSummary[]>([])
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    // ── Expanded receipts → lazy-loaded items ─────────────────────────────────
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [itemsMap, setItemsMap] = useState<Map<string, ReceiptItem[]>>(new Map())
    const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set())

    // ── Selection: receipt_id → Set<item_id> ─────────────────────────────────
    const [selectedItems, setSelectedItems] = useState<Map<string, Set<number>>>(new Map())

    // ── Payer + split ─────────────────────────────────────────────────────────
    const [paidBy, setPaidBy] = useState(currentUserId)
    const [splitWith, setSplitWith] = useState<Set<string>>(new Set(members.map(m => m.user_id)))
    const [isSaving, setIsSaving] = useState(false)

    // ── Fetch receipt list ────────────────────────────────────────────────────
    const fetchReceipts = useCallback(async (newOffset = 0, append = false) => {
        setIsLoading(true)
        try {
            const p = new URLSearchParams({ limit: "50", offset: String(newOffset) })
            if (debouncedSearch) p.set("search", debouncedSearch)
            const res = await demoFetch(`/api/rooms/${roomId}/receipts/browse?${p}`)
            if (!res.ok) return
            const json = await res.json()
            setReceipts(prev => append ? [...prev, ...json.receipts] : json.receipts)
            setTotal(json.meta.total)
            setOffset(newOffset)
        } finally {
            setIsLoading(false)
        }
    }, [roomId, debouncedSearch])

    useEffect(() => { fetchReceipts(0, false) }, [fetchReceipts])

    // Use refs so fetchItems doesn't rebuild on every render
    const itemsMapRef   = useRef(itemsMap)
    const loadingRef    = useRef(loadingItems)
    useEffect(() => { itemsMapRef.current = itemsMap }, [itemsMap])
    useEffect(() => { loadingRef.current = loadingItems }, [loadingItems])

    // ── Fetch items for a receipt (lazy) ──────────────────────────────────────
    const fetchItems = useCallback(async (receiptId: string) => {
        if (itemsMapRef.current.has(receiptId) || loadingRef.current.has(receiptId)) return
        setLoadingItems(prev => new Set(prev).add(receiptId))
        try {
            const res = await demoFetch(`/api/rooms/${roomId}/receipts/browse?receipt_id=${receiptId}`)
            if (!res.ok) return
            const json = await res.json()
            setItemsMap(prev => new Map(prev).set(receiptId, json.items))
        } finally {
            setLoadingItems(prev => {
                const next = new Set(prev)
                next.delete(receiptId)
                return next
            })
        }
    }, [roomId])

    // ── Toggle expand ─────────────────────────────────────────────────────────
    const toggleExpand = (receiptId: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(receiptId)) {
                next.delete(receiptId)
            } else {
                next.add(receiptId)
                fetchItems(receiptId)
            }
            return next
        })
    }

    // ── Item selection ────────────────────────────────────────────────────────
    const toggleItem = (receiptId: string, itemId: number) => {
        setSelectedItems(prev => {
            const next = new Map(prev)
            const set = new Set(next.get(receiptId) ?? [])
            if (set.has(itemId)) set.delete(itemId)
            else set.add(itemId)
            if (set.size === 0) next.delete(receiptId)
            else next.set(receiptId, set)
            return next
        })
    }

    // Toggle all items of a receipt
    const toggleReceipt = (receiptId: string, items: ReceiptItem[]) => {
        setSelectedItems(prev => {
            const next = new Map(prev)
            const existing = next.get(receiptId)
            if (existing && existing.size === items.length) {
                // All selected → deselect all
                next.delete(receiptId)
            } else {
                // Select all
                next.set(receiptId, new Set(items.map(i => i.id)))
            }
            return next
        })
    }

    // ── Derived totals ────────────────────────────────────────────────────────
    const totalSelectedItems = [...selectedItems.values()].reduce((s, set) => s + set.size, 0)

    const totalSelectedAmount = [...selectedItems.entries()].reduce((sum, [rid, ids]) => {
        const items = itemsMap.get(rid) ?? []
        return sum + items.filter(i => ids.has(i.id)).reduce((s, i) => s + i.total_price, 0)
    }, 0)

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (totalSelectedItems === 0) return
        setIsSaving(true)
        try {
            const splitMembers = [...splitWith]
            // Group selected items by receipt → one shared_transaction per receipt
            const entries = [...selectedItems.entries()]
            for (const [rid, ids] of entries) {
                const receipt = receipts.find(r => r.id === rid)
                const items = (itemsMap.get(rid) ?? []).filter(i => ids.has(i.id))
                if (items.length === 0) continue

                const totalAmount = items.reduce((s, i) => s + i.total_price, 0)
                const perPerson = totalAmount / splitMembers.length
                const splits = splitMembers.map(uid => ({
                    user_id: uid,
                    amount: Math.round(perPerson * 100) / 100,
                }))

                const description = receipt?.store_name
                    ? `${receipt.store_name} (${items.length} item${items.length > 1 ? "s" : ""})`
                    : `Receipt (${items.length} item${items.length > 1 ? "s" : ""})`

                const res = await demoFetch(`/api/rooms/${roomId}/transactions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        description,
                        total_amount: Math.round(totalAmount * 100) / 100,
                        transaction_date: receipt?.receipt_date ?? new Date().toISOString().slice(0, 10),
                        split_type: "custom",
                        source_type: "receipt",
                        paid_by: paidBy,
                        splits,
                        receipt_items: items
                            .filter(i => (i.total_price ?? 0) > 0)
                            .map(i => ({
                                name: i.description,
                                amount: Number(i.total_price),
                                quantity: Math.round(i.quantity) || 1,
                                category: i.category_name ?? undefined,
                            })),
                    }),
                })
                if (!res.ok) {
                    const json = await res.json().catch(() => ({}))
                    throw new Error(json.error ?? "Failed to save")
                }
            }
            onSaved()
        } catch (e: any) {
            const { toast } = await import("sonner")
            toast.error(e.message ?? "Failed to add receipts")
        } finally {
            setIsSaving(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-3">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by store name…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Receipt list */}
            <div className="border rounded-xl divide-y divide-border/30 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/40">
                    <span className="text-xs text-muted-foreground flex-1">
                        {totalSelectedItems > 0
                            ? `${totalSelectedItems} item${totalSelectedItems > 1 ? "s" : ""} · ${formatCurrency(totalSelectedAmount)}`
                            : `${total} receipt${total !== 1 ? "s" : ""}`}
                    </span>
                    {totalSelectedItems > 0 && (
                        <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors shrink-0"
                            onClick={() => setSelectedItems(new Map())}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {isLoading && receipts.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                    </div>
                ) : receipts.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                        No receipts found.
                    </div>
                ) : receipts.map(receipt => {
                    const isExpanded = expanded.has(receipt.id)
                    const items = itemsMap.get(receipt.id) ?? []
                    const isLoadingItems = loadingItems.has(receipt.id)
                    const selectedSet = selectedItems.get(receipt.id)
                    const selectedCount = selectedSet?.size ?? 0
                    const allSelected = items.length > 0 && selectedCount === items.length
                    const someSelected = selectedCount > 0 && !allSelected

                    return (
                        <div key={receipt.id} className="overflow-hidden">
                            {/* Receipt row */}
                            <div
                                className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 px-3 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer"
                                onClick={() => toggleExpand(receipt.id)}
                            >
                                {/* Expand chevron */}
                                <span className="text-muted-foreground">
                                    {isExpanded
                                        ? <ChevronDown className="w-3.5 h-3.5" />
                                        : <ChevronRight className="w-3.5 h-3.5" />}
                                </span>

                                {/* Select-all checkbox for this receipt */}
                                <Checkbox
                                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                    onCheckedChange={async () => {
                                        // Load items first if needed
                                        if (!itemsMapRef.current.has(receipt.id)) {
                                            await fetchItems(receipt.id)
                                            // After fetch, items are in itemsMapRef
                                        }
                                        const loaded = itemsMapRef.current.get(receipt.id) ?? []
                                        if (loaded.length > 0) toggleReceipt(receipt.id, loaded)
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    className="shrink-0"
                                />

                                {/* Store + date */}
                                <div className="min-w-0 overflow-hidden">
                                    <p className="text-xs font-medium truncate" title={receipt.store_name ?? "Receipt"}>
                                        {receipt.store_name ?? <span className="text-muted-foreground italic">Unknown store</span>}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {receipt.receipt_date ?? "No date"} · {receipt.item_count} item{receipt.item_count !== 1 ? "s" : ""}
                                        {selectedCount > 0 && (
                                            <span className="text-primary font-medium"> · {selectedCount} selected</span>
                                        )}
                                    </p>
                                </div>

                                {/* Total */}
                                <span className="text-xs font-semibold tabular-nums shrink-0 whitespace-nowrap text-right">
                                    {formatCurrency(receipt.total_amount)}
                                </span>
                            </div>

                            {/* Expanded items */}
                            {isExpanded && (
                                <div className="border-t border-border/20 bg-muted/10">
                                    {isLoadingItems ? (
                                        <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Loading items…
                                        </div>
                                    ) : items.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">No items found.</p>
                                    ) : items.map(item => {
                                        const isItemSelected = selectedSet?.has(item.id) ?? false
                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "grid grid-cols-[auto_1fr_auto] items-center gap-2 pl-8 pr-3 py-1.5 transition-colors cursor-pointer overflow-hidden",
                                                    isItemSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"
                                                )}
                                                onClick={() => toggleItem(receipt.id, item.id)}
                                            >
                                                <Checkbox
                                                    checked={isItemSelected}
                                                    onCheckedChange={() => toggleItem(receipt.id, item.id)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="shrink-0"
                                                />
                                                <div className="min-w-0 overflow-hidden">
                                                    <p className="text-xs truncate" title={item.description}>{item.description}</p>
                                                    {item.category_name && (
                                                        <p className="text-[10px] text-muted-foreground/70 truncate">
                                                            {item.category_name}
                                                            {item.quantity > 1 && ` · ×${item.quantity}`}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs tabular-nums shrink-0 whitespace-nowrap text-right text-muted-foreground">
                                                    {formatCurrency(item.total_price)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Load more */}
                {receipts.length < total && (
                    <div className="px-3 py-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            disabled={isLoading}
                            onClick={() => fetchReceipts(offset + 50, true)}
                        >
                            {isLoading ? "Loading…" : `Load more (${total - receipts.length} remaining)`}
                        </Button>
                    </div>
                )}
            </div>

            {/* Payer + split-with (only shown when items are selected) */}
            {totalSelectedItems > 0 && (
                <div className="border rounded-2xl p-3 space-y-3 bg-muted/20">
                    {/* Paid by */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Paid by</span>
                        <div className="flex flex-wrap gap-1.5">
                            {members.map(m => (
                                <button
                                    key={m.user_id}
                                    type="button"
                                    onClick={() => setPaidBy(m.user_id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                                        paidBy === m.user_id
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-border/60 hover:border-primary/40 hover:bg-muted/60"
                                    )}
                                >
                                    <Avatar className="w-4 h-4">
                                        <AvatarImage src={m.avatar_url || undefined} />
                                        <AvatarFallback className="text-[8px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {m.display_name.split(" ")[0]}
                                    {m.user_id === currentUserId && <span className="opacity-60">(you)</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Separator />
                    {/* Split with */}
                    <div className="flex items-start gap-3">
                        <span className="text-xs font-medium text-muted-foreground w-16 shrink-0 pt-0.5">Split with</span>
                        <div className="flex flex-wrap gap-1.5">
                            {members.map(m => {
                                const checked = splitWith.has(m.user_id)
                                return (
                                    <button
                                        key={m.user_id}
                                        type="button"
                                        onClick={() => setSplitWith(prev => {
                                            const next = new Set(prev)
                                            if (next.has(m.user_id) && next.size > 1) next.delete(m.user_id)
                                            else next.add(m.user_id)
                                            return next
                                        })}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                                            checked
                                                ? "bg-primary/10 text-primary border-primary/40"
                                                : "border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                                        )}
                                    >
                                        <Avatar className="w-4 h-4">
                                            <AvatarImage src={m.avatar_url || undefined} />
                                            <AvatarFallback className="text-[8px]">{m.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        {m.display_name.split(" ")[0]}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    {splitWith.size > 0 && (
                        <p className="text-[11px] text-muted-foreground pl-[76px]">
                            Each person pays: {formatCurrency(totalSelectedAmount / splitWith.size)}
                        </p>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                    {totalSelectedItems > 0
                        ? `${totalSelectedItems} item${totalSelectedItems > 1 ? "s" : ""} · ${formatCurrency(totalSelectedAmount)}`
                        : "Expand a receipt to select items"}
                </p>
                <Button
                    disabled={totalSelectedItems === 0 || isSaving}
                    onClick={handleSave}
                    size="sm"
                >
                    {isSaving ? "Adding…" : `Add to Room →`}
                </Button>
            </div>
        </div>
    )
})

BrowseReceiptsStep.displayName = "BrowseReceiptsStep"
