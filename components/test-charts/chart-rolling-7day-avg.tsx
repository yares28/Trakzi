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

interface ChartRolling7DayAvgProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartRolling7DayAvg({
    data,
    isLoading = false,
}: ChartRolling7DayAvgProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { rolling: [], daily: [] }

        // Group expenses by date
        const dailyTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const date = tx.date.split("T")[0]
            const current = dailyTotals.get(date) || 0
            dailyTotals.set(date, current + Math.abs(tx.amount))
        })

        if (dailyTotals.size === 0) return { rolling: [], daily: [] }

        const sortedDates = Array.from(dailyTotals.keys()).sort()

        // Calculate 7-day rolling average
        const rollingData: Array<{ x: string; y: number }> = []
        const dailyData: Array<{ x: string; y: number }> = []

        for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i]
            const dailyValue = dailyTotals.get(date) || 0

            dailyData.push({ x: date, y: dailyValue })

            // Calculate 7-day average
            const windowStart = Math.max(0, i - 6)
            let sum = 0
            let count = 0
            for (let j = windowStart; j <= i; j++) {
                sum += dailyTotals.get(sortedDates[j]) || 0
                count++
            }

            rollingData.push({
                x: date,
                y: sum / count,
            })
        }

        return {
            rolling: [{ id: "7-Day Average", data: rollingData }],
            daily: [{ id: "Daily", data: dailyData }],
        }
    }, [data])

    const theme = resolvedTheme === "dark" ? "dark" : "light"
    const textColor = theme === "dark" ? "#ffffff" : "#1f2937"
    const gridColor = theme === "dark" ? "#374151" : "#e5e7eb"

    const chartTitle = "Rolling 7-Day Average"
    const chartDescription =
        "Smoothed spending trend using a 7-day rolling average. This removes daily noise and shows the underlying spending pattern more clearly."

    const chartDataForAI = useMemo(() => {
        if (!chartData.rolling?.[0]?.data?.length) return {}
        const values = chartData.rolling[0].data.map((d) => d.y)
        return {
            latestAvg: values[values.length - 1] ?? 0,
            overallAvg: values.reduce((a, b) => a + b, 0) / values.length,
            dataPoints: values.length,
        }
    }, [chartData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:rolling7DayAvg"
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

    const hasData = chartData.rolling?.[0]?.data?.length > 0

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="testCharts:rolling7DayAvg"
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
                                "Removes daily fluctuations",
                                "Shows true spending trend",
                                "Based on last 7 days at each point",
                                "Great for identifying patterns",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:rolling7DayAvg"
                            chartTitle={chartTitle}
                            chartDescription={chartDescription}
                            chartData={chartDataForAI}
                            size="sm"
                        />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                {isLoading || !hasData ? (
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center">
                        <ChartLoadingState />
                    </div>
                ) : (
                    <div className="h-full w-full min-h-[250px]">
                        <ResponsiveLine
                            data={chartData.rolling}
                            margin={{ top: 20, right: 30, bottom: 50, left: 80 }}
                            xScale={{ type: "point" }}
                            yScale={{ type: "linear", min: 0, max: "auto" }}
                            curve="catmullRom"
                            colors={[palette[0] || "#fe8339"]}
                            lineWidth={3}
                            pointSize={0}
                            enableGridX={false}
                            enableArea={true}
                            areaOpacity={0.2}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                                tickSize: 0,
                                tickPadding: 16,
                                tickRotation: -45,
                                tickValues: chartData.rolling[0].data
                                    .filter((_: { x: string; y: number }, i: number, arr: Array<{ x: string; y: number }>) => i % Math.ceil(arr.length / 8) === 0)
                                    .map((d: { x: string; y: number }) => d.x),
                                format: (v: string | number) => {
                                    const date = new Date(v as string)
                                    return `${date.getMonth() + 1}/${date.getDate()}`
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
                                    line: { stroke: palette[0] || "#fe8339", strokeWidth: 1, strokeOpacity: 0.5 },
                                },
                            }}
                            useMesh={true}
                            tooltip={({ point }: { point: { data: { x: string | number; y: number } } }) => (
                                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                    <div className="font-semibold text-foreground mb-1">
                                        {new Date(point.data.x as string).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        7-Day Avg: <span className="font-medium text-foreground">{formatCurrency(point.data.y as number)}</span>
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
