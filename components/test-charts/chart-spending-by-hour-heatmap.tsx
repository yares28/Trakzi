"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
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

interface ChartSpendingByHourHeatmapProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartSpendingByHourHeatmap({
    data,
    isLoading = false,
}: ChartSpendingByHourHeatmapProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { grid: [], maxValue: 0 }

        // 7 days x 4 time periods
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const periods = ['Morning (6-12)', 'Afternoon (12-18)', 'Evening (18-24)', 'Night (0-6)']

        const grid: number[][] = Array(7).fill(0).map(() => Array(4).fill(0))

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = new Date(tx.date)
            const dayIndex = date.getDay()
            const hour = date.getHours()

            let periodIndex = 3 // Night
            if (hour >= 6 && hour < 12) periodIndex = 0
            else if (hour >= 12 && hour < 18) periodIndex = 1
            else if (hour >= 18) periodIndex = 2

            grid[dayIndex][periodIndex] += Math.abs(tx.amount)
        })

        const maxValue = Math.max(...grid.flat())

        return { grid, maxValue, dayNames, periods }
    }, [data])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Spending Heatmap"
    const chartDescription = "See when you spend most - by day and time of day."

    const getColor = (value: number) => {
        if (chartData.maxValue === 0) return isDark ? '#374151' : '#e5e7eb'
        const intensity = value / chartData.maxValue

        if (intensity < 0.2) return isDark ? '#1f2937' : '#f3f4f6'
        if (intensity < 0.4) return isDark ? '#374151' : '#e5e7eb'
        if (intensity < 0.6) return isDark ? '#f59e0b50' : '#fef3c7'
        if (intensity < 0.8) return isDark ? '#f59e0b80' : '#fcd34d'
        return palette[0] || '#fe8339'
    }

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Rows = days of week",
                    "Columns = time periods",
                    "Darker = more spending",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:spendingByHourHeatmap"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ maxValue: chartData.maxValue }}
                size="sm"
            />
        </div>
    )

    if (!mounted || !chartData.grid || chartData.grid.length === 0) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:spendingByHourHeatmap" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:spendingByHourHeatmap" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">When you spend</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[200px] flex flex-col gap-1">
                    {/* Header row */}
                    <div className="flex gap-1">
                        <div className="w-12" />
                        {chartData.periods?.map((period, i) => (
                            <div key={i} className="flex-1 text-center text-[0.65rem] text-muted-foreground truncate px-1">
                                {period.split(' ')[0]}
                            </div>
                        ))}
                    </div>

                    {/* Data rows */}
                    {chartData.dayNames?.map((day, dayIndex) => (
                        <div key={day} className="flex gap-1">
                            <div className="w-12 text-xs text-muted-foreground flex items-center">{day}</div>
                            {chartData.grid[dayIndex].map((value, periodIndex) => (
                                <div
                                    key={periodIndex}
                                    className="flex-1 h-10 rounded-md flex items-center justify-center text-xs transition-all hover:scale-105 cursor-pointer"
                                    style={{ backgroundColor: getColor(value) }}
                                    title={`${day} ${chartData.periods?.[periodIndex]}: ${formatCurrency(value)}`}
                                >
                                    {value > 0 && (
                                        <span className="text-[0.6rem] opacity-80" style={{ color: value / chartData.maxValue > 0.5 ? '#fff' : (isDark ? '#9ca3af' : '#6b7280') }}>
                                            {value >= 1000 ? `${(value / 1000).toFixed(0)}k` : Math.round(value)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
