"use client"

import { useState } from "react"
import { ArrowRightLeft } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { demoFetch } from "@/lib/demo/demo-fetch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrency } from "@/components/currency-provider"
import type { FriendWithBalance } from "@/lib/types/friends"

interface QuickSplitDialogProps {
    friend: FriendWithBalance | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function QuickSplitDialog({ friend, open, onOpenChange }: QuickSplitDialogProps) {
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")
    const [splitType, setSplitType] = useState<"equal" | "full">("equal")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const queryClient = useQueryClient()
    const { symbol, formatCurrency } = useCurrency()

    const handleSubmit = async () => {
        if (!friend || !amount || parseFloat(amount) <= 0) return
        setLoading(true)
        setError(null)

        try {
            const totalAmount = parseFloat(amount)
            const res = await demoFetch(`/api/friends/${friend.friendship_id}/splits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    total_amount: totalAmount,
                    description: description.trim() || 'Quick split',
                    split_type: splitType === "full" ? "custom" : "equal",
                    currency: friend.currency || "EUR",
                }),
            })

            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
                onOpenChange(false)
                setAmount("")
                setDescription("")
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create split')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    if (!friend) return null

    const splitAmount = splitType === "equal" ? parseFloat(amount || "0") / 2 : parseFloat(amount || "0")

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setError(null) } }}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5" /> Quick Split
                    </DialogTitle>
                    <DialogDescription>
                        Split an expense with {friend.display_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label>Total amount ({symbol})</Label>
                        <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="text-lg font-semibold"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                            placeholder="What's this for?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Split type</Label>
                        <Select value={splitType} onValueChange={(v) => setSplitType(v as "equal" | "full")}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="equal">Split equally (50/50)</SelectItem>
                                <SelectItem value="full">They owe the full amount</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {parseFloat(amount || "0") > 0 && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <span className="text-muted-foreground">
                                {friend.display_name} owes you:{" "}
                            </span>
                            <span className="font-semibold">{formatCurrency(splitAmount)}</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-500/10 text-rose-500 p-3 rounded-lg text-sm">{error}</div>
                    )}

                    <Button className="w-full" onClick={handleSubmit} disabled={loading || !amount || parseFloat(amount) <= 0}>
                        {loading ? "Creating..." : "Create Split"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
