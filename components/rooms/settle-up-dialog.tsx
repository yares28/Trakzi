"use client"

import { useState } from "react"
import { Check, Wallet } from "lucide-react"
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
}

interface SettleUpDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    splits: PendingSplit[]
    roomId?: string
}

export function SettleUpDialog({ open, onOpenChange, splits, roomId }: SettleUpDialogProps) {
    const [settledIds, setSettledIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState<string | null>(null)
    const queryClient = useQueryClient()
    const { formatCurrency } = useCurrency()

    const handleSettle = async (splitId: string) => {
        setLoading(splitId)
        try {
            const res = await demoFetch(`/api/splits/${splitId}/settle`, { method: 'PATCH' })

            if (res.ok) {
                setSettledIds(prev => new Set(prev).add(splitId))
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
                if (roomId) {
                    queryClient.invalidateQueries({ queryKey: ["room-bundle", roomId] })
                }
            }
        } catch { /* swallow */ }
        finally {
            setLoading(null)
        }
    }

    const pendingSplits = splits.filter(s => !settledIds.has(s.id))

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSettledIds(new Set()) }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Settle Up
                    </DialogTitle>
                    <DialogDescription>
                        Confirm payments you've sent or received.
                    </DialogDescription>
                </DialogHeader>

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
                                    onClick={() => handleSettle(split.id)}
                                    disabled={loading === split.id}
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    {loading === split.id ? "..." : "Settle"}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
