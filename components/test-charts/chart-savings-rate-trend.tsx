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
import { ChartLoadingState } from "@/components/chart-loading-state"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"
interface ChartSavingsRateTrendProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}
export const ChartSavingsRateTrend = memo(function ChartSavingsRateTrend({
    data,
    isLoading = false,
}: ChartSavingsRateTrendProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const palette = getShuffledPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const monthlyData = new Map<string, { income: number; expenses: number }>()
        data.forEach((tx) => {
            const month = tx.date.slice(0, 7)
            const existing = monthlyData.get(month) || { income: 0, expenses: 0 }
            if (tx.amount > 0) {
                existing.income += tx.amount
            } else {
                existing.expenses += Math.abs(tx.amount)
            }
            monthlyData.set(month, existing)
        })
        const sortedMonths = Array.from(monthlyData.keys()).sort()
        return [{
            id: "Savings Rate",
            data: sortedMonths.map(month => {
                const { income, expenses } = monthlyData.get(month)!
                const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
                return { x: month, y: Math.max(-50, Math.min(100, savingsRate)), income, expenses }
            }),
        }]
    }, [data])
    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const chartTitle = "Savings Rate Trend"
    const chartDescription = "Track your monthly savings rate over time. Higher is better - aim for at least 20%."
    const latestRate = chartData[0]?.data?.[chartData[0].data.length - 1]?.y ?? 0
    const avgRate = chartData[0]?.data ? chartData[0].data.reduce((sum, d) => sum + d.y, 0) / chartData[0].data.length : 0
    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Savings Rate = (Income - Expenses) / Income × 100",
                    "20%+ is a healthy target",
                    "50%+ is excellent (FIRE territory)",
                    "Negative = spending more than earning",
                ]}
            />
            <ChartAiInsightButton
                chartId="savingsRateTrend"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ latestRate, avgRate, months: chartData[0]?.data?.length ?? 0 }}
                size="sm"
            />
        </div>
    )
    const renderChart = (minHeight = "250px") => (
        <div className="h-full w-full" style={{ minHeight }} key={colorScheme}>
            <ResponsiveLine
                data={chartData}
                margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: -50, max: 100 }}
                curve="monotoneX"
                colors={[palette[1] || "#10b981"]}
                lineWidth={3}
                pointSize={8}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                enableGridX={false}
                enableArea={true}
                areaBaselineValue={0}
                areaOpacity={0.15}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 12,
                    tickRotation: -45,
                    format: (v: string) => {
                        const [year, month] = v.split("-")
                        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                        return `${months[parseInt(month) - 1]} ${year.slice(2)}`
                    },
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (v: number) => `${v}%`,
                }}
                markers={[
                    { axis: 'y', value: 0, lineStyle: { stroke: gridColor, strokeWidth: 2, strokeDasharray: '4 4' } },
                    { axis: 'y', value: 20, lineStyle: { stroke: palette[1] || "#10b981", strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 } },
                ]}
                theme={{
                    text: { fill: textColor, fontSize: 11 },
                    axis: { ticks: { text: { fill: textColor } } },
                    grid: { line: { stroke: gridColor } },
                }}
                useMesh={true}
                tooltip={({ point }) => (
                    <NivoChartTooltip
                        title={String(point.data.x)}
                        value={`${(point.data.y as number).toFixed(1)}%`}
                    />
                )}
                animate={true}
                motionConfig="gentle"
            />
        </div>
    )
    if (!mounted || !chartData[0]?.data?.length) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="savingsRateTrend" chartTitle={chartTitle} size="md" />
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
                        <ChartFavoriteButton chartId="savingsRateTrend" chartTitle={chartTitle} size="md" />
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
ChartSavingsRateTrend.displayName = "ChartSavingsRateTrend"
