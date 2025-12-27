"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Crown, Sparkles, Zap, TrendingUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LimitExceededResponse } from "@/lib/limits/transactions-cap";

interface TransactionLimitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    limitExceeded: LimitExceededResponse;
    onPartialImport?: () => void; // For CSV import flow
}

function getPlanIcon(plan: string) {
    switch (plan) {
        case "max":
            return <Crown className="h-5 w-5 text-amber-500" />;
        case "pro":
            return <Sparkles className="h-5 w-5 text-primary" />;
        default:
            return <Zap className="h-5 w-5 text-muted-foreground" />;
    }
}

function getPlanColor(plan: string) {
    switch (plan) {
        case "max":
            return "text-amber-500";
        case "pro":
            return "text-primary";
        default:
            return "text-muted-foreground";
    }
}

export function TransactionLimitDialog({
    open,
    onOpenChange,
    limitExceeded,
    onPartialImport,
}: TransactionLimitDialogProps) {
    const router = useRouter();
    const {
        plan,
        cap,
        used,
        remaining,
        incomingCount,
        suggestedActions,
        upgradePlans,
    } = limitExceeded;

    const canPartialImport = suggestedActions.includes('IMPORT_PARTIAL') && onPartialImport;
    const canUpgrade = suggestedActions.includes('UPGRADE') && upgradePlans.length > 0;
    const shouldDelete = suggestedActions.includes('DELETE_EXISTING');

    const nextPlan = upgradePlans[0]; // Get the first upgrade option

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-amber-500/10">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        </div>
                        <AlertDialogTitle className="text-xl">Transaction Limit Reached</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You've reached your transaction limit on the <strong className={getPlanColor(plan)}>{plan.toUpperCase()}</strong> plan.
                                {incomingCount > 0 && ` You're trying to add ${incomingCount} transaction${incomingCount > 1 ? 's' : ''}, but only ${remaining} ${remaining === 1 ? 'slot' : 'slots'} remaining.`}
                            </p>

                            <div className="bg-muted/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Current Usage</span>
                                    <span className="text-sm font-semibold">
                                        {used.toLocaleString()} / {cap === Infinity ? '∞' : cap.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-amber-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: cap === Infinity ? '0%' : `${Math.min(100, (used / cap) * 100)}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {canUpgrade && (
                                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        {getPlanIcon(nextPlan)}
                                        <p className="text-sm font-medium text-primary">
                                            Upgrade to {nextPlan.toUpperCase()} for more capacity
                                        </p>
                                    </div>
                                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1 space-y-1">
                                        {upgradePlans.includes('pro') && (
                                            <li><strong>PRO:</strong> 3,000 transactions</li>
                                        )}
                                        {upgradePlans.includes('max') && (
                                            <li><strong>MAX:</strong> 15,000 transactions</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {canPartialImport && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        <p className="text-sm font-medium text-blue-500">
                                            Partial Import Available
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Import the {remaining} most recent transactions that fit within your limit.
                                    </p>
                                </div>
                            )}

                            {shouldDelete && !canUpgrade && (
                                <div className="bg-muted/50 border border-border rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm font-medium">Free up space</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Delete old transactions to make room for new ones.
                                    </p>
                                </div>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
                    {canPartialImport && (
                        <AlertDialogAction
                            onClick={() => {
                                onOpenChange(false);
                                onPartialImport?.();
                            }}
                            className="bg-blue-500 text-white hover:bg-blue-600"
                        >
                            Import {remaining} Transactions
                        </AlertDialogAction>
                    )}
                    {canUpgrade && (
                        <AlertDialogAction
                            onClick={() => {
                                onOpenChange(false);
                                router.push("/?upgrade=true");
                            }}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Crown className="h-4 w-4 mr-2" />
                            Upgrade to {nextPlan.toUpperCase()}
                        </AlertDialogAction>
                    )}
                    {shouldDelete && !canPartialImport && !canUpgrade && (
                        <AlertDialogAction
                            onClick={() => {
                                onOpenChange(false);
                                router.push("/transactions");
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Manage Transactions
                        </AlertDialogAction>
                    )}
                    <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
