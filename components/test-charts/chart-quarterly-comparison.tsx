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

interface ChartQuarterlyComparisonProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartQuarterlyComparison({
    data,
    isLoading = false,
}: ChartQuarterlyComparisonProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const isDark = resolvedTheme === "dark"

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        const quarterlyTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = new Date(tx.date)
            const year = date.getFullYear()
            const quarter = Math.floor(date.getMonth() / 3) + 1
            const key = `${year} Q${quarter}`

            quarterlyTotals.set(key, (quarterlyTotals.get(key) || 0) + Math.abs(tx.amount))
        })

        return Array.from(quarterlyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-8)
            .map(([quarter, total], i, arr) => {
                const prevTotal = i > 0 ? arr[i - 1][1] : total
                const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0
                const isLatest = i === arr.length - 1
                return {
                    quarter,
                    total,
                    change,
                    color: isLatest ? palette[0] : (isDark ? '#4b5563' : '#9ca3af'),
                }
            })
    }, [data, palette, isDark])
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Quarterly Comparison"
    const chartDescription = "Compare your spending across quarters to spot seasonal patterns."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Shows up to 8 quarters",
                    "Current quarter highlighted",
                    "Identify seasonal trends",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:quarterlyComparison"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ quarters: chartData }}
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
                        <ChartFavoriteButton chartId="testCharts:quarterlyComparison" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:quarterlyComparison" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Quarterly trends</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="quarter"
                        margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
                        padding={0.3}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={6}
                        enableLabel={false}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 12,
                            tickRotation: -45,
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
                        tooltip={({ data: d }) => {
                            const changeValue = typeof d.change === 'number' ? d.change : 0
                            return (
                                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                    <div className="font-medium text-foreground">{d.quarter}</div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(d.total as number)}</div>
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
