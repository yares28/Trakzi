"use client"

import { AlertCircle, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export interface AccountLimitData {
    plan: string
    current: number
    max: number
}

interface AccountLimitDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: AccountLimitData
}

const NEXT_PLAN: Record<string, { name: string; max: number } | null> = {
    free: { name: "Pro", max: 5 },
    pro: { name: "Max", max: 15 },
    max: null,
}

export function AccountLimitDialog({ open, onOpenChange, data }: AccountLimitDialogProps) {
    const planDisplay = data.plan.charAt(0).toUpperCase() + data.plan.slice(1)
    const next = NEXT_PLAN[data.plan] ?? null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <DialogTitle>Account limit reached</DialogTitle>
                    </div>
                    <DialogDescription>
                        You've used {data.current} of {data.max} accounts on the {planDisplay} plan. Upgrade to add more, or archive an existing one in Settings.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                        <dl className="grid grid-cols-2 gap-3">
                            <div>
                                <dt className="text-muted-foreground">Current plan</dt>
                                <dd className="font-medium">{planDisplay}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Active accounts</dt>
                                <dd className="font-medium">{data.current} / {data.max}</dd>
                            </div>
                        </dl>
                    </div>

                    {next && (
                        <Button
                            onClick={() => {
                                window.location.href = "/billing"
                            }}
                            className="w-full justify-start"
                        >
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Upgrade to {next.name} — up to {next.max} accounts
                        </Button>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
