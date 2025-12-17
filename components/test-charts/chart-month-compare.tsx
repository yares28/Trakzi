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

interface ChartMonthCompareProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartMonthCompare({
    data,
    isLoading = false,
}: ChartMonthCompareProps) {
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

        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const prevDate = new Date(now)
        prevDate.setMonth(prevDate.getMonth() - 1)
        const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

        let currentTotal = 0
        let prevTotal = 0

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            if (month === currentMonth) currentTotal += Math.abs(tx.amount)
            else if (month === prevMonth) prevTotal += Math.abs(tx.amount)
        })

        const currentMonthName = now.toLocaleDateString('en-US', { month: 'short' })
        const prevMonthName = prevDate.toLocaleDateString('en-US', { month: 'short' })

        return [
            { month: prevMonthName, total: prevTotal, color: palette[1] || "#10b981" },
            { month: currentMonthName, total: currentTotal, color: palette[0] || "#fe8339" },
        ]
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "This Month vs Last"
    const chartDescription = "Compare your current month's spending against last month."

    const diff = chartData.length === 2 ? chartData[1].total - chartData[0].total : 0
    const diffPercent = chartData.length === 2 && chartData[0].total > 0
        ? ((chartData[1].total - chartData[0].total) / chartData[0].total) * 100
        : 0

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Current vs previous month",
                    "Green = spending less",
                    "Red = spending more",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:monthCompare"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ diff, diffPercent, months: chartData }}
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
                        <ChartFavoriteButton chartId="testCharts:monthCompare" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[200px]"><ChartLoadingState isLoading={isLoading} /></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:monthCompare" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Month comparison</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[180px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="month"
                        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                        padding={0.4}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={8}
                        enableLabel={true}
                        label={(d) => formatCurrency(d.value as number, { maximumFractionDigits: 0 })}
                        labelSkipHeight={20}
                        labelTextColor="#ffffff"
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
                        tooltip={({ data: d }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{d.month}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(d.total as number)}</div>
                            </div>
                        )}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>

                {/* Difference indicator */}
                <div className="text-center mt-2">
                    <span
                        className="text-sm font-semibold"
                        style={{ color: diff > 0 ? "#ef4444" : "#10b981" }}
                    >
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)} ({diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
