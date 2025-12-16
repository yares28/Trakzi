"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, MessageSquare, TrendingUp, TrendingDown, Target, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeeklySummaryData {
    summary: string;
    highlights: string[];
    recommendations: string[];
    sentiment: "positive" | "neutral" | "negative";
}

interface AIWeeklySummaryProps {
    savingsRate?: number;
    savingsScore?: number;
    trendDirection?: "improving" | "stable" | "declining";
    trendChange?: number;
}

export function AIWeeklySummary({
    savingsRate = 0,
    savingsScore = 0,
    trendDirection = "stable",
    trendChange = 0,
}: AIWeeklySummaryProps) {
    const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/dashboard/weekly-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    savingsRate,
                    savingsScore,
                    trendDirection,
                    trendChange,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate summary');
            }

            const data = await response.json();
            setSummary(data);
        } catch (err) {
            console.error('Error fetching AI summary:', err);
            setError('Unable to generate summary. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-fetch on mount
    useEffect(() => {
        if (savingsRate > 0 || savingsScore > 0) {
            fetchSummary();
        }
    }, [savingsRate, savingsScore]);

    const getSentimentIcon = () => {
        if (!summary) return null;
        switch (summary.sentiment) {
            case "positive":
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case "negative":
                return <TrendingDown className="h-4 w-4 text-red-500" />;
            default:
                return <Target className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getSentimentBg = () => {
        if (!summary) return "bg-muted/50";
        switch (summary.sentiment) {
            case "positive":
                return "bg-green-500/10 border-green-500/20";
            case "negative":
                return "bg-red-500/10 border-red-500/20";
            default:
                return "bg-yellow-500/10 border-yellow-500/20";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                        AI Weekly Insight
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchSummary}
                    disabled={isLoading}
                    className="h-6 px-2 text-xs"
                >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Thinking...' : 'Refresh'}
                </Button>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {isLoading && !summary && (
                <div className="p-4 rounded-lg bg-muted/50 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                </div>
            )}

            {summary && !isLoading && (
                <div className={`p-4 rounded-lg border ${getSentimentBg()}`}>
                    <div className="flex items-start gap-2 mb-3">
                        {getSentimentIcon()}
                        <p className="text-sm text-foreground leading-relaxed">
                            {summary.summary}
                        </p>
                    </div>

                    {summary.highlights.length > 0 && (
                        <div className="mb-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/50 mb-1">
                                Highlights
                            </p>
                            <ul className="space-y-1">
                                {summary.highlights.map((highlight, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5 text-xs text-foreground/80">
                                        <span className="text-green-500">✓</span>
                                        {highlight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {summary.recommendations.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/50 mb-1">
                                Recommendations
                            </p>
                            <ul className="space-y-1">
                                {summary.recommendations.map((rec, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5 text-xs text-foreground/80">
                                        <MessageSquare className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {!isLoading && !summary && !error && (
                <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
                    <p className="text-sm text-muted-foreground text-center">
                        No AI summary available yet. Click refresh to generate.
                    </p>
                </div>
            )}
        </motion.div>
    );
}
