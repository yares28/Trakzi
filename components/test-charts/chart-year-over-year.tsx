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

interface ChartYearOverYearProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartYearOverYear({
    data,
    isLoading = false,
}: ChartYearOverYearProps) {
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

        const yearlyTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const year = tx.date.slice(0, 4)
            yearlyTotals.set(year, (yearlyTotals.get(year) || 0) + Math.abs(tx.amount))
        })

        return Array.from(yearlyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-5)
            .map(([year, total], i, arr) => {
                const prevTotal = i > 0 ? arr[i - 1][1] : total
                const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0
                return {
                    year,
                    total,
                    change,
                    color: i === arr.length - 1 ? palette[0] : (isDark ? '#6b7280' : '#9ca3af'),
                }
            })
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Year Over Year"
    const chartDescription = "Compare your annual spending across years to spot long-term trends."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Shows up to 5 years",
                    "Current year highlighted",
                    "Track long-term changes",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:yearOverYear"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ years: chartData }}
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
                        <ChartFavoriteButton chartId="testCharts:yearOverYear" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:yearOverYear" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Annual comparison</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="year"
                        margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
                        padding={0.4}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={8}
                        enableLabel={false}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 16,
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `$${v}`,
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 12 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        tooltip={({ data: d }) => {
                            const changeValue = typeof d.change === 'number' ? d.change : 0
                            return (
                                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                    <div className="font-medium text-foreground">{d.year}</div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(d.total as number)}</div>
                                    {changeValue !== 0 && (
                                        <div className="text-[0.7rem]" style={{ color: changeValue > 0 ? "#ef4444" : "#10b981" }}>
                                            {changeValue > 0 ? '+' : ''}{changeValue.toFixed(0)}% vs prev year
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
