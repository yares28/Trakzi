"use client"

import { AlertCircle, TrendingUp, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export interface CategoryLimitExceededData {
    code: 'CATEGORY_LIMIT_EXCEEDED'
    type: 'transaction' | 'receipt'
    plan: string
    transactionCap?: number
    receiptCap?: number
    transactionUsed?: number
    receiptUsed?: number
    transactionRemaining?: number
    receiptRemaining?: number
    message?: string
    upgradePlans?: string[]
}

interface CategoryLimitDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: CategoryLimitExceededData
    onUpgrade?: () => void
    onDeleteUnused?: () => void
}

export function CategoryLimitDialog({
    open,
    onOpenChange,
    data,
    onUpgrade,
    onDeleteUnused,
}: CategoryLimitDialogProps) {
    const planDisplay = data.plan.charAt(0).toUpperCase() + data.plan.slice(1)
    const isTransaction = data.type === 'transaction'
    const categoryType = isTransaction ? 'spending' : 'receipt'

    const cap = isTransaction ? data.transactionCap : data.receiptCap
    const used = isTransaction ? data.transactionUsed : data.receiptUsed
    const remaining = isTransaction ? data.transactionRemaining : data.receiptRemaining

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <DialogTitle>Category Limit Reached</DialogTitle>
                    </div>
                    <DialogDescription>
                        {data.message || `You've reached your ${planDisplay} plan limit for ${categoryType} categories.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Capacity Stats */}
                    <div className="rounded-lg border bg-muted/50 p-4">
                        <dl className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <dt className="text-muted-foreground">Plan</dt>
                                <dd className="font-medium">{planDisplay}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Category Type</dt>
                                <dd className="font-medium capitalize">{categoryType}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Limit</dt>
                                <dd className="font-medium">{cap} categories</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Used</dt>
                                <dd className="font-medium">{used}</dd>
                            </div>
                            <div className="col-span-2">
                                <dt className="text-muted-foreground">Available</dt>
                                <dd className="font-medium text-orange-600">
                                    {remaining} remaining
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Cannot Create Category</AlertTitle>
                        <AlertDescription>
                            You cannot create more {categoryType} categories with your current plan.
                        </AlertDescription>
                    </Alert>

                    {/* Suggested Actions */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">What would you like to do?</h4>
                        <div className="space-y-2">
                            {data.upgradePlans && data.upgradePlans.length > 0 && onUpgrade && (
                                <Button
                                    onClick={onUpgrade}
                                    className="w-full justify-start"
                                    variant="default"
                                >
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    Upgrade to {data.upgradePlans.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' or ')} Plan
                                </Button>
                            )}

                            {onDeleteUnused && (
                                <Button
                                    onClick={onDeleteUnused}
                                    className="w-full justify-start"
                                    variant="outline"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Unused Categories
                                </Button>
                            )}
                        </div>
                    </div>
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

interface CategoryLimitAlertProps {
    data: CategoryLimitExceededData
    onUpgrade?: () => void
    onDismiss?: () => void
    className?: string
}

export function CategoryLimitAlert({
    data,
    onUpgrade,
    onDismiss,
    className,
}: CategoryLimitAlertProps) {
    const planDisplay = data.plan.charAt(0).toUpperCase() + data.plan.slice(1)
    const isTransaction = data.type === 'transaction'
    const categoryType = isTransaction ? 'spending' : 'receipt'
    const used = isTransaction ? data.transactionUsed : data.receiptUsed
    const cap = isTransaction ? data.transactionCap : data.receiptCap

    return (
        <Alert variant="destructive" className={className}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Category Limit Reached</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
                <p>
                    You've used {used} of your {cap} {planDisplay} plan {categoryType} categories.
                </p>
                <p className="font-medium">
                    Cannot create more categories.
                </p>
                <div className="flex gap-2 pt-2">
                    {onUpgrade && data.upgradePlans && data.upgradePlans.length > 0 && (
                        <Button size="sm" onClick={onUpgrade}>
                            Upgrade Plan
                        </Button>
                    )}
                    {onDismiss && (
                        <Button size="sm" variant="outline" onClick={onDismiss}>
                            Dismiss
                        </Button>
                    )}
                </div>
            </AlertDescription>
        </Alert>
    )
}
