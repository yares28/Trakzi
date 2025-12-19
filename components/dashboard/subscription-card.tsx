"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Zap, AlertCircle, Check, ArrowUp, ArrowDown, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

// Plan icons with dark/light mode variants
const planIcons = {
    free: {
        light: "/Trakzi/subs/freeicon.png",
        dark: "/Trakzi/subs/freeiconB.png",
    },
    pro: {
        light: "/Trakzi/subs/TrakziProIcon.png",
        dark: "/Trakzi/subs/TrakziProIconB.png",
    },
    max: {
        light: "/Trakzi/subs/trakziMaxIcon.png",
        dark: "/Trakzi/subs/TrakziMaxIconB.png",
    },
} as const;

type SubscriptionStatus = {
    plan: "free" | "pro" | "max";
    status: string;
    limits: {
        maxTotalTransactions: number;
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
            "400 transactions",
            "Unlimited receipt scans",
            "5 AI chat/day",
            "Analytics charts",
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
            "3,000 transactions",
            "Unlimited receipt scans",
            "Unlimited AI chat",
            "AI insights & summaries",
            "Unlimited categories",
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
            "Early access",
            "Sub-accounts (soon)",
            "Custom API (soon)",
        ],
    },
};

type PlanType = "free" | "pro" | "max";

function PlanCard({
    plan,
    isCurrentPlan,
    currentUserPlan,
    onManageSubscription,
    onUpgrade,
    onDowngrade,
    isManaging,
}: {
    plan: PlanType;
    isCurrentPlan: boolean;
    currentUserPlan: PlanType;
    onManageSubscription: () => void;
    onUpgrade: (plan: PlanType) => void;
    onDowngrade: (plan: PlanType) => void;
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
        <div className={`relative p-4 rounded-xl border flex flex-col ${isCurrentPlan ? "border-primary bg-primary/5" : "border-border"}`}>
            {/* Current plan indicator */}
            {isCurrentPlan && (
                <div className="absolute -top-3 left-4">
                    <Badge className="bg-primary text-primary-foreground text-xs">
                        Current
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

            <div className="relative flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {/* Show plan image icon for all plans */}
                        <>
                            <Image
                                src={planIcons[plan].dark}
                                alt={`${plan} icon`}
                                width={24}
                                height={24}
                                className="hidden dark:block"
                            />
                            <Image
                                src={planIcons[plan].light}
                                alt={`${plan} icon`}
                                width={24}
                                height={24}
                                className="block dark:hidden"
                            />
                        </>
                        <span className="font-semibold">{info.name}</span>
                    </div>
                    <Badge className={info.badgeClass}>
                        {info.price}
                    </Badge>
                </div>

                {/* Features - show all */}
                <ul className="space-y-1.5 flex-1">
                    {info.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                    {isCurrentPlan ? (
                        currentUserPlan !== "free" ? (
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
                                    <>
                                        <X className="h-4 w-4 mr-1" />
                                        Unsubscribe
                                    </>
                                )}
                            </Button>
                        ) : (
                            <div className="h-9" /> /* Spacer for Free plan */
                        )
                    ) : isUpgrade ? (
                        <Button
                            size="sm"
                            className={`w-full ${plan === "max" ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-primary to-primary/80"}`}
                            onClick={() => onUpgrade(plan)}
                            disabled={isManaging}
                        >
                            {isManaging ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <ArrowUp className="h-4 w-4 mr-1" />
                                    Upgrade
                                </>
                            )}
                        </Button>
                    ) : isDowngrade ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => onDowngrade(plan)}
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
                    ) : (
                        <div className="h-9" /> /* Spacer */
                    )}
                </div>
            </div>
        </div>
    );
}

export function SubscriptionCard() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManaging, setIsManaging] = useState(false);

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

    const handleManageSubscription = async () => {
        if (status?.plan === "free") {
            toast.info("You are on the free plan", {
                description: "Upgrade to PRO or MAX to unlock more features!",
            });
            return;
        }

        setIsManaging(true);
        try {
            // Use the cancel endpoint to cancel at period end
            const response = await fetch("/api/billing/cancel", {
                method: "POST",
            });
            const data = await response.json();

            if (data.success) {
                toast.success("Subscription cancelled", {
                    description: data.message,
                    duration: 5000,
                });
                // Refresh the subscription status
                const statusResponse = await fetch("/api/subscription/status");
                if (statusResponse.ok) {
                    const newStatus = await statusResponse.json();
                    setStatus(newStatus);
                }
            } else if (data.error) {
                toast.error(data.error);
            } else {
                toast.error("Unable to cancel subscription");
            }
        } catch (err) {
            console.error("Cancel subscription error:", err);
            toast.error("Failed to cancel subscription");
        } finally {
            setIsManaging(false);
        }
    };

    // Get price ID for a plan
    const getPriceIdForPlan = (plan: PlanType): string | null => {
        if (plan === 'pro') {
            return process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY || null;
        }
        if (plan === 'max') {
            return process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAX_MONTHLY || null;
        }
        return null;
    };

    const handleUpgrade = async (targetPlan: PlanType) => {
        const priceId = getPriceIdForPlan(targetPlan);
        if (!priceId) {
            toast.error("Unable to process upgrade. Please try again later.");
            return;
        }

        setIsManaging(true);
        try {
            const response = await fetch("/api/billing/change-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetPlan, priceId }),
            });
            const data = await response.json();

            if (data.action === 'checkout' && data.url) {
                window.location.href = data.url;
            } else if (data.success) {
                toast.success(data.message || `Upgraded to ${targetPlan.toUpperCase()}!`);
                const statusResponse = await fetch("/api/subscription/status");
                if (statusResponse.ok) {
                    const newStatus = await statusResponse.json();
                    setStatus(newStatus);
                }
            } else if (data.error) {
                toast.error(data.error);
            } else {
                toast.error("Unable to process upgrade");
            }
        } catch (err) {
            console.error("Upgrade error:", err);
            toast.error("Failed to upgrade subscription");
        } finally {
            setIsManaging(false);
        }
    };

    const handleDowngrade = async (targetPlan: PlanType) => {
        if (targetPlan === 'free') {
            handleManageSubscription();
            return;
        }

        const priceId = getPriceIdForPlan(targetPlan);
        if (!priceId) {
            toast.error("Unable to process downgrade. Please try again later.");
            return;
        }

        setIsManaging(true);
        try {
            const response = await fetch("/api/billing/change-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetPlan, priceId }),
            });
            const data = await response.json();

            if (data.success) {
                toast.success(data.message || `Downgraded to ${targetPlan.toUpperCase()}`);
                const statusResponse = await fetch("/api/subscription/status");
                if (statusResponse.ok) {
                    const newStatus = await statusResponse.json();
                    setStatus(newStatus);
                }
            } else if (data.error) {
                toast.error(data.error);
            } else {
                toast.error("Unable to process downgrade");
            }
        } catch (err) {
            console.error("Downgrade error:", err);
            toast.error("Failed to downgrade subscription");
        } finally {
            setIsManaging(false);
        }
    };

    if (isLoading) {
        return (
            <Card className="animate-pulse">
                <CardHeader className="pb-2">
                    <div className="h-6 w-48 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-56 bg-muted rounded-xl" />
                        ))}
                    </div>
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

    // Order plans with current plan first
    const allPlans: PlanType[] = ["free", "pro", "max"];
    const orderedPlans: PlanType[] = [
        status.plan,
        ...allPlans.filter((p) => p !== status.plan),
    ];

    return (
        <Card className="relative overflow-hidden">
            {/* Background glow */}
            {status.plan === "pro" && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400 to-orange-600 opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            )}
            {status.plan === "max" && (
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-400 to-orange-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            )}

            <CardHeader className="pb-4 relative">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Your Subscription
                    </CardTitle>
                    {status.subscription?.currentPeriodEnd && (
                        <p className="text-xs text-muted-foreground">
                            {status.subscription.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                            {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </CardHeader>

            <CardContent className="relative">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {orderedPlans.map((plan) => (
                        <PlanCard
                            key={plan}
                            plan={plan}
                            isCurrentPlan={plan === status.plan}
                            currentUserPlan={status.plan}
                            onManageSubscription={handleManageSubscription}
                            onUpgrade={handleUpgrade}
                            onDowngrade={handleDowngrade}
                            isManaging={isManaging}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
