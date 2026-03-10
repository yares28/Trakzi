"use client"

import { memo, useState, useMemo, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { demoFetch } from "@/lib/demo/demo-fetch"

import {
    AttributionStep,
    type PendingItem,
    type RoomMember,
    type AttributionMode,
} from "@/components/rooms/attribution-step"

interface Split {
    id: string
    user_id: string
    display_name: string
    amount: number
    item_id: string | null
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
    splits?: Split[]
    items?: ReceiptItem[]
    uploaded_by?: string
    uploader_name?: string
}

interface RoomTransactionEditSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction: Transaction | null
    members: RoomMember[]
    currentUserId: string
    roomId: string
}

function nanoid() {
    return Math.random().toString(36).slice(2, 10)
}

function txToItems(tx: Transaction, currentUserId: string): PendingItem[] {
    const hasItems = (tx.items?.length ?? 0) > 0

    if (hasItems) {
        return tx.items!.map(item => {
            const itemSplits = (tx.splits ?? []).filter(s => s.item_id === item.id)
            let mode: AttributionMode = "skip"
            let splitMembers: string[] = []
            let splitAmounts: Record<string, number> = {}
            let assignedTo = ""

            if (itemSplits.length === 1) {
                if (itemSplits[0].user_id === currentUserId) {
                    mode = "mine"
                    splitMembers = [currentUserId]
                    splitAmounts = { [currentUserId]: itemSplits[0].amount }
                    assignedTo = currentUserId
                } else {
                    mode = "other"
                    assignedTo = itemSplits[0].user_id
                    splitMembers = [itemSplits[0].user_id]
                    splitAmounts = { [itemSplits[0].user_id]: itemSplits[0].amount }
                }
            } else if (itemSplits.length > 1) {
                mode = "split"
                splitMembers = itemSplits.map(s => s.user_id)
                splitAmounts = Object.fromEntries(itemSplits.map(s => [s.user_id, s.amount]))
            }

            return { tempId: item.id, name: item.name, amount: item.amount, quantity: item.quantity, category: item.category, mode, splitMembers, splitAmounts, assignedTo }
        })
    }

    const splits = (tx.splits ?? []).filter(s => !s.item_id)
    let mode: AttributionMode = "skip"
    let splitMembers: string[] = []
    let splitAmounts: Record<string, number> = {}
    let assignedTo = ""

    if (splits.length === 1) {
        if (splits[0].user_id === currentUserId) {
            mode = "mine"
            splitMembers = [currentUserId]
            splitAmounts = { [currentUserId]: splits[0].amount }
            assignedTo = currentUserId
        } else {
            mode = "other"
            assignedTo = splits[0].user_id
            splitMembers = [splits[0].user_id]
            splitAmounts = { [splits[0].user_id]: splits[0].amount }
        }
    } else if (splits.length > 1) {
        mode = "split"
        splitMembers = splits.map(s => s.user_id)
        splitAmounts = Object.fromEntries(splits.map(s => [s.user_id, s.amount]))
    }

    return [{ tempId: nanoid(), name: tx.description, amount: tx.total_amount, mode, splitMembers, splitAmounts, assignedTo }]
}

export const RoomTransactionEditSheet = memo(function RoomTransactionEditSheet({
    open,
    onOpenChange,
    transaction,
    members,
    currentUserId,
    roomId,
}: RoomTransactionEditSheetProps) {
    const queryClient = useQueryClient()
    const [isSaving, setIsSaving] = useState(false)
    const [items, setItems] = useState<PendingItem[]>([])

    // Sync items when transaction changes or dialog opens
    useEffect(() => {
        if (transaction) setItems(txToItems(transaction, currentUserId))
    }, [transaction, currentUserId])

    // The uploader is the "paid by" person
    const paidByMember = transaction?.uploaded_by
        ? members.find(m => m.user_id === transaction.uploaded_by) ?? null
        : null

    const handleSave = async () => {
        if (!transaction) return
        setIsSaving(true)
        try {
            const hasItems = (transaction.items?.length ?? 0) > 0

            if (hasItems) {
                for (const item of items) {
                    const splits = buildSplitsForItem(item)
                    const res = await demoFetch(
                        `/api/rooms/${roomId}/transactions/${transaction.id}/splits`,
                        {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                split_type: "custom",
                                splits: splits.map(s => ({ ...s, item_id: item.tempId })),
                            }),
                        }
                    )
                    if (!res.ok) {
                        const json = await res.json()
                        toast.error(json.error ?? "Failed to update attribution")
                        return
                    }
                }
            } else {
                const singleItem = items[0]
                const splits = singleItem ? buildSplitsForItem(singleItem) : []
                const res = await demoFetch(
                    `/api/rooms/${roomId}/transactions/${transaction.id}/splits`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ split_type: "custom", splits }),
                    }
                )
                if (!res.ok) {
                    const json = await res.json()
                    toast.error(json.error ?? "Failed to update attribution")
                    return
                }
            }

            queryClient.invalidateQueries({ queryKey: ["room-bundle", roomId] })
            toast.success("Attribution updated")
            onOpenChange(false)
        } finally {
            setIsSaving(false)
        }
    }

    function buildSplitsForItem(item: PendingItem) {
        if (item.mode === "mine") return [{ user_id: currentUserId, amount: item.amount }]
        if (item.mode === "split") return item.splitMembers.map(uid => ({ user_id: uid, amount: item.splitAmounts[uid] ?? 0 }))
        if (item.mode === "other" && item.assignedTo) return [{ user_id: item.assignedTo, amount: item.amount }]
        return []
    }

    if (!transaction) return null

    const hasReceiptItems = (transaction.items?.length ?? 0) > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="text-base font-semibold leading-tight">
                        {transaction.description}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {hasReceiptItems
                            ? `Attribute ${transaction.items!.length} receipt items to room members`
                            : "Update how this transaction is split between members"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 py-2">
                    <AttributionStep
                        items={items}
                        members={members}
                        currentUserId={currentUserId}
                        paidByMember={paidByMember}
                        onChange={setItems}
                    />
                </div>

                <div className="shrink-0 border-t pt-4 mt-2">
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Saving…" : "Save Attribution"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
})

RoomTransactionEditSheet.displayName = "RoomTransactionEditSheet"
