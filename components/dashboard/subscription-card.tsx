"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Zap, Info, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type SubscriptionStatus = {
    plan: "free" | "pro" | "max";
    status: string;
    limits: {
        maxTotalTransactionsPerMonth: number;
        aiChatEnabled: boolean;
        aiChatMessagesPerDay: number;
        aiInsightsEnabled: boolean;
        exportEnabled: boolean;
        customTransactionCategoriesLimit: number;
        customFridgeCategoriesLimit: number;
    };
    usage: {
        bankTransactions: number;
        fridgeItems: number;
        totalTransactions: number;
        transactionLimit: number;
        percentUsed: number;
    };
    subscription: {
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
    } | null;
};

function getPlanIcon(plan: string) {
    switch (plan) {
        case "max":
            return <Crown className="h-4 w-4 text-amber-500" />;
        case "pro":
            return <Sparkles className="h-4 w-4 text-primary" />;
        default:
            return <Zap className="h-4 w-4 text-muted-foreground" />;
    }
}

function getPlanBadgeColor(plan: string) {
    switch (plan) {
        case "max":
            return "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0";
        case "pro":
            return "bg-gradient-to-r from-primary to-primary/80 text-white border-0";
        default:
            return "bg-muted text-muted-foreground";
    }
}

function formatNumber(num: number): string {
    if (num === Infinity) return "Unlimited";
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

export function SubscriptionCard() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStatus() {
            try {
                const response = await fetch("/api/subscription/status");
                if (!response.ok) throw new Error("Failed to fetch");
                const data = await response.json();
                setStatus(data);
            } catch (err) {
                setError("Unable to load subscription info");
            } finally {
                setIsLoading(false);
            }
        }
        fetchStatus();
    }, []);

    if (isLoading) {
        return (
            <Card className="animate-pulse">
                <CardHeader className="pb-2">
                    <div className="h-5 w-32 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                    <div className="h-20 bg-muted rounded" />
                </CardContent>
            </Card>
        );
    }

    if (error || !status) {
        return (
            <Card className="border-dashed">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{error || "Unable to load"}</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isUnlimited = status.usage.transactionLimit === Infinity || status.usage.transactionLimit === 0;
    const isNearLimit = status.usage.percentUsed >= 80;
    const isAtLimit = status.usage.percentUsed >= 100;

    return (
        <Card className="relative overflow-hidden">
            {/* Subtle gradient background based on plan */}
            <div
                className={`absolute inset-0 opacity-5 ${status.plan === "max"
                        ? "bg-gradient-to-br from-amber-500 to-orange-500"
                        : status.plan === "pro"
                            ? "bg-gradient-to-br from-primary to-primary/50"
                            : ""
                    }`}
            />

            <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        {getPlanIcon(status.plan)}
                        Your Plan
                    </CardTitle>
                    <Badge className={getPlanBadgeColor(status.plan)}>
                        {status.plan.toUpperCase()}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
                {/* Transaction Usage */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                            Transactions this month
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Bank: {status.usage.bankTransactions}</p>
                                        <p>Fridge: {status.usage.fridgeItems}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </span>
                        <span className="font-medium">
                            {formatNumber(status.usage.totalTransactions)}
                            {!isUnlimited && (
                                <span className="text-muted-foreground">
                                    {" "}
                                    / {formatNumber(status.usage.transactionLimit)}
                                </span>
                            )}
                        </span>
                    </div>

                    {!isUnlimited && (
                        <Progress
                            value={Math.min(100, status.usage.percentUsed)}
                            className={`h-2 ${isAtLimit
                                    ? "[&>div]:bg-red-500"
                                    : isNearLimit
                                        ? "[&>div]:bg-yellow-500"
                                        : ""
                                }`}
                        />
                    )}

                    {isAtLimit && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Limit reached. Upgrade to add more transactions.
                        </p>
                    )}
                    {isNearLimit && !isAtLimit && (
                        <p className="text-xs text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Approaching limit ({status.usage.percentUsed}% used)
                        </p>
                    )}
                </div>

                {/* Usage breakdown */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground text-xs">Bank Transactions</p>
                        <p className="font-medium">{status.usage.bankTransactions}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground text-xs">Fridge Items</p>
                        <p className="font-medium">{status.usage.fridgeItems}</p>
                    </div>
                </div>

                {/* Feature highlights */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Badge variant="outline" className="text-xs">
                        AI Chat: {status.limits.aiChatEnabled ? (
                            status.limits.aiChatMessagesPerDay === Infinity
                                ? "Unlimited"
                                : `${status.limits.aiChatMessagesPerDay}/day`
                        ) : "❌"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        Insights: {status.limits.aiInsightsEnabled ? "✓" : "❌"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        Export: {status.limits.exportEnabled ? "✓" : "❌"}
                    </Badge>
                </div>

                {/* Upgrade CTA for free users */}
                {status.plan === "free" && (
                    <Link href="/#pricing">
                        <Button className="w-full mt-2" size="sm">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Upgrade to Pro
                        </Button>
                    </Link>
                )}

                {/* Subscription info for paid users */}
                {status.subscription?.currentPeriodEnd && (
                    <p className="text-xs text-muted-foreground">
                        {status.subscription.cancelAtPeriodEnd
                            ? "Cancels on "
                            : "Renews on "}
                        {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
