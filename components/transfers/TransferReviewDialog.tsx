"use client"

import { memo, useState } from "react"
import { toast } from "sonner"
import { ArrowRight, Check, X, RefreshCw } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { usePendingTransfers, useResolveTransfer } from "@/hooks/use-transfers"
import type { AccountTransferWithDetails } from "@/lib/types/accounts"

interface TransferReviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const TransferRow = memo(function TransferRow({
    transfer,
    onResolve,
    isResolving,
}: {
    transfer: AccountTransferWithDetails
    onResolve: (id: string, action: "confirm" | "reject") => void
    isResolving: boolean
}) {
    const fmt = (n: number) =>
        n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
        <div className="flex items-start gap-3 py-3 border-b last:border-0">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{transfer.fromTx.txDate}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                        {transfer.fromTx.accountName ?? "Unknown"}
                    </Badge>
                    <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                    <Badge variant="outline" className="text-xs shrink-0">
                        {transfer.toTx.accountName ?? "Unknown"}
                    </Badge>
                </div>
                <p className="text-sm font-medium mt-1 truncate">{transfer.fromTx.description}</p>
                <p className="text-sm text-muted-foreground">
                    {fmt(transfer.amount)}
                </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1"
                    disabled={isResolving}
                    onClick={() => onResolve(transfer.id, "confirm")}
                >
                    <Check className="size-3" />
                    Confirm
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                    disabled={isResolving}
                    onClick={() => onResolve(transfer.id, "reject")}
                >
                    <X className="size-3" />
                    Not a transfer
                </Button>
            </div>
        </div>
    )
})

TransferRow.displayName = "TransferRow"

export const TransferReviewDialog = memo(function TransferReviewDialog({
    open,
    onOpenChange,
}: TransferReviewDialogProps) {
    const { data: transfers = [], isLoading, refetch } = usePendingTransfers()
    const resolveTransfer = useResolveTransfer()
    const [resolvingId, setResolvingId] = useState<string | null>(null)

    const handleResolve = async (id: string, action: "confirm" | "reject") => {
        setResolvingId(id)
        try {
            await resolveTransfer.mutateAsync({ id, action })
            toast.success(action === "confirm" ? "Transfer confirmed" : "Marked as not a transfer")
        } catch (err: any) {
            toast.error(err.message || "Failed to update transfer")
        } finally {
            setResolvingId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Review Transfers</DialogTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => refetch()}
                        >
                            <RefreshCw className="size-3.5" />
                        </Button>
                    </div>
                    <DialogDescription>
                        These transactions look like internal transfers between your accounts.
                        Confirming them removes them from your expense analytics.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0">
                    {isLoading ? (
                        <div className="space-y-3 py-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : transfers.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-sm text-muted-foreground">No pending transfers to review.</p>
                        </div>
                    ) : (
                        <div>
                            {transfers.map(t => (
                                <TransferRow
                                    key={t.id}
                                    transfer={t}
                                    onResolve={handleResolve}
                                    isResolving={resolvingId === t.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
})

TransferReviewDialog.displayName = "TransferReviewDialog"
