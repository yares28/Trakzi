"use client"

import { memo, useMemo, useState } from "react"
import { Users, User, UserCheck, MinusCircle, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    // Attribution state
    mode: AttributionMode
    splitMembers: string[]     // user_ids for split mode
    splitAmounts: Record<string, number>  // custom amounts per user_id
    assignedTo: string         // user_id for "other" mode
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
    onChange: (items: PendingItem[]) => void
}

function getInitials(name: string) {
    return name.substring(0, 2).toUpperCase()
}

function SplitSubUI({
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
    const selected = new Set(item.splitMembers.length > 0 ? item.splitMembers : [currentUserId])

    const toggleMember = (userId: string) => {
        const next = new Set(selected)
        if (next.has(userId) && next.size > 1) {
            next.delete(userId)
        } else {
            next.add(userId)
        }
        const memberList = Array.from(next)
        const perPerson = Math.round((item.amount / memberList.length) * 100) / 100
        const amounts: Record<string, number> = {}
        memberList.forEach((id, i) => {
            const remainder = i === 0 ? Math.round((item.amount - perPerson * memberList.length) * 100) / 100 : 0
            amounts[id] = perPerson + remainder
        })
        onChange({ ...item, splitMembers: memberList, splitAmounts: amounts })
    }

    const perPerson = selected.size > 0 ? Math.round((item.amount / selected.size) * 100) / 100 : 0

    return (
        <div className="mt-2 pl-1 space-y-1.5 border-l-2 border-primary/20">
            <p className="text-xs text-muted-foreground font-medium pl-2">Split between:</p>
            {members.map(m => {
                const isSelected = selected.has(m.user_id)
                return (
                    <button
                        key={m.user_id}
                        type="button"
                        onClick={() => toggleMember(m.user_id)}
                        className={cn(
                            "flex items-center justify-between w-full pl-2 pr-2 py-1 rounded-md text-xs transition-colors",
                            isSelected
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/50"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <span className={cn(
                                "w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold",
                                isSelected ? "bg-primary text-primary-foreground border-primary" : "border-border"
                            )}>
                                {isSelected ? "✓" : ""}
                            </span>
                            {m.display_name}{m.user_id === currentUserId ? " (You)" : ""}
                        </span>
                        {isSelected && (
                            <span className="tabular-nums">{formatCurrency(perPerson)}</span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

function OtherSubUI({
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
    const others = members.filter(m => m.user_id !== currentUserId)
    return (
        <div className="mt-2 pl-1 space-y-1 border-l-2 border-rose-400/30">
            <p className="text-xs text-muted-foreground font-medium pl-2">Assign to:</p>
            {others.map(m => (
                <button
                    key={m.user_id}
                    type="button"
                    onClick={() => onChange({ ...item, assignedTo: m.user_id })}
                    className={cn(
                        "flex items-center gap-1.5 w-full pl-2 pr-2 py-1 rounded-md text-xs transition-colors",
                        item.assignedTo === m.user_id
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground hover:bg-muted/50"
                    )}
                >
                    <span className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold",
                        item.assignedTo === m.user_id ? "bg-rose-500 text-white border-rose-500" : "border-border"
                    )}>
                        {item.assignedTo === m.user_id ? "✓" : ""}
                    </span>
                    {m.display_name}
                </button>
            ))}
        </div>
    )
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
    const [expanded, setExpanded] = useState(false)

    const modes: { id: AttributionMode; label: string; icon: React.ReactNode }[] = [
        { id: "mine", label: "Mine", icon: <UserCheck className="w-3 h-3" /> },
        { id: "split", label: "Split", icon: <Users className="w-3 h-3" /> },
        { id: "other", label: "Other", icon: <User className="w-3 h-3" /> },
        { id: "skip", label: "Skip", icon: <MinusCircle className="w-3 h-3" /> },
    ]

    const handleModeClick = (mode: AttributionMode) => {
        let updated: PendingItem = { ...item, mode }
        if (mode === "mine") {
            updated = { ...updated, splitMembers: [currentUserId], splitAmounts: { [currentUserId]: item.amount }, assignedTo: "" }
        } else if (mode === "split") {
            updated = { ...updated, splitMembers: [currentUserId], splitAmounts: { [currentUserId]: item.amount }, assignedTo: "" }
            setExpanded(true)
        } else if (mode === "other") {
            updated = { ...updated, splitMembers: [], splitAmounts: {}, assignedTo: "" }
            setExpanded(true)
        } else {
            updated = { ...updated, splitMembers: [], splitAmounts: {}, assignedTo: "" }
            setExpanded(false)
        }
        onChange(updated)
    }

    const showSubUI = (item.mode === "split" || item.mode === "other") && expanded

    return (
        <div className="p-3 rounded-xl border border-border/40 bg-muted/10 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    {item.category && (
                        <Badge variant="outline" className="text-[10px] h-4 mt-0.5">{item.category}</Badge>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
                    {(item.mode === "split" || item.mode === "other") && (
                        <button
                            type="button"
                            onClick={() => setExpanded(v => !v)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
                {modes.map(m => (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModeClick(m.id)}
                        className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all",
                            item.mode === m.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        )}
                    >
                        {m.icon}
                        {m.label}
                    </button>
                ))}
            </div>
            {showSubUI && item.mode === "split" && (
                <SplitSubUI
                    item={item}
                    members={members}
                    currentUserId={currentUserId}
                    onChange={onChange}
                />
            )}
            {showSubUI && item.mode === "other" && (
                <OtherSubUI
                    item={item}
                    members={members}
                    currentUserId={currentUserId}
                    onChange={onChange}
                />
            )}
        </div>
    )
}

export const AttributionStep = memo(function AttributionStep({
    items,
    members,
    currentUserId,
    onChange,
}: AttributionStepProps) {
    const { formatCurrency } = useCurrency()
    const [filter, setFilter] = useState<"all" | "unattributed">("all")

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

    const filtered = filter === "unattributed"
        ? items.filter(i => i.mode === "skip" || (i.mode === "other" && !i.assignedTo))
        : items

    const unattributedCount = items.filter(i => i.mode === "skip" || (i.mode === "other" && !i.assignedTo)).length

    const handleItemChange = (updated: PendingItem) => {
        onChange(items.map(i => i.tempId === updated.tempId ? updated : i))
    }

    return (
        <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setFilter("all")}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    All ({items.length})
                </button>
                <button
                    type="button"
                    onClick={() => setFilter("unattributed")}
                    className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                        filter === "unattributed" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                >
                    Unattributed ({unattributedCount})
                </button>

                {/* Bulk actions */}
                <div className="ml-auto flex gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onChange(items.map(i => ({
                            ...i,
                            mode: "mine" as AttributionMode,
                            splitMembers: [currentUserId],
                            splitAmounts: { [currentUserId]: i.amount },
                            assignedTo: "",
                        })))}
                    >
                        All Mine
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onChange(items.map(i => {
                            const memberIds = members.map(m => m.user_id)
                            const perPerson = Math.round((i.amount / memberIds.length) * 100) / 100
                            const amounts: Record<string, number> = {}
                            memberIds.forEach((id, idx) => {
                                const rem = idx === 0 ? Math.round((i.amount - perPerson * memberIds.length) * 100) / 100 : 0
                                amounts[id] = perPerson + rem
                            })
                            return { ...i, mode: "split" as AttributionMode, splitMembers: memberIds, splitAmounts: amounts, assignedTo: "" }
                        }))}
                    >
                        Split All
                    </Button>
                </div>
            </div>

            {/* Item list */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">No items to show.</p>
                ) : filtered.map(item => (
                    <ItemRow
                        key={item.tempId}
                        item={item}
                        members={members}
                        currentUserId={currentUserId}
                        onChange={handleItemChange}
                    />
                ))}
            </div>

            {/* Summary footer */}
            <div className="border-t pt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Summary</p>
                <div className="flex flex-wrap gap-2">
                    {members
                        .filter(m => (summary.memberTotals[m.user_id] ?? 0) > 0)
                        .map(m => (
                            <div key={m.user_id} className="flex items-center gap-1.5 text-xs">
                                <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold">
                                    {getInitials(m.display_name)}
                                </span>
                                <span className="font-medium">{m.user_id === currentUserId ? "You" : m.display_name}:</span>
                                <span className="tabular-nums">{formatCurrency(summary.memberTotals[m.user_id] ?? 0)}</span>
                            </div>
                        ))
                    }
                </div>
                {summary.unattributedTotal > 0 && (
                    <p className="text-xs text-muted-foreground">
                        Unattributed: <span className="font-medium tabular-nums">{formatCurrency(summary.unattributedTotal)}</span>
                        {" "}({unattributedCount} {unattributedCount === 1 ? "item" : "items"})
                    </p>
                )}
            </div>
        </div>
    )
})

AttributionStep.displayName = "AttributionStep"
