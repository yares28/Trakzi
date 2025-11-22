"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveAreaBump } from "@nivo/bump"
import { useColorScheme } from "@/components/color-scheme-provider"
import {
    Card,
    CardDescription,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

// Sample data showing how spending categories rank over months
export function ChartCategoryFlowFridge({ data }: { data: { id: string; data: { x: string; y: number }[] }[] }) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const isDark = resolvedTheme === "dark"
    const textColor = "#000000"
    const borderColor = isDark ? "#374151" : "#e5e7eb"

    // Use custom palette for colored, custom dark palette for dark styling
    // For all palettes: darker colors = higher rank (lower rank number), lighter colors = lower rank (higher rank number)
    // Rank 1 (Housing) = darkest, Rank 7 (Healthcare) = lightest
    const palette = getPalette().filter(color => color !== "#c3c3c3")
    const numCategories = data.length

    // Reverse palette so darkest colors are first (for highest ranks)
    const reversedPalette = [...palette].reverse()
    let colorConfig = reversedPalette.slice(0, numCategories)

    // Cycle if needed
    while (colorConfig.length < numCategories) {
        colorConfig.push(...reversedPalette.slice(0, numCategories - colorConfig.length))
    }
    colorConfig = colorConfig.slice(0, numCategories)

    if (!mounted) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <CardTitle>Spending Category Rankings</CardTitle>
                    <CardDescription>
                        <span className="hidden @[540px]/card:block">
                            Track how your spending priorities shift over time
                        </span>
                        <span className="@[540px]/card:hidden">Category flow over 6 months</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <div className="h-[400px] w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <CardTitle>Spending Category Rankings</CardTitle>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Track how your spending priorities shift over time
                    </span>
                    <span className="@[540px]/card:hidden">Category flow over 6 months</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <div className="h-[400px] w-full">
                    <ResponsiveAreaBump
                        data={data}
                        margin={{ top: 40, right: 120, bottom: 40, left: 120 }}
                        spacing={8}
                        colors={colorConfig}
                        blendMode="normal"
                        startLabel="id"
                        endLabel="id"
                        startLabelTextColor={textColor}
                        endLabelTextColor={textColor}
                        axisTop={{
                            tickSize: 5,
                            tickPadding: 5,
                            tickRotation: 0,
                            legend: "",
                            legendPosition: "middle",
                            legendOffset: -36,
                        }}
                        axisBottom={{
                            tickSize: 5,
                            tickPadding: 5,
                            tickRotation: 0,
                            legend: "",
                            legendPosition: "middle",
                            legendOffset: 32,
                        }}
                        theme={{
                            text: {
                                fill: textColor,
                                fontSize: 11,
                            },
                            axis: {
                                domain: {
                                    line: {
                                        stroke: borderColor,
                                        strokeWidth: 1,
                                    },
                                },
                                ticks: {
                                    line: {
                                        stroke: borderColor,
                                        strokeWidth: 1,
                                    },
                                },
                            },
                            grid: {
                                line: {
                                    stroke: borderColor,
                                    strokeWidth: 0.5,
                                },
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
                    />
                </div>
            </CardContent>
        </Card>
    )
}
