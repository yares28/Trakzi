"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, Crown, Zap } from "lucide-react";

interface TransactionProgressBarProps {
    spendingTransactions?: number;
    groceryTransactions?: number;
    maxTransactions?: number;
    className?: string;
}

type SubscriptionData = {
    plan: "free" | "pro" | "max";
    usage: {
        bankTransactions: number;
        fridgeItems: number;
        totalTransactions: number;
        transactionLimit: number;
    };
};

function getPlanIcon(plan: string) {
    switch (plan) {
        case "max":
            return <Crown className="h-3.5 w-3.5" />;
        case "pro":
            return <Sparkles className="h-3.5 w-3.5" />;
        default:
            return <Zap className="h-3.5 w-3.5" />;
    }
}

function getPlanBadgeStyle(plan: string) {
    switch (plan) {
        case "max":
            return "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600";
        case "pro":
            return "bg-gradient-to-r from-primary to-primary/80 text-white border-0";
        default:
            return "bg-muted text-muted-foreground";
    }
}

export function TransactionProgressBar({
    spendingTransactions: propSpending,
    groceryTransactions: propGrocery,
    maxTransactions: propMax,
    className,
}: TransactionProgressBarProps) {
    const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

    // Fetch subscription data on mount
    useEffect(() => {
        async function fetchSubscription() {
            try {
                const response = await fetch("/api/subscription/status");
                if (response.ok) {
                    const data = await response.json();
                    setSubscriptionData(data);
                }
            } catch (error) {
                console.error("Failed to fetch subscription status:", error);
            }
        }
        fetchSubscription();
    }, []);

    // Use subscription data if available, otherwise use props
    const spendingTransactions = subscriptionData?.usage.bankTransactions ?? propSpending ?? 0;
    const groceryTransactions = subscriptionData?.usage.fridgeItems ?? propGrocery ?? 0;
    const maxTransactions = subscriptionData?.usage.transactionLimit ?? propMax ?? 500;
    const plan = subscriptionData?.plan ?? "free";

    const totalTransactions = spendingTransactions + groceryTransactions;
    const isUnlimited = maxTransactions === Infinity || maxTransactions === 0;
    const freeSlots = isUnlimited ? Infinity : Math.max(0, maxTransactions - totalTransactions);
    const displayMax = isUnlimited ? "∞" : maxTransactions.toLocaleString();

    const segments = [
        {
            label: "Spending/Income",
            value: spendingTransactions,
            color: "bg-primary"
        },
        {
            label: "Grocery Shopping",
            value: groceryTransactions,
            color: "bg-emerald-500"
        },
    ];

    return (
        <Card className={cn("w-full shadow-sm", className)}>
            <CardContent className="py-4">
                {/* Header with subscription badge */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-base text-muted-foreground">
                        Transactions tracked{" "}
                        <span className="font-semibold tabular-nums text-foreground">
                            {totalTransactions.toLocaleString()}
                        </span>{" "}
                        of {displayMax} max
                    </p>
                    <Badge className={cn("flex items-center gap-1", getPlanBadgeStyle(plan))}>
                        {getPlanIcon(plan)}
                        <span className="font-semibold">{plan.toUpperCase()}</span>
                    </Badge>
                </div>

                {/* Progress bar - hide if unlimited */}
                {!isUnlimited && (
                    <div className="mb-4 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        {segments.map((segment) => {
                            const percentage = (segment.value / maxTransactions) * 100;
                            return (
                                <div
                                    key={segment.label}
                                    className={cn("h-full transition-all", segment.color)}
                                    style={{ width: `${percentage}%` }}
                                    role="progressbar"
                                    aria-label={segment.label}
                                    aria-valuenow={segment.value}
                                    aria-valuemin={0}
                                    aria-valuemax={maxTransactions}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                    {segments.map((segment) => (
                        <div key={segment.label} className="flex items-center gap-2">
                            <span
                                className={cn("size-3 shrink-0 rounded", segment.color)}
                                aria-hidden="true"
                            />
                            <span className="text-sm text-muted-foreground">
                                {segment.label}
                            </span>
                            <span className="text-sm tabular-nums text-foreground font-medium">
                                {segment.value.toLocaleString()}
                            </span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <span
                            className="size-3 shrink-0 rounded-sm bg-muted"
                            aria-hidden="true"
                        />
                        <span className="text-sm text-muted-foreground">Available</span>
                        <span className="text-sm tabular-nums text-foreground font-medium">
                            {isUnlimited ? "Unlimited" : freeSlots.toLocaleString()}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
