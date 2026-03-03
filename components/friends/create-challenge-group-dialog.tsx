"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PiggyBank, Heart, TrendingUp, ShoppingBag, Globe, Lock, Check } from "lucide-react"

import { demoFetch } from "@/lib/demo/demo-fetch"
import { cn } from "@/lib/utils"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { ChallengeGroupWithMembers, ChallengeMetric } from "@/lib/types/challenges"

const METRIC_OPTIONS: { key: ChallengeMetric; label: string; description: string; icon: React.ReactNode }[] = [
    {
        key: "savingsRate",
        label: "Savings Rate",
        description: "Who saves the highest % of their income this month?",
        icon: <PiggyBank className="w-5 h-5" />,
    },
    {
        key: "financialHealth",
        label: "Financial Health",
        description: "Who best follows the 50/30/20 rule?",
        icon: <Heart className="w-5 h-5" />,
    },
    {
        key: "fridgeScore",
        label: "Healthy Fridge",
        description: "Who buys the healthiest food based on scanned receipts?",
        icon: <TrendingUp className="w-5 h-5" />,
    },
    {
        key: "wantsPercent",
        label: "Frugality",
        description: "Who spends the least on wants? Lower % wins.",
        icon: <ShoppingBag className="w-5 h-5" />,
    },
]

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated: (group: ChallengeGroupWithMembers) => void
}

export function CreateChallengeGroupDialog({ open, onOpenChange, onCreated }: Props) {
    const [step, setStep] = useState(1)
    const [name, setName] = useState("")
    const [isPublic, setIsPublic] = useState(false)
    const [selectedMetrics, setSelectedMetrics] = useState<ChallengeMetric[]>([])
    const [loading, setLoading] = useState(false)

    const reset = () => {
        setStep(1)
        setName("")
        setIsPublic(false)
        setSelectedMetrics([])
    }

    const handleClose = (open: boolean) => {
        if (!open) reset()
        onOpenChange(open)
    }

    const toggleMetric = (key: ChallengeMetric) => {
        setSelectedMetrics(prev =>
            prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
        )
    }

    const handleCreate = async () => {
        if (!name.trim()) { toast.error("Give your group a name"); return }
        if (selectedMetrics.length === 0) { toast.error("Pick at least one metric"); return }

        setLoading(true)
        try {
            const res = await demoFetch("/api/challenge-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), metrics: selectedMetrics, is_public: isPublic }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? "Failed to create group")

            toast.success("Group created! Share your invite code with friends.")

            // Immediately fetch the full group details and return to parent
            const groupRes = await demoFetch("/api/challenge-groups")
            const groups: ChallengeGroupWithMembers[] = await groupRes.json()
            const newGroup = groups.find((g: ChallengeGroupWithMembers) => g.id === data.id)
            if (newGroup) onCreated(newGroup)

            handleClose(false)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg rounded-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {step === 1 ? "Create a Challenge Group" : "Pick Battle Metrics"}
                    </DialogTitle>
                </DialogHeader>

                {/* Step indicator */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold", step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted")}>1</span>
                    <div className={cn("flex-1 h-px", step >= 2 ? "bg-primary" : "bg-muted")} />
                    <span className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold", step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted")}>2</span>
                </div>

                {step === 1 && (
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="group-name">Group Name</Label>
                            <Input
                                id="group-name"
                                placeholder="e.g. Savings Squad, Office Hustle..."
                                value={name}
                                onChange={e => setName(e.target.value)}
                                maxLength={40}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Visibility</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(false)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                        !isPublic ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                                    )}
                                >
                                    <Lock className="w-5 h-5" />
                                    <span className="text-sm font-medium">Private</span>
                                    <span className="text-xs text-muted-foreground text-center">Invite by code only</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsPublic(true)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                        isPublic ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                                    )}
                                >
                                    <Globe className="w-5 h-5" />
                                    <span className="text-sm font-medium">Public</span>
                                    <span className="text-xs text-muted-foreground text-center">Anyone can discover & join</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Select the stats your group will battle over each month. Pick 1–4.</p>
                        <div className="space-y-2">
                            {METRIC_OPTIONS.map(opt => {
                                const selected = selectedMetrics.includes(opt.key)
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => toggleMetric(opt.key)}
                                        className={cn(
                                            "w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                                            selected ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                                        )}
                                    >
                                        <div className={cn("mt-0.5 shrink-0", selected ? "text-primary" : "text-muted-foreground")}>
                                            {opt.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm flex items-center gap-2">
                                                {opt.label}
                                                {selected && <Check className="w-3.5 h-3.5 text-primary" />}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                                        </div>
                                        {selected && <Badge className="shrink-0 bg-primary/10 text-primary border-0 text-[10px]">Selected</Badge>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                <DialogFooter className="flex gap-2 mt-4">
                    {step === 1 ? (
                        <>
                            <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                            <Button onClick={() => setStep(2)} disabled={!name.trim()}>
                                Next →
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                            <Button onClick={handleCreate} disabled={loading || selectedMetrics.length === 0}>
                                {loading ? "Creating..." : "Create Group"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
