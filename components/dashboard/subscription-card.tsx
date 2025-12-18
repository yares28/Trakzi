"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Zap, AlertCircle, Check, ArrowRight, Rocket, Star } from "lucide-react";
import Link from "next/link";

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
const PLAN_FEATURES = {
    free: [
        "400 transactions (~1 year of stats)",
        "Unlimited receipt scans",
        "5 AI chat messages per day",
        "Advanced analytics charts",
        "10 custom categories",
    ],
    pro: [
        "3,000 transactions (~6 years of stats)",
        "Unlimited receipt scans",
        "Unlimited AI chat messages",
        "AI-powered insights & summaries",
        "Unlimited custom categories",
        "Export to CSV",
    ],
    max: [
        "Unlimited transactions",
        "Everything in PRO",
        "Priority support",
        "Early access to new features",
        "Sub-accounts (coming soon)",
        "Custom API access (coming soon)",
    ],
};

// Upgrade benefits to show for each plan
const UPGRADE_BENEFITS = {
    free: {
        targetPlan: "PRO",
        tagline: "Unlock the full power of Trakzi",
        benefits: [
            "Unlimited AI chat messages",
            "AI-powered insights & summaries",
            "Unlimited custom categories",
            "Export your data to CSV",
            "7.5x more transactions",
        ],
        price: "€4.99/month",
        cta: "Upgrade to PRO",
        gradient: "from-primary to-primary/80",
        icon: Sparkles,
    },
    pro: {
        targetPlan: "MAX",
        tagline: "Go unlimited with MAX",
        benefits: [
            "Unlimited transactions forever",
            "Priority support",
            "Early access to new features",
            "Sub-accounts for organization",
            "Custom API access",
        ],
        price: "€19.99/month",
        cta: "Upgrade to MAX",
        gradient: "from-amber-500 to-orange-500",
        icon: Crown,
    },
    max: null, // No upgrade available
};

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

function getPlanGradient(plan: string) {
    switch (plan) {
        case "max":
            return "bg-gradient-to-br from-amber-500/10 to-orange-500/5";
        case "pro":
            return "bg-gradient-to-br from-primary/10 to-primary/5";
        default:
            return "";
    }
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="animate-pulse">
                    <CardHeader className="pb-2">
                        <div className="h-5 w-32 bg-muted rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-32 bg-muted rounded" />
                    </CardContent>
                </Card>
                <Card className="animate-pulse">
                    <CardHeader className="pb-2">
                        <div className="h-5 w-32 bg-muted rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-32 bg-muted rounded" />
                    </CardContent>
                </Card>
            </div>
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

    const currentPlanFeatures = PLAN_FEATURES[status.plan] || PLAN_FEATURES.free;
    const upgradeInfo = UPGRADE_BENEFITS[status.plan];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Current Plan Card */}
            <Card className={`relative overflow-hidden ${getPlanGradient(status.plan)}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            {getPlanIcon(status.plan)}
                            Your Current Plan
                        </CardTitle>
                        <Badge className={getPlanBadgeColor(status.plan)}>
                            {status.plan.toUpperCase()}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Plan Features */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            What you get:
                        </p>
                        <ul className="space-y-2">
                            {currentPlanFeatures.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Subscription info for paid users */}
                    {status.subscription?.currentPeriodEnd && (
                        <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground">
                                {status.subscription.cancelAtPeriodEnd
                                    ? "Your subscription ends on "
                                    : "Renews automatically on "}
                                <span className="font-medium">
                                    {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                                </span>
                            </p>
                            <Link href="/api/billing/portal" className="block mt-2">
                                <Button variant="outline" size="sm" className="text-xs">
                                    Manage Subscription
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upgrade Card or MAX Celebration Card */}
            {upgradeInfo ? (
                <Card className={`relative overflow-hidden border-2 border-dashed hover:border-solid transition-all bg-gradient-to-br ${upgradeInfo.gradient}/5`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${upgradeInfo.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />

                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <upgradeInfo.icon className={`h-5 w-5 ${upgradeInfo.targetPlan === "MAX" ? "text-amber-500" : "text-primary"}`} />
                                {upgradeInfo.tagline}
                            </CardTitle>
                            <Badge variant="outline" className="font-semibold">
                                {upgradeInfo.price}
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Upgrade Benefits */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                With {upgradeInfo.targetPlan} you unlock:
                            </p>
                            <ul className="space-y-2">
                                {upgradeInfo.benefits.map((benefit, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm">
                                        <Star className={`h-4 w-4 shrink-0 mt-0.5 ${upgradeInfo.targetPlan === "MAX" ? "text-amber-500" : "text-primary"}`} />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* CTA Button */}
                        <Link href="/#pricing" className="block">
                            <Button
                                className={`w-full bg-gradient-to-r ${upgradeInfo.gradient} text-white hover:opacity-90 transition-opacity`}
                            >
                                <Rocket className="h-4 w-4 mr-2" />
                                {upgradeInfo.cta}
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                /* MAX Plan - Celebration Card */
                <Card className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500 to-orange-500 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />

                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Crown className="h-5 w-5 text-amber-500" />
                            You&apos;re at the Top!
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            You have the MAX plan with all features unlocked. Thank you for your support!
                        </p>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Exclusive MAX benefits:
                            </p>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2 text-sm">
                                    <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span>Unlimited everything, forever</span>
                                </li>
                                <li className="flex items-start gap-2 text-sm">
                                    <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span>Priority support - we&apos;re here for you</span>
                                </li>
                                <li className="flex items-start gap-2 text-sm">
                                    <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span>Early access to new features</span>
                                </li>
                                <li className="flex items-start gap-2 text-sm">
                                    <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span>Shape the future of Trakzi</span>
                                </li>
                            </ul>
                        </div>

                        {status.subscription?.currentPeriodEnd && (
                            <div className="pt-3 border-t border-amber-500/20">
                                <p className="text-xs text-muted-foreground">
                                    {status.subscription.cancelAtPeriodEnd
                                        ? "Your subscription ends on "
                                        : "Renews automatically on "}
                                    <span className="font-medium">
                                        {new Date(status.subscription.currentPeriodEnd).toLocaleDateString()}
                                    </span>
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
