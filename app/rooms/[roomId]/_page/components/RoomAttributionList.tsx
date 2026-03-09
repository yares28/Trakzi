"use client"

import { memo, useState } from "react"
import { ArrowDownToLine, Receipt, FileSpreadsheet, PenLine, Edit2, ChevronDown, ChevronUp, MinusCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"

interface Split {
    user_id: string
    display_name: string
    amount: number
    item_id?: string | null
}

interface ReceiptItem {
    id: string
    name: string
    amount: number
    quantity: number
    category: string | null
}

interface Transaction {
    id: string
    description: string
    total_amount: number
    currency: string
    transaction_date: string
    uploaded_by: string
    uploader_name: string
    split_type: string
    created_at: string
    metadata?: Record<string, unknown>
    splits?: Split[]
    items?: ReceiptItem[]
    is_attributed?: boolean
    source_type?: string
}

interface RoomAttributionListProps {
    transactions: Transaction[]
    onEditSplits?: (txId: string) => void
    onAddTransactions?: () => void
}

function getSourceIcon(sourceType: string) {
    switch (sourceType) {
        case "personal_import": return <ArrowDownToLine className="w-3.5 h-3.5" />
        case "receipt": return <Receipt className="w-3.5 h-3.5" />
        case "statement": return <FileSpreadsheet className="w-3.5 h-3.5" />
        default: return <PenLine className="w-3.5 h-3.5" />
    }
}

function getSourceLabel(sourceType: string) {
    switch (sourceType) {
        case "personal_import": return "Imported"
        case "receipt": return "Receipt"
        case "statement": return "Statement"
        default: return "Manual"
    }
}

function getInitials(name: string) {
    return name.substring(0, 2).toUpperCase()
}

function AttributionChips({ splits }: { splits: Split[] }) {
    const { formatCurrency } = useCurrency()
    if (splits.length === 0) {
        return (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 text-muted-foreground">
                <MinusCircle className="w-2.5 h-2.5" />
                Unattributed
            </Badge>
        )
    }
    // Group by user (for top-level splits)
    const byUser = splits.reduce<Record<string, number>>((acc, s) => {
        acc[s.user_id] = (acc[s.user_id] ?? 0) + s.amount
        return acc
    }, {})
    const entries = Object.entries(byUser)

    return (
        <div className="flex flex-wrap gap-1">
            {entries.map(([uid, amt]) => {
                const name = splits.find(s => s.user_id === uid)?.display_name ?? uid
                return (
                    <div key={uid} className="flex items-center gap-1 text-[10px] bg-muted/50 rounded-full px-2 py-0.5">
                        <Avatar className="w-3.5 h-3.5">
                            <AvatarFallback className="text-[8px]">{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <span>{name.split(" ")[0]}</span>
                        <span className="tabular-nums text-muted-foreground">{formatCurrency(amt)}</span>
                    </div>
                )
            })}
        </div>
    )
}

function TransactionRow({
    tx,
    onEdit,
}: {
    tx: Transaction
    onEdit?: (txId: string) => void
}) {
    const { formatCurrency } = useCurrency()
    const [expanded, setExpanded] = useState(false)
    const sourceType = tx.source_type ?? (tx.metadata as any)?.source_type ?? "manual"
    const hasItems = (tx.items?.length ?? 0) > 0
    const topLevelSplits = (tx.splits ?? []).filter(s => !s.item_id)
    const isAttributed = tx.is_attributed ?? (tx.splits?.length ?? 0) > 0
    const unattributedItemCount = hasItems
        ? (tx.items ?? []).filter(item => !(tx.splits ?? []).some(s => s.item_id === item.id)).length
        : 0

    return (
        <div className="px-6 py-4 space-y-2">
            {/* Main row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 text-muted-foreground shrink-0">
                        {getSourceIcon(sourceType)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{tx.description}</p>
                            <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                                {getSourceLabel(sourceType)}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {tx.uploader_name} · {tx.transaction_date}
                        </p>
                        {/* Attribution chips */}
                        {!hasItems && (
                            <div className="mt-1.5">
                                <AttributionChips splits={topLevelSplits} />
                            </div>
                        )}
                        {hasItems && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    {tx.items!.length} items
                                    {unattributedItemCount > 0 && (
                                        <span className="text-amber-500 ml-1">· {unattributedItemCount} unattributed</span>
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setExpanded(v => !v)}
                                    className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    {expanded ? "Collapse" : "Expand"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="font-semibold tabular-nums text-sm">{formatCurrency(tx.total_amount)}</p>
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onEdit(tx.id)}
                        >
                            <Edit2 className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Expanded items */}
            {hasItems && expanded && (
                <div className="pl-6 space-y-1.5">
                    {tx.items!.map(item => {
                        const itemSplits = (tx.splits ?? []).filter(s => s.item_id === item.id)
                        return (
                            <div key={item.id} className="flex items-start justify-between gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2">
                                <div className="min-w-0">
                                    <p className="truncate font-medium">{item.name}</p>
                                    <AttributionChips splits={itemSplits} />
                                </div>
                                <span className="tabular-nums shrink-0 font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export const RoomAttributionList = memo(function RoomAttributionList({
    transactions,
    onEditSplits,
    onAddTransactions,
}: RoomAttributionListProps) {
    const [filter, setFilter] = useState<"all" | "unattributed">("all")

    const unattributedCount = transactions.filter(tx => !(tx.is_attributed ?? (tx.splits?.length ?? 0) > 0)).length

    const filtered = filter === "unattributed"
        ? transactions.filter(tx => !(tx.is_attributed ?? (tx.splits?.length ?? 0) > 0))
        : transactions

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold">Transactions</h2>
                {onAddTransactions && (
                    <Button size="sm" onClick={onAddTransactions} className="gap-1.5">
                        + Add to Room
                    </Button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 px-1">
                <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    All ({transactions.length})
                </button>
                {unattributedCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setFilter("unattributed")}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                            filter === "unattributed" ? "bg-amber-500 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                        )}
                    >
                        Unattributed ({unattributedCount})
                    </button>
                )}
            </div>

            <Card className="border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden">
                {filtered.length === 0 ? (
                    <CardContent className="py-12 text-center text-muted-foreground text-sm">
                        {filter === "unattributed"
                            ? "All transactions are attributed."
                            : "No transactions yet. Add a shared expense to get started."
                        }
                    </CardContent>
                ) : (
                    <CardContent className="p-0 divide-y divide-border/30">
                        {filtered.map(tx => (
                            <TransactionRow
                                key={tx.id}
                                tx={tx}
                                onEdit={onEditSplits}
                            />
                        ))}
                    </CardContent>
                )}
            </Card>
        </div>
    )
})

RoomAttributionList.displayName = "RoomAttributionList"
