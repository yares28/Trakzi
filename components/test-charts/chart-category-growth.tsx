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

interface ChartCategoryGrowthProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartCategoryGrowth({
    data,
    isLoading = false,
}: ChartCategoryGrowthProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Get current month and previous 3 months data
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const prevDate = new Date(now)
        prevDate.setMonth(prevDate.getMonth() - 1)
        const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

        const categoryCurrentMonth = new Map<string, number>()
        const categoryPrevMonth = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const category = tx.category?.trim() || "Other"
            const txMonth = tx.date.slice(0, 7)
            const amount = Math.abs(tx.amount)

            if (txMonth === currentMonth) {
                categoryCurrentMonth.set(category, (categoryCurrentMonth.get(category) || 0) + amount)
            } else if (txMonth === prevMonth) {
                categoryPrevMonth.set(category, (categoryPrevMonth.get(category) || 0) + amount)
            }
        })

        // Calculate growth for each category
        const categories = new Set([...categoryCurrentMonth.keys(), ...categoryPrevMonth.keys()])
        const growthData: Array<{ category: string; growth: number; current: number; previous: number; color: string }> = []

        categories.forEach((cat) => {
            const current = categoryCurrentMonth.get(cat) || 0
            const previous = categoryPrevMonth.get(cat) || 0
            const growth = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0)

            growthData.push({ category: cat, growth, current, previous, color: growth > 0 ? "#ef4444" : "#10b981" })
        })

        // Sort by absolute growth and take top 8
        return growthData
            .filter(d => d.growth !== 0)
            .sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth))
            .slice(0, 8)
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Category Growth"
    const chartDescription = "See which spending categories are growing or shrinking compared to last month."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Compares current vs previous month",
                    "Red = spending increased",
                    "Green = spending decreased",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:categoryGrowth"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ categories: chartData.slice(0, 5) }}
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
                        <ChartFavoriteButton chartId="testCharts:categoryGrowth" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:categoryGrowth" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Month-over-month by category</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["growth"]}
                        indexBy="category"
                        layout="horizontal"
                        margin={{ top: 10, right: 40, bottom: 30, left: 100 }}
                        padding={0.3}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={4}
                        enableLabel={true}
                        label={(d) => `${d.value && d.value > 0 ? '+' : ''}${(d.value as number).toFixed(0)}%`}
                        labelSkipWidth={30}
                        labelTextColor="#ffffff"
                        axisTop={null}
                        axisRight={null}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => `${v > 0 ? '+' : ''}${v}%`,
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                        }}
                        markers={[{ axis: 'x', value: 0, lineStyle: { stroke: gridColor, strokeWidth: 2 } }]}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        tooltip={({ data: d }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{d.category}</div>
                                <div className="mt-1 text-[0.7rem] text-foreground/80">
                                    Growth: <span style={{ color: d.color as string }}>{(d.growth as number) > 0 ? '+' : ''}{(d.growth as number).toFixed(1)}%</span>
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
