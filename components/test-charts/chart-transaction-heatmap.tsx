"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveHeatMap } from "@nivo/heatmap"
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

interface ChartTransactionHeatmapProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartTransactionHeatmap({
    data,
    isLoading = false,
}: ChartTransactionHeatmapProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Create a 7x4 grid: days of week x time of day (morning, afternoon, evening, night)
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const timeSlots = ["Morning", "Afternoon", "Evening", "Night"]

        const counts: Record<string, Record<string, number>> = {}
        dayNames.forEach((day) => {
            counts[day] = {}
            timeSlots.forEach((slot) => {
                counts[day][slot] = 0
            })
        })

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const date = new Date(tx.date)
            const dayOfWeek = dayNames[date.getDay()]
            const hour = date.getHours()

            let timeSlot: string
            if (hour >= 6 && hour < 12) timeSlot = "Morning"
            else if (hour >= 12 && hour < 17) timeSlot = "Afternoon"
            else if (hour >= 17 && hour < 21) timeSlot = "Evening"
            else timeSlot = "Night"

            counts[dayOfWeek][timeSlot]++
        })

        // Convert to heatmap format
        return timeSlots.map((slot) => ({
            id: slot,
            data: dayNames.map((day) => ({
                x: day,
                y: counts[day][slot],
            })),
        }))
    }, [data])

    const theme = resolvedTheme === "dark" ? "dark" : "light"
    const textColor = theme === "dark" ? "#ffffff" : "#1f2937"

    const chartTitle = "Transaction Frequency Heatmap"
    const chartDescription =
        "Discover when you make the most transactions. This heatmap shows transaction frequency by day of week and time of day."

    const chartDataForAI = useMemo(() => {
        if (chartData.length === 0) return {}
        let maxCount = 0
        let peakTime = ""
        let peakDay = ""

        chartData.forEach((row) => {
            row.data.forEach((cell) => {
                if (cell.y > maxCount) {
                    maxCount = cell.y
                    peakTime = row.id
                    peakDay = cell.x
                }
            })
        })

        return { peakTime, peakDay, peakCount: maxCount }
    }, [chartData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:transactionHeatmap"
                            chartTitle={chartTitle}
                            size="md"
                        />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" />
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
                        chartId="testCharts:transactionHeatmap"
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
                                "Morning: 6 AM - 12 PM",
                                "Afternoon: 12 PM - 5 PM",
                                "Evening: 5 PM - 9 PM",
                                "Night: 9 PM - 6 AM",
                                "Darker = more transactions",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:transactionHeatmap"
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
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center">
                        <ChartLoadingState />
                    </div>
                ) : (
                    <div className="h-full w-full min-h-[250px]">
                        <ResponsiveHeatMap
                            data={chartData}
                            margin={{ top: 30, right: 30, bottom: 30, left: 80 }}
                            valueFormat=">-.0f"
                            xOuterPadding={0.1}
                            yOuterPadding={0.1}
                            axisTop={{
                                tickSize: 0,
                                tickPadding: 8,
                                tickRotation: 0,
                            }}
                            axisLeft={{
                                tickSize: 0,
                                tickPadding: 8,
                                tickRotation: 0,
                            }}
                            colors={{
                                type: "sequential",
                                scheme: "oranges",
                            }}
                            emptyColor={theme === "dark" ? "#374151" : "#f3f4f6"}
                            borderRadius={4}
                            borderWidth={2}
                            borderColor={theme === "dark" ? "#1f2937" : "#ffffff"}
                            enableLabels={true}
                            labelTextColor={{
                                from: "color",
                                modifiers: [["darker", 3]],
                            }}
                            animate={true}
                            motionConfig="gentle"
                            hoverTarget="cell"
                            theme={{
                                text: { fill: textColor, fontSize: 12 },
                                labels: { text: { fontSize: 11, fontWeight: 600 } },
                            }}
                            tooltip={({ cell }: { cell: { serieId: string; data: { x: string; y: number } } }) => (
                                <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                                    <div className="font-semibold text-foreground mb-1">
                                        {cell.serieId} - {cell.data.x}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Transactions: <span className="font-medium text-foreground">{cell.data.y}</span>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
