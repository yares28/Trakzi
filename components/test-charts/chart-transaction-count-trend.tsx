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

interface ChartTransactionCountTrendProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartTransactionCountTrend({
    data,
    isLoading = false,
}: ChartTransactionCountTrendProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        const monthlyCounts = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1)
        })

        return Array.from(monthlyCounts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([month, count], i, arr) => {
                const prevCount = i > 0 ? arr[i - 1][1] : count
                const change = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : 0
                return {
                    month,
                    count,
                    change,
                    color: change > 10 ? "#ef4444" : change < -10 ? "#10b981" : palette[0] || "#fe8339",
                }
            })
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Transaction Count Trend"
    const chartDescription = "Track how many transactions you make each month. More transactions often means more spending."

    const avgCount = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length : 0

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Count of expense transactions per month",
                    "Red = increased from previous month",
                    "Green = decreased from previous month",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:transactionCountTrend"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ avgCount, months: chartData.length }}
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
                        <ChartFavoriteButton chartId="testCharts:transactionCountTrend" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:transactionCountTrend" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Monthly transaction counts</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["count"]}
                        indexBy="month"
                        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                        padding={0.3}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={6}
                        enableLabel={true}
                        label={(d) => String(d.value)}
                        labelSkipHeight={20}
                        labelTextColor="#ffffff"
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
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        tooltip={({ data: d }) => {
                            const changeValue = typeof d.change === 'number' ? d.change : 0
                            return (
                                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                    <div className="font-medium text-foreground">{d.month}</div>
                                    <div className="mt-1 text-[0.7rem] text-foreground/80">{d.count} transactions</div>
                                    {changeValue !== 0 && (
                                        <div className="text-[0.7rem]" style={{ color: changeValue > 0 ? "#ef4444" : "#10b981" }}>
                                            {changeValue > 0 ? '+' : ''}{changeValue.toFixed(0)}% vs prev
                                        </div>
                                    )}
                                </div>
                            )
                        }}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
