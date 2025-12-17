"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveLine } from "@nivo/line"
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

interface ChartNetWorthTrendProps {
    data: Array<{
        date: string
        amount: number
        balance?: number | null
    }>
    isLoading?: boolean
}

export function ChartNetWorthTrend({
    data,
    isLoading = false,
}: ChartNetWorthTrendProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Get monthly end-of-month balances or calculate running total
        const monthlyBalances = new Map<string, number>()

        // Sort by date
        const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date))

        // Use balance if available, otherwise calculate running total
        let runningTotal = 0
        sortedData.forEach((tx) => {
            const month = tx.date.slice(0, 7)
            runningTotal += tx.amount

            const balanceToUse = tx.balance !== null && tx.balance !== undefined ? tx.balance : runningTotal
            monthlyBalances.set(month, balanceToUse)
        })

        const sortedMonths = Array.from(monthlyBalances.keys()).sort().slice(-12)

        return [{
            id: "Net Worth",
            data: sortedMonths.map(month => ({
                x: month,
                y: monthlyBalances.get(month) || 0,
            })),
        }]
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Net Worth Trend"
    const chartDescription = "Track your net worth over time based on account balance."

    const latestValue = chartData[0]?.data?.[chartData[0].data.length - 1]?.y ?? 0
    const firstValue = chartData[0]?.data?.[0]?.y ?? 0
    const change = latestValue - firstValue

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Based on account balance",
                    "Shows last 12 months",
                    "Upward trend = growing wealth",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:netWorthTrend"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ latestValue, change }}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.length === 0 || !chartData[0]?.data?.length) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:netWorthTrend" chartTitle={chartTitle} size="md" />
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

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:netWorthTrend" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Wealth over time</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveLine
                        data={chartData}
                        margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
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
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 12,
                            tickRotation: -45,
                            format: (v: string) => {
                                const [year, month] = v.split("-")
                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                return months[parseInt(month) - 1]
                            },
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `$${v}`,
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        useMesh={true}
                        tooltip={({ point }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="text-[0.7rem] text-foreground/60">{point.data.xFormatted}</div>
                                <div className="mt-1 font-mono font-semibold text-foreground">
                                    {formatCurrency(point.data.y as number)}
                                </div>
                            </div>
                        )}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
