"use client"
import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
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
import { HoverableBar } from "@/components/chart-hoverable-bar"
const CHART_TITLE = "Hourly Spending Pattern"
const CHART_DESCRIPTION = "Discover what time of day you spend the most money."
interface ChartHourlySpendingProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}
export const ChartHourlySpending = memo(function ChartHourlySpending({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartHourlySpendingProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const hasTimeData = useMemo(() => {
        if (!data || data.length === 0) return false
        return data.some((tx) => tx.date.includes('T') || tx.date.includes(' '))
    }, [data])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        if (!hasTimeData) return []
        const hourlyTotals: number[] = new Array(24).fill(0)
        const hourlyCounts: number[] = new Array(24).fill(0)
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = new Date(tx.date)
            const hour = date.getHours()
            hourlyTotals[hour] += Math.abs(tx.amount)
            hourlyCounts[hour]++
        })
        return hourlyTotals.map((total, hour) => ({
            hour: hour.toString().padStart(2, '0') + ':00',
            hourNum: hour,
            total,
            count: hourlyCounts[hour],
            color: hour >= 9 && hour <= 17 ? palette[0] : hour >= 18 && hour <= 22 ? palette[1] : palette[2],
        }))
    }, [data, palette, hasTimeData])
    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const peakHour = chartData.reduce((max, curr) => curr.total > max.total ? curr : max, chartData[0] || { hour: '00:00', total: 0 })
    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Morning: 6AM - 12PM",
                    "Afternoon: 12PM - 6PM",
                    "Evening: 6PM - 10PM",
                    "Night: 10PM - 6AM",
                ]}
            />
            <ChartAiInsightButton
                chartId="hourlySpending"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ peakHour: peakHour?.hour, peakAmount: peakHour?.total }}
                size="sm"
            />
        </div>
    )
    const noTimeData = !isLoading && mounted && data && data.length > 0 && !hasTimeData
    const resolvedEmptyTitle = emptyTitle || "No hourly data available"
    const resolvedEmptyDescription = noTimeData
        ? "Time-of-day data requires bank statements with timestamps. Most CSV imports only include dates."
        : (emptyDescription || "Time-of-day data requires bank statements with timestamps. Most CSV imports only include dates.")

    if (!mounted || chartData.length === 0 || chartData.every(d => d.total === 0)) {
        return (
            <Card className="@container/card h-full relative" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="hourlySpending" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState
                            isLoading={isLoading || !mounted}
                            skeletonType="bar"
                            emptyTitle={resolvedEmptyTitle}
                            emptyDescription={resolvedEmptyDescription}
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }
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
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="hour"
                        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                        padding={0.2}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={4}
                        enableLabel={false}
                        barComponent={HoverableBar}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            tickRotation: -45,
                            tickValues: chartData.filter((_, i) => i % 3 === 0).map(d => d.hour),
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        tooltip={({ indexValue, value, color }) => (
                            <NivoChartTooltip
                                title={String(indexValue)}
                                titleColor={color}
                                value={formatCurrency(value as number)}
                            />
                        )}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full relative">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="hourlySpending" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                        <ResponsiveBar
                            data={chartData}
                            keys={["total"]}
                            indexBy="hour"
                            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                            padding={0.2}
                            colors={({ data: d }) => d.color as string}
                            borderRadius={4}
                            enableLabel={false}
                            barComponent={HoverableBar}
                            axisBottom={{
                                tickSize: 0,
                                tickPadding: 8,
                                tickRotation: -45,
                                tickValues: chartData.filter((_, i) => i % 3 === 0).map(d => d.hour),
                            }}
                            axisLeft={{
                                tickSize: 0,
                                tickPadding: 8,
                                format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                            }}
                            theme={{
                                text: { fill: textColor, fontSize: 11 },
                                axis: { ticks: { text: { fill: textColor } } },
                                grid: { line: { stroke: gridColor } },
                            }}
                            tooltip={({ indexValue, value, color }) => (
                                <NivoChartTooltip
                                    title={String(indexValue)}
                                    titleColor={color}
                                    value={formatCurrency(value as number)}
                                />
                            )}
                            animate={true}
                            motionConfig="gentle"
                        />
                    </div>
                </CardContent>
            </Card>
        </>
    )
})
ChartHourlySpending.displayName = "ChartHourlySpending"
