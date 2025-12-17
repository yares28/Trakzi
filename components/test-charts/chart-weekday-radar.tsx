"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveRadar } from "@nivo/radar"
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

interface ChartWeekdayRadarProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartWeekdayRadar({
    data,
    isLoading = false,
}: ChartWeekdayRadarProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const dayIndex = new Date(tx.date).getDay()
            weekdayTotals[dayIndex] += Math.abs(tx.amount)
            weekdayCounts[dayIndex]++
        })

        return days.map((day, i) => ({
            day,
            spending: weekdayTotals[i],
            transactions: weekdayCounts[i],
        }))
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"

    const chartTitle = "Weekday Spending Radar"
    const chartDescription = "See your spending patterns across different days of the week in a radar view."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Radar shows spending by day",
                    "Fuller shape = more consistent",
                    "Spikes = heavy spending days",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:weekdayRadar"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ weekdays: chartData }}
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
                        <ChartFavoriteButton chartId="testCharts:weekdayRadar" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:weekdayRadar" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Weekday patterns</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveRadar
                        data={chartData}
                        keys={["spending"]}
                        indexBy="day"
                        maxValue="auto"
                        margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
                        curve="linearClosed"
                        borderWidth={2}
                        borderColor={palette[0] || "#fe8339"}
                        gridLevels={5}
                        gridShape="circular"
                        gridLabelOffset={16}
                        enableDots={true}
                        dotSize={8}
                        dotColor={{ theme: "background" }}
                        dotBorderWidth={2}
                        dotBorderColor={palette[0] || "#fe8339"}
                        colors={[palette[0] || "#fe8339"]}
                        fillOpacity={0.25}
                        blendMode="normal"
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            grid: { line: { stroke: isDark ? "#374151" : "#e5e7eb" } },
                        }}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
