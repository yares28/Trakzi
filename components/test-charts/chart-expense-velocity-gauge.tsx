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

interface ChartExpenseVelocityGaugeProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartExpenseVelocityGauge({
    data,
    isLoading = false,
}: ChartExpenseVelocityGaugeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [animatedAngle, setAnimatedAngle] = useState(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    const gaugeData = useMemo(() => {
        if (!data || data.length === 0) return { velocity: 0, dailyAvg: 0, trend: 'stable' }

        const expenses = data.filter(tx => tx.amount < 0)
        if (expenses.length === 0) return { velocity: 0, dailyAvg: 0, trend: 'stable' }

        const dates = expenses.map(tx => new Date(tx.date).getTime())
        const minDate = Math.min(...dates)
        const maxDate = Math.max(...dates)
        const daySpan = Math.max(1, (maxDate - minDate) / (1000 * 60 * 60 * 24))

        const totalSpent = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        const dailyAvg = totalSpent / daySpan

        // Velocity as percentage of a "normal" $100/day baseline
        const velocity = Math.min(200, (dailyAvg / 100) * 100)

        // Recent vs older trend
        const midPoint = (minDate + maxDate) / 2
        const recentExpenses = expenses.filter(tx => new Date(tx.date).getTime() > midPoint)
        const olderExpenses = expenses.filter(tx => new Date(tx.date).getTime() <= midPoint)

        const recentAvg = recentExpenses.length > 0 ? recentExpenses.reduce((s, t) => s + Math.abs(t.amount), 0) / recentExpenses.length : 0
        const olderAvg = olderExpenses.length > 0 ? olderExpenses.reduce((s, t) => s + Math.abs(t.amount), 0) / olderExpenses.length : 0

        const trend = recentAvg > olderAvg * 1.1 ? 'increasing' : recentAvg < olderAvg * 0.9 ? 'decreasing' : 'stable'

        return { velocity, dailyAvg, trend }
    }, [data])

    useEffect(() => {
        if (!mounted) return
        const target = gaugeData.velocity
        const duration = 1500
        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setAnimatedAngle(target * easeOut)
            if (progress < 1) requestAnimationFrame(animate)
        }

        requestAnimationFrame(animate)
    }, [mounted, gaugeData.velocity])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Expense Velocity Gauge"
    const chartDescription = "How fast are you spending? This gauge shows your daily spending rate."

    const getVelocityColor = () => {
        if (gaugeData.velocity < 50) return "#10b981"
        if (gaugeData.velocity < 100) return "#f59e0b"
        return "#ef4444"
    }

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Measures daily spending rate",
                    "Green = under $50/day",
                    "Yellow = $50-100/day",
                    "Red = over $100/day",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:expenseVelocityGauge"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={gaugeData}
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
                        <ChartFavoriteButton chartId="testCharts:expenseVelocityGauge" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[200px]"><ChartLoadingState isLoading={isLoading} /></div>
                </CardContent>
            </Card>
        )
    }

    const angle = (animatedAngle / 200) * 180 - 90 // Map 0-200 to -90 to 90 degrees

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:expenseVelocityGauge" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Daily spending rate</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[180px] flex flex-col items-center justify-center gap-4">
                    {/* Gauge SVG */}
                    <div className="relative">
                        <svg width="180" height="100" viewBox="0 0 180 100">
                            {/* Background arc */}
                            <path
                                d="M 10 90 A 80 80 0 0 1 170 90"
                                fill="none"
                                stroke={isDark ? '#374151' : '#e5e7eb'}
                                strokeWidth="12"
                                strokeLinecap="round"
                            />
                            {/* Colored arc */}
                            <path
                                d="M 10 90 A 80 80 0 0 1 170 90"
                                fill="none"
                                stroke={`url(#gaugeGradient)`}
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={`${(animatedAngle / 200) * 251} 251`}
                            />
                            <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="50%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                            {/* Needle */}
                            <line
                                x1="90"
                                y1="90"
                                x2={90 + 60 * Math.cos((angle * Math.PI) / 180)}
                                y2={90 + 60 * Math.sin((angle * Math.PI) / 180)}
                                stroke={isDark ? '#ffffff' : '#1f2937'}
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <circle cx="90" cy="90" r="6" fill={isDark ? '#ffffff' : '#1f2937'} />
                        </svg>
                    </div>

                    {/* Value display */}
                    <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: getVelocityColor() }}>
                            {formatCurrency(gaugeData.dailyAvg)}/day
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">{gaugeData.trend}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
