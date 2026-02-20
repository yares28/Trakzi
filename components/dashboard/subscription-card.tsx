"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Sparkles, AlertCircle, Check, ArrowUp, ArrowDown, Loader2, X, CreditCard, RotateCcw, Calendar } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

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

type PlanType = "free" | "pro" | "max";

const ALL_FEATURES = [
    { id: "baseTransactions", label: "Base transactions", free: "500", pro: "1,500", max: "5,000" },
    { id: "monthlyBonus", label: "Monthly bonus", free: "+50", pro: "+250", max: "+750" },
    { id: "receiptScans", label: "Receipt scans/month", free: "10", pro: "50", max: "150" },
    { id: "aiChat", label: "AI chat/week", free: "10", pro: "50", max: "100" },
    { id: "aiInsights", label: "AI insights", free: "3 previews", pro: "Full", max: "Full" },
    { id: "advancedCharts", label: "Advanced charts", free: false, pro: true, max: true },
    { id: "customCategories", label: "Custom categories", free: "1", pro: "10", max: "25" },
    { id: "prioritySupport", label: "Priority support", free: false, pro: false, max: true },
] as const;

const PLAN_CONFIG = {
    free: {
        name: "Free",
        price: "€0",
        accentColor: "bg-muted",
        borderColor: "border-border",
        headerBg: "bg-muted/50",
        checkColor: "text-green-500",
    },
    pro: {
        name: "PRO",
        price: "€4.99/mo",
        accentColor: "bg-primary/10",
        borderColor: "border-primary",
        headerBg: "bg-primary/10",
        checkColor: "text-primary",
    },
    max: {
        name: "MAX",
        price: "€19.99/mo",
        accentColor: "bg-amber-500/10",
        borderColor: "border-amber-500",
        headerBg: "bg-gradient-to-r from-amber-500/20 to-orange-500/20",
        checkColor: "text-amber-500",
    },
} as const;

type SubscriptionStatus = {
    plan: "free" | "pro" | "max";
    status: string;
    limits: {
        maxTotalTransactions: number;
        aiChatEnabled: boolean;
        aiChatMessages: number;
        aiChatPeriod: 'day' | 'week' | 'month';
        aiInsightsEnabled: boolean;
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
        pendingPlan?: string | null;
    } | null;
};

function FeatureValue({ value, plan }: { value: string | boolean; plan: PlanType }) {
    const config = PLAN_CONFIG[plan];
    
    if (typeof value === "boolean") {
        return value ? (
            <Check className={`h-4 w-4 ${config.checkColor}`} />
        ) : (
            <X className="h-4 w-4 text-muted-foreground/40" />
        );
    }
    
    return <span className="text-sm font-medium">{value}</span>;
}

function PlanCard({
    plan,
    isCurrentPlan,
    currentUserPlan,
    onManageSubscription,
    onUpgrade,
    onDowngrade,
    onReactivate,
    isManaging,
    isCancelPending,
    pendingPlan,
}: {
    plan: PlanType;
    isCurrentPlan: boolean;
    currentUserPlan: PlanType;
    onManageSubscription: () => void;
    onUpgrade: (plan: PlanType) => void;
    onDowngrade: (plan: PlanType) => void;
    onReactivate: () => void;
    isManaging: boolean;
    isCancelPending: boolean;
    pendingPlan?: string | null;
}) {
    const config = PLAN_CONFIG[plan];

    const planOrder: PlanType[] = ["free", "pro", "max"];
    const currentIndex = planOrder.indexOf(currentUserPlan);
    const thisIndex = planOrder.indexOf(plan);
    const isUpgrade = thisIndex > currentIndex;
    const isDowngrade = thisIndex < currentIndex;
    const isPendingDowngrade = pendingPlan === plan;

    return (
        <div className={`relative rounded-xl border flex flex-col overflow-hidden transition-all ${isCurrentPlan ? `${config.borderColor} ring-1 ring-offset-1 ring-offset-background` : isPendingDowngrade ? "border-amber-500 ring-1 ring-amber-500/50" : "border-border hover:border-border/80"}`}>
            {/* Header */}
            <div className={`${config.headerBg} p-4 border-b border-border/50`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Image
                            src={planIcons[plan].dark}
                            alt={`${plan} icon`}
                            width={28}
                            height={28}
                            className="hidden dark:block"
                        />
                        <Image
                            src={planIcons[plan].light}
                            alt={`${plan} icon`}
                            width={28}
                            height={28}
                            className="block dark:hidden"
                        />
                        <span className="font-semibold text-lg">{config.name}</span>
                    </div>
                    {isCurrentPlan ? (
                        <Badge className="bg-primary text-primary-foreground text-xs">
                            Current
                        </Badge>
                    ) : isPendingDowngrade ? (
                        <Badge className="bg-amber-500 text-white text-xs">
                            Pending
                        </Badge>
                    ) : null}
                </div>
                <div className="mt-2">
                    <span className="text-2xl font-bold">{config.price}</span>
                </div>
            </div>

            {/* Features List */}
            <div className="flex-1 p-4">
                <div className="space-y-3">
                    {ALL_FEATURES.map((feature) => {
                        const value = feature[plan];
                        const isHigherPlan = planOrder.indexOf(plan) > planOrder.indexOf(currentUserPlan);
                        const isLowerPlan = planOrder.indexOf(plan) < planOrder.indexOf(currentUserPlan);
                        const isGained = isHigherPlan && !isCurrentPlan;
                        const isLost = isLowerPlan && !isCurrentPlan;

                        return (
                            <div 
                                key={feature.id} 
                                className={`flex items-center justify-between py-1 ${isGained ? "text-green-600 dark:text-green-400" : isLost ? "text-muted-foreground/60" : ""}`}
                            >
                                <span className="text-sm text-muted-foreground">{feature.label}</span>
                                <FeatureValue value={value} plan={plan} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Button */}
            <div className="p-4 pt-0">
                {isCurrentPlan ? (
                    currentUserPlan !== "free" ? (
                        isCancelPending ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-green-600 border-green-600/30 hover:bg-green-500/10"
                                onClick={onReactivate}
                                disabled={isManaging}
                            >
                                {isManaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4 mr-1" />Reactivate</>}
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={onManageSubscription}
                                disabled={isManaging}
                            >
                                {isManaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4 mr-1" />Unsubscribe</>}
                            </Button>
                        )
                    ) : null
                ) : isPendingDowngrade ? (
                    <div className="text-center text-xs text-amber-600 py-2">
                        Switching to this plan soon
                    </div>
                ) : isUpgrade ? (
                    <Button
                        size="sm"
                        className={`w-full ${plan === "max" ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" : "bg-primary hover:bg-primary/90"}`}
                        onClick={() => onUpgrade(plan)}
                        disabled={isManaging}
                    >
                        {isManaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowUp className="h-4 w-4 mr-1" />Upgrade</>}
                    </Button>
                ) : isDowngrade ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onDowngrade(plan)}
                        disabled={isManaging}
                    >
                        {isManaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowDown className="h-4 w-4 mr-1" />Downgrade</>}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}

export function SubscriptionCard() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManaging, setIsManaging] = useState(false);

    // Confirmation dialog states
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showDowngradeConfirm, setShowDowngradeConfirm] = useState<PlanType | null>(null);
    const [showUpgradeConfirm, setShowUpgradeConfirm] = useState<PlanType | null>(null);

    // Cancel preview state (how many transactions will be deleted)
    const [cancelPreview, setCancelPreview] = useState<{
        loading: boolean;
        currentTotal: number;
        freePlanCap: number;
        transactionsToDelete: number;
        willExceed: boolean;
    } | null>(null);

    useEffect(() => {
        async function fetchStatus() {
            try {
                // Use /api/subscription/me which returns pendingPlan and usage data
                const response = await fetch("/api/subscription/me");
                if (!response.ok) throw new Error("Failed to fetch");
                const data = await response.json();

                // Transform response to expected format
                setStatus({
                    plan: data.plan,
                    status: data.status,
                    limits: {
                        maxTotalTransactions: data.limits?.max_total_transactions ?? 400,
                        aiChatEnabled: data.limits?.ai_chat_enabled ?? true,
                        aiChatMessages: data.limits?.ai_chat_messages ?? 10,
                        aiChatPeriod: data.limits?.ai_chat_period ?? 'week',
                        aiInsightsEnabled: data.limits?.ai_insights_enabled ?? false,
                        customTransactionCategoriesLimit: 10,
                        customFridgeCategoriesLimit: 10,
                    },
                    usage: {
                        bankTransactions: data.usage?.bank_transactions || 0,
                        fridgeItems: data.usage?.receipt_trips || 0,
                        totalTransactions: data.used_total || 0,
                        transactionLimit: data.cap === -1 ? Infinity : (data.cap || 300),
                        percentUsed: data.cap > 0 && data.cap !== -1
                            ? Math.round((data.used_total / data.cap) * 100)
                            : 0,
                    },
                    subscription: {
                        currentPeriodEnd: data.current_period_end,
                        cancelAtPeriodEnd: data.cancel_at_period_end,
                        pendingPlan: data.pending_plan,
                    },
                });
            } catch (err) {
                setError("Unable to load subscription info");
            } finally {
                setIsLoading(false);
            }
        }
        fetchStatus();
    }, []);

    // Fetch cancel preview (how many transactions will be deleted)
    const fetchCancelPreview = async () => {
        try {
            const response = await fetch("/api/billing/cancel-preview");
            if (response.ok) {
                const data = await response.json();
                setCancelPreview({
                    loading: false,
                    currentTotal: data.currentTotal,
                    freePlanCap: data.freePlanCap,
                    transactionsToDelete: data.transactionsToDelete,
                    willExceed: data.willExceed,
                });
            }
        } catch (err) {
            console.error("Failed to fetch cancel preview:", err);
            setCancelPreview({
                loading: false,
                currentTotal: 0,
                freePlanCap: 400,
                transactionsToDelete: 0,
                willExceed: false,
            });
        }
    };

    // Fetch cancel preview when cancel dialog opens
    useEffect(() => {
        if (showCancelConfirm && status?.plan !== 'free') {
            setCancelPreview({ loading: true, currentTotal: 0, freePlanCap: 400, transactionsToDelete: 0, willExceed: false });
            fetchCancelPreview();
        }
    }, [showCancelConfirm, status?.plan]);

    // Format date for display
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return "Unknown";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const handleManageSubscription = async () => {
        if (status?.plan === "free") {
            toast.info("You are on the free plan", {
                description: "Upgrade to PRO or MAX to unlock more features!",
            });
            return;
        }

        setIsManaging(true);
        try {
            const response = await fetch("/api/billing/cancel", {
                method: "POST",
            });
            const data = await response.json();

            if (data.success) {
                toast.success("Subscription cancelled", {
                    description: data.message,
                    duration: 5000,
                });
                // Refresh using /api/subscription/me
                await refreshStatus();
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

    // Cancel immediately (not at period end)
    const handleCancelNow = async () => {
        setIsManaging(true);
        try {
            const response = await fetch("/api/billing/cancel-now", {
                method: "POST",
            });
            const data = await response.json();

            if (data.success) {
                toast.success("Subscription cancelled immediately", {
                    description: data.message,
                    duration: 5000,
                });
                // Refresh using /api/subscription/me
                await refreshStatus();
                // Trigger transaction count refresh in dashboard
                window.dispatchEvent(new CustomEvent('subscription-changed'));
                setShowCancelConfirm(false);
            } else if (data.error) {
                toast.error(data.error);
            } else {
                toast.error("Unable to cancel subscription");
            }
        } catch (err) {
            console.error("Cancel now error:", err);
            toast.error("Failed to cancel subscription");
        } finally {
            setIsManaging(false);
        }
    };

    // Helper to refresh subscription status
    const refreshStatus = async () => {
        try {
            const response = await fetch("/api/subscription/me");
            if (!response.ok) return;
            const data = await response.json();
            setStatus({
                plan: data.plan,
                status: data.status,
                limits: {
                    maxTotalTransactions: data.limits?.max_total_transactions ?? 400,
                    aiChatEnabled: data.limits?.ai_chat_enabled ?? true,
                    aiChatMessages: data.limits?.ai_chat_messages ?? 10,
                    aiChatPeriod: data.limits?.ai_chat_period ?? 'week',
                    aiInsightsEnabled: data.limits?.ai_insights_enabled ?? false,
                    customTransactionCategoriesLimit: 10,
                    customFridgeCategoriesLimit: 10,
                },
                usage: {
                    bankTransactions: data.usage?.bank_transactions || 0,
                    fridgeItems: data.usage?.receipt_trips || 0,
                    totalTransactions: data.used_total || 0,
                    transactionLimit: data.cap === -1 ? Infinity : (data.cap || 300),
                    percentUsed: data.cap > 0 && data.cap !== -1
                        ? Math.round((data.used_total / data.cap) * 100)
                        : 0,
                },
                subscription: {
                    currentPeriodEnd: data.current_period_end,
                    cancelAtPeriodEnd: data.cancel_at_period_end,
                    pendingPlan: data.pending_plan,
                },
            });
        } catch (err) {
            console.error("Failed to refresh status:", err);
        }
    };

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
                // Validate redirect goes to Stripe before navigating
                const redirectUrl = new URL(data.url);
                if (!redirectUrl.hostname.endsWith('stripe.com')) {
                    throw new Error('Invalid checkout redirect URL');
                }
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
                toast.success(data.message || `Plan will change to ${targetPlan.toUpperCase()}`);
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

    const handleReactivate = async () => {
        setIsManaging(true);
        try {
            const response = await fetch("/api/billing/reactivate", {
                method: "POST",
            });
            const data = await response.json();

            if (data.success) {
                toast.success(data.message || "Subscription reactivated!");
                const statusResponse = await fetch("/api/subscription/status");
                if (statusResponse.ok) {
                    const newStatus = await statusResponse.json();
                    setStatus(newStatus);
                }
            } else if (data.error) {
                toast.error(data.error);
            } else {
                toast.error("Unable to reactivate subscription");
            }
        } catch (err) {
            console.error("Reactivate error:", err);
            toast.error("Failed to reactivate subscription");
        } finally {
            setIsManaging(false);
        }
    };

    // Wrapper functions to show confirmation dialogs
    const confirmCancel = () => {
        setShowCancelConfirm(true);
    };

    const confirmDowngrade = (plan: PlanType) => {
        setShowDowngradeConfirm(plan);
    };

    const confirmUpgrade = (plan: PlanType) => {
        // For free users, go directly to checkout (no confirmation needed)
        if (!status || status.plan === 'free' || !status.subscription) {
            handleUpgrade(plan);
        } else {
            // For paid users upgrading, show confirmation
            setShowUpgradeConfirm(plan);
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

    // Get current billing date
    const billingDate = status.subscription?.currentPeriodEnd
        ? formatDate(status.subscription.currentPeriodEnd)
        : "your next billing date";

    const shortBillingDate = status.subscription?.currentPeriodEnd
        ? new Date(status.subscription.currentPeriodEnd).toLocaleDateString()
        : null;

    return (
        <>
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
                        {shortBillingDate && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                                <Calendar className="h-3 w-3" />
                                <span>
                                    {status.subscription?.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                                    {shortBillingDate}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Pending plan info */}
                    {status.subscription?.pendingPlan && (
                        <div className="mt-2 text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                            Your plan will change to <strong>{status.subscription.pendingPlan.toUpperCase()}</strong> on {shortBillingDate || "your next billing date"}
                        </div>
                    )}
                </CardHeader>

                <CardContent className="relative">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {orderedPlans.map((plan) => (
                            <PlanCard
                                key={plan}
                                plan={plan}
                                isCurrentPlan={plan === status.plan}
                                currentUserPlan={status.plan}
                                onManageSubscription={confirmCancel}
                                onUpgrade={confirmUpgrade}
                                onDowngrade={confirmDowngrade}
                                onReactivate={handleReactivate}
                                isManaging={isManaging}
                                isCancelPending={status.subscription?.cancelAtPeriodEnd || false}
                                pendingPlan={status.subscription?.pendingPlan}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card >

            {/* Cancel Confirmation Dialog - Enhanced */}
            < AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm} >
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-full bg-destructive/10">
                                <AlertCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <AlertDialogTitle className="text-xl">Cancel Subscription?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    We're sad to see you go! Here's what will happen:
                                </p>

                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Keep access until</p>
                                            <p className="text-sm text-muted-foreground">{billingDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">After this date, you'll lose:</p>
                                            <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                                                <li>Extra transaction capacity</li>
                                                <li>Extra receipt scans</li>
                                                <li>Extra AI chat messages</li>
                                                <li>Full AI insights</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction Deletion Warning */}
                                {cancelPreview?.willExceed && cancelPreview.transactionsToDelete > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                                    Transaction Limit Warning
                                                </p>
                                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                                    You currently have <strong>{cancelPreview.currentTotal.toLocaleString()}</strong> transactions.
                                                    The free plan allows up to <strong>{cancelPreview.freePlanCap.toLocaleString()}</strong> transactions.
                                                </p>
                                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mt-2">
                                                    ⚠️ <strong>{cancelPreview.transactionsToDelete.toLocaleString()}</strong> oldest transaction(s) will be automatically deleted to fit the free plan limit.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {cancelPreview?.loading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Calculating transaction impact...</span>
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground">
                                    You can reactivate anytime before {billingDate} to keep your benefits.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
                        <AlertDialogCancel className="font-semibold">Keep My Subscription</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-amber-600 text-white hover:bg-amber-700"
                            onClick={() => {
                                setShowCancelConfirm(false);
                                handleManageSubscription();
                            }}
                        >
                            Cancel at Period End
                        </AlertDialogAction>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleCancelNow}
                            disabled={isManaging || cancelPreview?.loading}
                        >
                            {isManaging ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Cancel Now
                            {cancelPreview?.willExceed && cancelPreview.transactionsToDelete > 0 && (
                                <span className="ml-2 text-xs opacity-90">
                                    ({cancelPreview.transactionsToDelete.toLocaleString()} transactions will be deleted)
                                </span>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >

            {/* Upgrade Confirmation Dialog */}
            < AlertDialog open={!!showUpgradeConfirm
            } onOpenChange={(open) => !open && setShowUpgradeConfirm(null)}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-full ${showUpgradeConfirm === 'max' ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                                <ArrowUp className={`h-6 w-6 ${showUpgradeConfirm === 'max' ? 'text-amber-500' : 'text-primary'}`} />
                            </div>
                            <AlertDialogTitle className="text-xl">
                                Upgrade to {showUpgradeConfirm?.toUpperCase()}?
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Great choice! Here's what happens next:
                                </p>

                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">New rate starts</p>
                                            <p className="text-sm text-muted-foreground">{billingDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">New price</p>
                                            <p className="text-sm text-muted-foreground">
                                                {showUpgradeConfirm ? PLAN_CONFIG[showUpgradeConfirm].price : ""} (billed monthly)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Immediate access to:</p>
                                            <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                                                {showUpgradeConfirm && ALL_FEATURES.slice(0, 3).map((f) => (
                                                    <li key={f.id}>{f.label}: {f[showUpgradeConfirm]}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Your payment method on file will be charged on {billingDate}.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className={showUpgradeConfirm === 'max'
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                : "bg-primary hover:bg-primary/90"}
                            onClick={() => {
                                if (showUpgradeConfirm) {
                                    handleUpgrade(showUpgradeConfirm);
                                }
                                setShowUpgradeConfirm(null);
                            }}
                        >
                            Confirm Upgrade
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >

            {/* Downgrade Confirmation Dialog - Enhanced */}
            < AlertDialog open={!!showDowngradeConfirm} onOpenChange={(open) => !open && setShowDowngradeConfirm(null)}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-full bg-muted">
                                <ArrowDown className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <AlertDialogTitle className="text-xl">
                                Downgrade to {showDowngradeConfirm?.toUpperCase()}?
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    {showDowngradeConfirm === 'free'
                                        ? "This will cancel your subscription."
                                        : "Your plan will change at the end of your billing period."}
                                </p>

                                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Keep current benefits until</p>
                                            <p className="text-sm text-muted-foreground">{billingDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">New rate after that</p>
                                            <p className="text-sm text-muted-foreground">
                                                {showDowngradeConfirm ? PLAN_CONFIG[showDowngradeConfirm].price : ""} (billed monthly)
                                            </p>
                                        </div>
                                    </div>
                                    {status && showDowngradeConfirm && (
                                        <div className="flex items-start gap-3">
                                            <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium">Features you'll lose:</p>
                                                <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                                                    {showDowngradeConfirm === 'free' ? (
                                                        <>
                                                            <li>Extra transaction capacity</li>
                                                            <li>Extra receipt scans</li>
                                                            <li>Extra AI chat messages</li>
                                                            <li>Full AI insights</li>
                                                        </>
                                                    ) : showDowngradeConfirm === 'pro' && status.plan === 'max' ? (
                                                        <>
                                                            <li>Higher transaction limit</li>
                                                            <li>More receipt scans</li>
                                                            <li>More AI chat messages</li>
                                                            <li>Priority support</li>
                                                        </>
                                                    ) : null}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    You can upgrade again anytime to restore these features.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="font-semibold">Keep Current Plan</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (showDowngradeConfirm) {
                                    if (showDowngradeConfirm === 'free') {
                                        handleManageSubscription();
                                    } else {
                                        handleDowngrade(showDowngradeConfirm);
                                    }
                                }
                                setShowDowngradeConfirm(null);
                            }}
                        >
                            Yes, Downgrade
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog >
        </>
    );
}
