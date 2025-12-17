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

interface ChartSmallVsLargePurchasesProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartSmallVsLargePurchases({
    data,
    isLoading = false,
}: ChartSmallVsLargePurchasesProps) {
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

        const monthlyData = new Map<string, { small: number; medium: number; large: number }>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            const amount = Math.abs(tx.amount)
            const existing = monthlyData.get(month) || { small: 0, medium: 0, large: 0 }

            if (amount < 25) existing.small += amount
            else if (amount < 100) existing.medium += amount
            else existing.large += amount

            monthlyData.set(month, existing)
        })

        return Array.from(monthlyData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6)
            .map(([month, data]) => ({
                month,
                small: data.small,
                medium: data.medium,
                large: data.large,
            }))
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Purchase Size Breakdown"
    const chartDescription = "See how your spending is distributed between small, medium, and large purchases each month."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Small: under $25",
                    "Medium: $25 - $100",
                    "Large: over $100",
                    "Stacked by month",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:smallVsLargePurchases"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ months: chartData }}
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
                        <ChartFavoriteButton chartId="testCharts:smallVsLargePurchases" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:smallVsLargePurchases" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Small vs large purchases</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["small", "medium", "large"]}
                        indexBy="month"
                        margin={{ top: 20, right: 100, bottom: 50, left: 60 }}
                        padding={0.3}
                        colors={[palette[2] || "#3b82f6", palette[1] || "#10b981", palette[0] || "#fe8339"]}
                        borderRadius={4}
                        enableLabel={false}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: string) => {
                                const [year, month] = v.split("-")
                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                return months[parseInt(month) - 1]
                            },
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                        }}
                        legends={[
                            {
                                dataFrom: "keys",
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
                        tooltip={({ id, value, indexValue }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground capitalize">{id} purchases</div>
                                <div className="text-[0.7rem] text-foreground/60">{indexValue}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(value as number)}</div>
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
