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
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"
interface ChartNetWorthTrendProps {
    data: Array<{
        date: string
        amount: number
        balance?: number | null
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}
export const ChartNetWorthTrend = memo(function ChartNetWorthTrend({
    data,
    isLoading = false,
}: ChartNetWorthTrendProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getShuffledPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        // Get monthly end-of-month balances or calculate running total
        const monthlyBalances = new Map<string, number>()
        // Sort by date
        const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date))
        // Use balance if available, otherwise calculate running total
        let runningTotal = 0
        sortedData.forEach((tx) => {
            const month = tx.date.slice(0, 7)
            runningTotal += tx.amount
            const balanceToUse = tx.balance !== null && tx.balance !== undefined ? tx.balance : runningTotal
            monthlyBalances.set(month, balanceToUse)
        })
        const sortedMonths = Array.from(monthlyBalances.keys()).sort().slice(-12)
        return [{
            id: "Net Worth",
            data: sortedMonths.map(month => ({
                x: month,
                y: monthlyBalances.get(month) || 0,
            })),
        }]
    }, [data])
    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const chartTitle = "Net Worth Trend"
    const chartDescription = "Track your net worth over time based on account balance."
    const latestValue = chartData[0]?.data?.[chartData[0].data.length - 1]?.y ?? 0
    const firstValue = chartData[0]?.data?.[0]?.y ?? 0
    const change = latestValue - firstValue
    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Based on account balance",
                    "Shows last 12 months",
                    "Upward trend = growing wealth",
                ]}
            />
            <ChartAiInsightButton
                chartId="netWorthTrend"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ latestValue, change }}
                size="sm"
            />
        </div>
    )
    const renderChart = (minHeight = "250px") => (
        <div className="h-full w-full" style={{ minHeight }} key={colorScheme}>
            <ResponsiveLine
                data={chartData}
                margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                curve="monotoneX"
                colors={[palette[1] || "#10b981"]}
                lineWidth={3}
                pointSize={8}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                enableGridX={false}
                enableArea={true}
                areaOpacity={0.15}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 12,
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
                    format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                }}
                theme={{
                    text: { fill: textColor, fontSize: 11 },
                    axis: { ticks: { text: { fill: textColor } } },
                    grid: { line: { stroke: gridColor } },
                }}
                useMesh={true}
                tooltip={({ point }) => (
                    <NivoChartTooltip
                        title={String(point.data.x)}
                        value={formatCurrency(point.data.y as number)}
                    />
                )}
                animate={true}
                motionConfig="gentle"
            />
        </div>
    )
    if (!mounted || chartData.length === 0 || !chartData[0]?.data?.length) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="netWorthTrend" chartTitle={chartTitle} size="md" />
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
        <>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title={chartTitle}
                description={chartDescription}
                headerActions={renderInfoTrigger()}
            >
                <div className="h-full w-full min-h-[400px]" key={colorScheme}>
                    {renderChart("400px")}
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="netWorthTrend" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction className="flex items-center gap-2">
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    {renderChart("250px")}
                </CardContent>
            </Card>
        </>
    )
})
ChartNetWorthTrend.displayName = "ChartNetWorthTrend"
