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
const CHART_ID = "dailyAverageByMonth"
const CHART_TITLE = "Daily Average by Month"
const CHART_DESCRIPTION = "Your average daily spending for each month - lower is better!"
interface ChartDailyAverageByMonthProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}
export const ChartDailyAverageByMonth = memo(function ChartDailyAverageByMonth({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartDailyAverageByMonthProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(
        () => getShuffledPalette("analytics:dailyAverageByMonth"),
        [getShuffledPalette],
    )
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const monthlyData = new Map<string, { total: number; days: Set<string> }>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            const day = tx.date.slice(0, 10)
            const existing = monthlyData.get(month) || { total: 0, days: new Set() }
            existing.total += Math.abs(tx.amount)
            existing.days.add(day)
            monthlyData.set(month, existing)
        })
        const paletteLength = palette?.length || 0
        return Array.from(monthlyData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([month, data], i) => {
                const dailyAvg = data.days.size > 0 ? data.total / data.days.size : 0
                return {
                    month,
                    dailyAvg,
                    daysActive: data.days.size,
                    color: paletteLength > 0 ? (palette[i % paletteLength] || "#fe8339") : "#fe8339",
                }
            })
    }, [data, palette])
    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const overallAvg = chartData.length > 0
        ? chartData.reduce((sum, d) => sum + d.dailyAvg, 0) / chartData.length
        : 0
    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Average spending per active day",
                    "Excludes days with no spending",
                    "Compare months easily",
                ]}
            />
            <ChartAiInsightButton
                chartId={CHART_ID}
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ overallAvg, months: chartData.length }}
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
                        <ChartFavoriteButton chartId={CHART_ID} chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} skeletonType="bar" emptyTitle={emptyTitle || "No data yet"} emptyDescription={emptyDescription || "No monthly data found"} />
                    </div>
                </CardContent>
            </Card>
        )
    }
    const chart = (
        <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            <ResponsiveBar
                data={chartData}
                keys={["dailyAvg"]}
                indexBy="month"
                margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                barComponent={HoverableBar as any}
                markers={[
                    {
                        axis: 'y',
                        value: overallAvg,
                        lineStyle: { stroke: isDark ? '#6b7280' : '#9ca3af', strokeWidth: 2, strokeDasharray: '4 4' },
                        legend: 'avg',
                        legendOrientation: 'horizontal',
                    },
                ]}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 8,
                    tickRotation: -45,
                    format: (v: string) => {
                        const [, month] = v.split("-")
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
                tooltip={({ data: d, color }) => (
                    <NivoChartTooltip
                        title={String(d.month)}
                        titleColor={color}
                        value={`${formatCurrency(d.dailyAvg as number)}/day`}
                        subValue={`${d.daysActive} active days`}
                    />
                )}
                animate={true}
                motionConfig="gentle"
            />
        </div>
    )
    return (
        <>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                headerActions={renderInfoTrigger()}
            >
                <div className="h-full w-full min-h-[400px]" key={colorScheme}>
                    {chart}
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId={CHART_ID} chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction>
                        <div className="flex items-center gap-1">
                            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                            {renderInfoTrigger()}
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    {chart}
                </CardContent>
            </Card>
        </>
    )
})
ChartDailyAverageByMonth.displayName = "ChartDailyAverageByMonth"
