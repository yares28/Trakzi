"use client";

import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Zap, AlertCircle, Check, ArrowUp, ArrowDown, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

// Plan features for display
const PLAN_INFO = {
    free: {
        name: "Free",
        price: "€0",
        icon: Zap,
        iconColor: "text-muted-foreground",
        badgeClass: "bg-muted text-muted-foreground",
        features: [
            "400 transactions (~1 year of stats)",
            "Unlimited receipt scans",
            "5 AI chat messages per day",
            "Advanced analytics charts",
            "10 custom categories",
        ],
    },
    pro: {
        name: "PRO",
        price: "€4.99/mo",
        icon: Sparkles,
        iconColor: "text-primary",
        badgeClass: "bg-gradient-to-r from-primary to-primary/80 text-white border-0",
        features: [
            "3,000 transactions (~6 years of stats)",
            "Unlimited receipt scans",
            "Unlimited AI chat messages",
            "AI-powered insights & summaries",
            "Unlimited custom categories",
            "Export to CSV",
        ],
    },
    max: {
        name: "MAX",
        price: "€19.99/mo",
        icon: Crown,
        iconColor: "text-amber-500",
        badgeClass: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0",
        features: [
            "Unlimited transactions",
            "Everything in PRO",
            "Priority support",
            "Early access to new features",
            "Sub-accounts (coming soon)",
            "Custom API access (coming soon)",
        ],
    },
};

type PlanType = "free" | "pro" | "max";

function PlanCard({
    plan,
    isCurrentPlan,
    currentUserPlan,
    onManageSubscription,
    isManaging,
}: {
    plan: PlanType;
    isCurrentPlan: boolean;
    currentUserPlan: PlanType;
    onManageSubscription: () => void;
    isManaging: boolean;
}) {
    const info = PLAN_INFO[plan];
    const Icon = info.icon;

    const planOrder: PlanType[] = ["free", "pro", "max"];
    const currentIndex = planOrder.indexOf(currentUserPlan);
    const thisIndex = planOrder.indexOf(plan);
    const isUpgrade = thisIndex > currentIndex;
    const isDowngrade = thisIndex < currentIndex;

    return (
        <div className={`relative p-4 rounded-xl border ${isCurrentPlan ? "border-primary bg-primary/5" : "border-border"}`}>
            {/* Current plan indicator */}
            {isCurrentPlan && (
                <div className="absolute -top-3 left-4">
                    <Badge className="bg-primary text-primary-foreground text-xs">
                        Current Plan
                    </Badge>
                </div>
            )}

            {/* Orange glow effect based on plan tier */}
            {plan === "pro" && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            )}
            {plan === "max" && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-500 opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            )}

            <div className="relative space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${info.iconColor}`} />
                        <span className="font-semibold">{info.name}</span>
                    </div>
                    <Badge className={info.badgeClass}>
                        {info.price}
                    </Badge>
                </div>

                {/* Features */}
                <ul className="space-y-1">
                    {info.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs">
                            <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{feature}</span>
                        </li>
                    ))}
                    {info.features.length > 4 && (
                        <li className="text-xs text-muted-foreground pl-5">
                            +{info.features.length - 4} more
                        </li>
                    )}
                </ul>

                {/* Action Button */}
                {isCurrentPlan ? (
                    <div className="space-y-2 pt-2">
                        {currentUserPlan !== "free" && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={onManageSubscription}
                                disabled={isManaging}
                            >
                                {isManaging ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Unsubscribe"
                                )}
                            </Button>
                        )}
                    </div>
                ) : isUpgrade ? (
                    <Link href="/#pricing" className="block pt-2">
                        <Button size="sm" className={`w-full ${plan === "max" ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-primary to-primary/80"}`}>
                            <ArrowUp className="h-4 w-4 mr-1" />
                            Upgrade
                        </Button>
                    </Link>
                ) : isDowngrade ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={onManageSubscription}
                        disabled={isManaging}
                    >
                        {isManaging ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <ArrowDown className="h-4 w-4 mr-1" />
                                Downgrade
                            </>
                        )}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

export function SubscriptionDialog({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManaging, setIsManaging] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;

        async function fetchStatus() {
            setIsLoading(true);
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
    }, [open]);

    const handleManageSubscription = async () => {
        if (status?.plan === "free") {
            toast.info("You are on the free plan", {
                description: "Upgrade to PRO or MAX to unlock more features!",
            });
            return;
        }

        setIsManaging(true);
        try {
            const response = await fetch("/api/billing/portal", {
                method: "POST",
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("Unable to open subscription portal");
            }
        } catch (err) {
            toast.error("Failed to open subscription management");
        } finally {
            setIsManaging(false);
        }
    };

    // Order plans with current plan first
    const allPlans: PlanType[] = ["free", "pro", "max"];
    const orderedPlans: PlanType[] = status
        ? [status.plan, ...allPlans.filter((p) => p !== status.plan)]
        : allPlans;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Manage Subscription
                    </DialogTitle>
                    <DialogDescription>
                        View your current plan, upgrade, or manage your subscription.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : error || !status ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{error || "Unable to load"}</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Subscription info */}
                        {status.subscription?.currentPeriodEnd && (
                            <div className="text-center text-sm text-muted-foreground">
                                {status.subscription.cancelAtPeriodEnd
                                    ? "Your subscription ends on "
                                    : "Renews automatically on "}
                                <span className="font-medium">
                                    {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                                </span>
                            </div>
                        )}

                        {/* Plan cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {orderedPlans.map((plan) => (
                                <PlanCard
                                    key={plan}
                                    plan={plan}
                                    isCurrentPlan={plan === status.plan}
                                    currentUserPlan={status.plan}
                                    onManageSubscription={handleManageSubscription}
                                    isManaging={isManaging}
                                />
                            ))}
                        </div>

                        {/* Help text */}
                        <p className="text-xs text-center text-muted-foreground">
                            Need help? Contact us at{" "}
                            <a href="mailto:help@trakzi.com" className="text-primary hover:underline">
                                help@trakzi.com
                            </a>
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
