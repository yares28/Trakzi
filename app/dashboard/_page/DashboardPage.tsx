"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import {
    ChevronDown,
    ChevronUp,
    Loader2,
    Lock,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from "lucide-react";

import { safeCapture } from "@/lib/posthog-safe";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { GoalSettingModal } from "@/components/dashboard/goal-setting-modal";
import { TransactionProgressBar } from "@/components/dashboard/transaction-progress-bar";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";

import { pagesConfig, chartConfig } from "./constants";
import { DashboardLayout } from "./components/DashboardLayout";
import { AnimatedScore } from "./components/AnimatedScore";
import { ScoreSparkline } from "./components/ScoreSparkline";
import { ComparisonPopover } from "./components/ComparisonPopover";
import { getAnalyticsInsight, getSavingsInsight, getFridgeInsight } from "./insights";
import {
    getCardGradient,
    getCardHoverStyles,
    getScoreColor,
    getScoreGlow,
    getScoreLabel,
    getTipBgColor,
    getTipIconColor,
} from "./score-style";
import { getCardIcon, getIconForTip, IconLightbulb } from "./icons";
import type { DashboardStats, ScoreInsight } from "./types";
export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Phase 2: Track which cards have expanded tips
    const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});
    // Phase 5: Goal setting modal
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

    useEffect(() => {
        async function fetchDashboardStats() {
            try {
                setIsLoading(true);
                const response = await fetch("/api/dashboard-stats");
                if (!response.ok) {
                    throw new Error("Failed to fetch dashboard stats");
                }
                const data = await response.json();
                setStats(data);
            } catch (err) {
                console.error("Error fetching dashboard stats:", err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchDashboardStats();
    }, []);

    // Build display data based on stats
    const displayData = pagesConfig.map((page) => {
        let mainStat = "";
        let trend = { value: 0 };
        let score = 0;
        let insight: ScoreInsight;

        switch (page.key) {
            case "analytics":
                score = stats?.analytics.score || 0;
                mainStat = stats ? `Score: ${score}%` : "-";
                // Comparison Logic
                const analyticsAvg = stats?.comparison?.analytics?.avgScore || 50;
                trend = { value: score - analyticsAvg };
                insight = getAnalyticsInsight(stats);
                break;
            case "fridge":
                score = stats?.fridge.score || 0;
                mainStat = stats ? `Score: ${score}%` : "-";
                // Comparison Logic
                const fridgeAvg = stats?.comparison?.fridge?.avgScore || 50;
                trend = { value: score - fridgeAvg };
                insight = getFridgeInsight(stats);
                break;
            case "savings":
                score = stats?.savings.score || 0;
                mainStat = stats ? `Score: ${score}%` : "-";
                // Comparison Logic
                const savingsAvg = stats?.comparison?.savings?.avgScore || 50;
                trend = { value: score - savingsAvg };
                insight = getSavingsInsight(stats);
                break;
            default:
                insight = { reason: "", tips: [], priority: "medium" };
        }

        // Check if card is locked (not enough transactions)
        let isLocked = false;
        if (page.key === "analytics" || page.key === "savings") {
            isLocked = stats ? !stats.analytics.hasEnoughTransactions : true;
        } else if (page.key === "fridge") {
            isLocked = stats ? !stats.fridge.hasEnoughTransactions : true;
        }

        return {
            ...page,
            mainStat,
            trend,
            progress: score,
            insight,
            isLocked,
            minRequired: page.key === "fridge" ? (stats?.fridge.minRequired || 200) : (stats?.analytics.minRequired || 100),
            currentCount: page.key === "fridge" ? (stats?.fridge.transactionCount || 0) : (stats?.analytics.transactionCount || 0),
        };
    });

    return (
        <DashboardLayout>
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        {/* Header Section */}
                        <section className="px-4 lg:px-6">
                            <div className="flex flex-col justify-between gap-4 rounded-3xl border bg-muted/30 px-6 py-6 lg:flex-row lg:items-center">
                                <div className="space-y-2">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 text-sm border rounded-full">
                                        <Sparkles className="size-4" />
                                        AI-Powered
                                    </span>
                                    <h1 className="text-3xl font-semibold tracking-tight">
                                        Dashboard
                                    </h1>
                                    <p className="text-muted-foreground max-w-2xl">
                                        Real-time analysis of your spending, savings, and habits.
                                        Track your financial health with AI-powered insights and personalized recommendations.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="px-4 lg:px-6">
                            <dl className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3 w-full">
                                {displayData.map((item, index) => {
                                    const scoreLabel = getScoreLabel(item.progress);
                                    return (
                                        <motion.div
                                            key={item.name}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1, duration: 0.4 }}
                                            className="relative"
                                        >
                                            {/* Blur/Lock Overlay for cards below transaction threshold */}
                                            {item.isLocked && (
                                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
                                                    <div className="p-4 rounded-full bg-muted/50 mb-3">
                                                        <Lock className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-sm font-medium text-foreground mb-1">Locked</p>
                                                    <p className="text-xs text-muted-foreground text-center px-4">
                                                        {item.currentCount}/{item.minRequired} {item.key === "fridge" ? "grocery items" : "transactions"}
                                                    </p>
                                                </div>
                                            )}
                                            {/* Phase 1: Gradient background + enhanced hover */}
                                            <Card className={`p-0 gap-0 h-full flex flex-col ${getCardGradient(item.key)} ${getCardHoverStyles()}`}>
                                                {/* Card Header */}
                                                <div className="p-6 pb-4 border-b border-border/50">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                                {getCardIcon(item.key)}
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {!isLoading && stats?.comparison && (
                                                                <ComparisonPopover
                                                                    pageKey={item.key}
                                                                    comparison={stats.comparison}
                                                                    userScore={item.progress}
                                                                />
                                                            )}
                                                            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                                                                <Sparkles className="h-3 w-3" />
                                                                AI Score
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Main Content */}
                                                <CardContent className="p-6 flex-1">
                                                    <div className="flex items-start gap-6">
                                                        {/* Phase 1: Radial Chart with Glow Effect */}
                                                        <div className={`relative flex items-center justify-center shrink-0 rounded-full ${!isLoading ? getScoreGlow(item.progress) : ''}`}>
                                                            <ChartContainer
                                                                config={chartConfig}
                                                                className="h-[120px] w-[120px]"
                                                            >
                                                                <RadialBarChart
                                                                    data={[item]}
                                                                    innerRadius={42}
                                                                    outerRadius={55}
                                                                    barSize={10}
                                                                    startAngle={90}
                                                                    endAngle={-270}
                                                                >
                                                                    <PolarAngleAxis
                                                                        type="number"
                                                                        domain={[0, 100]}
                                                                        angleAxisId={0}
                                                                        tick={false}
                                                                        axisLine={false}
                                                                    />
                                                                    <RadialBar
                                                                        dataKey="progress"
                                                                        background
                                                                        cornerRadius={10}
                                                                        fill={item.fill}
                                                                        angleAxisId={0}
                                                                        animationDuration={1500}
                                                                    />
                                                                </RadialBarChart>
                                                            </ChartContainer>
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                {isLoading ? (
                                                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                                                ) : (
                                                                    <>
                                                                        {/* Phase 1: Animated Score Counter */}
                                                                        <AnimatedScore
                                                                            value={item.progress}
                                                                            className={`text-2xl font-bold ${getScoreColor(item.progress)}`}
                                                                        />
                                                                        {/* Phase 1: Score Label Badge */}
                                                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${scoreLabel.bgColor} ${scoreLabel.color}`}>
                                                                            {scoreLabel.label}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Stats Section */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="mb-3">
                                                                <dd className="text-2xl font-bold text-foreground">
                                                                    {isLoading ? (
                                                                        <span className="text-muted-foreground text-lg">Loading...</span>
                                                                    ) : (
                                                                        item.mainStat
                                                                    )}
                                                                </dd>
                                                                {!isLoading && item.trend && !item.isLocked && (
                                                                    <div className="flex items-center gap-1.5 text-sm mt-1 font-medium">
                                                                        {item.trend.value >= 0 ? (
                                                                            <TrendingUp className="h-4 w-4 text-green-500" />
                                                                        ) : (
                                                                            <TrendingDown className="h-4 w-4 text-red-500" />
                                                                        )}
                                                                        <span className={item.trend.value >= 0 ? "text-green-500" : "text-red-500"}>
                                                                            {item.trend.value >= 0 ? "+" : ""}{item.trend.value}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Phase 4: Score Sparkline for Analytics */}
                                                                {!isLoading && item.key === "analytics" && stats?.analytics?.scoreHistory && stats.analytics.scoreHistory.length > 1 && (
                                                                    <ScoreSparkline data={stats.analytics.scoreHistory} />
                                                                )}

                                                                {/* Phase 4: Score Sparkline for Savings */}
                                                                {!isLoading && item.key === "savings" && stats?.savings?.scoreHistory && stats.savings.scoreHistory.length > 1 && (
                                                                    <ScoreSparkline data={stats.savings.scoreHistory} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* AI Insights Section */}
                                                    {!isLoading && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.1 + 0.3, duration: 0.3 }}
                                                            className="mt-5 space-y-3"
                                                        >
                                                            {/* Score Reason */}
                                                            <div className={`p-3 rounded-lg border ${getTipBgColor(item.insight.priority)}`}>
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Sparkles className={`h-4 w-4 ${getTipIconColor(item.insight.priority)}`} />
                                                                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                                                                        Why this score
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm font-medium text-foreground">
                                                                    {item.insight.reason}
                                                                </p>
                                                            </div>

                                                            {/* Phase 2: Collapsible Tips Section */}
                                                            <div className="space-y-2">
                                                                <button
                                                                    onClick={() => setExpandedTips(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                                                    className="flex items-center justify-between w-full group"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <IconLightbulb className="h-4 w-4 text-primary" />
                                                                        <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                                                                            Tips to improve ({item.insight.tips.length})
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                                                                        <span className="text-xs">{expandedTips[item.key] ? 'Hide' : 'Show'}</span>
                                                                        {expandedTips[item.key] ? (
                                                                            <ChevronUp className="h-4 w-4" />
                                                                        ) : (
                                                                            <ChevronDown className="h-4 w-4" />
                                                                        )}
                                                                    </div>
                                                                </button>

                                                                {/* Animated tips list */}
                                                                <AnimatePresence>
                                                                    {expandedTips[item.key] && (
                                                                        <motion.ul
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: "auto", opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="space-y-2 overflow-hidden"
                                                                        >
                                                                            {item.insight.tips.map((tip, tipIndex) => (
                                                                                <motion.li
                                                                                    key={tipIndex}
                                                                                    initial={{ opacity: 0, x: -10 }}
                                                                                    animate={{ opacity: 1, x: 0 }}
                                                                                    transition={{ delay: tipIndex * 0.1 }}
                                                                                    className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                                                                >
                                                                                    {/* Phase 2: Priority Indicator */}
                                                                                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                                                                        {tipIndex + 1}
                                                                                    </span>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2">
                                                                                            {getIconForTip(tip.icon)}
                                                                                            <span className="text-sm text-foreground/80">{tip.text}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </motion.li>
                                                                            ))}
                                                                        </motion.ul>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </CardContent>

                                                {/* Card Footer */}
                                                <CardFooter className="flex items-center justify-between border-t border-border p-0 bg-muted/20">
                                                    <div className="px-6 py-4 text-xs font-medium text-muted-foreground">
                                                        {isLoading ? "Analyzing..." : item.progress >= 80 ? "Great progress!" : item.progress >= 50 ? "Room to improve" : "Needs attention"}
                                                    </div>
                                                    <Link
                                                        href={item.href}
                                                        className="text-sm font-medium text-primary px-6 py-4 hover:text-primary/80 hover:bg-primary/5 transition-all flex items-center gap-2"
                                                        onClick={() => safeCapture('dashboard_card_viewed', {
                                                            card_name: item.name,
                                                            card_key: item.key,
                                                            card_score: item.progress,
                                                            card_href: item.href
                                                        })}
                                                    >
                                                        View details
                                                        <span className="text-lg">{"->"}</span>
                                                    </Link>
                                                </CardFooter>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </dl>
                        </section>

                        {/* Transaction Progress Bar */}
                        <section className="px-4 lg:px-6">
                            <Separator className="my-4" />
                            <div className="w-full">
                                <TransactionProgressBar
                                    spendingTransactions={stats?.analytics?.transactionCount || 0}
                                    groceryTransactions={stats?.fridge?.transactionCount || 0}
                                    maxTransactions={500}
                                />
                            </div>
                        </section>

                        {/* Subscription Card */}
                        <section className="px-4 lg:px-6 pb-6">
                            <SubscriptionCard />
                        </section>
                    </div>
                </div>
            </div>

            {/* Phase 5: Goal Setting Modal */}
            <GoalSettingModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                currentSavingsRate={stats?.savings?.savingsRate || 0}
                onSaveGoal={(goal) => {
                    console.log('Goal saved:', goal);
                    // TODO: Persist goal to database
                }}
            />

        </DashboardLayout>
    );
}


