"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardAction,
} from "@/components/ui/card"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react"

interface ChartSpendingScoreProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartSpendingScore({
    data,
    isLoading = false,
}: ChartSpendingScoreProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [animatedScore, setAnimatedScore] = useState(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    const scoreData = useMemo(() => {
        if (!data || data.length === 0) return { score: 0, factors: [], grade: 'N/A', trend: 'stable' as const }

        let score = 50 // Start at 50

        // Factor 1: Weekend vs Weekday ratio (less weekend spending = better)
        let weekendSpend = 0, weekdaySpend = 0
        data.filter(tx => tx.amount < 0).forEach(tx => {
            const day = new Date(tx.date).getDay()
            if (day === 0 || day === 6) weekendSpend += Math.abs(tx.amount)
            else weekdaySpend += Math.abs(tx.amount)
        })
        const weekendRatio = weekendSpend / Math.max(weekdaySpend, 1)
        if (weekendRatio < 0.3) score += 15 // Great: weekends are < 30% of weekday
        else if (weekendRatio < 0.5) score += 10
        else if (weekendRatio > 1) score -= 10 // Bad: spending more on weekends

        // Factor 2: Category diversity (too concentrated = risky)
        const categoryTotals = new Map<string, number>()
        data.filter(tx => tx.amount < 0).forEach(tx => {
            const cat = tx.category || 'Other'
            categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(tx.amount))
        })
        const totalSpend = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0)
        const topCategoryPct = Math.max(...Array.from(categoryTotals.values())) / Math.max(totalSpend, 1)
        if (topCategoryPct < 0.3) score += 15 // Well diversified
        else if (topCategoryPct < 0.5) score += 5
        else score -= 5 // Too concentrated

        // Factor 3: Spending consistency (less variance = better)
        const dailyTotals = new Map<string, number>()
        data.filter(tx => tx.amount < 0).forEach(tx => {
            const date = tx.date.split('T')[0]
            dailyTotals.set(date, (dailyTotals.get(date) || 0) + Math.abs(tx.amount))
        })
        const dailyAmounts = Array.from(dailyTotals.values())
        const avgDaily = dailyAmounts.reduce((a, b) => a + b, 0) / Math.max(dailyAmounts.length, 1)
        const variance = dailyAmounts.reduce((sum, val) => sum + Math.pow(val - avgDaily, 2), 0) / Math.max(dailyAmounts.length, 1)
        const stdDev = Math.sqrt(variance)
        const cv = stdDev / Math.max(avgDaily, 1) // Coefficient of variation
        if (cv < 0.5) score += 10 // Consistent
        else if (cv > 1.5) score -= 10 // Erratic

        // Factor 4: Recent trend (improving = bonus)
        const sortedDates = Array.from(dailyTotals.keys()).sort()
        const recentDays = sortedDates.slice(-7)
        const olderDays = sortedDates.slice(-14, -7)
        const recentAvg = recentDays.reduce((sum, d) => sum + (dailyTotals.get(d) || 0), 0) / Math.max(recentDays.length, 1)
        const olderAvg = olderDays.reduce((sum, d) => sum + (dailyTotals.get(d) || 0), 0) / Math.max(olderDays.length, 1)
        const trend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0
        if (trend < -0.2) { score += 10 } // Improving
        else if (trend > 0.2) { score -= 10 } // Worsening

        const trendDirection = trend < -0.1 ? 'improving' : trend > 0.1 ? 'worsening' : 'stable'

        // Clamp score
        score = Math.max(0, Math.min(100, Math.round(score)))

        // Grade
        let grade = 'F'
        if (score >= 90) grade = 'A+'
        else if (score >= 80) grade = 'A'
        else if (score >= 70) grade = 'B'
        else if (score >= 60) grade = 'C'
        else if (score >= 50) grade = 'D'

        return {
            score,
            grade,
            trend: trendDirection as 'improving' | 'worsening' | 'stable',
            factors: [
                { name: 'Weekend Ratio', impact: weekendRatio < 0.5 ? 'positive' : 'negative' },
                { name: 'Diversity', impact: topCategoryPct < 0.5 ? 'positive' : 'negative' },
                { name: 'Consistency', impact: cv < 1 ? 'positive' : 'negative' },
                { name: 'Trend', impact: trend < 0 ? 'positive' : trend > 0 ? 'negative' : 'neutral' },
            ],
        }
    }, [data])

    useEffect(() => {
        if (!mounted) return
        const target = scoreData.score
        const duration = 1500
        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setAnimatedScore(Math.round(target * easeOut))
            if (progress < 1) requestAnimationFrame(animate)
        }

        requestAnimationFrame(animate)
    }, [mounted, scoreData.score])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Spending Score"
    const chartDescription = "An AI-calculated score based on your spending patterns, diversity, and trends."

    const getScoreColor = () => {
        if (scoreData.score >= 80) return palette[1] || "#10b981"
        if (scoreData.score >= 60) return palette[2] || "#3b82f6"
        if (scoreData.score >= 40) return "#f59e0b"
        return "#ef4444"
    }

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Weekend/weekday balance",
                    "Category diversification",
                    "Spending consistency",
                    "Recent trend direction",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:spendingScore"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={scoreData}
                size="sm"
            />
        </div>
    )

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:spendingScore" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]"><ChartLoadingState isLoading={isLoading} /></div>
                </CardContent>
            </Card>
        )
    }

    const TrendIcon = scoreData.trend === 'improving' ? IconTrendingDown : scoreData.trend === 'worsening' ? IconTrendingUp : IconMinus

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:spendingScore" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Overall spending health</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[200px] flex flex-col items-center justify-center gap-4">
                    {/* Score circle */}
                    <div className="relative">
                        <svg width="140" height="140" viewBox="0 0 140 140">
                            <circle cx="70" cy="70" r="60" fill="none" stroke={isDark ? '#374151' : '#e5e7eb'} strokeWidth="12" />
                            <circle
                                cx="70" cy="70" r="60"
                                fill="none"
                                stroke={getScoreColor()}
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${(animatedScore / 100) * 377} 377`}
                                transform="rotate(-90 70 70)"
                                style={{ transition: 'stroke-dasharray 0.3s ease-out' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold" style={{ color: getScoreColor() }}>{animatedScore}</span>
                            <span className="text-2xl font-bold text-foreground">{scoreData.grade}</span>
                        </div>
                    </div>

                    {/* Trend indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}>
                        <TrendIcon size={16} style={{ color: scoreData.trend === 'improving' ? '#10b981' : scoreData.trend === 'worsening' ? '#ef4444' : '#6b7280' }} />
                        <span className="text-sm capitalize text-foreground">{scoreData.trend}</span>
                    </div>

                    {/* Factors */}
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {scoreData.factors.map((factor, i) => (
                            <div
                                key={factor.name}
                                className="px-2 py-1 rounded text-xs"
                                style={{
                                    backgroundColor: factor.impact === 'positive' ? (isDark ? '#064e3b' : '#d1fae5') : factor.impact === 'negative' ? (isDark ? '#7f1d1d' : '#fee2e2') : (isDark ? '#374151' : '#f3f4f6'),
                                    color: factor.impact === 'positive' ? '#10b981' : factor.impact === 'negative' ? '#ef4444' : (isDark ? '#9ca3af' : '#6b7280'),
                                }}
                            >
                                {factor.name}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
