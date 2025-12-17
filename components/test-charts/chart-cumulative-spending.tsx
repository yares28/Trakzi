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

interface ChartCumulativeSpendingProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartCumulativeSpending({
    data,
    isLoading = false,
}: ChartCumulativeSpendingProps) {
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

        const dailyTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = tx.date.split("T")[0]
            const current = dailyTotals.get(date) || 0
            dailyTotals.set(date, current + Math.abs(tx.amount))
        })

        const sortedDates = Array.from(dailyTotals.keys()).sort()
        let cumulative = 0

        return [{
            id: "Cumulative Spending",
            data: sortedDates.map(date => {
                cumulative += dailyTotals.get(date) || 0
                return { x: date, y: cumulative }
            }),
        }]
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Cumulative Spending"
    const chartDescription = "Watch your total spending accumulate over time. Steeper slopes indicate faster spending periods."

    const totalSpending = chartData[0]?.data?.[chartData[0].data.length - 1]?.y ?? 0

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Line shows running total of expenses",
                    "Steeper = faster spending",
                    "Flat = no spending that day",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:cumulativeSpending"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ totalSpending, days: chartData[0]?.data?.length ?? 0 }}
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
                        <ChartFavoriteButton chartId="testCharts:cumulativeSpending" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:cumulativeSpending" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Running total over time</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveLine
                        data={chartData}
                        margin={{ top: 20, right: 30, bottom: 50, left: 80 }}
                        xScale={{ type: "point" }}
                        yScale={{ type: "linear", min: 0, max: "auto" }}
                        curve="monotoneX"
                        colors={[palette[0] || "#fe8339"]}
                        lineWidth={3}
                        pointSize={0}
                        enableGridX={false}
                        enableArea={true}
                        areaOpacity={0.15}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 12,
                            tickRotation: -45,
                            tickValues: chartData[0].data.filter((_: { x: string; y: number }, i: number, arr: Array<{ x: string; y: number }>) => i % Math.ceil(arr.length / 6) === 0).map((d: { x: string; y: number }) => d.x),
                            format: (v: string) => {
                                const d = new Date(v)
                                return `${d.getMonth() + 1}/${d.getDate()}`
                            },
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => {
                                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
                                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
                                return formatCurrency(v, { maximumFractionDigits: 0 })
                            },
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        useMesh={true}
                        tooltip={({ point }: { point: { data: { x: string | number; y: number } } }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{new Date(point.data.x as string).toLocaleDateString()}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">Total: {formatCurrency(point.data.y)}</div>
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
