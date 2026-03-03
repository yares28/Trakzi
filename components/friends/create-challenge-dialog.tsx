"use client"

import { useState } from "react"
import { Target } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"

import { demoFetch } from "@/lib/demo/demo-fetch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrency } from "@/components/currency-provider"

interface CreateChallengeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const CATEGORIES = [
    "Dining", "Groceries", "Shopping", "Entertainment",
    "Transport", "Subscriptions", "Travel", "Utilities",
]

export function CreateChallengeDialog({ open, onOpenChange }: CreateChallengeDialogProps) {
    const [title, setTitle] = useState("")
    const [category, setCategory] = useState("")
    const [goalType, setGoalType] = useState<"individual_cap" | "group_total">("individual_cap")
    const [targetAmount, setTargetAmount] = useState("")
    const [startsAt, setStartsAt] = useState("")
    const [endsAt, setEndsAt] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const queryClient = useQueryClient()
    const { symbol } = useCurrency()

    const handleSubmit = async () => {
        if (!title.trim() || !category || !targetAmount || !startsAt || !endsAt) return
        setLoading(true)
        setError(null)

        try {
            const res = await demoFetch('/api/challenges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    category,
                    goal_type: goalType,
                    target_amount: parseFloat(targetAmount),
                    starts_at: startsAt,
                    ends_at: endsAt,
                }),
            })

            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ["friends-bundle"] })
                onOpenChange(false)
                setTitle(""); setCategory(""); setTargetAmount(""); setStartsAt(""); setEndsAt("")
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to create challenge')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const isValid = title.trim() && category && targetAmount && parseFloat(targetAmount) > 0 && startsAt && endsAt

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setError(null) }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" /> Create Challenge
                    </DialogTitle>
                    <DialogDescription>
                        Set a spending goal and challenge your friends.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label>Challenge title</Label>
                        <Input
                            placeholder="e.g., No Eating Out March"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pick category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Goal type</Label>
                            <Select value={goalType} onValueChange={(v) => setGoalType(v as typeof goalType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="individual_cap">Per-person cap</SelectItem>
                                    <SelectItem value="group_total">Group total</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Target amount ({symbol})</Label>
                        <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="50"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start date</Label>
                            <Input
                                type="date"
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End date</Label>
                            <Input
                                type="date"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 text-rose-500 p-3 rounded-lg text-sm">{error}</div>
                    )}

                    <Button className="w-full" onClick={handleSubmit} disabled={loading || !isValid}>
                        {loading ? "Creating..." : "Create Challenge"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
