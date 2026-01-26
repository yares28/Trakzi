"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
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

interface ChartDailyAverageByMonthProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartDailyAverageByMonth({
    data,
    isLoading = false,
}: ChartDailyAverageByMonthProps) {
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

        const monthlyData = new Map<string, { total: number; days: Set<string> }>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            const day = tx.date.slice(0, 10)

            const existing = monthlyData.get(month) || { total: 0, days: new Set() }
            existing.total += Math.abs(tx.amount)
            existing.days.add(day)
            monthlyData.set(month, existing)
        })

        const paletteLength = palette?.length || 0
        return Array.from(monthlyData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([month, data], i) => {
                const dailyAvg = data.days.size > 0 ? data.total / data.days.size : 0
                return {
                    month,
                    dailyAvg,
                    daysActive: data.days.size,
                    color: paletteLength > 0 ? (palette[i % paletteLength] || "#fe8339") : "#fe8339",
                }
            })
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Daily Average by Month"
    const chartDescription = "Your average daily spending for each month - lower is better!"

    const overallAvg = chartData.length > 0
        ? chartData.reduce((sum, d) => sum + d.dailyAvg, 0) / chartData.length
        : 0

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Average spending per active day",
                    "Excludes days with no spending",
                    "Compare months easily",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:dailyAverageByMonth"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ overallAvg, months: chartData.length }}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.length === 0) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:dailyAverageByMonth" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:dailyAverageByMonth" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Daily averages</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["dailyAvg"]}
                        indexBy="month"
                        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                        padding={0.3}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={6}
                        enableLabel={false}
                        markers={[
                            {
                                axis: 'y',
                                value: overallAvg,
                                lineStyle: { stroke: isDark ? '#6b7280' : '#9ca3af', strokeWidth: 2, strokeDasharray: '4 4' },
                                legend: 'avg',
                                legendOrientation: 'horizontal',
                            },
                        ]}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
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
                            format: (v: number) => `$${v >= 100 ? Math.round(v) : v.toFixed(0)}`,
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        tooltip={({ data: d }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{d.month}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                                    {formatCurrency(d.dailyAvg as number)}/day
                                </div>
                                <div className="text-[0.7rem] text-foreground/60">{d.daysActive} active days</div>
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
