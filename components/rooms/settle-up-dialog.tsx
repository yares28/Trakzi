"use client"

import { useState } from "react"
import { Check, Wallet, Banknote, Building2, Tag, Users } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { demoFetch } from "@/lib/demo/demo-fetch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useCurrency } from "@/components/currency-provider"
import { cn } from "@/lib/utils"
import { DEFAULT_CATEGORY_GROUPS } from "@/lib/categories"

interface PendingSplit {
    id: string
    description: string
    amount: number
    currency: string
    from_name: string
    is_payer?: boolean
    item_id?: string | null
    item_name?: string | null
    item_category?: string | null
    shared_tx_id?: string
}

interface SettleUpDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    splits: PendingSplit[]
    roomId?: string
}

type PaymentMethod = "cash" | "bank"

type SettlePhase = "categorize" | "choose"

interface SettleStep {
    splitId: string
    phase: SettlePhase
    selectedCategory: string | null
}

interface SettleAllGroup {
    label: string
    splits: PendingSplit[]
}

function CategoryPicker({
    value,
    onChange,
}: {
    value: string | null
    onChange: (cat: string) => void
}) {
    return (
        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {DEFAULT_CATEGORY_GROUPS.map(group => (
                <div key={group.label}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                        {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {group.categories.map(cat => (
                            <button
                                key={cat.name}
                                type="button"
                                onClick={() => onChange(cat.name)}
                                className={cn(
                                    "px-2 py-1 rounded-full text-xs border transition-colors",
                                    value === cat.name
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

function PaymentMethodPicker({
    title,
    subtitle,
    loading,
    onSelect,
    onCancel,
}: {
    title: React.ReactNode
    subtitle?: string
    loading: boolean
    onSelect: (method: PaymentMethod) => void
    onCancel: () => void
}) {
    return (
        <div className="space-y-3 mt-2">
            <p className="text-sm font-medium">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground -mt-1">{subtitle}</p>}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onSelect("cash")}
                    disabled={loading}
                    className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60",
                        "bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    <Banknote className="w-5 h-5 text-emerald-500" />
                    Cash / Other
                    <span className="text-xs text-muted-foreground font-normal text-center leading-tight">
                        Record now
                    </span>
                </button>
                <button
                    onClick={() => onSelect("bank")}
                    disabled={loading}
                    className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60",
                        "bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    <Building2 className="w-5 h-5 text-blue-500" />
                    Bank transfer
                    <span className="text-xs text-muted-foreground font-normal text-center leading-tight">
                        Link when it imports
                    </span>
                </button>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={onCancel}
            >
                Cancel
            </Button>
        </div>
    )
}

export function SettleUpDialog({ open, onOpenChange, splits, roomId }: SettleUpDialogProps) {
    const [settledIds, setSettledIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState<string | null>(null)
    const [bulkLoading, setBulkLoading] = useState(false)
    const [step, setStep] = useState<SettleStep | null>(null)
    const [settleAllGroup, setSettleAllGroup] = useState<SettleAllGroup | null>(null)
    const queryClient = useQueryClient()
    const { formatCurrency } = useCurrency()

    const settleSingle = async (splitId: string, method: PaymentMethod, category?: string | null) => {
        const res = await demoFetch(`/api/splits/${splitId}/settle`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                payment_method: method,
                ...(category ? { category } : {}),
            }),
        })
        if (!res.ok) {
            const json = await res.json().catch(() => ({}))
            if (json.code === "WALLET_FULL") {
                throw Object.assign(new Error(json.error ?? "Transaction limit reached"), { code: "WALLET_FULL" })
            }
            throw new Error(json.error ?? "Failed to settle")
        }
        return true
    }

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
        queryClient.invalidateQueries({ queryKey: ["analytics-bundle"] })
        if (roomId) {
            queryClient.invalidateQueries({ queryKey: ["room-bundle", roomId] })
        }
    }

    const handleSettleClick = (split: PendingSplit) => {
        if (split.is_payer) {
            setStep({ splitId: split.id, phase: "choose", selectedCategory: null })
            return
        }
        setStep({
            splitId: split.id,
            phase: "categorize",
            selectedCategory: split.item_category ?? null,
        })
    }

    const handleCategoryConfirm = (category: string | null) => {
        if (!step) return
        setStep({ ...step, phase: "choose", selectedCategory: category })
    }

    const handleConfirmSettle = async (splitId: string, method: PaymentMethod) => {
        setLoading(splitId)
        const selectedCategory = step?.selectedCategory
        setStep(null)
        try {
            await settleSingle(splitId, method, selectedCategory)
            setSettledIds(prev => new Set(prev).add(splitId))
            invalidateAll()
        } catch (e: any) {
            if (e.code === "WALLET_FULL") {
                toast.error(e.message ?? "Transaction limit reached. Upgrade your plan or delete old transactions.")
            } else {
                toast.error(e.message ?? "Failed to settle")
            }
        } finally {
            setLoading(null)
        }
    }

    const handleSettleAll = async (method: PaymentMethod) => {
        if (!settleAllGroup) return
        setBulkLoading(true)
        setSettleAllGroup(null)
        const pending = settleAllGroup.splits.filter(s => !settledIds.has(s.id))
        let successCount = 0
        let walletFull = false
        for (const split of pending) {
            try {
                await settleSingle(split.id, method, split.item_category ?? undefined)
                setSettledIds(prev => new Set(prev).add(split.id))
                successCount++
            } catch (e: any) {
                if (e.code === "WALLET_FULL") {
                    walletFull = true
                    break
                }
            }
        }
        if (successCount > 0) invalidateAll()
        if (walletFull) {
            toast.error("Transaction limit reached. Some splits were not settled. Upgrade your plan or delete old transactions.")
        } else if (successCount === pending.length) {
            toast.success(`${successCount} split${successCount > 1 ? "s" : ""} settled`)
        }
        setBulkLoading(false)
    }

    const handleClose = (v: boolean) => {
        onOpenChange(v)
        if (!v) {
            setSettledIds(new Set())
            setStep(null)
            setSettleAllGroup(null)
        }
    }

    const pendingSplits = splits.filter(s => !settledIds.has(s.id))
    const activeSplit = step ? splits.find(s => s.id === step.splitId) : null

    // Group pending splits for the summary section
    const oweSplits = pendingSplits.filter(s => !s.is_payer)
    const incomingSplits = pendingSplits.filter(s => s.is_payer)

    // Group "you owe" splits by from_name (uploader)
    const oweByPerson = oweSplits.reduce<Record<string, PendingSplit[]>>((acc, s) => {
        ;(acc[s.from_name] ??= []).push(s)
        return acc
    }, {})

    const showMain = !step && !settleAllGroup

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Settle Up
                    </DialogTitle>
                    <DialogDescription>
                        Confirm payments you&apos;ve sent or received.
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Category picker (debtors only) */}
                {step?.phase === "categorize" && activeSplit && (
                    <div className="space-y-3 mt-2">
                        <div>
                            <p className="text-sm font-medium">
                                What category is this expense?
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {activeSplit.description} · {formatCurrency(activeSplit.amount)}
                            </p>
                        </div>
                        <CategoryPicker
                            value={step.selectedCategory}
                            onChange={(cat) => setStep(prev => prev ? { ...prev, selectedCategory: cat } : null)}
                        />
                        <div className="flex gap-2 pt-1">
                            <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleCategoryConfirm(step.selectedCategory ?? "Other")}
                            >
                                <Tag className="w-3.5 h-3.5 mr-1.5" />
                                {step.selectedCategory ? `Use "${step.selectedCategory}"` : "Continue"}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={() => handleCategoryConfirm("Other")}
                            >
                                Skip
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground"
                            onClick={() => setStep(null)}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Step 2: Payment method picker (individual) */}
                {step?.phase === "choose" && activeSplit && (
                    <PaymentMethodPicker
                        title={
                            activeSplit.is_payer
                                ? <>How did you receive <span className="text-foreground">{formatCurrency(activeSplit.amount)}</span>?</>
                                : <>How did you pay <span className="text-foreground">{formatCurrency(activeSplit.amount)}</span>?</>
                        }
                        subtitle={activeSplit.description}
                        loading={!!loading}
                        onSelect={(method) => handleConfirmSettle(step.splitId, method)}
                        onCancel={() => setStep(null)}
                    />
                )}

                {/* Settle All: payment method picker */}
                {settleAllGroup && (
                    <PaymentMethodPicker
                        title={
                            <>Settle all with <span className="text-foreground">{settleAllGroup.label}</span>?</>
                        }
                        subtitle={`${settleAllGroup.splits.filter(s => !settledIds.has(s.id)).length} splits · ${formatCurrency(settleAllGroup.splits.filter(s => !settledIds.has(s.id)).reduce((s, sp) => s + sp.amount, 0))}`}
                        loading={bulkLoading}
                        onSelect={handleSettleAll}
                        onCancel={() => setSettleAllGroup(null)}
                    />
                )}

                {/* Main view */}
                {showMain && (
                    <div className="space-y-4 mt-2">
                        {pendingSplits.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                                <p className="font-medium">All settled!</p>
                            </div>
                        ) : (
                            <>
                                {/* Per-person summary */}
                                {(Object.keys(oweByPerson).length > 0 || incomingSplits.length > 0) && (
                                    <div className="space-y-2">
                                        {Object.entries(oweByPerson).map(([name, personSplits]) => {
                                            const total = personSplits.reduce((s, sp) => s + sp.amount, 0)
                                            return (
                                                <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">You owe</p>
                                                        <p className="text-sm font-semibold">{name}</p>
                                                        <p className="text-xs text-muted-foreground">{personSplits.length} split{personSplits.length > 1 ? "s" : ""}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm font-bold text-rose-500">{formatCurrency(total)}</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-xs gap-1"
                                                            disabled={bulkLoading || !!loading}
                                                            onClick={() => setSettleAllGroup({ label: name, splits: personSplits })}
                                                        >
                                                            <Users className="w-3 h-3" />
                                                            Settle All
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {incomingSplits.length > 0 && (
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Owed to you</p>
                                                    <p className="text-sm font-semibold">Incoming payments</p>
                                                    <p className="text-xs text-muted-foreground">{incomingSplits.length} split{incomingSplits.length > 1 ? "s" : ""}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-emerald-500">
                                                        {formatCurrency(incomingSplits.reduce((s, sp) => s + sp.amount, 0))}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs gap-1"
                                                        disabled={bulkLoading || !!loading}
                                                        onClick={() => setSettleAllGroup({ label: "incoming", splits: incomingSplits })}
                                                    >
                                                        <Users className="w-3 h-3" />
                                                        Settle All
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Splits table */}
                                <div className="rounded-2xl border border-border/40 bg-white/5 dark:bg-black/20 backdrop-blur-xl overflow-hidden max-h-[320px] overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-border/40">
                                                <TableHead className="pl-4 text-xs">Description</TableHead>
                                                <TableHead className="text-xs hidden sm:table-cell">With</TableHead>
                                                <TableHead className="text-right text-xs pr-2">Amount</TableHead>
                                                <TableHead className="w-20 pr-4" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingSplits.map(split => (
                                                <TableRow key={split.id} className="hover:bg-muted/40">
                                                    <TableCell className="py-2.5 pl-4">
                                                        <p className="text-xs font-medium truncate max-w-[140px]">{split.description}</p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {split.is_payer ? "Incoming" : `→ ${split.from_name}`}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                                                        {split.from_name}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold tabular-nums text-xs py-2.5 pr-2">
                                                        <span className={split.is_payer ? "text-emerald-500" : "text-rose-500"}>
                                                            {formatCurrency(split.amount)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2.5 pr-4">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 gap-1 text-xs w-full"
                                                            onClick={() => handleSettleClick(split)}
                                                            disabled={loading === split.id || bulkLoading}
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            {loading === split.id ? "…" : "Settle"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
