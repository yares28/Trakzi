"use client"
import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveLine } from "@nivo/line"
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
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"

const CHART_TITLE = "Spending Volatility Index"
const CHART_DESCRIPTION = "How stable is your spending day-to-day? Lower volatility means more predictable expenses."

interface TestChartsTransaction {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

interface ChartSpendingVolatilityProps {
    data: TestChartsTransaction[]
    isLoading?: boolean
}

export const ChartSpendingVolatility = memo(function ChartSpendingVolatility({
    data,
    isLoading = false,
}: ChartSpendingVolatilityProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Group expenses by month, then by day
        const monthDayMap = new Map<string, Map<string, number>>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            const day = tx.date.slice(0, 10)
            if (!monthDayMap.has(month)) monthDayMap.set(month, new Map())
            const dayMap = monthDayMap.get(month)!
            dayMap.set(day, (dayMap.get(day) || 0) + Math.abs(tx.amount))
        })

        if (monthDayMap.size === 0) return []

        // Compute std dev per month
        const sortedMonths = Array.from(monthDayMap.keys()).sort()
        const monthStdDev = sortedMonths.map((month) => {
            const dailyAmounts = Array.from(monthDayMap.get(month)!.values())
            if (dailyAmounts.length < 2) return { month, stdDev: 0 }
            const mean = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length
            const variance = dailyAmounts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / dailyAmounts.length
            return { month, stdDev: Math.sqrt(variance) }
        })

        // 3-month rolling average
        const rollingAvg = monthStdDev.map((item, i) => {
            const window = monthStdDev.slice(Math.max(0, i - 2), i + 1)
            const avg = window.reduce((s, w) => s + w.stdDev, 0) / window.length
            return { x: item.month, y: Math.round(avg * 100) / 100 }
        })

        return [
            {
                id: "Volatility",
                color: palette[0] || "#fe8339",
                data: monthStdDev.map((d) => ({ x: d.month, y: Math.round(d.stdDev * 100) / 100 })),
            },
            {
                id: "3-Month Avg",
                color: palette[2] || "#6366f1",
                data: rollingAvg,
            },
        ]
    }, [data, palette])

    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Lower = more predictable spending",
                    "High volatility may indicate impulse purchases",
                    "Rolling average smooths seasonal effects",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:spendingVolatility"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ months: chartData[0]?.data?.length ?? 0 }}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.length === 0 || !chartData[0]?.data?.length) {
        return (
            <Card className="@container/card h-full flex flex-col" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:spendingVolatility" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading || !mounted} skeletonType="area" emptyTitle="No data" emptyDescription="No expense data available to compute volatility." />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const chart = (
        <ResponsiveLine
            data={chartData}
            margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: 0, max: "auto" }}
            curve="monotoneX"
            colors={chartData.map((s) => s.color)}
            lineWidth={2}
            pointSize={6}
            pointColor={{ theme: "background" }}
            pointBorderWidth={2}
            pointBorderColor={{ from: "serieColor" }}
            enableGridX={false}
            axisBottom={{
                tickSize: 0,
                tickPadding: 12,
                tickRotation: -45,
                format: (v: string) => {
                    const [, month] = v.split("-")
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                    return months[parseInt(month) - 1] ?? v
                },
            }}
            axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `$${v}`,
            }}
            legends={[
                {
                    anchor: "bottom-right",
                    direction: "column",
                    translateX: 100,
                    itemWidth: 90,
                    itemHeight: 20,
                    itemTextColor: textColor,
                    symbolSize: 12,
                    symbolShape: "circle",
                },
            ]}
            theme={{
                text: { fill: textColor, fontSize: 11 },
                axis: { ticks: { text: { fill: textColor } } },
                grid: { line: { stroke: gridColor } },
            }}
            useMesh={true}
            tooltip={({ point }) => (
                <NivoChartTooltip
                    title={String(point.seriesId)}
                    titleColor={point.color}
                    value={formatCurrency(point.data.y as number)}
                    subValue={String(point.data.xFormatted)}
                />
            )}
            animate={true}
            motionConfig="gentle"
        />
    )

    return (
        <>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                headerActions={renderInfoTrigger(true)}
            >
                <div className="h-full w-full min-h-[400px]" key={colorScheme}>
                    {chart}
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:spendingVolatility" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                        {chart}
                    </div>
                </CardContent>
            </Card>
        </>
    )
})
ChartSpendingVolatility.displayName = "ChartSpendingVolatility"
