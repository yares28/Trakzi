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

interface ChartMonthlyBudgetPaceProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartMonthlyBudgetPace({
    data,
    isLoading = false,
}: ChartMonthlyBudgetPaceProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const isDark = resolvedTheme === "dark"

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return { paceData: [], projectedTotal: 0, currentTotal: 0, daysRemaining: 0 }

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
        const dayOfMonth = now.getDate()
        const daysRemaining = daysInMonth - dayOfMonth

        // Get historical monthly averages
        const monthlyTotals = new Map<string, number>()
        let currentMonthTotal = 0

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const txDate = new Date(tx.date)
            const txMonth = txDate.getMonth()
            const txYear = txDate.getFullYear()

            if (txMonth === currentMonth && txYear === currentYear) {
                currentMonthTotal += Math.abs(tx.amount)
            }

            const monthKey = `${txYear}-${txMonth}`
            monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + Math.abs(tx.amount))
        })

        // Calculate average from past months (excluding current)
        const pastMonths = Array.from(monthlyTotals.entries())
            .filter(([key]) => {
                const [y, m] = key.split('-').map(Number)
                return !(y === currentYear && m === currentMonth)
            })
            .map(([_, val]) => val)

        const avgMonthlySpend = pastMonths.length > 0
            ? pastMonths.reduce((a, b) => a + b, 0) / pastMonths.length
            : currentMonthTotal * (daysInMonth / dayOfMonth)

        // Daily pace
        const expectedAtThisPoint = (avgMonthlySpend / daysInMonth) * dayOfMonth
        const projectedTotal = (currentMonthTotal / dayOfMonth) * daysInMonth

        const paceData = [
            { label: "Spent", value: currentMonthTotal, color: palette[0] || "#fe8339" },
            { label: "Expected", value: expectedAtThisPoint, color: palette[1] || "#10b981" },
            { label: "Projected", value: projectedTotal, color: palette[2] || "#3b82f6" },
            { label: "Avg Month", value: avgMonthlySpend, color: isDark ? "#6b7280" : "#9ca3af" },
        ]

        return { paceData, projectedTotal, currentTotal: currentMonthTotal, daysRemaining, dayOfMonth, daysInMonth, avgMonthlySpend }
    }, [data, palette, isDark])

    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Monthly Budget Pace"
    const chartDescription = "Are you on track this month? Compare your spending pace against your typical month."

    const paceStatus = chartData.currentTotal > ((chartData.avgMonthlySpend ?? 0) / (chartData.daysInMonth ?? 1) * (chartData.dayOfMonth ?? 1)) ? 'over' : 'under'

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Spent: your actual spending so far",
                    "Expected: where you should be based on avg",
                    "Projected: estimated end-of-month total",
                    "Avg: your typical monthly spending",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:monthlyBudgetPace"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={chartData}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.paceData.length === 0) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:monthlyBudgetPace" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:monthlyBudgetPace" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Monthly spending pace</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData.paceData}
                        keys={["value"]}
                        indexBy="label"
                        layout="horizontal"
                        margin={{ top: 10, right: 60, bottom: 30, left: 80 }}
                        padding={0.3}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={6}
                        enableLabel={true}
                        label={(d) => formatCurrency(d.value as number, { maximumFractionDigits: 0 })}
                        labelSkipWidth={50}
                        labelTextColor="#ffffff"
                        axisTop={null}
                        axisRight={null}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `$${v}`,
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        tooltip={({ data: d }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{d.label}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(d.value as number)}</div>
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
