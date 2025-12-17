"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
    Card,
    CardContent,
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

interface ChartSpendingVelocityProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartSpendingVelocity({
    data,
    isLoading = false,
}: ChartSpendingVelocityProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [animatedValue, setAnimatedValue] = useState(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    const velocityData = useMemo(() => {
        if (!data || data.length === 0) return { velocity: 0, dailyAvg: 0, recent7DayAvg: 0, status: "neutral" as const }

        // Calculate overall daily average
        const expensesByDate = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = tx.date.split("T")[0]
            const current = expensesByDate.get(date) || 0
            expensesByDate.set(date, current + Math.abs(tx.amount))
        })

        if (expensesByDate.size === 0) return { velocity: 0, dailyAvg: 0, recent7DayAvg: 0, status: "neutral" as const }

        const allDays = Array.from(expensesByDate.keys()).sort()
        const totalExpenses = Array.from(expensesByDate.values()).reduce((a, b) => a + b, 0)
        const dailyAvg = totalExpenses / allDays.length

        // Get last 7 days average
        const last7Days = allDays.slice(-7)
        const recent7DayTotal = last7Days.reduce((sum, day) => sum + (expensesByDate.get(day) || 0), 0)
        const recent7DayAvg = recent7DayTotal / last7Days.length

        // Velocity = how fast you're spending relative to average (percentage)
        const velocity = dailyAvg > 0 ? (recent7DayAvg / dailyAvg) * 100 : 0

        let status: "slow" | "normal" | "fast" | "neutral"
        if (velocity < 80) status = "slow"
        else if (velocity > 120) status = "fast"
        else status = "normal"

        return { velocity, dailyAvg, recent7DayAvg, status }
    }, [data])

    // Animate gauge
    useEffect(() => {
        if (!mounted) return
        const target = Math.min(velocityData.velocity, 200) // Cap at 200%
        const duration = 1500
        const startTime = Date.now()
        const startValue = 0

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setAnimatedValue(startValue + (target - startValue) * easeOut)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }, [mounted, velocityData.velocity])

    const theme = resolvedTheme === "dark" ? "dark" : "light"

    const chartTitle = "Spending Velocity"
    const chartDescription =
        "Measures how fast you're spending compared to your historical average. Values above 100% mean you're spending faster than usual."

    const getStatusColor = () => {
        switch (velocityData.status) {
            case "slow": return palette[1] || "#10b981"
            case "normal": return palette[2] || "#3b82f6"
            case "fast": return palette[0] || "#ef4444"
            default: return "#6b7280"
        }
    }

    const getStatusText = () => {
        switch (velocityData.status) {
            case "slow": return "Spending Slowly"
            case "normal": return "Normal Pace"
            case "fast": return "Spending Fast"
            default: return "No Data"
        }
    }

    // SVG Gauge
    const size = 200
    const strokeWidth = 20
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const maxAngle = 270 // degrees
    const gaugeOffset = circumference * (1 - maxAngle / 360)
    const normalizedValue = Math.min(animatedValue / 200, 1) // Normalize to 0-1 (max 200%)
    const filledOffset = circumference * (1 - (normalizedValue * maxAngle) / 360)

    const chartDataForAI = useMemo(() => velocityData, [velocityData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:spendingVelocity"
                            chartTitle={chartTitle}
                            size="md"
                        />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="testCharts:spendingVelocity"
                        chartTitle={chartTitle}
                        size="md"
                    />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-col items-center gap-2">
                        <ChartInfoPopover
                            title={chartTitle}
                            description={chartDescription}
                            details={[
                                "< 80% = Spending slower than average",
                                "80-120% = Normal spending pace",
                                "> 120% = Spending faster than average",
                                "Based on last 7 days vs overall average",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:spendingVelocity"
                            chartTitle={chartTitle}
                            chartDescription={chartDescription}
                            chartData={chartDataForAI}
                            size="sm"
                        />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                {isLoading ? (
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center">
                        <ChartLoadingState />
                    </div>
                ) : (
                    <div className="h-full w-full min-h-[250px] flex flex-col items-center justify-center gap-4">
                        <svg
                            width={size}
                            height={size}
                            viewBox={`0 0 ${size} ${size}`}
                            className="transform -rotate-[135deg]"
                        >
                            {/* Background arc */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={gaugeOffset}
                                strokeLinecap="round"
                            />
                            {/* Filled arc */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={getStatusColor()}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={filledOffset}
                                strokeLinecap="round"
                                style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
                            />
                        </svg>

                        <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-bold text-foreground">
                                {Math.round(animatedValue)}%
                            </span>
                            <span
                                className="text-sm font-medium"
                                style={{ color: getStatusColor() }}
                            >
                                {getStatusText()}
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-1 mt-4 text-sm text-muted-foreground">
                            <div>
                                Recent 7-day avg: <span className="font-medium text-foreground">{formatCurrency(velocityData.recent7DayAvg)}/day</span>
                            </div>
                            <div>
                                Overall avg: <span className="font-medium text-foreground">{formatCurrency(velocityData.dailyAvg)}/day</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
