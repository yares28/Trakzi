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

interface ChartBudgetBurndownProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    monthlyBudget?: number
}

export function ChartBudgetBurndown({
    data,
    isLoading = false,
    monthlyBudget = 3000,
}: ChartBudgetBurndownProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { actual: [], ideal: [] }

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

        // Filter to current month
        const currentMonthData = data.filter((tx) => {
            if (tx.amount >= 0) return false
            const txDate = new Date(tx.date)
            return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
        })

        // Calculate actual spending by day
        const dailySpending = new Map<number, number>()
        currentMonthData.forEach((tx) => {
            const day = new Date(tx.date).getDate()
            dailySpending.set(day, (dailySpending.get(day) || 0) + Math.abs(tx.amount))
        })

        // Build actual burndown
        let remaining = monthlyBudget
        const actualData: Array<{ x: number; y: number }> = [{ x: 0, y: monthlyBudget }]

        for (let day = 1; day <= daysInMonth; day++) {
            const spent = dailySpending.get(day) || 0
            remaining -= spent
            if (day <= now.getDate()) {
                actualData.push({ x: day, y: Math.max(0, remaining) })
            }
        }

        // Build ideal burndown (linear)
        const idealData: Array<{ x: number; y: number }> = []
        const dailyBudget = monthlyBudget / daysInMonth
        for (let day = 0; day <= daysInMonth; day++) {
            idealData.push({ x: day, y: monthlyBudget - (dailyBudget * day) })
        }

        return {
            actual: [{ id: "Actual", data: actualData }],
            ideal: [{ id: "Ideal", data: idealData }],
            remaining,
            daysInMonth,
            currentDay: now.getDate(),
        }
    }, [data, monthlyBudget])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Budget Burndown"
    const chartDescription = "Track how quickly you're burning through your monthly budget. Stay below the ideal line!"

    const isOverBudget = (chartData.remaining ?? monthlyBudget) < 0
    const paceStatus = chartData.actual?.[0]?.data ?
        (chartData.actual[0].data[chartData.actual[0].data.length - 1]?.y ?? 0) > (chartData.ideal?.[0]?.data?.[chartData.currentDay ?? 0]?.y ?? 0)
            ? 'under' : 'over'
        : 'unknown'

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    `Budget: ${formatCurrency(monthlyBudget)}`,
                    "Solid line = actual spending",
                    "Dashed line = ideal pace",
                    "Stay above the ideal for savings",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:budgetBurndown"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ remaining: chartData.remaining, monthlyBudget, paceStatus }}
                size="sm"
            />
        </div>
    )

    if (!mounted || !chartData.actual?.length) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:budgetBurndown" chartTitle={chartTitle} size="md" />
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

    const combinedData = [
        ...(chartData.ideal || []),
        ...(chartData.actual || []),
    ]

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:budgetBurndown" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Budget remaining over time</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveLine
                        data={combinedData}
                        margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
                        xScale={{ type: "linear", min: 0, max: chartData.daysInMonth }}
                        yScale={{ type: "linear", min: 0, max: monthlyBudget * 1.1 }}
                        curve="monotoneX"
                        colors={[isDark ? "#4b5563" : "#9ca3af", palette[0] || "#fe8339"]}
                        lineWidth={3}
                        enablePoints={false}
                        enableGridX={false}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 12,
                            legend: 'Day of Month',
                            legendOffset: 36,
                            legendPosition: 'middle',
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        legends={[
                            {
                                anchor: 'top-right',
                                direction: 'row',
                                translateY: -20,
                                itemWidth: 80,
                                itemHeight: 20,
                                itemTextColor: textColor,
                                symbolSize: 12,
                                symbolShape: 'circle',
                            },
                        ]}
                        useMesh={true}
                        tooltip={(props) => {
                            const point = props.point as unknown as { serieId: string; data: { x: number; y: number } }
                            return (
                                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                    <div className="font-medium text-foreground">Day {point.data.x}</div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                                        {point.serieId}: {formatCurrency(point.data.y)}
                                    </div>
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
