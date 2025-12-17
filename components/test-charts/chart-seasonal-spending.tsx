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

interface ChartSeasonalSpendingProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartSeasonalSpending({
    data,
    isLoading = false,
}: ChartSeasonalSpendingProps) {
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

        const seasonTotals = { Spring: 0, Summer: 0, Fall: 0, Winter: 0 }
        const seasonCounts = { Spring: 0, Summer: 0, Fall: 0, Winter: 0 }

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = new Date(tx.date).getMonth()
            let season: keyof typeof seasonTotals

            if (month >= 2 && month <= 4) season = 'Spring'
            else if (month >= 5 && month <= 7) season = 'Summer'
            else if (month >= 8 && month <= 10) season = 'Fall'
            else season = 'Winter'

            seasonTotals[season] += Math.abs(tx.amount)
            seasonCounts[season]++
        })

        const seasonColors = {
            Spring: '#10b981',
            Summer: '#f59e0b',
            Fall: '#ef4444',
            Winter: '#3b82f6',
        }

        return ['Winter', 'Spring', 'Summer', 'Fall'].map(season => ({
            season,
            total: seasonTotals[season as keyof typeof seasonTotals],
            count: seasonCounts[season as keyof typeof seasonCounts],
            avg: seasonCounts[season as keyof typeof seasonCounts] > 0
                ? seasonTotals[season as keyof typeof seasonTotals] / seasonCounts[season as keyof typeof seasonCounts]
                : 0,
            color: seasonColors[season as keyof typeof seasonColors],
        }))
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Seasonal Spending"
    const chartDescription = "Compare your spending across seasons. See if your habits change with the weather."

    const maxSeason = chartData.reduce((max, curr) => curr.total > max.total ? curr : max, chartData[0] || { season: '', total: 0 })

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Winter: Dec, Jan, Feb",
                    "Spring: Mar, Apr, May",
                    "Summer: Jun, Jul, Aug",
                    "Fall: Sep, Oct, Nov",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:seasonalSpending"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ seasons: chartData, peakSeason: maxSeason?.season }}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.length === 0 || chartData.every(d => d.total === 0)) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:seasonalSpending" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:seasonalSpending" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Spending by season</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="season"
                        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
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
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 12 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        tooltip={({ data: d }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color as string }} />
                                    <span className="font-medium text-foreground">{d.season}</span>
                                </div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(d.total as number)}</div>
                                <div className="text-[0.7rem] text-foreground/60">{d.count} transactions</div>
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
