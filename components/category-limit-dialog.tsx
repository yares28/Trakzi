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
import { Sparkles, Crown, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

interface CategoryLimitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUsage: number;
    limit: number;
    plan: "free" | "pro" | "max";
    categoryType: "transaction" | "fridge";
    upgradeRequired?: boolean;
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

export function CategoryLimitDialog({
    open,
    onOpenChange,
    currentUsage,
    limit,
    plan,
    categoryType,
    upgradeRequired = true,
}: CategoryLimitDialogProps) {
    const router = useRouter();
    const categoryTypeLabel = categoryType === "transaction" ? "transaction" : "receipt/fridge";

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-amber-500/10">
                            {getPlanIcon(plan)}
                        </div>
                        <AlertDialogTitle className="text-xl">Category Limit Reached</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You've reached your limit for custom {categoryTypeLabel} categories on the <strong>{plan.toUpperCase()}</strong> plan.
                            </p>

                            <div className="bg-muted/50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted-foreground">Current Usage</span>
                                    <span className="text-sm font-semibold">{currentUsage} / {limit}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-amber-500 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, (currentUsage / limit) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {upgradeRequired && (
                                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                                    <p className="text-sm font-medium text-primary mb-1">
                                        Upgrade to unlock more categories
                                    </p>
                                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1 space-y-1">
                                        <li><strong>PRO:</strong> {categoryType === "transaction" ? "30" : "30"} custom categories</li>
                                        <li><strong>MAX:</strong> Unlimited custom categories</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
                    <AlertDialogCancel>Close</AlertDialogCancel>
                    {upgradeRequired && (
                        <AlertDialogAction
                            onClick={() => {
                                onOpenChange(false);
                                router.push("/?upgrade=true");
                            }}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Upgrade Plan
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

