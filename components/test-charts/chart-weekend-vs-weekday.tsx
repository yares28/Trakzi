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

interface ChartWeekendVsWeekdayProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartWeekendVsWeekday({
    data,
    isLoading = false,
}: ChartWeekendVsWeekdayProps) {
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

        let weekdayTotal = 0
        let weekdayCount = 0
        let weekendTotal = 0
        let weekendCount = 0

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = new Date(tx.date)
            const dayOfWeek = date.getDay()
            const amount = Math.abs(tx.amount)

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                weekendTotal += amount
                weekendCount++
            } else {
                weekdayTotal += amount
                weekdayCount++
            }
        })

        return [
            {
                type: "Weekday",
                total: weekdayTotal,
                average: weekdayCount > 0 ? weekdayTotal / weekdayCount : 0,
                count: weekdayCount,
                color: palette[0] || "#fe8339",
            },
            {
                type: "Weekend",
                total: weekendTotal,
                average: weekendCount > 0 ? weekendTotal / weekendCount : 0,
                count: weekendCount,
                color: palette[2] || "#3b82f6",
            },
        ]
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Weekend vs Weekday"
    const chartDescription =
        "Compare your spending habits between weekdays (Mon-Fri) and weekends (Sat-Sun)."

    const chartDataForAI = useMemo(() => {
        if (chartData.length === 0) return {}
        return {
            weekdayTotal: chartData[0]?.total ?? 0,
            weekendTotal: chartData[1]?.total ?? 0,
            weekdayAvg: chartData[0]?.average ?? 0,
            weekendAvg: chartData[1]?.average ?? 0,
        }
    }, [chartData])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Weekdays: Monday through Friday",
                    "Weekends: Saturday and Sunday",
                    "Shows total spending and average per transaction",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:weekendVsWeekday"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={chartDataForAI}
                size="sm"
            />
        </div>
    )

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:weekendVsWeekday" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" />
                </CardContent>
            </Card>
        )
    }

    if (!data || data.length === 0 || chartData.length === 0) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:weekendVsWeekday" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:weekendVsWeekday" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Weekday vs weekend spending</span>
                </CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="type"
                        margin={{ top: 20, right: 30, bottom: 50, left: 80 }}
                        padding={0.4}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={8}
                        enableLabel={false}
                        axisTop={null}
                        axisRight={null}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 16,
                            tickRotation: 0,
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            tickRotation: 0,
                            format: (v: number) => {
                                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
                                if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
                                return formatCurrency(v, { maximumFractionDigits: 0 })
                            },
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 12 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor, strokeWidth: 1 } },
                        }}
                        tooltip={({ data: d }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full border border-border/50"
                                        style={{ backgroundColor: d.color as string }}
                                    />
                                    <span className="font-medium text-foreground whitespace-nowrap">{d.type}</span>
                                </div>
                                <div className="mt-1 space-y-0.5">
                                    <div className="font-mono text-[0.7rem] text-foreground/80">
                                        Total: {formatCurrency(d.total as number)}
                                    </div>
                                    <div className="font-mono text-[0.7rem] text-foreground/80">
                                        Avg: {formatCurrency(d.average as number)}
                                    </div>
                                    <div className="text-[0.7rem] text-foreground/60">{d.count} transactions</div>
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
