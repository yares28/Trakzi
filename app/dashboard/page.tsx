"use client";

import React, { useEffect, useState } from "react";
import posthog from "posthog-js";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { PolarAngleAxis, RadialBar, RadialBarChart, AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
    Loader2, TrendingUp, TrendingDown, Sparkles,
    Info, Users, X, Target, ChevronDown, ChevronUp, Flag, Lock
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
// Phase 5 imports
import { GoalSettingModal } from "@/components/dashboard/goal-setting-modal";
import { AIWeeklySummary } from "@/components/dashboard/ai-weekly-summary";
import { TransactionProgressBar } from "@/components/dashboard/transaction-progress-bar";

// Custom Icons matching sidebar (from app-sidebar.tsx)
const IconAnalytics = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor">
        <path d="M344 170.6C362.9 161.6 376 142.3 376 120C376 89.1 350.9 64 320 64C289.1 64 264 89.1 264 120C264 142.3 277.1 161.6 296 170.6L296 269.4C293.2 270.7 290.5 272.3 288 274.1L207.9 228.3C209.5 207.5 199.3 186.7 180 175.5C153.2 160 119 169.2 103.5 196C88 222.8 97.2 257 124 272.5C125.3 273.3 126.6 274 128 274.6L128 365.4C126.7 366 125.3 366.7 124 367.5C97.2 383 88 417.2 103.5 444C119 470.8 153.2 480 180 464.5C199.3 453.4 209.4 432.5 207.8 411.7L258.3 382.8C246.8 371.6 238.4 357.2 234.5 341.1L184 370.1C181.4 368.3 178.8 366.8 176 365.4L176 274.6C178.8 273.3 181.5 271.7 184 269.9L264.1 315.7C264 317.1 263.9 318.5 263.9 320C263.9 342.3 277 361.6 295.9 370.6L295.9 469.4C277 478.4 263.9 497.7 263.9 520C263.9 550.9 289 576 319.9 576C350.8 576 375.9 550.9 375.9 520C375.9 497.7 362.8 478.4 343.9 469.4L343.9 370.6C346.7 369.3 349.4 367.7 351.9 365.9L432 411.7C430.4 432.5 440.6 453.3 459.8 464.5C486.6 480 520.8 470.8 536.3 444C551.8 417.2 542.6 383 515.8 367.5C514.5 366.7 513.1 366 511.8 365.4L511.8 274.6C513.2 274 514.5 273.3 515.8 272.5C542.6 257 551.8 222.8 536.3 196C520.8 169.2 486.8 160 460 175.5C440.7 186.6 430.6 207.5 432.2 228.3L381.6 257.2C393.1 268.4 401.5 282.8 405.4 298.9L456 269.9C458.6 271.7 461.2 273.2 464 274.6L464 365.4C461.2 366.7 458.5 368.3 456 370L375.9 324.2C376 322.8 376.1 321.4 376.1 319.9C376.1 297.6 363 278.3 344.1 269.3L344.1 170.5z"></path>
    </svg>
);

const IconFridge = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20" fill="currentColor">
        <path d="M352.2 64C352.2 46.3 337.9 32 320.2 32C302.5 32 288.2 46.3 288.2 64L288.2 126.1L273.2 111.1C263.8 101.7 248.6 101.7 239.3 111.1C230 120.5 229.9 135.7 239.3 145L288.3 194L288.3 264.6L227.1 229.3L209.2 162.4C205.8 149.6 192.6 142 179.8 145.4C167 148.8 159.3 162 162.7 174.8L168.2 195.3L114.5 164.3C99.2 155.5 79.6 160.7 70.8 176C62 191.3 67.2 210.9 82.5 219.7L136.2 250.7L115.7 256.2C102.9 259.6 95.3 272.8 98.7 285.6C102.1 298.4 115.3 306 128.1 302.6L195 284.7L256.2 320L195 355.3L128.1 337.4C115.3 334 102.1 341.6 98.7 354.4C95.3 367.2 102.9 380.4 115.7 383.8L136.2 389.3L82.5 420.3C67.2 429.1 62 448.7 70.8 464C79.6 479.3 99.2 484.6 114.5 475.7L168.2 444.7L162.7 465.2C159.3 478 166.9 491.2 179.7 494.6C192.5 498 205.7 490.4 209.1 477.6L227 410.7L288.2 375.4L288.2 446L239.2 495C229.8 504.4 229.8 519.6 239.2 528.9C248.6 538.2 263.8 538.3 273.1 528.9L288.1 513.9L288.1 576C288.1 593.7 302.4 608 320.1 608C337.8 608 352.1 593.7 352.1 576L352.1 513.9L367.1 528.9C376.5 538.3 391.7 538.3 401 528.9C410.3 519.5 410.4 504.3 401 495L352 446L352 375.4L413.2 410.7L431.1 477.6C434.5 490.4 447.7 498 460.5 494.6C473.3 491.2 480.9 478 477.5 465.2L472 444.7L525.7 475.7C541 484.5 560.6 479.3 569.4 464C578.2 448.7 573 429.1 557.7 420.3L504 389.3L524.5 383.8C537.3 380.4 544.9 367.2 541.5 354.4C538.1 341.6 524.9 334 512.1 337.4L445.2 355.3L384 320L445.2 284.7L512.1 302.6C524.9 306 538.1 298.4 541.5 285.6C544.9 272.8 537.3 259.6 524.5 256.2L504 250.7L557.7 219.7C573 210.9 578.3 191.3 569.4 176C560.5 160.7 541 155.5 525.7 164.3L472 195.3L477.5 174.8C480.9 162 473.3 148.8 460.5 145.4C447.7 142 434.5 149.6 431.1 162.4L413.2 229.3L352 264.6L352 194L401 145C410.4 135.6 410.4 120.4 401 111.1C391.6 101.8 376.4 101.7 367.1 111.1L352.1 126.1L352.1 64z"></path>
    </svg>
);

const IconSavings = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path fill="none" d="M0 0h24v24H0z"></path>
        <path d="M10.0049 19.9998H6.00488V21.9998H4.00488V19.9998H3.00488C2.4526 19.9998 2.00488 19.552 2.00488 18.9998V3.99977C2.00488 3.44748 2.4526 2.99977 3.00488 2.99977H10.0049V1.59C10.0049 1.31385 10.2287 1.09 10.5049 1.09C10.5324 1.09 10.5599 1.09227 10.5871 1.0968L21.1693 2.8605C21.6515 2.94086 22.0049 3.35805 22.0049 3.84689V5.99977H23.0049V7.99977H22.0049V14.9998H23.0049V16.9998H22.0049V19.1526C22.0049 19.6415 21.6515 20.0587 21.1693 20.139L20.0049 20.3331V21.9998H18.0049V20.6664L10.5871 21.9027C10.3147 21.9481 10.0571 21.7641 10.0117 21.4917C10.0072 21.4646 10.0049 21.4371 10.0049 21.4095V19.9998ZM12.0049 19.6388L20.0049 18.3055V4.69402L12.0049 3.36069V19.6388ZM16.5049 13.9998C15.6765 13.9998 15.0049 12.8805 15.0049 11.4998C15.0049 10.1191 15.6765 8.99977 16.5049 8.99977C17.3333 8.99977 18.0049 10.1191 18.0049 11.4998C18.0049 12.8805 17.3333 13.9998 16.5049 13.9998Z"></path>
    </svg>
);

// Custom Lightbulb icon
const IconLightbulb = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className={className}>
        <path fill="none" d="M0 0h24v24H0z"></path>
        <path d="M11 18H7.94101C7.64391 16.7274 6.30412 15.6857 5.75395 14.9992C4.65645 13.6297 4 11.8915 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10C20 11.8925 19.3428 13.6315 18.2443 15.0014C17.6944 15.687 16.3558 16.7276 16.059 18H13V13H11V18ZM16 20V21C16 22.1046 15.1046 23 14 23H10C8.89543 23 8 22.1046 8 21V20H16Z"></path>
    </svg>
);

// Helper to get the appropriate icon for each card
function getCardIcon(key: string) {
    switch (key) {
        case "analytics": return <IconAnalytics />;
        case "fridge": return <IconFridge />;
        case "savings": return <IconSavings />;
        default: return <IconAnalytics />;
    }
}

// Type for dashboard stats from API
type DashboardStats = {
    analytics: {
        transactionCount: number;
        score: number;
        needsPercent: number;
        wantsPercent: number;
        savingsPercent: number;
        hasEnoughTransactions: boolean;
        minRequired: number;
        breakdown: { needs: number; wants: number; savings: number; other: number };
    };
    fridge: {
        transactionCount: number;
        score: number;
        healthyPercent: number;
        unhealthyPercent: number;
        hasEnoughTransactions: boolean;
        minRequired: number;
        breakdown: { healthy: number; unhealthy: number; neutral: number };
        itemCounts: { healthy: number; unhealthy: number; neutral: number };
    };
    savings: {
        transactionCount: number;
        totalIncome: number;
        totalExpenses: number;
        actualSavings: number;
        savingsRate: number;
        score: number;
        monthlyAvgSavings: number;
        targetSavings: number;
        gap: number;
        // Phase 3: Trend data
        trend?: {
            direction: "improving" | "stable" | "declining";
            change: number;
            currentMonthRate: number;
            previousMonthRate: number;
        };
        // Phase 4: Score history for sparkline
        scoreHistory?: Array<{
            month: string;
            score: number;
            savingsRate: number;
        }>;
    };
    trends: {
        transactionCount: number;
        categoryCount: number;
        monthCount: number;
        score: number;
        categoryAnalysis: Array<{
            category: string;
            userPercent: number;
            avgPercent: number;
            status: "below" | "average" | "above";
            difference: number;
        }>;
    };
    comparison: {
        userCount: number;
        analytics: { userRank: number; avgScore: number; percentile: number };
        fridge: { userRank: number; avgScore: number; percentile: number };
        savings: { userRank: number; avgScore: number; percentile: number };
        trends: { userRank: number; avgScore: number; percentile: number };
    };
};

// Type for tip with reasoning
type ScoreInsight = {
    reason: string;
    tips: Array<{ text: string; icon: "categorize" | "upload" | "review" | "goal" | "import" | "reduce" | "track" | "celebrate" | "warning" | "save" }>;
    priority: "low" | "medium" | "high";
};

// Get comprehensive insights for Analytics (50/30/20 rule)
const getAnalyticsInsight = (stats: DashboardStats | null): ScoreInsight => {
    if (!stats || !stats.analytics || stats.analytics.transactionCount === 0) {
        return {
            reason: "No spending data available",
            tips: [
                { text: "Import your bank statements to analyze your spending", icon: "upload" },
                { text: "We'll calculate your 50/30/20 budget breakdown", icon: "track" },
            ],
            priority: "high",
        };
    }

    const needsPercent = stats.analytics.needsPercent ?? 0;
    const wantsPercent = stats.analytics.wantsPercent ?? 0;
    const score = stats.analytics.score ?? 0;
    const savingsPercent = 100 - needsPercent - wantsPercent;

    if (score >= 80) {
        return {
            reason: `Great balance! Needs: ${needsPercent}%, Wants: ${wantsPercent}%, Other: ${savingsPercent}%`,
            tips: [
                { text: "You're following the 50/30/20 rule well!", icon: "celebrate" },
                { text: "Keep maintaining this healthy spending balance", icon: "track" },
            ],
            priority: "low",
        };
    }

    const tips: ScoreInsight["tips"] = [];

    if (needsPercent > 50) {
        tips.push({
            text: `Needs spending is ${needsPercent}% (target: ≤50%). Look for ways to reduce fixed costs`,
            icon: "warning"
        });
        tips.push({ text: "Consider refinancing, switching providers, or downsizing", icon: "reduce" });
    }

    if (wantsPercent > 30) {
        tips.push({
            text: `Wants spending is ${wantsPercent}% (target: ≤30%). Review discretionary expenses`,
            icon: "warning"
        });
        tips.push({ text: "Try a no-spend challenge for non-essentials this week", icon: "goal" });
    }

    if (tips.length === 0) {
        tips.push({ text: "You're close to the ideal 50/30/20 balance!", icon: "track" });
    }

    return {
        reason: `Budget breakdown: Needs ${needsPercent}%, Wants ${wantsPercent}%, Other ${savingsPercent}%`,
        tips,
        priority: score < 50 ? "high" : "medium",
    };

};

// Get comprehensive insights for Savings (20% target)
const getSavingsInsight = (stats: DashboardStats | null): ScoreInsight => {
    if (!stats || !stats.savings || stats.savings.totalIncome === 0) {
        return {
            reason: "No income data recorded",
            tips: [
                { text: "Import transactions to calculate your savings rate", icon: "upload" },
                { text: "The target is to save 20% of your income", icon: "goal" },
            ],
            priority: "high",
        };
    }

    const savingsRate = stats.savings.savingsRate ?? 0;
    const actualSavings = stats.savings.actualSavings ?? 0;
    const gap = stats.savings.gap ?? 0;
    const score = stats.savings.score ?? 0;

    if (score >= 80) {
        return {
            reason: `Excellent! Saving ${savingsRate}% of income (${actualSavings >= 0 ? "+" : ""}€${Math.abs(actualSavings).toLocaleString()})`,
            tips: [
                { text: "You're exceeding the 20% savings target!", icon: "celebrate" },
                { text: "Consider investing surplus savings for growth", icon: "goal" },
            ],
            priority: "low",
        };
    }

    if (savingsRate < 0) {
        return {
            reason: `Spending exceeds income by €${Math.abs(actualSavings).toLocaleString()}`,
            tips: [
                { text: "Your expenses exceed your income - this is unsustainable", icon: "warning" },
                { text: "Identify your top 3 expense categories to cut", icon: "reduce" },
                { text: "Set up a strict weekly budget immediately", icon: "goal" },
            ],
            priority: "high",
        };
    }

    if (savingsRate < 10) {
        return {
            reason: `Saving ${savingsRate}% of income. Target: 20% (€${Math.abs(gap).toLocaleString()} gap)`,
            tips: [
                { text: `You need to save €${Math.abs(gap).toLocaleString()} more to hit 20%`, icon: "save" },
                { text: "Automate transfers to savings on payday", icon: "track" },
                { text: "Find 2-3 subscriptions you can cancel", icon: "reduce" },
            ],
            priority: "high",
        };
    }

    return {
        reason: `Saving ${savingsRate}% of income. Almost at the 20% target!`,
        tips: [
            { text: `Just €${Math.abs(gap).toLocaleString()} more to reach 20% savings rate`, icon: "goal" },
            { text: "You're on the right track - keep going!", icon: "track" },
        ],
        priority: "medium",
    };
};

// Get comprehensive insights for Fridge (nutritional balance)
const getFridgeInsight = (stats: DashboardStats | null): ScoreInsight => {
    if (!stats || !stats.fridge || stats.fridge.transactionCount === 0) {
        return {
            reason: "No grocery data uploaded",
            tips: [
                { text: "Upload grocery receipts to analyze your diet", icon: "upload" },
                { text: "We'll track healthy vs unhealthy food purchases", icon: "track" },
            ],
            priority: "high",
        };
    }

    const healthyPercent = stats.fridge.healthyPercent ?? 0;
    const unhealthyPercent = stats.fridge.unhealthyPercent ?? 0;
    const score = stats.fridge.score ?? 0;
    const neutralPercent = 100 - healthyPercent - unhealthyPercent;

    if (score >= 80) {
        return {
            reason: `Balanced diet! ${healthyPercent}% healthy foods, only ${unhealthyPercent}% snacks/unhealthy`,
            tips: [
                { text: "Great job prioritizing nutritious foods!", icon: "celebrate" },
                { text: "Keep up the healthy eating habits", icon: "track" },
            ],
            priority: "low",
        };
    }

    const tips: ScoreInsight["tips"] = [];

    if (unhealthyPercent > 25) {
        tips.push({
            text: `${unhealthyPercent}% of purchases are snacks/unhealthy foods`,
            icon: "warning"
        });
        tips.push({ text: "Try replacing chips with nuts or fruit", icon: "goal" });
    }

    if (healthyPercent < 40) {
        tips.push({
            text: `Only ${healthyPercent}% healthy foods. Add more fruits, vegetables, and proteins`,
            icon: "warning"
        });
    }

    if (tips.length === 0) {
        tips.push({ text: "Good balance! Keep prioritizing whole foods", icon: "track" });
    }

    return {
        reason: `Diet breakdown: ${healthyPercent}% healthy, ${unhealthyPercent}% snacks, ${neutralPercent}% neutral`,
        tips,
        priority: score < 50 ? "high" : "medium",
    };
};

// Get comprehensive insights for Trends (category analysis)
const getTrendsInsight = (stats: DashboardStats | null): ScoreInsight => {
    if (!stats || !stats.trends || stats.trends.transactionCount === 0) {
        return {
            reason: "No transaction history available",
            tips: [
                { text: "Import more transactions to analyze spending trends", icon: "upload" },
                { text: "We compare your spending to typical benchmarks", icon: "track" },
            ],
            priority: "high",
        };
    }

    const categoryAnalysis = stats.trends.categoryAnalysis ?? [];
    const monthCount = stats.trends.monthCount ?? 0;
    const score = stats.trends.score ?? 0;
    const aboveAvg = categoryAnalysis.filter(c => c.status === "above");
    const belowAvg = categoryAnalysis.filter(c => c.status === "below");

    if (score >= 80) {
        return {
            reason: `Spending well below average in ${belowAvg.length} categories over ${monthCount} months`,
            tips: [
                { text: "Your spending is well-controlled across categories!", icon: "celebrate" },
                { text: "You're beating typical benchmarks", icon: "track" },
            ],
            priority: "low",
        };
    }

    const tips: ScoreInsight["tips"] = [];

    aboveAvg.slice(0, 2).forEach(cat => {
        tips.push({
            text: `${cat.category}: ${cat.userPercent}% vs ${cat.avgPercent}% average (+${cat.difference}%)`,
            icon: "warning"
        });
    });

    if (aboveAvg.length > 0) {
        tips.push({ text: "Focus on reducing spending in above-average categories", icon: "reduce" });
    }

    if (belowAvg.length > 0) {
        tips.push({
            text: `Great job! Below average in: ${belowAvg.map(c => c.category).join(", ")}`,
            icon: "celebrate"
        });
    }

    if (tips.length === 0) {
        tips.push({ text: "Your spending is close to typical patterns", icon: "track" });
    }

    return {
        reason: `${monthCount} months analyzed: ${aboveAvg.length} categories above average, ${belowAvg.length} below`,
        tips,
        priority: score < 50 ? "high" : "medium",
    };
};

// Configuration for each page card
const pagesConfig = [
    {
        name: "Analytics",
        key: "analytics" as const,
        href: "/analytics",
        fill: "var(--chart-1)",
        description: "50/30/20 budget rule analysis",
    },
    {
        name: "Fridge",
        key: "fridge" as const,
        href: "/fridge",
        fill: "var(--chart-3)",
        description: "Nutritional balance of groceries",
    },
    {
        name: "Savings",
        key: "savings" as const,
        href: "/savings",
        fill: "var(--chart-4)",
        description: "Savings rate vs 20% target",
    },
];

const chartConfig = {
    progress: {
        label: "Progress",
        color: "var(--primary)",
    },
} satisfies ChartConfig;

function formatNumber(num: number): string {
    if (Math.abs(num) >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(num) >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
}

function formatCurrency(num: number): string {
    const formatted = Math.abs(num) >= 1000
        ? `€${(Math.abs(num) / 1000).toFixed(1)}K`
        : `€${Math.abs(num).toFixed(0)}`;
    return num < 0 ? `-${formatted}` : formatted;
}

function getScoreColor(score: number): string {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-orange-500";
}

function getTipBgColor(priority: "low" | "medium" | "high"): string {
    switch (priority) {
        case "high": return "bg-orange-500/10 border-orange-500/20";
        case "medium": return "bg-yellow-500/10 border-yellow-500/20";
        case "low": return "bg-green-500/10 border-green-500/20";
    }
}

function getTipIconColor(priority: "low" | "medium" | "high"): string {
    switch (priority) {
        case "high": return "text-orange-500";
        case "medium": return "text-yellow-500";
        case "low": return "text-green-500";
    }
}

function getIconForTip(icon: string): React.ReactNode {
    return <IconLightbulb className="h-3 w-3 text-primary" />;
}

// Phase 1: Score Labels
function getScoreLabel(score: number): { label: string; color: string; bgColor: string } {
    if (score >= 90) return { label: "Excellent", color: "text-green-600", bgColor: "bg-green-500/10" };
    if (score >= 70) return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-500/10" };
    if (score >= 50) return { label: "Needs Work", color: "text-yellow-600", bgColor: "bg-yellow-500/10" };
    return { label: "Critical", color: "text-red-600", bgColor: "bg-red-500/10" };
}

// Phase 1: Sunset Palette Gradient Backgrounds
function getCardGradient(key: string): string {
    const gradients: Record<string, string> = {
        analytics: "bg-gradient-to-br from-[#df5501]/5 via-transparent to-[#fe680e]/10",
        fridge: "bg-gradient-to-br from-[#fe9e64]/5 via-transparent to-[#feb98f]/10",
        savings: "bg-gradient-to-br from-[#893401]/5 via-transparent to-[#b44401]/10",
        trends: "bg-gradient-to-br from-[#fe8339]/5 via-transparent to-[#ffd4bb]/10",
    };
    return gradients[key] || "";
}

// Phase 1: Glow Effect for Radial Chart
function getScoreGlow(score: number): string {
    if (score >= 80) return "shadow-[0_0_20px_rgba(34,197,94,0.3)]"; // Green glow
    if (score >= 50) return "shadow-[0_0_20px_rgba(234,179,8,0.3)]"; // Yellow glow
    return "shadow-[0_0_20px_rgba(249,115,22,0.3)]"; // Orange glow
}

// Phase 1: Enhanced Card Styles
function getCardHoverStyles(): string {
    return "hover:scale-[1.02] hover:shadow-xl hover:border-primary/50 transition-all duration-300 ease-out";
}

// Phase 1: Animated Score Counter Component
function AnimatedScore({ value, className }: { value: number; className?: string }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const duration = 1500; // 1.5 seconds
        const startTime = Date.now();
        const startValue = 0;

        const animateValue = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (value - startValue) * easeOut);

            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animateValue);
            }
        };

        requestAnimationFrame(animateValue);
    }, [value]);

    return <span className={className}>{displayValue}</span>;
}

// Phase 3: Trend Indicator Component
function TrendIndicator({
    direction,
    change
}: {
    direction: "improving" | "stable" | "declining";
    change: number;
}) {
    if (direction === "stable") {
        return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="text-gray-500">→</span>
                <span>Stable</span>
            </div>
        );
    }

    if (direction === "improving") {
        return (
            <div className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="h-3 w-3" />
                <span>+{Math.abs(change)}% from last month</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 text-xs text-red-600">
            <TrendingDown className="h-3 w-3" />
            <span>{change}% from last month</span>
        </div>
    );
}

// Phase 4: Score Sparkline Component
function ScoreSparkline({
    data
}: {
    data: Array<{ month: string; score: number; savingsRate: number }>
}) {
    if (!data || data.length < 2) {
        return null;
    }

    // Format month for display (e.g., "2024-12" -> "Dec")
    const formattedData = data.map(d => ({
        ...d,
        monthLabel: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short' })
    }));

    return (
        <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Score History
                </span>
            </div>
            <div className="h-[40px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <defs>
                            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-popover border rounded-md shadow-md px-2 py-1">
                                            <p className="text-xs font-medium">{data.monthLabel}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Score: {data.score} | Rate: {data.savingsRate}%
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="var(--chart-1)"
                            strokeWidth={2}
                            fill="url(#sparklineGradient)"
                            dot={false}
                            activeDot={{ r: 3, fill: "var(--chart-1)" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Comparison Popover Component
function ComparisonPopover({
    pageKey,
    comparison,
    userScore
}: {
    pageKey: string;
    comparison: DashboardStats["comparison"];
    userScore: number;
}) {
    const compData = comparison[pageKey as keyof typeof comparison] as { userRank: number; avgScore: number; percentile: number };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full hover:bg-primary/10"
                >
                    <Users className="h-4 w-4 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Compare to Others</h4>
                    </div>

                    <div className="space-y-3">
                        {/* Your Score */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Your Score</span>
                            <span className={`font-bold ${getScoreColor(userScore)}`}>{userScore}</span>
                        </div>

                        {/* Average Score */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Average Score</span>
                            <span className="font-medium text-foreground">{compData.avgScore}</span>
                        </div>

                        {/* Percentile */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Your Percentile</span>
                                <span className="font-medium text-primary">{compData.percentile}%</span>
                            </div>
                            <Progress value={compData.percentile} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                                You're doing better than {compData.percentile}% of users
                            </p>
                        </div>

                        {/* User Count */}
                        <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                                Based on {comparison.userCount} active users
                            </p>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Phase 2: Track which cards have expanded tips
    const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});
    // Phase 5: Goal setting modal
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [savedGoal, setSavedGoal] = useState<{ targetRate: number; deadline: string } | null>(null);

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
                setError(null);
            } catch (err) {
                console.error("Error fetching dashboard stats:", err);
                setError(err instanceof Error ? err.message : "Failed to load stats");
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
                mainStat = stats ? `Score: ${score}%` : "—";
                // Comparison Logic
                const analyticsAvg = stats?.comparison?.analytics?.avgScore || 50;
                trend = { value: score - analyticsAvg };
                insight = getAnalyticsInsight(stats);
                break;
            case "fridge":
                score = stats?.fridge.score || 0;
                mainStat = stats ? `Score: ${score}%` : "—";
                // Comparison Logic
                const fridgeAvg = stats?.comparison?.fridge?.avgScore || 50;
                trend = { value: score - fridgeAvg };
                insight = getFridgeInsight(stats);
                break;
            case "savings":
                score = stats?.savings.score || 0;
                mainStat = stats ? `Score: ${score}%` : "—";
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
        <SidebarProvider
            style={{
                "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties}
        >
            <AppSidebar />
            <SidebarInset>
                <DashboardHeader />
                <div className="flex flex-col items-center p-6 md:p-10 w-full min-h-[calc(100vh-4rem)] bg-background">
                    {/* Header Section */}
                    <div className="w-full max-w-7xl mb-8 flex items-end justify-between">
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                Financial Health
                            </h1>
                            <p className="text-muted-foreground text-lg">AI-powered analysis of your spending, savings, and habits</p>
                        </div>
                    </div>

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
                                    {/* DISABLED FOR TROUBLESHOOTING - Re-enable before production (see PRE_LAUNCH_CHECKLIST.md) */}
                                    {/* item.isLocked && (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
                                            <div className="p-4 rounded-full bg-muted/50 mb-3">
                                                <Lock className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground mb-1">Locked</p>
                                            <p className="text-xs text-muted-foreground text-center px-4">
                                                {item.currentCount}/{item.minRequired} {item.key === "fridge" ? "grocery items" : "transactions"}
                                            </p>
                                        </div>
                                    ) */}
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
                                                onClick={() => posthog.capture('dashboard_card_viewed', {
                                                    card_name: item.name,
                                                    card_key: item.key,
                                                    card_score: item.progress,
                                                    card_href: item.href
                                                })}
                                            >
                                                View details
                                                <span className="text-lg">→</span>
                                            </Link>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </dl>

                    {/* Transaction Progress Bar */}
                    <Separator className="my-8 w-full" />
                    <div className="w-full">
                        <TransactionProgressBar
                            spendingTransactions={stats?.analytics?.transactionCount || 0}
                            groceryTransactions={stats?.fridge?.transactionCount || 0}
                            maxTransactions={500}
                        />
                    </div>
                </div>
            </SidebarInset>

            {/* Phase 5: Goal Setting Modal */}
            <GoalSettingModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                currentSavingsRate={stats?.savings?.savingsRate || 0}
                onSaveGoal={(goal) => {
                    setSavedGoal(goal);
                    console.log('Goal saved:', goal);
                    // TODO: Persist goal to database
                }}
            />

            {/* Quick Action Chips - Floating Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 25 }}
                    className="flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
                >
                    <span className="text-xs text-muted-foreground mr-1">Ask AI:</span>
                    <Link
                        href="/chat?prompt=Give%20me%20a%20monthly%20spending%20summary"
                        className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        onClick={() => posthog.capture('quick_ai_prompt_clicked', { prompt_type: 'monthly_summary', prompt_text: 'Give me a monthly spending summary' })}
                    >
                        Monthly summary
                    </Link>
                    <Link
                        href="/chat?prompt=What%20are%20my%20top%20expenses%20this%20month"
                        className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                        onClick={() => posthog.capture('quick_ai_prompt_clicked', { prompt_type: 'top_expenses', prompt_text: 'What are my top expenses this month' })}
                    >
                        Top expenses
                    </Link>
                    <Link
                        href="/chat?prompt=What%20seasonal%20spending%20patterns%20do%20you%20see%20in%20my%20data"
                        className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors hidden sm:block"
                        onClick={() => posthog.capture('quick_ai_prompt_clicked', { prompt_type: 'seasonal_patterns', prompt_text: 'What seasonal spending patterns do you see in my data' })}
                    >
                        Seasonal patterns
                    </Link>
                    <Link
                        href="/chat?prompt=Compare%20my%20spending%20year%20over%20year"
                        className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors hidden md:block"
                        onClick={() => posthog.capture('quick_ai_prompt_clicked', { prompt_type: 'year_over_year', prompt_text: 'Compare my spending year over year' })}
                    >
                        Year-over-year
                    </Link>
                </motion.div>
            </div>
        </SidebarProvider>
    );
}
