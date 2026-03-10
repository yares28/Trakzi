"use client"

import { memo, useMemo } from "react"
import { Users, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"

export type AttributionMode = "mine" | "split" | "other" | "skip"

export interface PendingItem {
    tempId: string
    name: string
    amount: number
    quantity?: number
    category?: string | null
    date?: string
    mode: AttributionMode
    splitMembers: string[]
    splitAmounts: Record<string, number>
    assignedTo: string
}

export interface RoomMember {
    user_id: string
    display_name: string
    avatar_url: string | null
}

interface AttributionStepProps {
    items: PendingItem[]
    members: RoomMember[]
    currentUserId: string
    paidByUserId?: string
    paidByMember?: RoomMember | null
    onChange: (items: PendingItem[]) => void
}

function getInitials(name: string) {
    const parts = name.trim().split(" ")
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
}

// Compact chip showing the current attribution state of an item
function StatusBadge({ item, members, currentUserId }: { item: PendingItem; members: RoomMember[]; currentUserId: string }) {
    if (item.mode === "skip") {
        return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">Skip</span>
    }
    if (item.mode === "mine") {
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Mine</span>
    }
    if (item.mode === "split") {
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Split ×{item.splitMembers.length}</span>
    }
    if (item.mode === "other" && item.assignedTo) {
        const m = members.find(m => m.user_id === item.assignedTo)
        return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">→ {m?.display_name.split(" ")[0] ?? "?"}</span>
    }
    return <span className="inline-flex items-center text-[10px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">Unset</span>
}

function ItemRow({
    item,
    members,
    currentUserId,
    onChange,
}: {
    item: PendingItem
    members: RoomMember[]
    currentUserId: string
    onChange: (updated: PendingItem) => void
}) {
    const { formatCurrency } = useCurrency()

    const selectedSet = useMemo(() => {
        if (item.mode === "skip") return new Set<string>()
        if (item.mode === "mine") return new Set([currentUserId])
        if (item.mode === "other" && item.assignedTo) return new Set([item.assignedTo])
        if (item.mode === "split") return new Set(item.splitMembers)
        return new Set<string>()
    }, [item, currentUserId])

    const toggleMember = (userId: string) => {
        const next = new Set(selectedSet)
        if (next.has(userId)) {
            if (next.size > 1) next.delete(userId)
            // single last member: can't deselect — use skip instead
        } else {
            next.add(userId)
        }
        applySelection(next)
    }

    const applySelection = (next: Set<string>) => {
        const memberList = Array.from(next)
        if (memberList.length === 0) {
            onChange({ ...item, mode: "skip", splitMembers: [], splitAmounts: {}, assignedTo: "" })
            return
        }
        if (memberList.length === 1) {
            const uid = memberList[0]
            const mode: AttributionMode = uid === currentUserId ? "mine" : "other"
            onChange({ ...item, mode, splitMembers: [uid], splitAmounts: { [uid]: item.amount }, assignedTo: uid })
        } else {
            const perPerson = Math.round((item.amount / memberList.length) * 100) / 100
            const amounts: Record<string, number> = {}
            memberList.forEach((id, i) => {
                const rem = i === 0 ? Math.round((item.amount - perPerson * memberList.length) * 100) / 100 : 0
                amounts[id] = perPerson + rem
            })
            onChange({ ...item, mode: "split", splitMembers: memberList, splitAmounts: amounts, assignedTo: "" })
        }
    }

    const perPersonAmount = selectedSet.size > 1 ? item.amount / selectedSet.size : 0
    const isSkipped = item.mode === "skip"

    return (
        <div className={cn(
            "rounded-2xl border transition-colors",
            isSkipped
                ? "border-border/25 bg-muted/5"
                : "border-border/50 bg-card shadow-sm"
        )}>
            {/* ── Header row ── */}
            <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
                <div className="min-w-0 flex-1 space-y-1">
                    <p className={cn("text-sm font-semibold truncate leading-tight", isSkipped && "text-muted-foreground/60")}>
                        {item.name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {item.category && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">{item.category}</Badge>
                        )}
                        {item.date && (
                            <span className="text-[10px] text-muted-foreground/70">{item.date.slice(0, 10)}</span>
                        )}
                        {item.quantity && item.quantity > 1 && (
                            <span className="text-[10px] text-muted-foreground/70">×{item.quantity}</span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("text-sm font-bold tabular-nums", isSkipped && "text-muted-foreground/50")}>
                        {formatCurrency(item.amount)}
                    </span>
                    <StatusBadge item={item} members={members} currentUserId={currentUserId} />
                </div>
            </div>

            {/* ── Divider ── */}
            <div className="h-px bg-border/30 mx-4" />

            {/* ── Avatar selector row ── */}
            <div className="px-4 py-3 flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mr-1 shrink-0 whitespace-nowrap">
                    Owes:
                </span>

                <div className="flex items-start gap-2 flex-wrap flex-1">
                    {members.map(m => {
                        const isSelected = selectedSet.has(m.user_id)
                        const firstName = m.user_id === currentUserId ? "You" : m.display_name.split(" ")[0]
                        const splitAmount = isSelected && item.splitAmounts[m.user_id]
                            ? item.splitAmounts[m.user_id]
                            : (isSelected ? item.amount : null)

                        return (
                            <button
                                key={m.user_id}
                                type="button"
                                onClick={() => toggleMember(m.user_id)}
                                className="flex flex-col items-center gap-0.5 transition-all group focus:outline-none"
                                title={m.display_name + (m.user_id === currentUserId ? " (you)" : "")}
                            >
                                <div className={cn(
                                    "rounded-full transition-all duration-150",
                                    isSelected
                                        ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-105"
                                        : "opacity-30 hover:opacity-60 group-hover:ring-1 group-hover:ring-border group-hover:ring-offset-1 group-hover:ring-offset-background"
                                )}>
                                    <Avatar className="w-9 h-9">
                                        <AvatarImage src={m.avatar_url || undefined} />
                                        <AvatarFallback className={cn(
                                            "text-xs font-bold",
                                            isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            {getInitials(m.display_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium transition-colors max-w-[40px] truncate text-center",
                                    isSelected ? "text-foreground" : "text-muted-foreground/50"
                                )}>
                                    {firstName}
                                </span>
                                {isSelected && splitAmount !== null && (
                                    <span className="text-[9px] font-semibold tabular-nums text-primary/80">
                                        {formatCurrency(splitAmount)}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Skip pill — right aligned */}
                <button
                    type="button"
                    onClick={() => onChange({ ...item, mode: "skip", splitMembers: [], splitAmounts: {}, assignedTo: "" })}
                    className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all shrink-0 ml-auto",
                        isSkipped
                            ? "bg-muted/70 border-border/60 text-muted-foreground"
                            : "border-border/40 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/70 hover:bg-muted/30"
                    )}
                >
                    <X className="w-3 h-3" /> Skip
                </button>
            </div>
        </div>
    )
}

export const AttributionStep = memo(function AttributionStep({
    items,
    members,
    currentUserId,
    paidByMember,
    onChange,
}: AttributionStepProps) {
    const { formatCurrency } = useCurrency()

    const summary = useMemo(() => {
        const memberTotals: Record<string, number> = {}
        let unattributedTotal = 0

        for (const item of items) {
            if (item.mode === "mine") {
                memberTotals[currentUserId] = (memberTotals[currentUserId] ?? 0) + item.amount
            } else if (item.mode === "split") {
                for (const [uid, amt] of Object.entries(item.splitAmounts)) {
                    memberTotals[uid] = (memberTotals[uid] ?? 0) + amt
                }
            } else if (item.mode === "other" && item.assignedTo) {
                memberTotals[item.assignedTo] = (memberTotals[item.assignedTo] ?? 0) + item.amount
            } else {
                unattributedTotal += item.amount
            }
        }
        return { memberTotals, unattributedTotal }
    }, [items, currentUserId])

    const unattributedCount = items.filter(i => i.mode === "skip" || (i.mode === "other" && !i.assignedTo)).length
    const handleItemChange = (updated: PendingItem) =>
        onChange(items.map(i => i.tempId === updated.tempId ? updated : i))

    return (
        <div className="space-y-4">
            {/* ── Paid by + bulk actions row ── */}
            <div className="flex items-center gap-2 flex-wrap">
                {paidByMember ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/40 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground font-medium shrink-0">Paid by</span>
                        <Avatar className="w-6 h-6 shrink-0">
                            <AvatarImage src={paidByMember.avatar_url || undefined} />
                            <AvatarFallback className="text-[9px] font-bold">{getInitials(paidByMember.display_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold truncate">{paidByMember.display_name}</span>
                        {paidByMember.user_id === currentUserId && (
                            <span className="text-xs text-muted-foreground shrink-0">(you)</span>
                        )}
                    </div>
                ) : <div className="flex-1" />}

                <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-8 text-xs"
                        onClick={() => onChange(items.map(i => ({
                            ...i, mode: "mine" as AttributionMode,
                            splitMembers: [currentUserId], splitAmounts: { [currentUserId]: i.amount }, assignedTo: currentUserId,
                        })))}>
                        All Mine
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1"
                        onClick={() => onChange(items.map(i => {
                            const memberIds = members.map(m => m.user_id)
                            const perPerson = Math.round((i.amount / memberIds.length) * 100) / 100
                            const amounts: Record<string, number> = {}
                            memberIds.forEach((id, idx) => {
                                const rem = idx === 0 ? Math.round((i.amount - perPerson * memberIds.length) * 100) / 100 : 0
                                amounts[id] = perPerson + rem
                            })
                            return { ...i, mode: "split" as AttributionMode, splitMembers: memberIds, splitAmounts: amounts, assignedTo: "" }
                        }))}>
                        <Users className="w-3 h-3" /> Split All
                    </Button>
                </div>
            </div>

            {/* ── Item list ── */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                {items.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No items to attribute.</p>
                ) : items.map(item => (
                    <ItemRow
                        key={item.tempId}
                        item={item}
                        members={members}
                        currentUserId={currentUserId}
                        onChange={handleItemChange}
                    />
                ))}
            </div>

            {/* ── Summary footer ── */}
            {(Object.keys(summary.memberTotals).length > 0 || summary.unattributedTotal > 0) && (
                <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {members
                            .filter(m => (summary.memberTotals[m.user_id] ?? 0) > 0)
                            .map(m => (
                                <div key={m.user_id} className="flex items-center gap-2">
                                    <Avatar className="w-5 h-5 shrink-0">
                                        <AvatarImage src={m.avatar_url || undefined} />
                                        <AvatarFallback className="text-[8px]">{getInitials(m.display_name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {m.user_id === currentUserId ? "You" : m.display_name.split(" ")[0]}
                                    </span>
                                    <span className="ml-auto text-xs font-semibold tabular-nums text-foreground">
                                        {formatCurrency(summary.memberTotals[m.user_id] ?? 0)}
                                    </span>
                                </div>
                            ))
                        }
                    </div>
                    {summary.unattributedTotal > 0 && (
                        <div className="flex items-center justify-between pt-1 border-t border-border/30">
                            <span className="text-xs text-amber-600 dark:text-amber-400">
                                Skipped ({unattributedCount} {unattributedCount === 1 ? "item" : "items"})
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                                {formatCurrency(summary.unattributedTotal)}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
})

AttributionStep.displayName = "AttributionStep"
