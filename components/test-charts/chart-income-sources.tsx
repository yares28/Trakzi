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

interface ChartIncomeSourcesProps {
    data: Array<{
        date: string
        amount: number
        description: string
        category?: string
    }>
    isLoading?: boolean
}

export function ChartIncomeSources({
    data,
    isLoading = false,
}: ChartIncomeSourcesProps) {
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

        const sourceTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount <= 0) return // Only income

            // Try to categorize income source
            let source = tx.category || 'Other Income'
            const desc = tx.description.toLowerCase()

            if (desc.includes('salary') || desc.includes('payroll') || desc.includes('paycheck')) {
                source = 'Salary'
            } else if (desc.includes('dividend') || desc.includes('interest')) {
                source = 'Investments'
            } else if (desc.includes('refund') || desc.includes('return')) {
                source = 'Refunds'
            } else if (desc.includes('transfer') || desc.includes('deposit')) {
                source = 'Transfers'
            } else if (desc.includes('freelance') || desc.includes('consulting')) {
                source = 'Freelance'
            }

            sourceTotals.set(source, (sourceTotals.get(source) || 0) + tx.amount)
        })

        return Array.from(sourceTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([source, total], i) => ({
                source,
                total,
                color: palette[i % palette.length] || "#10b981",
            }))
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const totalIncome = chartData.reduce((sum, d) => sum + d.total, 0)

    const chartTitle = "Income Sources"
    const chartDescription = "Breakdown of where your income comes from. Diversification is key to financial stability."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Groups positive transactions by type",
                    "Auto-categorizes common sources",
                    "Shows top 6 sources",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:incomeSources"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ sources: chartData, totalIncome }}
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
                        <ChartFavoriteButton chartId="testCharts:incomeSources" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:incomeSources" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Where your money comes from</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="source"
                        layout="horizontal"
                        margin={{ top: 10, right: 60, bottom: 30, left: 100 }}
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
                        tooltip={({ data: d }) => {
                            const pct = totalIncome > 0 ? ((d.total as number) / totalIncome) * 100 : 0
                            return (
                                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                    <div className="font-medium text-foreground">{d.source}</div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(d.total as number)}</div>
                                    <div className="text-[0.7rem] text-foreground/60">{pct.toFixed(1)}% of income</div>
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
