"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveLine } from "@nivo/line"
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

interface ChartAvgTransactionTrendProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartAvgTransactionTrend({
    data,
    isLoading = false,
}: ChartAvgTransactionTrendProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Group by month and calculate average transaction size
        const monthlyData = new Map<string, { total: number; count: number }>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const date = new Date(tx.date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            const amount = Math.abs(tx.amount)

            if (!monthlyData.has(monthKey)) {
                monthlyData.set(monthKey, { total: 0, count: 0 })
            }
            const entry = monthlyData.get(monthKey)!
            entry.total += amount
            entry.count++
        })

        const sortedMonths = Array.from(monthlyData.keys()).sort()

        return [
            {
                id: "Average Transaction",
                data: sortedMonths.map((month) => {
                    const entry = monthlyData.get(month)!
                    return {
                        x: month,
                        y: entry.count > 0 ? entry.total / entry.count : 0,
                    }
                }),
            },
        ]
    }, [data])

    const theme = resolvedTheme === "dark" ? "dark" : "light"
    const textColor = theme === "dark" ? "#ffffff" : "#1f2937"
    const gridColor = theme === "dark" ? "#374151" : "#e5e7eb"

    const chartTitle = "Average Transaction Size"
    const chartDescription =
        "Track how your average transaction size changes over time. A rising trend might indicate lifestyle inflation, while a declining trend shows better spending control."

    const chartDataForAI = useMemo(() => {
        if (!chartData[0]?.data?.length) return {}
        const values = chartData[0].data.map((d) => d.y as number)
        return {
            currentAvg: values[values.length - 1] ?? 0,
            overallAvg: values.reduce((a, b) => a + b, 0) / values.length,
            trend: values.length > 1 ? (values[values.length - 1] > values[0] ? "increasing" : "decreasing") : "stable",
        }
    }, [chartData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:avgTransactionTrend"
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
                        chartId="testCharts:avgTransactionTrend"
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
                                "Calculated monthly",
                                "Only includes expenses (negative transactions)",
                                "Higher values = larger purchases",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:avgTransactionTrend"
                            chartTitle={chartTitle}
                            chartDescription={chartDescription}
                            chartData={chartDataForAI}
                            size="sm"
                        />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                {isLoading || chartData.length === 0 || !chartData[0]?.data?.length ? (
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center">
                        <ChartLoadingState />
                    </div>
                ) : (
                    <div className="h-full w-full min-h-[250px]">
                        <ResponsiveLine
                            data={chartData}
                            margin={{ top: 20, right: 30, bottom: 50, left: 80 }}
                            xScale={{ type: "point" }}
                            yScale={{ type: "linear", min: "auto", max: "auto" }}
                            curve="monotoneX"
                            colors={[palette[1] || "#10b981"]}
                            lineWidth={3}
                            pointSize={8}
                            pointColor={{ theme: "background" }}
                            pointBorderWidth={2}
                            pointBorderColor={{ from: "serieColor" }}
                            enableGridX={false}
                            enableArea={true}
                            areaOpacity={0.15}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                                tickSize: 0,
                                tickPadding: 16,
                                tickRotation: -45,
                                format: (v) => {
                                    const [year, month] = v.split("-")
                                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                    return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`
                                },
                            }}
                            axisLeft={{
                                tickSize: 0,
                                tickPadding: 8,
                                tickRotation: 0,
                                format: (v: number) => {
                                    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
                                    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
                                    return formatCurrency(v, { maximumFractionDigits: 0 })
                                },
                            }}
                            theme={{
                                text: { fill: textColor, fontSize: 12 },
                                axis: {
                                    ticks: { text: { fill: textColor } },
                                },
                                grid: { line: { stroke: gridColor, strokeWidth: 1 } },
                                crosshair: {
                                    line: { stroke: palette[1] || "#10b981", strokeWidth: 1, strokeOpacity: 0.5 },
                                },
                            }}
                            useMesh={true}
                            tooltip={({ point }) => (
                                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                    <div className="font-semibold text-foreground mb-1">
                                        {(() => {
                                            const [year, month] = (point.data.x as string).split("-")
                                            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                                            return `${monthNames[parseInt(month) - 1]} ${year}`
                                        })()}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Average: <span className="font-medium text-foreground">{formatCurrency(point.data.y as number)}</span>
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
