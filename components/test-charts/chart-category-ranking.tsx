"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBump } from "@nivo/bump"
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
import { ChartLoadingState } from "@/components/chart-loading-state"

interface ChartCategoryRankingProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartCategoryRanking({
    data,
    isLoading = false,
}: ChartCategoryRankingProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Group by month and category
        const monthlyCategories = new Map<string, Map<string, number>>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            const category = tx.category?.trim() || "Other"

            if (!monthlyCategories.has(month)) {
                monthlyCategories.set(month, new Map())
            }
            const catMap = monthlyCategories.get(month)!
            catMap.set(category, (catMap.get(category) || 0) + Math.abs(tx.amount))
        })

        const sortedMonths = Array.from(monthlyCategories.keys()).sort().slice(-6)
        if (sortedMonths.length < 2) return []

        // Find top 5 categories overall
        const totalByCategory = new Map<string, number>()
        monthlyCategories.forEach((cats) => {
            cats.forEach((amount, cat) => {
                totalByCategory.set(cat, (totalByCategory.get(cat) || 0) + amount)
            })
        })

        const topCategories = Array.from(totalByCategory.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cat]) => cat)

        // Build bump chart data
        return topCategories.map((cat, i) => ({
            id: cat,
            data: sortedMonths.map(month => {
                const cats = monthlyCategories.get(month)!
                const sorted = Array.from(cats.entries()).sort((a, b) => b[1] - a[1])
                const rank = sorted.findIndex(([c]) => c === cat) + 1
                return { x: month, y: rank > 0 ? rank : sorted.length + 1 }
            }),
        }))
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"

    const chartTitle = "Category Ranking"
    const chartDescription = "Watch how your spending categories rank against each other over time."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Shows top 5 categories",
                    "Rank 1 = highest spending",
                    "Track shifts in priorities",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:categoryRanking"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ categories: chartData.map(d => d.id) }}
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
                        <ChartFavoriteButton chartId="testCharts:categoryRanking" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:categoryRanking" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Category rankings over time</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBump
                        data={chartData}
                        colors={palette.slice(0, 5)}
                        lineWidth={3}
                        activeLineWidth={5}
                        inactiveLineWidth={2}
                        inactiveOpacity={0.3}
                        pointSize={10}
                        activePointSize={14}
                        inactivePointSize={0}
                        pointColor={{ theme: "background" }}
                        pointBorderWidth={3}
                        activePointBorderWidth={3}
                        pointBorderColor={{ from: "serie.color" }}
                        axisTop={null}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 12,
                            format: (v: string) => {
                                const [_, month] = v.split("-")
                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                return months[parseInt(month) - 1]
                            },
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                        }}
                        margin={{ top: 20, right: 100, bottom: 40, left: 40 }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                        }}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
