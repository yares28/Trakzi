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

interface ChartMonthlyTrendProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartMonthlyTrend({
    data,
    isLoading = false,
}: ChartMonthlyTrendProps) {
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

        const monthlyTotals = new Map<string, { income: number; expenses: number }>()

        data.forEach((tx) => {
            const month = tx.date.slice(0, 7)
            const existing = monthlyTotals.get(month) || { income: 0, expenses: 0 }

            if (tx.amount > 0) {
                existing.income += tx.amount
            } else {
                existing.expenses += Math.abs(tx.amount)
            }
            monthlyTotals.set(month, existing)
        })

        const sortedMonths = Array.from(monthlyTotals.keys()).sort().slice(-12)

        return [
            {
                id: "Income",
                data: sortedMonths.map(month => ({
                    x: month,
                    y: monthlyTotals.get(month)!.income,
                })),
            },
            {
                id: "Expenses",
                data: sortedMonths.map(month => ({
                    x: month,
                    y: monthlyTotals.get(month)!.expenses,
                })),
            },
        ]
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Monthly Income vs Expenses"
    const chartDescription = "Compare your income and expenses trend over the last 12 months."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Green line = income",
                    "Orange line = expenses",
                    "Goal: keep income above expenses",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:monthlyTrend"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ months: chartData[0]?.data?.length ?? 0 }}
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
                        <ChartFavoriteButton chartId="testCharts:monthlyTrend" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:monthlyTrend" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Income vs expenses</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveLine
                        data={chartData}
                        margin={{ top: 20, right: 100, bottom: 50, left: 70 }}
                        xScale={{ type: "point" }}
                        yScale={{ type: "linear", min: 0, max: "auto" }}
                        curve="monotoneX"
                        colors={["#10b981", palette[0] || "#fe8339"]}
                        lineWidth={3}
                        pointSize={8}
                        pointColor={{ theme: "background" }}
                        pointBorderWidth={2}
                        pointBorderColor={{ from: "serieColor" }}
                        enableGridX={false}
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
                        legends={[
                            {
                                anchor: "bottom-right",
                                direction: "column",
                                translateX: 90,
                                itemWidth: 80,
                                itemHeight: 20,
                                itemTextColor: textColor,
                                symbolSize: 12,
                                symbolShape: "circle",
                            },
                        ]}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        useMesh={true}
                        tooltip={({ point }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{point.seriesId}</div>
                                <div className="text-[0.7rem] text-foreground/60">{point.data.xFormatted}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
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
