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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Zap, AlertCircle, Check, ArrowUp, ArrowDown, CreditCard, Loader2, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

// Plan icons with dark/light mode variants
const planIcons = {
    free: {
        light: "/Trakzi/subs/freeicon.png",
        dark: "/Trakzi/subs/freeiconB.png",
    },
    pro: {
        light: "/Trakzi/subs/TrakziProLogo.png",
        dark: "/Trakzi/subs/TrakziProLogoB.png",
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
    onReactivate,
    isManaging,
    isCancelPending,
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
                        <li key={index} className="flex items-start gap-2 text-xs">
                            <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                    {isCurrentPlan ? (
                        currentUserPlan !== "free" ? (
                            isCancelPending ? (
                                // Show reactivate button if subscription is pending cancellation
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-green-600 border-green-600/30 hover:bg-green-500/10"
                                    onClick={onReactivate}
                                    disabled={isManaging}
                                >
                                    {isManaging ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <RotateCcw className="h-4 w-4 mr-1" />
                                            Reactivate
                                        </>
                                    )}
                                </Button>
                            ) : (
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
                            )
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

export function SubscriptionDialog({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManaging, setIsManaging] = useState(false);
    const [open, setOpen] = useState(false);
    // Confirmation dialog states
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showDowngradeConfirm, setShowDowngradeConfirm] = useState<PlanType | null>(null);
    const [showUpgradeConfirm, setShowUpgradeConfirm] = useState<PlanType | null>(null);
    // Upgrade preview state
    const [upgradePreview, setUpgradePreview] = useState<{
        loading: boolean;
        error: string | null;
        prorationAmount: string | null;
        daysRemaining: number | null;
        nextBillingAmount: string | null;
        currency: string;
    }>({ loading: false, error: null, prorationAmount: null, daysRemaining: null, nextBillingAmount: null, currency: 'eur' });
    // Downgrade cap preview state
    const [downgradeCapInfo, setDowngradeCapInfo] = useState<{
        currentTotal: number;
        targetCap: number;
        toDelete: number;
    } | null>(null);
    
    // Cancel preview state (how many transactions will be deleted)
    const [cancelPreview, setCancelPreview] = useState<{
        loading: boolean;
        currentTotal: number;
        freePlanCap: number;
        transactionsToDelete: number;
        willExceed: boolean;
    } | null>(null);

    // Plan caps for downgrade warning
    const PLAN_CAPS: Record<PlanType, number> = { free: 400, pro: 3000, max: 15000 };

    // Fetch subscription status with usage data
    const fetchStatus = async () => {
        try {
            const response = await fetch("/api/subscription/me");
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            // Transform to expected format
            setStatus({
                plan: data.plan,
                status: data.status,
                limits: data.limits || {},
                usage: {
                    bankTransactions: data.usage?.bank_transactions || 0,
                    fridgeItems: data.usage?.receipt_transactions || 0,
                    totalTransactions: data.used_total || 0,
                    transactionLimit: data.cap || 400,
                    percentUsed: data.cap > 0 ? Math.round((data.used_total / data.cap) * 100) : 0,
                },
                subscription: {
                    currentPeriodEnd: data.current_period_end,
                    cancelAtPeriodEnd: data.cancel_at_period_end,
                },
            });
        } catch (err) {
            setError("Unable to load subscription info");
        }
    };

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

    useEffect(() => {
        if (!open) return;

        setIsLoading(true);
        fetchStatus().finally(() => setIsLoading(false));

        // Polling while dialog is open (every 5 seconds)
        const pollInterval = setInterval(fetchStatus, 5000);

        return () => clearInterval(pollInterval);
    }, [open]);
    
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

    // Retention offer state
    const [showRetentionOffer, setShowRetentionOffer] = useState(false);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    const handleApplyRetentionCoupon = async () => {
        setIsApplyingCoupon(true);
        try {
            const response = await fetch("/api/billing/apply-retention-coupon", {
                method: "POST",
            });
            const data = await response.json();

            if (data.success) {
                toast.success("Discount applied!", {
                    description: data.message,
                    duration: 5000,
                });
                // Refresh the subscription status
                const statusResponse = await fetch("/api/subscription/status");
                if (statusResponse.ok) {
                    const newStatus = await statusResponse.json();
                    setStatus(newStatus);
                }
                setShowRetentionOffer(false);
                setShowCancelConfirm(false);
            } else if (data.error) {
                toast.error(data.error);
            } else {
                toast.error("Unable to apply discount");
            }
        } catch (err) {
            console.error("Apply retention coupon error:", err);
            toast.error("Failed to apply discount");
        } finally {
            setIsApplyingCoupon(false);
        }
    };

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
                // Refresh the subscription status and trigger transaction count refresh
                const statusResponse = await fetch("/api/subscription/status");
                if (statusResponse.ok) {
                    const newStatus = await statusResponse.json();
                    setStatus(newStatus);
                }
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

    // Get price ID for a plan
    const getPriceIdForPlan = (plan: PlanType): string | null => {
        // Use NEXT_PUBLIC_ env vars since this is client-side
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
                // Redirect to Stripe checkout
                window.location.href = data.url;
            } else if (data.success) {
                toast.success(data.message || `Upgraded to ${targetPlan.toUpperCase()}!`);
                // Refresh subscription status
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
            // Downgrading to free is just canceling
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
                // Refresh subscription status
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
                // Refresh subscription status
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
        // Calculate cap warning info
        if (status) {
            const currentTotal = status.usage.totalTransactions;
            const targetCap = PLAN_CAPS[plan];
            const toDelete = Math.max(0, currentTotal - targetCap);
            setDowngradeCapInfo({ currentTotal, targetCap, toDelete });
        }
        setShowDowngradeConfirm(plan);
    };

    const confirmUpgrade = async (plan: PlanType) => {
        // For free users, go directly to checkout (no confirmation needed)
        if (!status || status.plan === 'free' || !status.subscription) {
            handleUpgrade(plan);
        } else {
            // For paid users upgrading, show confirmation with proration preview
            setShowUpgradeConfirm(plan);
            setUpgradePreview({ loading: true, error: null, prorationAmount: null, daysRemaining: null, nextBillingAmount: null, currency: 'eur' });

            try {
                const priceId = getPriceIdForPlan(plan);
                if (!priceId) {
                    setUpgradePreview(prev => ({ ...prev, loading: false, error: 'Unable to get pricing information' }));
                    return;
                }

                const response = await fetch('/api/billing/preview-upgrade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targetPriceId: priceId }),
                });
                const data = await response.json();

                if (data.error) {
                    setUpgradePreview(prev => ({ ...prev, loading: false, error: data.error }));
                } else {
                    setUpgradePreview({
                        loading: false,
                        error: null,
                        prorationAmount: data.prorationAmountFormatted,
                        daysRemaining: data.daysRemaining,
                        nextBillingAmount: data.nextBillingAmountFormatted,
                        currency: data.currency || 'eur',
                    });
                }
            } catch (err) {
                setUpgradePreview(prev => ({ ...prev, loading: false, error: 'Failed to calculate upgrade cost' }));
            }
        }
    };

    // Order plans with current plan first
    const allPlans: PlanType[] = ["free", "pro", "max"];
    const orderedPlans: PlanType[] = status
        ? [status.plan, ...allPlans.filter((p) => p !== status.plan)]
        : allPlans;

    // Get current billing date
    const billingDate = status?.subscription?.currentPeriodEnd
        ? formatDate(status.subscription.currentPeriodEnd)
        : "your next billing date";

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[85vh] overflow-y-auto">
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-56 bg-muted rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : error || !status ? (
                        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{error || "Unable to load"}</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Payment failure warning */}
                            {status.status === 'past_due' && (
                                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-destructive">Payment Failed</p>
                                        <p className="text-xs text-muted-foreground">
                                            Your last payment was unsuccessful. Please update your payment method to continue using premium features.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2 text-xs"
                                            onClick={async () => {
                                                try {
                                                    const response = await fetch('/api/billing/portal', { method: 'POST' });
                                                    const data = await response.json();
                                                    if (data.url) window.location.href = data.url;
                                                } catch (e) {
                                                    toast.error('Unable to open billing portal');
                                                }
                                            }}
                                        >
                                            Update Payment Method
                                        </Button>
                                    </div>
                                </div>
                            )}

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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Cancel Confirmation Dialog - Enhanced */}
            <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
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
                                                <li>Unlimited AI chat access</li>
                                                <li>Extra transaction capacity</li>
                                                <li>CSV export feature</li>
                                                <li>Priority support</li>
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
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => {
                                setShowRetentionOffer(true);
                            }}
                        >
                            Stay & Save 30%
                        </AlertDialogAction>
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
            </AlertDialog>

            {/* Retention Offer Dialog */}
            <AlertDialog open={showRetentionOffer} onOpenChange={setShowRetentionOffer}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-full bg-green-500/10">
                                <Sparkles className="h-6 w-6 text-green-600" />
                            </div>
                            <AlertDialogTitle className="text-xl">Stay & Save 30%!</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    We'd love to keep you! Here's a special offer:
                                </p>

                                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                                                30% Off Your Next Month
                                            </p>
                                            <p className="text-sm text-green-800 dark:text-green-200">
                                                Stay with us for one more month and get 30% off your next invoice. 
                                                Your subscription will continue automatically after that.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    This discount applies to your next billing cycle only. You can cancel anytime.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2">
                        <AlertDialogCancel>No Thanks</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={handleApplyRetentionCoupon}
                            disabled={isApplyingCoupon}
                        >
                            {isApplyingCoupon ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Apply Discount & Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Upgrade Confirmation Dialog - New */}
            <AlertDialog open={!!showUpgradeConfirm} onOpenChange={(open) => !open && setShowUpgradeConfirm(null)}>
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
                                                {showUpgradeConfirm ? PLAN_INFO[showUpgradeConfirm].price : ""} (billed monthly)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">Immediate access to:</p>
                                            <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                                                {showUpgradeConfirm && PLAN_INFO[showUpgradeConfirm].features.slice(0, 3).map((f, i) => (
                                                    <li key={i}>{f}</li>
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
            </AlertDialog>

            {/* Downgrade Confirmation Dialog - Enhanced */}
            <AlertDialog open={!!showDowngradeConfirm} onOpenChange={(open) => !open && setShowDowngradeConfirm(null)}>
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
                                                {showDowngradeConfirm ? PLAN_INFO[showDowngradeConfirm].price : ""} (billed monthly)
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
                                                            <li>Unlimited AI chat</li>
                                                            <li>CSV export</li>
                                                        </>
                                                    ) : showDowngradeConfirm === 'pro' && status.plan === 'max' ? (
                                                        <>
                                                            <li>Unlimited transactions</li>
                                                            <li>Priority support</li>
                                                            <li>Early access features</li>
                                                        </>
                                                    ) : null}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Auto-delete warning if over cap */}
                                {downgradeCapInfo && downgradeCapInfo.toDelete > 0 && (
                                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-destructive">
                                                    Transaction Limit Warning
                                                </p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    You have <strong>{downgradeCapInfo.currentTotal.toLocaleString()}</strong> transactions,
                                                    but the {showDowngradeConfirm?.toUpperCase()} plan allows only <strong>{downgradeCapInfo.targetCap.toLocaleString()}</strong>.
                                                </p>
                                                <p className="text-sm text-destructive mt-2">
                                                    If you don't delete <strong>{downgradeCapInfo.toDelete.toLocaleString()}</strong> transactions
                                                    before {billingDate}, Trakzi will automatically delete your oldest transactions to fit the plan.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
            </AlertDialog>

            {/* Upgrade Confirmation Dialog with Payment Preview */}
            <AlertDialog open={!!showUpgradeConfirm} onOpenChange={(open) => !open && setShowUpgradeConfirm(null)}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <ArrowUp className="h-5 w-5 text-primary" />
                            Upgrade to {showUpgradeConfirm?.toUpperCase()}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4">
                                {upgradePreview.loading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        <span className="ml-2 text-sm">Calculating your upgrade cost...</span>
                                    </div>
                                ) : upgradePreview.error ? (
                                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                                        <p className="text-sm text-destructive">{upgradePreview.error}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            You can still proceed, but the exact amount will be shown at checkout.
                                        </p>
                                    </div>
                                ) : upgradePreview.prorationAmount ? (
                                    <div className="space-y-4">
                                        {/* Payment breakdown */}
                                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Pay now (prorated)</span>
                                                <span className="text-lg font-bold text-primary">
                                                    €{upgradePreview.prorationAmount}
                                                </span>
                                            </div>
                                            <div className="border-t border-border pt-3">
                                                <p className="text-xs text-muted-foreground">
                                                    This covers the {upgradePreview.daysRemaining} days remaining in your current billing period.
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground">Next month onwards</span>
                                                <span className="font-medium">
                                                    €{showUpgradeConfirm === 'max' ? '19.99' : '4.99'}/month
                                                </span>
                                            </div>
                                        </div>

                                        {/* What you'll get */}
                                        <div>
                                            <p className="text-sm font-medium mb-2">What you'll get:</p>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                {showUpgradeConfirm === 'max' ? (
                                                    <>
                                                        <li className="flex items-center gap-2">
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                            Unlimited transactions
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                            Priority support
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                            Early access to new features
                                                        </li>
                                                    </>
                                                ) : (
                                                    <>
                                                        <li className="flex items-center gap-2">
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                            3,000 transactions
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                            Unlimited AI chat
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                            CSV export
                                                        </li>
                                                    </>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Your payment method on file will be charged the prorated amount for the upgrade.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={upgradePreview.loading}
                            className={showUpgradeConfirm === 'max'
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                                : "bg-gradient-to-r from-primary to-primary/80"
                            }
                            onClick={() => {
                                if (showUpgradeConfirm) {
                                    handleUpgrade(showUpgradeConfirm);
                                }
                                setShowUpgradeConfirm(null);
                            }}
                        >
                            {upgradePreview.loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            {upgradePreview.prorationAmount
                                ? `Pay €${upgradePreview.prorationAmount} Now`
                                : 'Upgrade Now'
                            }
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
