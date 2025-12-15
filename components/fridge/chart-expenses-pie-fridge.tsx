"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { IconGripVertical } from "@tabler/icons-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

// Dark colors that require white text
const darkColors = ["#696969", "#464646", "#2F2F2F", "#252525"]

// Gold palette colors that require white text (black and brown)
const goldDarkColors = ["#000000", "#361c1b", "#754232", "#cd894a"]

// Helper function to determine text color based on slice color
const getTextColor = (sliceColor: string, colorScheme?: string): string => {
    if (colorScheme === "gold") {
        return goldDarkColors.includes(sliceColor) ? "#ffffff" : "#000000"
    }
    return darkColors.includes(sliceColor) ? "#ffffff" : "#000000"
}

export function ChartExpensesPieFridge({ data }: { data: { id: string; label: string; value: number }[] }) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Dynamically assign colors based on number of parts (max 7)
    // For all palettes: darker colors = larger amounts, lighter colors = smaller amounts
    const dataWithColors = useMemo(() => {
        const numParts = Math.min(data.length, 7)
        const palette = getPalette().filter(color => color !== "#c3c3c3")

        // Sort by value descending (highest first) and assign colors
        // Darker colors go to higher values, lighter colors to lower values
        const sorted = [...data].sort((a, b) => b.value - a.value)
        // Reverse palette so darkest colors are first (for highest values)
        const reversedPalette = [...palette].reverse().slice(0, numParts)
        return sorted.map((item, index) => ({
            ...item,
            color: reversedPalette[index % reversedPalette.length]
        }))
    }, [colorScheme, getPalette, data])

    const chartData = dataWithColors

    const colorConfig = colorScheme === "colored"
        ? { datum: "data.color" as const }
        : { datum: "data.color" as const } // Use assigned colors from darkDataWithColors

    const isDark = resolvedTheme === "dark"

    const textColor = isDark ? "#9ca3af" : "#4b5563"
    const arcLinkLabelColor = isDark ? "#d1d5db" : "#374151"

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
                        arcLabelsTextColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
                        valueFormat={(value) => `$${value}`}
                        colors={colorConfig}
                        theme={{
                            text: {
                                fill: textColor,
                                fontSize: 12,
                            },
                            tooltip: {
                                container: {
                                    background: "#ffffff",
                                    color: "#000000",
                                    fontSize: 12,
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                    padding: "8px 12px",
                                    border: "1px solid #e2e8f0",
                                },
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
}
