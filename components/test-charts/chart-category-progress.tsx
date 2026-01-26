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

interface ChartCategoryProgressProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
    budgets?: Record<string, number>
}

export function ChartCategoryProgress({
    data,
    isLoading = false,
    budgets = {},
}: ChartCategoryProgressProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Default budgets if not provided
    const defaultBudgets: Record<string, number> = {
        'Food': 500,
        'Transportation': 300,
        'Entertainment': 200,
        'Shopping': 400,
        'Utilities': 200,
        'Other': 300,
    }
    const activeBudgets = Object.keys(budgets).length > 0 ? budgets : defaultBudgets

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

        const paletteLength = palette?.length || 0
        return Object.entries(activeBudgets).map(([category, budget], i) => {
            const spent = categoryTotals.get(category) || 0
            const progress = (spent / budget) * 100
            return {
                category,
                spent,
                budget,
                progress: Math.min(progress, 150), // Cap at 150% for display
                color: progress > 100 ? '#ef4444' : progress > 75 ? '#f59e0b' : (paletteLength > 0 ? (palette[i % paletteLength] || '#10b981') : '#10b981'),
            }
        }).filter(d => d.budget > 0)
    }, [data, activeBudgets, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Category Budget Progress"
    const chartDescription = "How much of each category budget have you used this month?"

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Green = under 75% of budget",
                    "Yellow = 75-100% of budget",
                    "Red = over budget",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:categoryProgress"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ categories: chartData }}
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
                        <ChartFavoriteButton chartId="testCharts:categoryProgress" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:categoryProgress" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Category budgets</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["progress"]}
                        indexBy="category"
                        layout="horizontal"
                        margin={{ top: 10, right: 60, bottom: 30, left: 100 }}
                        padding={0.3}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={6}
                        enableLabel={true}
                        label={(d) => `${Math.min(100, Math.round(d.value as number))}%`}
                        labelSkipWidth={30}
                        labelTextColor="#ffffff"
                        markers={[
                            {
                                axis: 'x',
                                value: 100,
                                lineStyle: { stroke: isDark ? '#6b7280' : '#9ca3af', strokeWidth: 2, strokeDasharray: '4 4' },
                            },
                        ]}
                        axisTop={null}
                        axisRight={null}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v) => `${v}%`,
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
                                <div className="font-medium text-foreground">{d.category}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                                    {formatCurrency(d.spent as number)} / {formatCurrency(d.budget as number)}
                                </div>
                                <div className="text-[0.7rem]" style={{ color: (d.progress as number) > 100 ? '#ef4444' : '#10b981' }}>
                                    {Math.round(d.progress as number)}% used
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
