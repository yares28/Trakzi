"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveRadar } from "@nivo/radar"
import {
    Card,
    CardContent,
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

interface ChartCategoryDiversityProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartCategoryDiversity({
    data,
    isLoading = false,
}: ChartCategoryDiversityProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Calculate spending by category
        const categoryTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const category = tx.category?.trim() || "Other"
            const current = categoryTotals.get(category) || 0
            categoryTotals.set(category, current + Math.abs(tx.amount))
        })

        if (categoryTotals.size === 0) return []

        // Get top 6 categories for radar display
        const sorted = Array.from(categoryTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)

        const maxValue = Math.max(...sorted.map(([, v]) => v))

        // Normalize values to 0-100 for radar display
        return sorted.map(([category, value]) => ({
            category,
            spending: (value / maxValue) * 100,
            rawValue: value,
        }))
    }, [data])

    const theme = resolvedTheme === "dark" ? "dark" : "light"
    const textColor = theme === "dark" ? "#ffffff" : "#1f2937"
    const gridColor = theme === "dark" ? "#374151" : "#e5e7eb"

    const chartTitle = "Category Diversity"
    const chartDescription =
        "A radar chart showing how your spending is distributed across top categories. A more balanced shape indicates diversified spending, while spikes show dominant categories."

    const chartDataForAI = useMemo(() => {
        if (chartData.length === 0) return {}
        const topCategory = chartData[0]
        return {
            topCategory: topCategory?.category ?? "None",
            topCategoryPercent: topCategory?.spending ?? 0,
            categoriesCount: chartData.length,
        }
    }, [chartData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:categoryDiversity"
                            chartTitle={chartTitle}
                            size="md"
                        />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[300px]" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="testCharts:categoryDiversity"
                        chartTitle={chartTitle}
                        size="md"
                    />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-col items-center gap-2">
                        <ChartInfoPopover
                            title={chartTitle}
                            description={chartDescription}
                            details={[
                                "Shows top 6 spending categories",
                                "Values normalized for comparison",
                                "Balanced = diversified spending",
                                "Spikes = category dominance",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:categoryDiversity"
                            chartTitle={chartTitle}
                            chartDescription={chartDescription}
                            chartData={chartDataForAI}
                            size="sm"
                        />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                {isLoading || chartData.length === 0 ? (
                    <div className="h-full w-full min-h-[300px] flex items-center justify-center">
                        <ChartLoadingState />
                    </div>
                ) : (
                    <div className="h-full w-full min-h-[300px]">
                        <ResponsiveRadar
                            data={chartData}
                            keys={["spending"]}
                            indexBy="category"
                            maxValue={100}
                            margin={{ top: 50, right: 80, bottom: 50, left: 80 }}
                            curve="linearClosed"
                            borderWidth={2}
                            borderColor={palette[0] || "#fe8339"}
                            gridLevels={5}
                            gridShape="circular"
                            gridLabelOffset={20}
                            enableDots={true}
                            dotSize={8}
                            dotColor={{ theme: "background" }}
                            dotBorderWidth={2}
                            dotBorderColor={palette[0] || "#fe8339"}
                            colors={[palette[0] || "#fe8339"]}
                            fillOpacity={0.25}
                            blendMode="multiply"
                            animate={true}
                            motionConfig="gentle"
                            isInteractive={true}
                            theme={{
                                text: { fill: textColor, fontSize: 11 },
                                axis: {
                                    ticks: { text: { fill: textColor } },
                                },
                                grid: { line: { stroke: gridColor, strokeWidth: 1 } },
                                tooltip: {
                                    container: {
                                        background: theme === "dark" ? "#1f2937" : "#ffffff",
                                        color: textColor,
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                        padding: "12px",
                                    },
                                },
                            }}
                            sliceTooltip={({ index, data }) => {
                                const item = data.find((d) => d.id === "spending")
                                const rawItem = chartData.find((d) => d.category === index)
                                return (
                                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                        <div className="font-semibold text-foreground mb-1">{index}</div>
                                        <div className="text-sm text-muted-foreground">
                                            Share: <span className="font-medium text-foreground">{Math.round(item?.value ?? 0)}%</span>
                                        </div>
                                    </div>
                                )
                            }}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
