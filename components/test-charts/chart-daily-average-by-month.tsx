"use client"
import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import {
    ChartCardFloatingMeta,
    ChartCardTopRightControl,
} from "@/components/chart-card-overlay-controls"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"
import { formatCompactAxisMagnitude } from "@/lib/chart-axis-compact"
import { HoverableBar } from "@/components/chart-hoverable-bar"
import { useIsMobile } from "@/hooks/use-mobile"
const CHART_ID = "dailyAverageByMonth"
const CHART_TITLE = "Daily Average by Month"
const CHART_DESCRIPTION = "Your average daily spending for each month - lower is better!"
type DailyAvgViewMode = "month" | "quarter" | "year"

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
    const isMobile = useIsMobile()
    const palette = useMemo(
        () => getShuffledPalette("analytics:dailyAverageByMonth"),
        [getShuffledPalette],
    )
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [viewMode, setViewMode] = useState<DailyAvgViewMode>("month")
    useEffect(() => {
        setMounted(true)
    }, [])

    const monthlyChartData = useMemo(() => {
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
            .map(([month, row], i) => {
                const dailyAvg = row.days.size > 0 ? row.total / row.days.size : 0
                return {
                    period: month,
                    dailyAvg,
                    daysActive: row.days.size,
                    color: paletteLength > 0 ? (palette[i % paletteLength] || "#fe8339") : "#fe8339",
                }
            })
    }, [data, palette])

    const quarterlyChartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const quarterlyData = new Map<string, { total: number; days: Set<string> }>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const day = tx.date.slice(0, 10)
            const parts = day.split("-")
            const y = parseInt(parts[0] ?? "", 10)
            const m = parseInt(parts[1] ?? "", 10)
            if (!y || !m) return
            const q = Math.floor((m - 1) / 3) + 1
            const period = `${y} Q${q}`
            const existing = quarterlyData.get(period) || { total: 0, days: new Set() }
            existing.total += Math.abs(tx.amount)
            existing.days.add(day)
            quarterlyData.set(period, existing)
        })
        const paletteLength = palette?.length || 0
        return Array.from(quarterlyData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-8)
            .map(([period, row], i) => {
                const dailyAvg = row.days.size > 0 ? row.total / row.days.size : 0
                return {
                    period,
                    dailyAvg,
                    daysActive: row.days.size,
                    color: paletteLength > 0 ? (palette[i % paletteLength] || "#fe8339") : "#fe8339",
                }
            })
    }, [data, palette])

    const yearlyChartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const yearlyData = new Map<string, { total: number; days: Set<string> }>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const year = tx.date.slice(0, 4)
            const day = tx.date.slice(0, 10)
            const existing = yearlyData.get(year) || { total: 0, days: new Set() }
            existing.total += Math.abs(tx.amount)
            existing.days.add(day)
            yearlyData.set(year, existing)
        })
        const paletteLength = palette?.length || 0
        return Array.from(yearlyData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-10)
            .map(([year, row], i) => {
                const dailyAvg = row.days.size > 0 ? row.total / row.days.size : 0
                return {
                    period: year,
                    dailyAvg,
                    daysActive: row.days.size,
                    color: paletteLength > 0 ? (palette[i % paletteLength] || "#fe8339") : "#fe8339",
                }
            })
    }, [data, palette])

    const chartData =
        viewMode === "month"
            ? monthlyChartData
            : viewMode === "quarter"
                ? quarterlyChartData
                : yearlyChartData
    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const overallAvg = chartData.length > 0
        ? chartData.reduce((sum, d) => sum + d.dailyAvg, 0) / chartData.length
        : 0

    const viewSwitchControl = (
        <div
            className="flex shrink-0 items-center justify-start text-center rounded-full bg-muted p-px text-xs leading-tight"
            role="group"
            aria-label="Daily average period"
        >
            <button
                type="button"
                className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setViewMode("month")}
            >
                Month
            </button>
            <button
                type="button"
                className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "quarter" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setViewMode("quarter")}
            >
                Quarter
            </button>
            <button
                type="button"
                className={`rounded-full px-2.5 py-1 font-medium transition-all whitespace-nowrap ${viewMode === "year" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setViewMode("year")}
            >
                Year
            </button>
        </div>
    )
    const mobileViewSwitchControl = (
        <div className="flex justify-center px-2 pb-2 md:hidden">
            {viewSwitchControl}
        </div>
    )
        const renderCardFloatingMeta = () => (
        <ChartCardFloatingMeta
            insight={
                <ChartAiInsightButton
                chartId={CHART_ID}
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{
                    overallAvg,
                    viewMode,
                    periodCount: chartData.length,
                }}
                size="sm"
            />
            }
            info={
                <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Average spending per active day",
                    "Excludes days with no spending",
                    "Use Month / Quarter / Year to compare by month, quarter, or calendar year",
                ]}
            />
            }
        />
    )

    const renderFullscreenHeaderActions = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartAiInsightButton
                chartId={CHART_ID}
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{
                    overallAvg,
                    viewMode,
                    periodCount: chartData.length,
                }}
                size="sm"
            />
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Average spending per active day",
                    "Excludes days with no spending",
                    "Use Month / Quarter / Year to compare by month, quarter, or calendar year",
                ]}
            />
        </div>
    )

    if (!mounted || (monthlyChartData.length === 0 && quarterlyChartData.length === 0 && yearlyChartData.length === 0)) {
        return (
            <Card className="@container/card h-full flex flex-col relative">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId={CHART_ID} chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
</CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} skeletonType="bar" emptyTitle={emptyTitle || "No data yet"} emptyDescription={emptyDescription || "No monthly data found"} />
                    </div>
                </CardContent>
                        {renderCardFloatingMeta()}
            </Card>
        )
    }
    const chart = (
        <div className="h-full w-full min-h-[210px] sm:min-h-[250px]" key={`${viewMode}-${colorScheme}`}>
            <ResponsiveBar
                data={chartData}
                keys={["dailyAvg"]}
                indexBy="period"
                margin={isMobile ? { top: 14, right: 12, bottom: 42, left: 52 } : { top: 20, right: 20, bottom: 50, left: 60 }}
                padding={0.3}
                colors={({ data: d }) => d.color as string}
                borderRadius={6}
                enableLabel={!isMobile}
                label={(d) => {
                    const v = Number(d.value)
                    if (v <= 0) return ""
                    return formatCompactAxisMagnitude(v, {
                        belowThreshold: (x) => String(Math.round(x)),
                    })
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
                    tickRotation: viewMode === "year" ? 0 : -45,
                    format: (v: string) => {
                        if (viewMode === "year" || viewMode === "quarter") return v
                        const [, month] = v.split("-")
                        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                        return months[parseInt(month, 10) - 1] ?? v
                    },
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (v: number) =>
                        formatCompactAxisMagnitude(v, {
                            belowThreshold: (x) => formatCurrency(x, { maximumFractionDigits: 0 }),
                        }),
                }}
                theme={{
                    text: { fill: textColor, fontSize: isMobile ? 10 : 11 },
                    axis: { ticks: { text: { fill: textColor } } },
                    grid: { line: { stroke: gridColor } },
                }}
                tooltip={({ data: d, color }) => (
                    <NivoChartTooltip
                        title={String(d.period)}
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
                headerActions={renderFullscreenHeaderActions()}
            >
                <div className="flex h-full min-h-[400px] flex-col gap-2" key={`${viewMode}-${colorScheme}`}>
                    <div className="flex justify-center">{viewSwitchControl}</div>
                    <div className="min-h-0 flex-1">{chart}</div>
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full flex flex-col relative">
                <ChartCardTopRightControl className="hidden md:block">
                    {viewSwitchControl}
                </ChartCardTopRightControl>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId={CHART_ID} chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                </CardHeader>
                {mobileViewSwitchControl}
                <CardContent className="px-2 pt-0 sm:px-6 sm:pt-2 flex-1 min-h-0">
                    {chart}
                </CardContent>
                        {renderCardFloatingMeta()}
            </Card>
        </>
    )
})
ChartDailyAverageByMonth.displayName = "ChartDailyAverageByMonth"
