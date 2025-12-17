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

interface ChartPaydayImpactProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartPaydayImpact({
    data,
    isLoading = false,
}: ChartPaydayImpactProps) {
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

        // Detect paydays (days with large income)
        const paydays = new Set<string>()
        data.forEach((tx) => {
            if (tx.amount > 1000) { // Likely a paycheck
                paydays.add(tx.date.split("T")[0])
            }
        })

        // Group spending by days relative to payday
        const relativeDaySpending = new Map<number, { total: number; count: number }>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const txDate = new Date(tx.date.split("T")[0])

            // Find nearest payday
            const paydayDates = Array.from(paydays).map(pd => new Date(pd))
            let nearestPayday: Date | null = null
            let minDiff = Infinity

            for (const paydayDate of paydayDates) {
                const diff = Math.abs(txDate.getTime() - paydayDate.getTime())
                if (diff < minDiff) {
                    minDiff = diff
                    nearestPayday = paydayDate
                }
            }

            if (nearestPayday !== null) {
                const daysDiff = Math.round((txDate.getTime() - nearestPayday.getTime()) / (1000 * 60 * 60 * 24))
                if (daysDiff >= -3 && daysDiff <= 14) {
                    const existing = relativeDaySpending.get(daysDiff) || { total: 0, count: 0 }
                    relativeDaySpending.set(daysDiff, {
                        total: existing.total + Math.abs(tx.amount),
                        count: existing.count + 1,
                    })
                }
            }
        })

        const result = []
        for (let day = -3; day <= 14; day++) {
            const data = relativeDaySpending.get(day) || { total: 0, count: 0 }
            result.push({
                day: day === 0 ? "Payday" : day > 0 ? `+${day}` : `${day}`,
                dayNum: day,
                total: data.total,
                avg: data.count > 0 ? data.total / data.count : 0,
                color: day <= 3 ? palette[0] : day <= 7 ? palette[1] : palette[2],
            })
        }

        return result
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Payday Impact"
    const chartDescription = "See how your spending changes around payday. Many people spend more right after getting paid."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Shows spending relative to payday",
                    "Day 0 = Payday",
                    "Positive = days after payday",
                    "Negative = days before payday",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:paydayImpact"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ days: chartData }}
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
                        <ChartFavoriteButton chartId="testCharts:paydayImpact" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:paydayImpact" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Spending around payday</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="day"
                        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                        padding={0.2}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={4}
                        enableLabel={false}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            tickRotation: -45,
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
                        tooltip={({ data: d }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{d.day === "Payday" ? "Payday" : `${d.day} days`}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(d.total as number)}</div>
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
