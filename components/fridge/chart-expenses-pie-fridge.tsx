"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { IconGripVertical } from "@tabler/icons-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { getContrastTextColor, getChartTextColor } from "@/lib/chart-colors"
import { useCurrency } from "@/components/currency-provider"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface ChartExpensesPieFridgeProps {
    data: { id: string; label: string; value: number }[]
    categorySpendingData?: Array<{ category: string; total: number }>
}

export const ChartExpensesPieFridge = memo(function ChartExpensesPieFridge({ data, categorySpendingData }: ChartExpensesPieFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Use bundle data if available
    const pieData = useMemo(() => {
        if (categorySpendingData && categorySpendingData.length > 0) {
            return categorySpendingData.map(d => ({
                id: d.category,
                label: d.category,
                value: d.total
            }))
        }
        return data
    }, [data, categorySpendingData])

    // Dynamically assign colors based on number of parts (max 7)
    // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
    const dataWithColors = useMemo(() => {
        const numParts = Math.min(pieData.length, 7)
        const palette = getShuffledPalette()

        // Sort by value descending (highest first) and assign colors
        // Darker colors go to higher values, lighter colors to lower values
        const sorted = [...pieData].sort((a, b) => b.value - a.value)
        // Reverse palette so darkest colors are first (for highest values)
        const reversedPalette = [...palette].reverse().slice(0, numParts)
        return sorted.map((item, index) => ({
            ...item,
            color: reversedPalette[index % reversedPalette.length]
        }))
    }, [colorScheme, getShuffledPalette, pieData])

    const chartData = dataWithColors

    const colorConfig = colorScheme === "colored"
        ? { datum: "data.color" as const }
        : { datum: "data.color" as const } // Use assigned colors from darkDataWithColors

    const isDark = resolvedTheme === "dark"

    const textColor = getChartTextColor(isDark)
    const arcLinkLabelColor = getChartTextColor(isDark)

    if (!mounted) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <span className="gridstack-drag-handle -m-1 inline-flex cursor-grab touch-none select-none items-center justify-center rounded p-1 active:cursor-grabbing">
                            <IconGripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </span>
                        <CardTitle>Basket Breakdown</CardTitle>
                    </div>
                    <CardDescription>Your grocery spend by category</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <span className="gridstack-drag-handle -m-1 inline-flex cursor-grab touch-none select-none items-center justify-center rounded p-1 active:cursor-grabbing">
                        <IconGripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <CardTitle>Basket Breakdown</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Distribution of your grocery spending across categories
                    </span>
                    <span className="@[540px]/card:hidden">Category distribution</span>
                </CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-col items-center gap-2">
                        <ChartInfoPopover
                            title="Basket Breakdown"
                            description="Shows how your grocery budget splits across categories."
                            details={[
                                "Each slice is a category total (based on receipt line items).",
                                "Use this to spot a rising spend area (e.g., snacks, beverages, household).",
                            ]}
                            ignoredFootnote="Totals are based on receipt line items inside the selected time filter."
                        />
                        <ChartAiInsightButton
                            chartId="fridge:basket-breakdown"
                            chartTitle="Basket Breakdown"
                            chartDescription="Grocery spend distribution across categories."
                            chartData={{
                                categories: chartData.map((d) => ({ category: d.label, value: d.value })),
                                total: chartData.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
                            }}
                            size="sm"
                        />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <div className="h-[250px] w-full" key={colorScheme}>
                    <ResponsivePie
                        data={chartData}
                        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                        innerRadius={0.5}
                        padAngle={0.7}
                        cornerRadius={3}
                        activeOuterRadiusOffset={8}
                        borderWidth={0}
                        arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor={arcLinkLabelColor}
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: "color" }}
                        arcLabelsSkipAngle={20}
                        arcLabelsTextColor={(d: { color: string }) => getContrastTextColor(d.color)}
                        valueFormat={(value) => formatCurrency(value)}
                        colors={colorConfig}
                        tooltip={({ datum }) => (
                            <NivoChartTooltip
                                title={datum.label as string}
                                titleColor={datum.color as string}
                                value={formatCurrency(Number(datum.value))}
                            />
                        )}
                        theme={{
                            text: {
                                fill: textColor,
                                fontSize: 12,
                            },
                        }}
                        legends={[
                            {
                                anchor: "bottom",
                                direction: "row",
                                justify: false,
                                translateX: 0,
                                translateY: 56,
                                itemsSpacing: 0,
                                itemWidth: 100,
                                itemHeight: 18,
                                itemTextColor: textColor,
                                itemDirection: "left-to-right",
                                itemOpacity: 1,
                                symbolSize: 18,
                                symbolShape: "circle",
                            },
                        ]}
                    />
                </div>
            </CardContent>
        </Card>
    )
})

ChartExpensesPieFridge.displayName = "ChartExpensesPieFridge"
