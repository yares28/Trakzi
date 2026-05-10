"use client"

import { memo, useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowRight, Check, X, AlertCircle, ListChecks } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import {
    useTransfers,
    useResolveTransfer,
    type TransferStatusFilter,
} from "@/hooks/use-transfers"
import type { AccountTransferWithDetails } from "@/lib/types/accounts"

const FILTER_TABS: { value: TransferStatusFilter; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "pending", label: "Pending" },
    { value: "suggested", label: "Suggested" },
    { value: "confirmed", label: "Confirmed" },
    { value: "all", label: "All" },
]

const fmtAmount = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function statusVariant(status: AccountTransferWithDetails["status"]) {
    switch (status) {
        case "pending":   return { label: "Pending",   className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" }
        case "suggested": return { label: "Suggested", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" }
        case "confirmed": return { label: "Confirmed", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" }
        case "rejected":  return { label: "Rejected",  className: "bg-muted text-muted-foreground" }
    }
}

const TransferCard = memo(function TransferCard({
    transfer,
    isResolving,
    onResolve,
}: {
    transfer: AccountTransferWithDetails
    isResolving: boolean
    onResolve: (id: string, action: "confirm" | "reject") => void
}) {
    const v = statusVariant(transfer.status)
    const isSuggested = transfer.status === "suggested"

    return (
        <div className="rounded-lg border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-base font-semibold tabular-nums">
                        {fmtAmount(transfer.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {transfer.fromTx.txDate}
                        {transfer.toTx.txDate !== transfer.fromTx.txDate && (
                            <> → {transfer.toTx.txDate}</>
                        )}
                    </p>
                </div>
                <Badge className={cn("shrink-0 text-[10px] tracking-wide uppercase", v.className)}>
                    {v.label}
                </Badge>
            </div>

            <div className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0">↗ From</span>
                    <Badge variant="outline" className="shrink-0">
                        {transfer.fromTx.accountName ?? "Unknown"}
                    </Badge>
                    <span className="truncate text-muted-foreground">
                        {transfer.fromTx.description}
                    </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0">↙ To</span>
                    <Badge variant="outline" className="shrink-0">
                        {transfer.toTx.accountName ?? "Unknown"}
                    </Badge>
                    <span className="truncate text-muted-foreground">
                        {transfer.toTx.description}
                    </span>
                </div>
            </div>

            {isSuggested && (
                <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                    <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                    Multiple matches looked plausible. Confirming below picks the best guess.
                </p>
            )}

            {transfer.status === "pending" || transfer.status === "suggested" ? (
                <div className="flex gap-2">
                    <Button
                        className="flex-1 h-11 gap-1.5"
                        disabled={isResolving}
                        onClick={() => onResolve(transfer.id, "confirm")}
                    >
                        <Check className="size-4" />
                        Confirm
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1 h-11 gap-1.5"
                        disabled={isResolving}
                        onClick={() => onResolve(transfer.id, "reject")}
                    >
                        <X className="size-4" />
                        Not a transfer
                    </Button>
                </div>
            ) : null}
        </div>
    )
})
TransferCard.displayName = "TransferCard"

const TransferTableRow = memo(function TransferTableRow({
    transfer,
    isResolving,
    onResolve,
}: {
    transfer: AccountTransferWithDetails
    isResolving: boolean
    onResolve: (id: string, action: "confirm" | "reject") => void
}) {
    const v = statusVariant(transfer.status)
    const resolvable = transfer.status === "pending" || transfer.status === "suggested"

    return (
        <TableRow>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                {transfer.fromTx.txDate}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="shrink-0">
                        {transfer.fromTx.accountName ?? "Unknown"}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {transfer.fromTx.description}
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-center">
                <ArrowRight className="size-3.5 text-muted-foreground inline" />
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="shrink-0">
                        {transfer.toTx.accountName ?? "Unknown"}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {transfer.toTx.description}
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
                {fmtAmount(transfer.amount)}
            </TableCell>
            <TableCell>
                <Badge className={cn("text-[10px] tracking-wide uppercase", v.className)}>
                    {v.label}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
                {resolvable ? (
                    <div className="flex justify-end gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 gap-1"
                            disabled={isResolving}
                            onClick={() => onResolve(transfer.id, "confirm")}
                        >
                            <Check className="size-3.5" />
                            Confirm
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 gap-1 text-muted-foreground"
                            disabled={isResolving}
                            onClick={() => onResolve(transfer.id, "reject")}
                        >
                            <X className="size-3.5" />
                            Reject
                        </Button>
                    </div>
                ) : null}
            </TableCell>
        </TableRow>
    )
})
TransferTableRow.displayName = "TransferTableRow"

export default function TransfersPage() {
    const isMobile = useIsMobile()
    const [filter, setFilter] = useState<TransferStatusFilter>("open")
    const { data: transfers = [], isLoading } = useTransfers(filter)
    const resolve = useResolveTransfer()
    const [resolvingId, setResolvingId] = useState<string | null>(null)
    const [bulkRunning, setBulkRunning] = useState(false)

    const handleResolve = async (id: string, action: "confirm" | "reject") => {
        setResolvingId(id)
        try {
            await resolve.mutateAsync({ id, action })
            toast.success(action === "confirm" ? "Transfer confirmed" : "Marked as not a transfer")
        } catch (err: any) {
            toast.error(err.message || "Failed to update transfer")
        } finally {
            setResolvingId(null)
        }
    }

    // Bulk confirm only the high-confidence rows currently visible.
    // 'suggested' rows are ambiguous by definition — the user must pick those one-by-one.
    const bulkConfirmable = useMemo(
        () => transfers.filter(t => t.status === "pending"),
        [transfers]
    )

    const handleBulkConfirm = async () => {
        if (bulkConfirmable.length === 0) return
        setBulkRunning(true)
        let succeeded = 0
        let failed = 0
        for (const t of bulkConfirmable) {
            try {
                await resolve.mutateAsync({ id: t.id, action: "confirm" })
                succeeded += 1
            } catch {
                failed += 1
            }
        }
        setBulkRunning(false)
        if (succeeded > 0) {
            toast.success(`Confirmed ${succeeded} transfer${succeeded > 1 ? "s" : ""}`)
        }
        if (failed > 0) {
            toast.error(`Failed to confirm ${failed} transfer${failed > 1 ? "s" : ""}`)
        }
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72 - 15px)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="@container/main flex flex-1 flex-col gap-2 pt-[72px] md:pt-0 overflow-y-auto overflow-x-hidden min-w-0">
                        <div className="flex flex-col gap-4 pb-4 md:gap-6 md:pb-6 min-w-0 w-full px-4 lg:px-6">
                            <header className="flex flex-col gap-1">
                                <h1 className="text-2xl font-semibold tracking-tight">Transfers</h1>
                                <p className="text-sm text-muted-foreground">
                                    Internal moves between your accounts. Confirming a transfer removes both legs from spending and income totals.
                                </p>
                            </header>

                            <div className="flex flex-wrap items-center gap-2 justify-between">
                                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border w-max">
                                    {FILTER_TABS.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setFilter(t.value)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                                filter === t.value
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                {bulkConfirmable.length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        disabled={bulkRunning}
                                        onClick={handleBulkConfirm}
                                    >
                                        <ListChecks className="size-4" />
                                        Confirm {bulkConfirmable.length} pending
                                    </Button>
                                )}
                            </div>

                            {isLoading ? (
                                <div className="space-y-3">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
                                    ))}
                                </div>
                            ) : transfers.length === 0 ? (
                                <div className="rounded-lg border border-dashed py-12 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        No transfers in this view.
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Detected transfers from imports show up here for review.
                                    </p>
                                </div>
                            ) : isMobile ? (
                                <div className="flex flex-col gap-3">
                                    {transfers.map(t => (
                                        <TransferCard
                                            key={t.id}
                                            transfer={t}
                                            isResolving={resolvingId === t.id || bulkRunning}
                                            onResolve={handleResolve}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>From</TableHead>
                                                <TableHead className="w-8" />
                                                <TableHead>To</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right w-[180px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transfers.map(t => (
                                                <TransferTableRow
                                                    key={t.id}
                                                    transfer={t}
                                                    isResolving={resolvingId === t.id || bulkRunning}
                                                    onResolve={handleResolve}
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
