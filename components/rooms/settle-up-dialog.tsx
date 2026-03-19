"use client"

import { useState } from "react"
import { Check, Wallet, Banknote, Building2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { demoFetch } from "@/lib/demo/demo-fetch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useCurrency } from "@/components/currency-provider"
import { cn } from "@/lib/utils"

interface PendingSplit {
    id: string
    description: string
    amount: number
    currency: string
    from_name: string
    is_payer?: boolean
}

interface SettleUpDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    splits: PendingSplit[]
    roomId?: string
}

type PaymentMethod = "cash" | "bank"

interface SettleStep {
    splitId: string
    phase: "choose" | "done"
}

export function SettleUpDialog({ open, onOpenChange, splits, roomId }: SettleUpDialogProps) {
    const [settledIds, setSettledIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState<string | null>(null)
    const [step, setStep] = useState<SettleStep | null>(null)
    const queryClient = useQueryClient()
    const { formatCurrency } = useCurrency()

    const handleSettleClick = (splitId: string) => {
        setStep({ splitId, phase: "choose" })
    }

    const handleConfirmSettle = async (splitId: string, method: PaymentMethod) => {
        setLoading(splitId)
        setStep(null)
        try {
            const res = await demoFetch(`/api/splits/${splitId}/settle`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payment_method: method }),
            })

            if (res.ok) {
                setSettledIds(prev => new Set(prev).add(splitId))
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
                queryClient.invalidateQueries({ queryKey: ["analytics-bundle"] })
                if (roomId) {
                    queryClient.invalidateQueries({ queryKey: ["room-bundle", roomId] })
                }
            }
        } catch { /* swallow */ }
        finally {
            setLoading(null)
        }
    }

    const handleClose = (v: boolean) => {
        onOpenChange(v)
        if (!v) {
            setSettledIds(new Set())
            setStep(null)
        }
    }

    const pendingSplits = splits.filter(s => !settledIds.has(s.id))
    const activeSplit = step ? splits.find(s => s.id === step.splitId) : null

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Settle Up
                    </DialogTitle>
                    <DialogDescription>
                        Confirm payments you've sent or received.
                    </DialogDescription>
                </DialogHeader>

                {/* Payment method picker */}
                {step && activeSplit && (
                    <div className="space-y-3 mt-2">
                        <p className="text-sm font-medium">
                            {activeSplit.is_payer
                                ? <>How did you receive <span className="text-foreground">{formatCurrency(activeSplit.amount)}</span>?</>
                                : <>How did you pay <span className="text-foreground">{formatCurrency(activeSplit.amount)}</span>?</>
                            }
                        </p>
                        <p className="text-xs text-muted-foreground -mt-1">{activeSplit.description}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleConfirmSettle(step.splitId, "cash")}
                                disabled={!!loading}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60",
                                    "bg-muted/20 hover:bg-muted/40 transition-colors text-sm font-medium",
                                    "disabled:opacity-50 disabled:cursor-not-allowed"
                                )}
                            >
                                <Banknote className="w-5 h-5 text-emerald-500" />
                                Cash / Other
                                <span className="text-xs text-muted-foreground font-normal text-center leading-tight">
                                    {activeSplit.is_payer ? "Record income now" : "Record expense now"}
                                </span>
                            </button>
                            <button
                                onClick={() => handleConfirmSettle(step.splitId, "bank")}
                                disabled={!!loading}
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
                            onClick={() => setStep(null)}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Split list */}
                {!step && (
                    <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto">
                        {pendingSplits.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                                <p className="font-medium">All settled!</p>
                            </div>
                        ) : pendingSplits.map(split => (
                            <div key={split.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{split.description}</p>
                                    <p className="text-xs text-muted-foreground">{split.from_name}</p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="font-semibold text-sm">
                                        {formatCurrency(split.amount)}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1 text-xs"
                                        onClick={() => handleSettleClick(split.id)}
                                        disabled={loading === split.id}
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        {loading === split.id ? "..." : "Settle"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
