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

interface ChartLargestTransactionsProps {
    data: Array<{
        date: string
        amount: number
        description: string
        category?: string
    }>
    isLoading?: boolean
}

export function ChartLargestTransactions({
    data,
    isLoading = false,
}: ChartLargestTransactionsProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [animatedWidths, setAnimatedWidths] = useState<number[]>([])

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Get top 10 largest transactions (expenses)
        return data
            .filter((tx) => tx.amount < 0)
            .map((tx) => ({
                ...tx,
                absAmount: Math.abs(tx.amount),
            }))
            .sort((a, b) => b.absAmount - a.absAmount)
            .slice(0, 10)
            .map((tx, index) => ({
                description: tx.description.slice(0, 30) + (tx.description.length > 30 ? "..." : ""),
                fullDescription: tx.description,
                amount: tx.absAmount,
                date: new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                category: tx.category || "Other",
                color: palette && palette.length > 0 ? (palette[index % palette.length] || "#6b7280") : "#6b7280",
            }))
    }, [data, palette])

    // Animate bars
    useEffect(() => {
        if (!mounted || chartData.length === 0) return

        const maxAmount = chartData[0]?.amount || 1
        const duration = 1200
        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)

            const widths = chartData.map((item, index) => {
                const targetWidth = (item.amount / maxAmount) * 100
                const delay = Math.min(index * 0.1, 0.5) // Stagger animation
                const adjustedProgress = Math.max(0, (progress - delay) / (1 - delay))
                return targetWidth * Math.min(adjustedProgress, 1)
            })

            setAnimatedWidths(widths)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }, [mounted, chartData])

    const theme = resolvedTheme === "dark" ? "dark" : "light"

    const chartTitle = "Largest Transactions"
    const chartDescription =
        "Your top 10 biggest single expenses. These large purchases often have the most impact on your budget."

    const chartDataForAI = useMemo(() => {
        if (chartData.length === 0) return {}
        const total = chartData.reduce((sum, tx) => sum + tx.amount, 0)
        return {
            largestAmount: chartData[0]?.amount ?? 0,
            largestDescription: chartData[0]?.description ?? "None",
            top10Total: total,
            averageSize: total / chartData.length,
        }
    }, [chartData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:largestTransactions"
                            chartTitle={chartTitle}
                            size="md"
                        />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[300px]" />
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
                        chartId="testCharts:largestTransactions"
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
                                "Shows top 10 largest expenses",
                                "Sorted by transaction size",
                                "Hover for full details",
                                "Great for identifying big-ticket items",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:largestTransactions"
                            chartTitle={chartTitle}
                            chartDescription={chartDescription}
                            chartData={chartDataForAI}
                            size="sm"
                        />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0 overflow-auto">
                {isLoading || chartData.length === 0 ? (
                    <div className="h-full w-full min-h-[300px] flex items-center justify-center">
                        <ChartLoadingState />
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 py-2">
                        {chartData.map((item, index) => (
                            <div
                                key={`${item.description}-${index}`}
                                className="group relative flex items-center gap-2"
                                title={`${item.fullDescription}\n${item.date} • ${item.category}`}
                            >
                                <div className="flex-1 relative h-8">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-r-lg flex items-center px-2 transition-all duration-100 group-hover:brightness-110"
                                        style={{
                                            width: `${Math.max(animatedWidths[index] || 0, 5)}%`,
                                            backgroundColor: item.color,
                                            minWidth: "60px",
                                        }}
                                    >
                                        <span className="text-xs font-medium text-white truncate">
                                            {item.description}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground w-12">{item.date}</span>
                                    <span className="font-semibold text-foreground w-20 text-right">
                                        {formatCurrency(animatedWidths[index] ? (item.amount * (animatedWidths[index] / ((item.amount / (chartData[0]?.amount || 1)) * 100))) : 0)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
