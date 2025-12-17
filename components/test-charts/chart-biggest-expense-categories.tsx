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

interface ChartBiggestExpenseCategoriesProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartBiggestExpenseCategories({
    data,
    isLoading = false,
}: ChartBiggestExpenseCategoriesProps) {
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
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const categoryTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const txDate = new Date(tx.date)
            if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) return

            const category = tx.category?.trim() || 'Other'
            categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(tx.amount))
        })

        return Array.from(categoryTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, total], i) => ({
                category: category.length > 15 ? category.substring(0, 15) + '...' : category,
                fullCategory: category,
                total,
                color: palette[i % palette.length] || "#fe8339",
            }))
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Biggest Expense Categories"
    const chartDescription = "Your top 5 spending categories this month."

    const total = chartData.reduce((sum, d) => sum + d.total, 0)

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Top 5 categories this month",
                    "Sorted by total amount",
                    "Helps identify spending focus",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:biggestExpenseCategories"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ categories: chartData, total }}
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
                        <ChartFavoriteButton chartId="testCharts:biggestExpenseCategories" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:biggestExpenseCategories" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Top 5 categories</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="category"
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
                        tooltip={({ data: d }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{d.fullCategory}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(d.total as number)}</div>
                                <div className="text-[0.7rem] text-foreground/60">
                                    {((d.total as number) / total * 100).toFixed(1)}% of total
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
