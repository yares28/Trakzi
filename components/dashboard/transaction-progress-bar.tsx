"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, Crown, Zap, Loader2 } from "lucide-react";

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
        transactionLimit: number; // -1 means unlimited
    };
    subscription?: {
        currentPeriodEnd?: string | null;
    };
};

type WalletInfo = {
    monthlyBonusEarned: number;
    monthlyAvailable: number;
    monthlyUsed: number;
};

/** Next period-start date: paid plans use Stripe period end, free uses 1st of next month. */
function getNextRenewalDate(plan: string, currentPeriodEnd?: string | null): Date {
    if (plan !== "free" && currentPeriodEnd) {
        return new Date(currentPeriodEnd);
    }
    // Free plan: calendar month — resets on the 1st of next month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

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
    const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
    const [categoryData, setCategoryData] = useState<{
        transactions: number;
        receipts: number;
        total: number;
        capacity: {
            transactionCap: number;
            receiptCap: number;
            transactionRemaining: number;
            receiptRemaining: number;
        };
        plan: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch subscription and category data on mount
    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);

                // Fetch all three in parallel — no-store so prod never uses cached counts
                const [subResponse, catResponse, walletResponse] = await Promise.all([
                    fetch("/api/subscription/status", { cache: "no-store" }),
                    fetch("/api/categories/count", { cache: "no-store" }),
                    fetch("/api/transactions/wallet", { cache: "no-store" }),
                ]);

                if (subResponse.ok) {
                    const subData = await subResponse.json();
                    setSubscriptionData(subData);
                }

                if (catResponse.ok) {
                    const catData = await catResponse.json();
                    setCategoryData(catData);
                }

                if (walletResponse.ok) {
                    const walletData = await walletResponse.json();
                    setWalletInfo({
                        monthlyBonusEarned: walletData.monthlyBonusEarned ?? 0,
                        monthlyAvailable: walletData.monthlyAvailable ?? 0,
                        monthlyUsed: walletData.monthlyUsed ?? 0,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();

        // Listen for subscription change events
        const handleSubscriptionChange = () => {
            fetchData();
        };
        window.addEventListener('subscription-changed', handleSubscriptionChange);

        return () => {
            window.removeEventListener('subscription-changed', handleSubscriptionChange);
        };
    }, []);

    // Show loading skeleton while fetching
    if (isLoading) {
        return (
            <Card className={cn("w-full shadow-sm", className)}>
                <CardContent className="py-4">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading subscription info...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Use subscription data if available, otherwise use props
    const spendingTransactions = subscriptionData?.usage.bankTransactions ?? propSpending ?? 0;
    const groceryTransactions = subscriptionData?.usage.fridgeItems ?? propGrocery ?? 0;
    // -1 means unlimited from the API
    const apiLimit = subscriptionData?.usage.transactionLimit;
    const maxTransactions = apiLimit === -1 ? Infinity : (apiLimit ?? propMax ?? 500);
    const plan = subscriptionData?.plan ?? "free";

    const totalTransactions = spendingTransactions + groceryTransactions;
    const isUnlimited = maxTransactions === Infinity || maxTransactions <= 0;
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
                <div className="flex items-center justify-between mb-2">
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

                {/* Renewal date + accumulated bonus */}
                {!isUnlimited && (() => {
                    const renewalDate = getNextRenewalDate(plan, subscriptionData?.subscription?.currentPeriodEnd);
                    const bonus = walletInfo?.monthlyBonusEarned ?? 0;
                    const monthlyAdd = walletInfo?.monthlyAvailable ?? 0;
                    return (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs text-muted-foreground">
                            <span>
                                Monthly allocation renews{" "}
                                <span className="font-medium text-foreground">
                                    {renewalDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                                {monthlyAdd > 0 && (
                                    <span className="ml-1 text-muted-foreground">
                                        (+{monthlyAdd.toLocaleString()} slots)
                                    </span>
                                )}
                            </span>
                            {bonus > 0 && (
                                <span>
                                    Accumulated bonus{" "}
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        +{bonus.toLocaleString()}
                                    </span>
                                </span>
                            )}
                        </div>
                    );
                })()}

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

                {/* Categories Tracked Section */}
                {categoryData && (
                    <>
                        {/* Divider */}
                        <div className="my-4 border-t" />

                        {/* Categories Header */}
                        <div className="mb-3">
                            <p className="text-base text-muted-foreground">
                                Categories tracked{" "}
                                <span className="font-semibold tabular-nums text-foreground">
                                    {categoryData.total}
                                </span>{" "}
                                of {categoryData.capacity.transactionCap + categoryData.capacity.receiptCap} max
                            </p>
                        </div>

                        {/* Category Gauges */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Spending Categories Gauge */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Spending Categories</span>
                                    <span className={`text-sm font-bold tabular-nums ${(categoryData.transactions / categoryData.capacity.transactionCap) >= 0.9 ? 'text-red-600' :
                                        (categoryData.transactions / categoryData.capacity.transactionCap) >= 0.7 ? 'text-orange-500' :
                                            'text-green-600'
                                        }`}>
                                        {categoryData.transactions} / {categoryData.capacity.transactionCap}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all bg-primary"
                                        style={{
                                            width: `${categoryData.transactions > 0 ? Math.max(2, Math.min(100, (categoryData.transactions / categoryData.capacity.transactionCap) * 100)) : 0}%`
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {categoryData.capacity.transactionRemaining} remaining
                                </p>
                            </div>

                            {/* Receipt Categories Gauge */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Receipt Categories</span>
                                    <span className={`text-sm font-bold tabular-nums ${(categoryData.receipts / categoryData.capacity.receiptCap) >= 0.9 ? 'text-red-600' :
                                        (categoryData.receipts / categoryData.capacity.receiptCap) >= 0.7 ? 'text-orange-500' :
                                            'text-green-600'
                                        }`}>
                                        {categoryData.receipts} / {categoryData.capacity.receiptCap}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all bg-emerald-500"
                                        style={{
                                            width: `${categoryData.receipts > 0 ? Math.max(2, Math.min(100, (categoryData.receipts / categoryData.capacity.receiptCap) * 100)) : 0}%`
                                        }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {categoryData.capacity.receiptRemaining} remaining
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
