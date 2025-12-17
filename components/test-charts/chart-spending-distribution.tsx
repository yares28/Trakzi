"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
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

interface ChartSpendingDistributionProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartSpendingDistribution({
    data,
    isLoading = false,
}: ChartSpendingDistributionProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Define spending buckets
        const buckets = [
            { label: "$0-10", min: 0, max: 10, count: 0 },
            { label: "$10-25", min: 10, max: 25, count: 0 },
            { label: "$25-50", min: 25, max: 50, count: 0 },
            { label: "$50-100", min: 50, max: 100, count: 0 },
            { label: "$100-250", min: 100, max: 250, count: 0 },
            { label: "$250-500", min: 250, max: 500, count: 0 },
            { label: "$500+", min: 500, max: Infinity, count: 0 },
        ]

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const amount = Math.abs(tx.amount)

            for (const bucket of buckets) {
                if (amount >= bucket.min && amount < bucket.max) {
                    bucket.count++
                    break
                }
            }
        })

        return buckets.map((bucket) => ({
            range: bucket.label,
            count: bucket.count,
        }))
    }, [data])

    const theme = resolvedTheme === "dark" ? "dark" : "light"
    const textColor = theme === "dark" ? "#ffffff" : "#1f2937"
    const gridColor = theme === "dark" ? "#374151" : "#e5e7eb"

    const chartTitle = "Spending Distribution"
    const chartDescription =
        "A histogram showing how your transactions are distributed across different spending ranges. See where most of your spending falls."

    const chartDataForAI = useMemo(() => {
        if (chartData.length === 0) return {}
        const mostCommon = chartData.reduce((prev, curr) =>
            curr.count > prev.count ? curr : prev
        )
        const totalTx = chartData.reduce((sum, b) => sum + b.count, 0)
        return {
            mostCommonRange: mostCommon.range,
            mostCommonCount: mostCommon.count,
            totalTransactions: totalTx,
            mostCommonPercent: totalTx > 0 ? ((mostCommon.count / totalTx) * 100).toFixed(1) : 0,
        }
    }, [chartData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:spendingDistribution"
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

    const getBarColor = (index: number) => {
        const colors = [
            palette[1] || "#10b981",
            palette[1] || "#10b981",
            palette[2] || "#3b82f6",
            palette[2] || "#3b82f6",
            palette[0] || "#f59e0b",
            palette[0] || "#f59e0b",
            palette[3] || "#ef4444",
        ]
        return colors[index] || palette[0]
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="testCharts:spendingDistribution"
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
                                "Groups transactions by amount",
                                "Shows frequency in each range",
                                "Helps identify spending patterns",
                                "Higher bars = more transactions",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:spendingDistribution"
                            chartTitle={chartTitle}
                            chartDescription={chartDescription}
                            chartData={chartDataForAI}
                            size="sm"
                        />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                {isLoading || chartData.length === 0 ? (
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center">
                        <ChartLoadingState />
                    </div>
                ) : (
                    <div className="h-full w-full min-h-[250px]">
                        <ResponsiveBar
                            data={chartData}
                            keys={["count"]}
                            indexBy="range"
                            margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                            padding={0.3}
                            colors={({ index }) => getBarColor(index)}
                            borderRadius={6}
                            enableLabel={true}
                            label={(d) => (d.value as number) > 0 ? String(d.value) : ""}
                            labelSkipWidth={12}
                            labelSkipHeight={12}
                            labelTextColor={{
                                from: "color",
                                modifiers: [["darker", 2]],
                            }}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                                tickSize: 0,
                                tickPadding: 8,
                                tickRotation: -35,
                            }}
                            axisLeft={{
                                tickSize: 0,
                                tickPadding: 8,
                                tickRotation: 0,
                            }}
                            theme={{
                                text: { fill: textColor, fontSize: 11 },
                                axis: {
                                    ticks: { text: { fill: textColor } },
                                },
                                grid: { line: { stroke: gridColor, strokeWidth: 1 } },
                            }}
                            tooltip={({ data, value }) => (
                                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                    <div className="font-semibold text-foreground mb-1">
                                        {data.range}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Transactions: <span className="font-medium text-foreground">{value}</span>
                                    </div>
                                </div>
                            )}
                            animate={true}
                            motionConfig="gentle"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
