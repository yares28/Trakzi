"use client"

import { memo, useState, useCallback } from "react"
import { ArrowLeft, ClipboardList, ScanLine, FileSpreadsheet, Upload, X, AlertTriangle } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/components/currency-provider"
import { demoFetch } from "@/lib/demo/demo-fetch"

import {
    AttributionStep,
    type PendingItem,
    type RoomMember,
    type AttributionMode,
} from "./attribution-step"
import { BrowseTransactionsStep } from "./browse-transactions-step"

type SourceType = "my-txns" | "receipt" | "statement"
type Step = "source" | "browse" | "upload-receipt" | "upload-statement" | "attribute"

interface AddToRoomDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    roomId: string
    members: RoomMember[]
    currentUserId: string
}

function nanoid() {
    return Math.random().toString(36).slice(2, 10)
}

// ─── Receipt Upload Step ────────────────────────────────────────────────────

interface ParsedReceiptItem {
    name: string
    amount: number
    quantity: number
    category: string | null
}

interface ParsedReceipt {
    store_name: string | null
    receipt_date: string | null
    total_amount: number | null
    currency: string | null
    items: ParsedReceiptItem[]
    warnings: string[]
}

function ReceiptUploadStep({
    roomId,
    onContinue,
}: {
    roomId: string
    onContinue: (parsed: ParsedReceipt) => void
}) {
    const [file, setFile] = useState<File | null>(null)
    const [parsedItems, setParsedItems] = useState<ParsedReceiptItem[]>([])
    const [parsedMeta, setParsedMeta] = useState<Omit<ParsedReceipt, "items"> | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { formatCurrency } = useCurrency()

    const handleFile = async (f: File) => {
        setFile(f)
        setError(null)
        setIsLoading(true)
        try {
            const form = new FormData()
            form.append("file", f)
            const res = await demoFetch(`/api/rooms/${roomId}/transactions/parse-receipt`, {
                method: "POST",
                body: form,
            })
            const json = await res.json()
            if (!res.ok) {
                setError(json.error ?? "Failed to parse receipt")
                return
            }
            const data = json.data as ParsedReceipt
            setParsedItems(data.items)
            setParsedMeta({ store_name: data.store_name, receipt_date: data.receipt_date, total_amount: data.total_amount, currency: data.currency, warnings: data.warnings })
            setSelectedIds(new Set(data.items.map((_, i) => i)))
        } finally {
            setIsLoading(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
    }

    const selectedItems = parsedItems.filter((_, i) => selectedIds.has(i))
    const selectedTotal = selectedItems.reduce((s, it) => s + it.amount, 0)

    if (!parsedItems.length) {
        return (
            <div className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 text-sm text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}
                <div
                    className={cn(
                        "relative border-2 border-dashed rounded-2xl p-10 text-center transition-colors",
                        isLoading ? "opacity-50 pointer-events-none" : "hover:border-primary/50 cursor-pointer"
                    )}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("receipt-file-input")?.click()}
                >
                    <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium">
                        {isLoading ? "Parsing receipt..." : "Drag & drop receipt image or PDF here"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Supports: JPG, PNG, WebP, PDF</p>
                    <input
                        id="receipt-file-input"
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                    />
                </div>
                {isLoading && (
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Receipt header */}
            <div className="flex items-center justify-between text-sm">
                <div>
                    {parsedMeta?.store_name && <span className="font-medium">{parsedMeta.store_name}</span>}
                    {parsedMeta?.receipt_date && <span className="text-muted-foreground ml-2">{parsedMeta.receipt_date}</span>}
                </div>
                {parsedMeta?.total_amount && (
                    <span className="font-semibold">{formatCurrency(parsedMeta.total_amount)} total</span>
                )}
            </div>
            {parsedMeta?.warnings && parsedMeta.warnings.length > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg space-y-0.5">
                    {parsedMeta.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
            )}

            {/* Items list */}
            <div className="max-h-[280px] overflow-y-auto border rounded-xl divide-y divide-border/30">
                {parsedItems.map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedIds(prev => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                        })}
                    >
                        <Checkbox checked={selectedIds.has(i)} onCheckedChange={() => { }} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.name}</p>
                            {item.category && <span className="text-[10px] text-muted-foreground">{item.category}</span>}
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-medium tabular-nums">{formatCurrency(item.amount)}</p>
                            {item.quantity > 1 && <p className="text-[10px] text-muted-foreground">×{item.quantity}</p>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                    {selectedIds.size} items selected ({formatCurrency(selectedTotal)})
                </p>
                <Button
                    disabled={selectedIds.size === 0}
                    size="sm"
                    onClick={() => onContinue({ ...parsedMeta!, items: selectedItems })}
                >
                    Continue to Attribution →
                </Button>
            </div>
        </div>
    )
}

// ─── Statement Upload Step ────────────────────────────────────────────────────

interface ParsedRow {
    date: string
    description: string
    amount: number
    category: string | null
}

function StatementUploadStep({
    roomId,
    onContinue,
}: {
    roomId: string
    onContinue: (rows: ParsedRow[]) => void
}) {
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
    const [diagnostics, setDiagnostics] = useState<{ totalRows: number; validRows: number; warnings: string[] } | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { formatCurrency } = useCurrency()

    const handleFile = async (f: File) => {
        setError(null)
        setIsLoading(true)
        try {
            const form = new FormData()
            form.append("file", f)
            const res = await demoFetch(`/api/rooms/${roomId}/transactions/parse-statement`, {
                method: "POST",
                body: form,
            })
            const json = await res.json()
            if (!res.ok) {
                setError(json.error ?? "Failed to parse statement")
                return
            }
            const rows = json.data.rows as ParsedRow[]
            setParsedRows(rows)
            setDiagnostics(json.data.diagnostics)
            // Select all by default (excluding income/positive)
            setSelectedIds(new Set(rows.map((_, i) => i).filter(i => rows[i].amount < 0)))
        } finally {
            setIsLoading(false)
        }
    }

    const selectedRows = parsedRows.filter((_, i) => selectedIds.has(i))
    const selectedTotal = selectedRows.reduce((s, r) => s + Math.abs(r.amount), 0)

    if (!parsedRows.length) {
        return (
            <div className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 text-sm text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}
                <div
                    className={cn(
                        "relative border-2 border-dashed rounded-2xl p-10 text-center transition-colors",
                        isLoading ? "opacity-50 pointer-events-none" : "hover:border-primary/50 cursor-pointer"
                    )}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    onClick={() => document.getElementById("statement-file-input")?.click()}
                >
                    <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium">
                        {isLoading ? "Parsing statement..." : "Drag & drop bank statement here"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Supports: CSV, XLSX, PDF</p>
                    <input
                        id="statement-file-input"
                        type="file"
                        accept=".csv,.xlsx,.xls,application/pdf,text/csv"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                    />
                </div>
                {isLoading && (
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {diagnostics && (
                <div className="text-xs text-muted-foreground">
                    Found {diagnostics.validRows} transactions
                    {diagnostics.totalRows !== diagnostics.validRows && ` (${diagnostics.totalRows - diagnostics.validRows} skipped)`}
                    {diagnostics.warnings.length > 0 && (
                        <span className="text-amber-600 ml-1">⚠ {diagnostics.warnings.length} warning(s)</span>
                    )}
                </div>
            )}

            <div className="max-h-[300px] overflow-y-auto border rounded-xl divide-y divide-border/30">
                {parsedRows.map((row, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/30"
                        onClick={() => setSelectedIds(prev => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                        })}
                    >
                        <Checkbox checked={selectedIds.has(i)} onCheckedChange={() => { }} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{row.description}</p>
                            <p className="text-xs text-muted-foreground">{row.date}</p>
                        </div>
                        <span className={cn(
                            "text-sm font-medium tabular-nums shrink-0",
                            row.amount < 0 ? "text-rose-500" : "text-emerald-500"
                        )}>
                            {row.amount < 0 ? "" : "+"}{formatCurrency(row.amount)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
                <p className="text-sm text-muted-foreground">
                    {selectedIds.size} selected ({formatCurrency(selectedTotal)})
                </p>
                <Button
                    disabled={selectedIds.size === 0}
                    size="sm"
                    onClick={() => onContinue(selectedRows)}
                >
                    Continue to Attribution →
                </Button>
            </div>
        </div>
    )
}

// ─── Main Dialog ─────────────────────────────────────────────────────────────

export const AddToRoomDialog = memo(function AddToRoomDialog({
    open,
    onOpenChange,
    roomId,
    members,
    currentUserId,
}: AddToRoomDialogProps) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState<Step>("source")
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
    const [sourceType, setSourceType] = useState<SourceType>("my-txns")
    const [isSaving, setIsSaving] = useState(false)
    const [receiptMeta, setReceiptMeta] = useState<{ store_name?: string | null; receipt_date?: string | null; total_amount?: number | null } | null>(null)

    const reset = () => {
        setStep("source")
        setPendingItems([])
        setReceiptMeta(null)
    }

    const handleOpenChange = (v: boolean) => {
        if (!v) reset()
        onOpenChange(v)
    }

    // Convert personal transactions to PendingItems
    const handlePersonalTxsContinue = useCallback((txs: { id: number; date: string; description: string; amount: number; category_name: string | null }[]) => {
        const items: PendingItem[] = txs.map(tx => ({
            tempId: nanoid(),
            name: tx.description,
            amount: Math.abs(tx.amount),
            category: tx.category_name,
            date: tx.date,
            mode: "skip" as AttributionMode,
            splitMembers: [],
            splitAmounts: {},
            assignedTo: "",
        }))
        setPendingItems(items)
        setSourceType("my-txns")
        setStep("attribute")
    }, [])

    // Convert receipt items to PendingItems
    const handleReceiptContinue = useCallback((parsed: { store_name: string | null; receipt_date: string | null; total_amount: number | null; currency: string | null; items: ParsedReceiptItem[] }) => {
        setReceiptMeta({ store_name: parsed.store_name, receipt_date: parsed.receipt_date, total_amount: parsed.total_amount })
        const items: PendingItem[] = parsed.items.map(item => ({
            tempId: nanoid(),
            name: item.name,
            amount: item.amount,
            quantity: item.quantity,
            category: item.category,
            mode: "skip" as AttributionMode,
            splitMembers: [],
            splitAmounts: {},
            assignedTo: "",
        }))
        setPendingItems(items)
        setSourceType("receipt")
        setStep("attribute")
    }, [])

    // Convert statement rows to PendingItems
    const handleStatementContinue = useCallback((rows: ParsedRow[]) => {
        const items: PendingItem[] = rows.map(row => ({
            tempId: nanoid(),
            name: row.description,
            amount: Math.abs(row.amount),
            category: row.category,
            date: row.date,
            mode: "skip" as AttributionMode,
            splitMembers: [],
            splitAmounts: {},
            assignedTo: "",
        }))
        setPendingItems(items)
        setSourceType("statement")
        setStep("attribute")
    }, [])

    // Build splits payload for a PendingItem
    const buildSplits = (item: PendingItem) => {
        if (item.mode === "mine") {
            return [{ user_id: currentUserId, amount: item.amount }]
        }
        if (item.mode === "split") {
            return item.splitMembers.map(uid => ({
                user_id: uid,
                amount: item.splitAmounts[uid] ?? 0,
            }))
        }
        if (item.mode === "other" && item.assignedTo) {
            return [{ user_id: item.assignedTo, amount: item.amount }]
        }
        return [] // skip / unattributed
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            if (sourceType === "receipt") {
                // Single transaction with receipt_items
                const totalAmount = receiptMeta?.total_amount ?? pendingItems.reduce((s, it) => s + it.amount, 0)
                const date = receiptMeta?.receipt_date ?? new Date().toISOString().slice(0, 10)
                const description = receiptMeta?.store_name ?? "Receipt"

                const res = await demoFetch(`/api/rooms/${roomId}/transactions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        total_amount: totalAmount,
                        description,
                        transaction_date: date,
                        split_type: "item_level",
                        source_type: "receipt",
                        splits: [], // No top-level splits; all attribution is per-item
                        receipt_items: pendingItems.map(item => ({
                            name: item.name,
                            amount: item.amount,
                            quantity: item.quantity ?? 1,
                            category: item.category,
                            splits: buildSplits(item),
                        })),
                    }),
                })
                if (!res.ok) {
                    const json = await res.json()
                    toast.error(json.error ?? "Failed to save receipt")
                    return
                }
            } else {
                // Bulk insert for personal import or statement
                const transactions = pendingItems.map(item => ({
                    total_amount: item.amount,
                    description: item.name,
                    category: item.category,
                    transaction_date: item.date ?? new Date().toISOString().slice(0, 10),
                    splits: buildSplits(item),
                }))

                const res = await demoFetch(`/api/rooms/${roomId}/transactions/bulk`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transactions,
                        source_type: sourceType === "my-txns" ? "personal_import" : "statement",
                    }),
                })
                if (!res.ok) {
                    const json = await res.json()
                    toast.error(json.error ?? "Failed to save transactions")
                    return
                }
            }

            queryClient.invalidateQueries({ queryKey: ["room-bundle", roomId] })
            toast.success(`${pendingItems.length} transaction(s) added to room`)
            handleOpenChange(false)
        } finally {
            setIsSaving(false)
        }
    }

    const sourceSources = [
        {
            id: "my-txns" as SourceType,
            icon: <ClipboardList className="w-6 h-6" />,
            label: "My Transactions",
            desc: "Browse & select your personal transactions",
        },
        {
            id: "receipt" as SourceType,
            icon: <ScanLine className="w-6 h-6" />,
            label: "Receipt",
            desc: "Upload a photo or PDF of a receipt",
        },
        {
            id: "statement" as SourceType,
            icon: <FileSpreadsheet className="w-6 h-6" />,
            label: "Bank Statement",
            desc: "Upload a CSV, XLSX, or PDF statement",
        },
    ]

    const stepTitle: Record<Step, string> = {
        source: "Add Transactions",
        browse: "Select Transactions",
        "upload-receipt": "Upload Receipt",
        "upload-statement": "Upload Statement",
        attribute: "Attribute Transactions",
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step !== "source" && (
                            <button
                                type="button"
                                onClick={() => setStep(step === "attribute" ? (sourceType === "my-txns" ? "browse" : sourceType === "receipt" ? "upload-receipt" : "upload-statement") : "source")}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        {stepTitle[step]}
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-2">
                    {step === "source" && (
                        <div className="grid grid-cols-1 gap-3">
                            {sourceSources.map(src => (
                                <button
                                    key={src.id}
                                    type="button"
                                    onClick={() => {
                                        setSourceType(src.id)
                                        setStep(src.id === "my-txns" ? "browse" : src.id === "receipt" ? "upload-receipt" : "upload-statement")
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/50 hover:border-primary/40 transition-all text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        {src.icon}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{src.label}</p>
                                        <p className="text-xs text-muted-foreground">{src.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === "browse" && (
                        <BrowseTransactionsStep
                            roomId={roomId}
                            onContinue={handlePersonalTxsContinue}
                        />
                    )}

                    {step === "upload-receipt" && (
                        <ReceiptUploadStep
                            roomId={roomId}
                            onContinue={handleReceiptContinue}
                        />
                    )}

                    {step === "upload-statement" && (
                        <StatementUploadStep
                            roomId={roomId}
                            onContinue={handleStatementContinue}
                        />
                    )}

                    {step === "attribute" && (
                        <div className="space-y-4">
                            <AttributionStep
                                items={pendingItems}
                                members={members}
                                currentUserId={currentUserId}
                                onChange={setPendingItems}
                            />
                            <Button
                                className="w-full"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? "Saving..." : `Save Attribution (${pendingItems.length} items)`}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
})

AddToRoomDialog.displayName = "AddToRoomDialog"

