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
import { ChartLoadingState } from "@/components/chart-loading-state"

interface ChartMoMGrowthProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartMoMGrowth({
    data,
    isLoading = false,
}: ChartMoMGrowthProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Group expenses by month
        const monthlyTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const date = new Date(tx.date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            const current = monthlyTotals.get(monthKey) || 0
            monthlyTotals.set(monthKey, current + Math.abs(tx.amount))
        })

        if (monthlyTotals.size < 2) return []

        const sortedMonths = Array.from(monthlyTotals.keys()).sort()

        // Calculate MoM growth percentage
        const growthData = []
        for (let i = 1; i < sortedMonths.length; i++) {
            const prevMonth = sortedMonths[i - 1]
            const currMonth = sortedMonths[i]
            const prevValue = monthlyTotals.get(prevMonth) || 0
            const currValue = monthlyTotals.get(currMonth) || 0

            const growth = prevValue > 0 ? ((currValue - prevValue) / prevValue) * 100 : 0

            growthData.push({
                x: currMonth,
                y: growth,
                prevValue,
                currValue,
            })
        }

        return [
            {
                id: "Growth Rate",
                data: growthData,
            },
        ]
    }, [data])

    const theme = resolvedTheme === "dark" ? "dark" : "light"
    const textColor = theme === "dark" ? "#ffffff" : "#1f2937"
    const gridColor = theme === "dark" ? "#374151" : "#e5e7eb"

    const chartTitle = "Month-over-Month Growth"
    const chartDescription =
        "Track your spending growth rate month-over-month. Positive values indicate increased spending, negative values indicate decreased spending."

    const chartDataForAI = useMemo(() => {
        if (!chartData[0]?.data?.length) return {}
        const values = chartData[0].data.map((d) => d.y)
        const avgGrowth = values.reduce((a, b) => a + b, 0) / values.length
        const latestGrowth = values[values.length - 1]
        return {
            averageGrowth: avgGrowth,
            latestGrowth,
            months: values.length,
        }
    }, [chartData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:momGrowth"
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
                        chartId="testCharts:momGrowth"
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
                                "Positive = spending increased",
                                "Negative = spending decreased",
                                "0% = same as previous month",
                                "Based on total monthly expenses",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:momGrowth"
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
                            margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
                            xScale={{ type: "point" }}
                            yScale={{ type: "linear", min: "auto", max: "auto" }}
                            yFormat=" >-.1f"
                            curve="monotoneX"
                            colors={({ id }) => palette[2] || "#8b5cf6"}
                            lineWidth={3}
                            pointSize={10}
                            pointColor={{ theme: "background" }}
                            pointBorderWidth={2}
                            pointBorderColor={{ from: "serieColor" }}
                            enableGridX={false}
                            enableSlices="x"
                            enableArea={true}
                            areaBaselineValue={0}
                            areaOpacity={0.1}
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
                                format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`,
                            }}
                            theme={{
                                text: { fill: textColor, fontSize: 12 },
                                axis: {
                                    ticks: { text: { fill: textColor } },
                                },
                                grid: { line: { stroke: gridColor, strokeWidth: 1 } },
                                crosshair: {
                                    line: { stroke: palette[2] || "#8b5cf6", strokeWidth: 1, strokeOpacity: 0.5 },
                                },
                            }}
                            markers={[
                                {
                                    axis: "y",
                                    value: 0,
                                    lineStyle: { stroke: gridColor, strokeWidth: 2, strokeDasharray: "4 4" },
                                },
                            ]}
                            sliceTooltip={({ slice }) => {
                                const point = slice.points[0]
                                const dataPoint = chartData[0].data.find((d) => d.x === point.data.x)
                                return (
                                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                        <div className="font-semibold text-foreground mb-2">
                                            {(() => {
                                                const [year, month] = (point.data.x as string).split("-")
                                                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                                                return `${monthNames[parseInt(month) - 1]} ${year}`
                                            })()}
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-muted-foreground">Growth:</span>
                                                <span
                                                    className="font-medium"
                                                    style={{ color: (point.data.y as number) >= 0 ? "#ef4444" : "#10b981" }}
                                                >
                                                    {(point.data.y as number) > 0 ? "+" : ""}{(point.data.y as number).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }}
                            animate={true}
                            motionConfig="gentle"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
