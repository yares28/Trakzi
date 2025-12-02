"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
    Card,
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
                    <CardTitle>Expense Breakdown</CardTitle>
                    <CardDescription>Your spending by category</CardDescription>
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
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Distribution of your monthly expenses across categories
                    </span>
                    <span className="@[540px]/card:hidden">Monthly expense distribution</span>
                </CardDescription>
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
