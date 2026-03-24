"use client"

import { memo, useState } from "react"
import { ArrowDownToLine, Receipt, FileSpreadsheet, PenLine, Edit2, ChevronDown, ChevronUp, MinusCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { demoFetch } from "@/lib/demo/demo-fetch"

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
    currentUserId?: string
    currentUserRole?: string
    roomId?: string
    onDeleted?: () => void
}

function getSourceIcon(sourceType: string) {
    switch (sourceType) {
        case "personal_import": return <ArrowDownToLine className="w-3 h-3" />
        case "receipt": return <Receipt className="w-3 h-3" />
        case "statement": return <FileSpreadsheet className="w-3 h-3" />
        default: return <PenLine className="w-3 h-3" />
    }
}

function getSourceLabel(sourceType: string) {
    switch (sourceType) {
        case "personal_import": return "Import"
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
    const byUser = splits.reduce<Record<string, number>>((acc, s) => {
        acc[s.user_id] = (acc[s.user_id] ?? 0) + s.amount
        return acc
    }, {})

    return (
        <div className="flex flex-wrap gap-1">
            {Object.entries(byUser).map(([uid, amt]) => {
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

function ItemAmount({ amount }: { amount: number }) {
    const { formatCurrency } = useCurrency()
    return <>{formatCurrency(amount)}</>
}

function ExpandedItems({ items, splits }: { items: ReceiptItem[]; splits: Split[] }) {
    return (
        <div className="space-y-1.5">
            {items.map(item => {
                const itemSplits = splits.filter(s => s.item_id === item.id)
                return (
                    <div key={item.id} className="flex items-start justify-between gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2">
                        <div className="min-w-0 space-y-1">
                            <p className="truncate font-medium">{item.name}</p>
                            <AttributionChips splits={itemSplits} />
                        </div>
                        <span className="tabular-nums shrink-0 font-medium">
                            <ItemAmount amount={item.amount} />
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

function TransactionRow({
    tx,
    onEdit,
    canDelete,
    onDelete,
}: {
    tx: Transaction
    onEdit?: (txId: string) => void
    canDelete: boolean
    onDelete: (txId: string) => void
}) {
    const { formatCurrency } = useCurrency()
    const [expanded, setExpanded] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const sourceType = tx.source_type ?? (tx.metadata as any)?.source_type ?? "manual"
    const hasItems = (tx.items?.length ?? 0) > 0
    const topLevelSplits = (tx.splits ?? []).filter(s => !s.item_id)
    const unattributedItemCount = hasItems
        ? (tx.items ?? []).filter(item => !(tx.splits ?? []).some(s => s.item_id === item.id)).length
        : 0

    const handleDelete = async () => {
        if (!confirm("Delete this transaction? This cannot be undone.")) return
        setIsDeleting(true)
        try {
            await onDelete(tx.id)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <TableRow className="group hover:bg-muted/40">
                <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap py-3 pl-4">
                    {tx.transaction_date}
                </TableCell>
                <TableCell className="py-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground shrink-0">{getSourceIcon(sourceType)}</span>
                        <span className="font-medium text-sm truncate max-w-[180px]">{tx.description}</span>
                        <Badge variant="outline" className="text-[10px] h-4 shrink-0 hidden sm:flex">
                            {getSourceLabel(sourceType)}
                        </Badge>
                    </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-3 hidden md:table-cell">
                    {tx.uploader_name}
                </TableCell>
                <TableCell className="py-3">
                    {hasItems ? (
                        <button
                            type="button"
                            onClick={() => setExpanded(v => !v)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {tx.items!.length} items
                            {unattributedItemCount > 0 && (
                                <span className="text-amber-500 ml-1">· {unattributedItemCount} unattributed</span>
                            )}
                        </button>
                    ) : (
                        <AttributionChips splits={topLevelSplits} />
                    )}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-sm py-3 pr-2">
                    {formatCurrency(tx.total_amount)}
                </TableCell>
                <TableCell className="py-3 pr-4 w-16">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tx.id)}>
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </TableCell>
            </TableRow>

            {hasItems && expanded && (
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={6} className="py-2 pl-10 pr-4">
                        <ExpandedItems items={tx.items!} splits={tx.splits ?? []} />
                    </TableCell>
                </TableRow>
            )}
        </>
    )
}

export const RoomAttributionList = memo(function RoomAttributionList({
    transactions,
    onEditSplits,
    onAddTransactions,
    currentUserId,
    currentUserRole,
    roomId,
    onDeleted,
}: RoomAttributionListProps) {
    const [filter, setFilter] = useState<"all" | "unattributed">("all")

    const isAdmin = currentUserRole === "owner" || currentUserRole === "admin"

    const unattributedCount = transactions.filter(tx => !(tx.is_attributed ?? (tx.splits?.length ?? 0) > 0)).length

    const filtered = filter === "unattributed"
        ? transactions.filter(tx => !(tx.is_attributed ?? (tx.splits?.length ?? 0) > 0))
        : transactions

    const handleDelete = async (txId: string) => {
        if (!roomId) return
        try {
            const res = await demoFetch(`/api/rooms/${roomId}/transactions/${txId}`, {
                method: "DELETE",
            })
            if (!res.ok) {
                const json = await res.json()
                toast.error(json.error ?? "Failed to delete transaction")
                return
            }
            toast.success("Transaction deleted")
            onDeleted?.()
        } catch {
            toast.error("Failed to delete transaction")
        }
    }

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

            <div className="rounded-3xl border border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">
                        {filter === "unattributed"
                            ? "All transactions are attributed."
                            : "No transactions yet. Add a shared expense to get started."
                        }
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-border/40">
                                <TableHead className="pl-4 text-xs">Date</TableHead>
                                <TableHead className="text-xs">Description</TableHead>
                                <TableHead className="text-xs hidden md:table-cell">Added by</TableHead>
                                <TableHead className="text-xs">Attribution</TableHead>
                                <TableHead className="text-right text-xs pr-2">Amount</TableHead>
                                <TableHead className="w-16 pr-4" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(tx => {
                                const canDelete = isAdmin || tx.uploaded_by === currentUserId
                                return (
                                    <TransactionRow
                                        key={tx.id}
                                        tx={tx}
                                        onEdit={onEditSplits}
                                        canDelete={canDelete}
                                        onDelete={handleDelete}
                                    />
                                )
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    )
})

RoomAttributionList.displayName = "RoomAttributionList"
