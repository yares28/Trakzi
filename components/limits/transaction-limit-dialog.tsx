"use client"

import { AlertCircle, TrendingUp, Trash2, Filter } from "lucide-react"
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

export interface TransactionLimitExceededData {
    code: 'LIMIT_EXCEEDED'
    plan: string
    cap: number
    used: number
    remaining: number
    incomingCount?: number
    message?: string
    suggestedActions?: ('IMPORT_PARTIAL' | 'FILTER_BY_DATE' | 'UPGRADE' | 'DELETE_EXISTING')[]
    upgradePlans?: string[]
    dateMin?: string
    dateMax?: string
}

interface TransactionLimitDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: TransactionLimitExceededData
    onUpgrade?: () => void
    onDeleteOld?: () => void
    onFilterByDate?: () => void
    onPartialImport?: () => void
}

export function TransactionLimitDialog({
    open,
    onOpenChange,
    data,
    onUpgrade,
    onDeleteOld,
    onFilterByDate,
    onPartialImport,
}: TransactionLimitDialogProps) {
    const planDisplay = data.plan.charAt(0).toUpperCase() + data.plan.slice(1)
    const hasActions = data.suggestedActions && data.suggestedActions.length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <DialogTitle>Transaction Limit Reached</DialogTitle>
                    </div>
                    <DialogDescription>
                        {data.message || `You've reached your ${planDisplay} plan limit.`}
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
                                <dt className="text-muted-foreground">Limit</dt>
                                <dd className="font-medium">{data.cap.toLocaleString()} transactions</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Used</dt>
                                <dd className="font-medium">{data.used.toLocaleString()}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Available</dt>
                                <dd className="font-medium text-orange-600">
                                    {data.remaining.toLocaleString()}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {data.incomingCount && data.incomingCount > 0 && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Cannot Add Transactions</AlertTitle>
                            <AlertDescription>
                                You're trying to add {data.incomingCount.toLocaleString()} transaction
                                {data.incomingCount !== 1 ? 's' : ''}, but you only have{' '}
                                {data.remaining.toLocaleString()} slot{data.remaining !== 1 ? 's' : ''} available.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Suggested Actions */}
                    {hasActions && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">What would you like to do?</h4>
                            <div className="space-y-2">
                                {data.suggestedActions?.includes('UPGRADE') && data.upgradePlans && data.upgradePlans.length > 0 && onUpgrade && (
                                    <Button
                                        onClick={onUpgrade}
                                        className="w-full justify-start"
                                        variant="default"
                                    >
                                        <TrendingUp className="mr-2 h-4 w-4" />
                                        Upgrade to {data.upgradePlans.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' or ')} Plan
                                    </Button>
                                )}

                                {data.suggestedActions?.includes('DELETE_EXISTING') && onDeleteOld && (
                                    <Button
                                        onClick={onDeleteOld}
                                        className="w-full justify-start"
                                        variant="outline"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Old Transactions
                                    </Button>
                                )}

                                {data.suggestedActions?.includes('FILTER_BY_DATE') && onFilterByDate && (
                                    <Button
                                        onClick={onFilterByDate}
                                        className="w-full justify-start"
                                        variant="outline"
                                    >
                                        <Filter className="mr-2 h-4 w-4" />
                                        Filter by Date Range
                                    </Button>
                                )}

                                {data.suggestedActions?.includes('IMPORT_PARTIAL') && data.remaining > 0 && onPartialImport && (
                                    <Button
                                        onClick={onPartialImport}
                                        className="w-full justify-start"
                                        variant="outline"
                                    >
                                        <Filter className="mr-2 h-4 w-4" />
                                        Import {data.remaining.toLocaleString()} Most Recent
                                    </Button>
                                )}
                            </div>
                        </div>
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

interface TransactionLimitAlertProps {
    data: TransactionLimitExceededData
    onUpgrade?: () => void
    onDismiss?: () => void
    className?: string
}

export function TransactionLimitAlert({
    data,
    onUpgrade,
    onDismiss,
    className,
}: TransactionLimitAlertProps) {
    const planDisplay = data.plan.charAt(0).toUpperCase() + data.plan.slice(1)

    return (
        <Alert variant="destructive" className={className}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Transaction Limit Reached</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
                <p>
                    You've used {data.used.toLocaleString()} of your {data.cap.toLocaleString()}{' '}
                    {planDisplay} plan transactions.
                </p>
                {data.incomingCount && data.incomingCount > 0 && (
                    <p className="font-medium">
                        Cannot add {data.incomingCount.toLocaleString()} new transaction
                        {data.incomingCount !== 1 ? 's' : ''}.
                    </p>
                )}
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
