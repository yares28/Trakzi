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

interface ChartWeeklyComparisonProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartWeeklyComparison({
    data,
    isLoading = false,
}: ChartWeeklyComparisonProps) {
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

        // Group by ISO week
        const weeklyTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = new Date(tx.date)
            const year = date.getFullYear()
            const week = getISOWeek(date)
            const weekKey = `${year}-W${week.toString().padStart(2, '0')}`
            weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + Math.abs(tx.amount))
        })

        const sortedWeeks = Array.from(weeklyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)

        return [{
            id: "Weekly Spending",
            data: sortedWeeks.map(([week, total]) => ({ x: week, y: total })),
        }]
    }, [data])

    // ISO week calculation
    function getISOWeek(date: Date): number {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    }

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Weekly Comparison"
    const chartDescription = "Compare your spending week over week. Spot patterns and anomalies in your weekly budget."

    const avgWeekly = chartData[0]?.data ? chartData[0].data.reduce((sum, d) => sum + d.y, 0) / chartData[0].data.length : 0

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Shows last 12 weeks",
                    "Dashed line = average",
                    "Compare week over week",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:weeklyComparison"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ avgWeekly, weeks: chartData[0]?.data?.length ?? 0 }}
                size="sm"
            />
        </div>
    )

    if (!mounted || !chartData[0]?.data?.length) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:weeklyComparison" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:weeklyComparison" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Week over week spending</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveLine
                        data={chartData}
                        margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
                        xScale={{ type: "point" }}
                        yScale={{ type: "linear", min: 0, max: "auto" }}
                        curve="monotoneX"
                        colors={[palette[0] || "#fe8339"]}
                        lineWidth={3}
                        pointSize={10}
                        pointColor={{ theme: "background" }}
                        pointBorderWidth={3}
                        pointBorderColor={{ from: "serieColor" }}
                        enableGridX={false}
                        enableArea={true}
                        areaOpacity={0.1}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 12,
                            tickRotation: -45,
                            format: (v: string) => v.split("-")[1],
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                        }}
                        markers={[
                            { axis: 'y', value: avgWeekly, lineStyle: { stroke: palette[1] || "#10b981", strokeWidth: 2, strokeDasharray: '6 4' }, legend: 'Avg', legendOrientation: 'horizontal' },
                        ]}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        useMesh={true}
                        tooltip={({ point }: { point: { data: { x: string | number; y: number } } }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{point.data.x}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(point.data.y)}</div>
                                <div className="text-[0.7rem] text-foreground/60">
                                    {point.data.y > avgWeekly ? `+${((point.data.y - avgWeekly) / avgWeekly * 100).toFixed(0)}% above avg` :
                                        point.data.y < avgWeekly ? `${((point.data.y - avgWeekly) / avgWeekly * 100).toFixed(0)}% below avg` : 'At average'}
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
