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
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"
import { HoverableBar } from "@/components/chart-hoverable-bar"
const CHART_TITLE = "Transaction Count Trend"
const CHART_DESCRIPTION = "Track how many transactions you make each month. More transactions often means more spending."
interface ChartTransactionCountTrendProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}
export const ChartTransactionCountTrend = memo(function ChartTransactionCountTrend({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartTransactionCountTrendProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const palette = useMemo(
        () => getShuffledPalette("analytics:transactionCountTrend"),
        [getShuffledPalette],
    )
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const monthlyCounts = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            monthlyCounts.set(month, (monthlyCounts.get(month) || 0) + 1)
        })
        return Array.from(monthlyCounts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([month, count], i, arr) => {
                const prevCount = i > 0 ? arr[i - 1][1] : count
                const change = prevCount > 0 ? ((count - prevCount) / prevCount) * 100 : 0
                return {
                    month,
                    count,
                    change,
                    color: change > 10 ? palette[2] || "#ef4444" : change < -10 ? palette[3] || "#10b981" : palette[0] || "#fe8339",
                }
            })
    }, [data, palette])
    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const avgCount = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length : 0
    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Count of expense transactions per month",
                    "Red = increased from previous month",
                    "Green = decreased from previous month",
                ]}
            />
            <ChartAiInsightButton
                chartId="transactionCountTrend"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ avgCount, months: chartData.length }}
                size="sm"
            />
        </div>
    )
    if (!mounted || chartData.length === 0) {
        return (
            <Card className="@container/card h-full relative" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="transactionCountTrend" chartTitle={CHART_TITLE} size="md" />
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
                            emptyTitle={emptyTitle || "No transaction data yet"}
                            emptyDescription={emptyDescription || "Import your bank statements to see your transaction count trend."}
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
                        keys={["count"]}
                        indexBy="month"
                        margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                        padding={0.3}
                        colors={({ data: d }) => d.color as string}
                        borderRadius={6}
                        enableLabel={true}
                        label={(d) => {
                            const v = Number(d.value)
                            return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v > 0 ? String(Math.round(v)) : ''
                        }}
                        labelSkipWidth={50}
                        labelSkipHeight={16}
                        labelTextColor={{ from: 'color', modifiers: [['brighter', 3]] }}
                        barComponent={HoverableBar}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            tickRotation: -45,
                            format: (v: string) => {
                                const [year, month] = v.split("-")
                                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                return months[parseInt(month) - 1]
                            },
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
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
                                value={String(value)}
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
                        <ChartFavoriteButton chartId="transactionCountTrend" chartTitle={CHART_TITLE} size="md" />
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
                            keys={["count"]}
                            indexBy="month"
                            margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                            padding={0.3}
                            colors={({ data: d }) => d.color as string}
                            borderRadius={6}
                            enableLabel={true}
                            label={(d) => {
                                const v = Number(d.value)
                                return v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v > 0 ? String(Math.round(v)) : ''
                            }}
                            labelSkipWidth={50}
                            labelSkipHeight={16}
                            labelTextColor={{ from: 'color', modifiers: [['brighter', 3]] }}
                            barComponent={HoverableBar}
                            axisBottom={{
                                tickSize: 0,
                                tickPadding: 8,
                                tickRotation: -45,
                                format: (v: string) => {
                                    const [year, month] = v.split("-")
                                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                                    return months[parseInt(month) - 1]
                                },
                            }}
                            axisLeft={{
                                tickSize: 0,
                                tickPadding: 8,
                            }}
                            theme={{
                                text: { fill: textColor, fontSize: 11 },
                                axis: { ticks: { text: { fill: textColor } } },
                                grid: { line: { stroke: gridColor } },
                            }}
                            tooltip={({ indexValue, value, color }) => {
                                const [yr, mo] = String(indexValue).split("-")
                                const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
                                const label = mo ? `${MONTHS[parseInt(mo) - 1]}-${yr.slice(2)}` : String(indexValue)
                                return (
                                    <NivoChartTooltip
                                        title={label}
                                        titleColor={color}
                                        value={String(value)}
                                    />
                                )
                            }}
                            animate={true}
                            motionConfig="gentle"
                        />
                    </div>
                </CardContent>
            </Card>
        </>
    )
})
ChartTransactionCountTrend.displayName = "ChartTransactionCountTrend"
