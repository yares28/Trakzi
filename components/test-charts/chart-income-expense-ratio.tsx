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
import { ChartLoadingState } from "@/components/chart-loading-state"

interface ChartIncomeExpenseRatioProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartIncomeExpenseRatio({
    data,
    isLoading = false,
}: ChartIncomeExpenseRatioProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [animatedRatio, setAnimatedRatio] = useState(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    const ratioData = useMemo(() => {
        if (!data || data.length === 0) return { ratio: 0, income: 0, expenses: 0, status: "neutral" as const }

        let totalIncome = 0
        let totalExpenses = 0

        data.forEach((tx) => {
            if (tx.amount > 0) {
                totalIncome += tx.amount
            } else {
                totalExpenses += Math.abs(tx.amount)
            }
        })

        const ratio = totalExpenses > 0 ? totalIncome / totalExpenses : 0

        let status: "danger" | "warning" | "good" | "excellent" | "neutral"
        if (ratio < 0.8) status = "danger"
        else if (ratio < 1) status = "warning"
        else if (ratio < 1.5) status = "good"
        else status = "excellent"

        return { ratio, income: totalIncome, expenses: totalExpenses, status }
    }, [data])

    // Animate the ratio display
    useEffect(() => {
        if (!mounted) return
        const target = Math.min(ratioData.ratio, 3) // Cap display at 3x
        const duration = 1500
        const startTime = Date.now()
        const startValue = 0

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setAnimatedRatio(startValue + (target - startValue) * easeOut)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }, [mounted, ratioData.ratio])

    const theme = resolvedTheme === "dark" ? "dark" : "light"

    const chartTitle = "Income to Expense Ratio"
    const chartDescription =
        "Shows how your income compares to your expenses. A ratio above 1 means you're earning more than spending, below 1 means you're spending more than earning."

    const getStatusColor = () => {
        switch (ratioData.status) {
            case "danger": return "#ef4444"
            case "warning": return "#f59e0b"
            case "good": return "#10b981"
            case "excellent": return palette[1] || "#22c55e"
            default: return "#6b7280"
        }
    }

    const getStatusText = () => {
        switch (ratioData.status) {
            case "danger": return "Overspending"
            case "warning": return "Near Break-even"
            case "good": return "Healthy"
            case "excellent": return "Excellent"
            default: return "No Data"
        }
    }

    // SVG Donut gauge
    const size = 180
    const strokeWidth = 24
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const normalizedValue = Math.min(animatedRatio / 3, 1) // Normalize to 0-1 (max 3x)
    const filledOffset = circumference * (1 - normalizedValue)

    const chartDataForAI = useMemo(() => ratioData, [ratioData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:incomeExpenseRatio"
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
                        chartId="testCharts:incomeExpenseRatio"
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
                                "< 0.8x = Danger zone (overspending)",
                                "0.8-1x = Warning (near break-even)",
                                "1-1.5x = Healthy surplus",
                                "> 1.5x = Excellent savings",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:incomeExpenseRatio"
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
                    <div className="h-full w-full min-h-[250px] flex flex-col items-center justify-center relative">
                        <svg
                            width={size}
                            height={size}
                            viewBox={`0 0 ${size} ${size}`}
                            className="transform -rotate-90"
                        >
                            {/* Background circle */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
                                strokeWidth={strokeWidth}
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
                            <span className="text-3xl font-bold text-foreground">
                                {animatedRatio.toFixed(2)}x
                            </span>
                            <span
                                className="text-sm font-medium"
                                style={{ color: getStatusColor() }}
                            >
                                {getStatusText()}
                            </span>
                        </div>

                        <div className="flex gap-8 mt-6 text-sm">
                            <div className="text-center">
                                <div className="text-muted-foreground">Income</div>
                                <div className="font-semibold text-emerald-500">
                                    ${ratioData.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-muted-foreground">Expenses</div>
                                <div className="font-semibold text-red-500">
                                    ${ratioData.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
