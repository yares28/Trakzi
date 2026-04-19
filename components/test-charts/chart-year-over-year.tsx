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

const CHART_ID = "yearOverYear"
const CHART_TITLE = "Spending comparison"
const CHART_DESCRIPTION = "Compare total spending by month, quarter, or year to spot trends and seasonality."

type PeriodViewMode = "month" | "quarter" | "year"

interface ChartYearOverYearProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}

export const ChartYearOverYear = memo(function ChartYearOverYear({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartYearOverYearProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const isMobile = useIsMobile()
    const palette = useMemo(
        () => getShuffledPalette("analytics:yearOverYear"),
        [getShuffledPalette],
    )
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [viewMode, setViewMode] = useState<PeriodViewMode>("year")
    useEffect(() => {
        setMounted(true)
    }, [])
    const isDark = resolvedTheme === "dark"

    const monthlyChartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const monthlyTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + Math.abs(tx.amount))
        })
        const paletteLength = palette?.length || 0
        const accent = paletteLength > 0 ? palette[0] : "#fe8339"
        return Array.from(monthlyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([period, total], i, arr) => {
                const prevTotal = i > 0 ? arr[i - 1][1] : total
                const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0
                const isLatest = i === arr.length - 1
                return {
                    period,
                    total,
                    change,
                    color: isLatest ? accent : (isDark ? "#4b5563" : "#9ca3af"),
                }
            })
    }, [data, palette, isDark])

    const quarterlyChartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const quarterlyTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const d = tx.date.slice(0, 10)
            const parts = d.split("-")
            const year = parseInt(parts[0] ?? "", 10)
            const month = parseInt(parts[1] ?? "", 10)
            if (!year || !month) return
            const quarter = Math.floor((month - 1) / 3) + 1
            const key = `${year} Q${quarter}`
            quarterlyTotals.set(key, (quarterlyTotals.get(key) || 0) + Math.abs(tx.amount))
        })
        const paletteLength = palette?.length || 0
        const accent = paletteLength > 0 ? palette[0] : "#fe8339"
        return Array.from(quarterlyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-8)
            .map(([period, total], i, arr) => {
                const prevTotal = i > 0 ? arr[i - 1][1] : total
                const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0
                const isLatest = i === arr.length - 1
                return {
                    period,
                    total,
                    change,
                    color: isLatest ? accent : (isDark ? "#4b5563" : "#9ca3af"),
                }
            })
    }, [data, palette, isDark])

    const yearlyChartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const yearlyTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const year = tx.date.slice(0, 4)
            yearlyTotals.set(year, (yearlyTotals.get(year) || 0) + Math.abs(tx.amount))
        })
        const paletteLength = palette?.length || 0
        const accent = paletteLength > 0 ? palette[0] : "#fe8339"
        return Array.from(yearlyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-5)
            .map(([period, total], i, arr) => {
                const prevTotal = i > 0 ? arr[i - 1][1] : total
                const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0
                const isLatest = i === arr.length - 1
                return {
                    period,
                    total,
                    change,
                    color: isLatest ? accent : (isDark ? "#6b7280" : "#9ca3af"),
                }
            })
    }, [data, palette, isDark])

    const chartData =
        viewMode === "month"
            ? monthlyChartData
            : viewMode === "quarter"
                ? quarterlyChartData
                : yearlyChartData

    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const viewSwitchControl = (
        <div
            className="flex shrink-0 items-center justify-start text-center rounded-full bg-muted p-px text-xs leading-tight"
            role="group"
            aria-label="Spending period"
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
                chartData={{ viewMode, periods: chartData }}
                size="sm"
            />
            }
            info={
                <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Month: last 12 calendar months",
                    "Quarter: last 8 quarters, latest highlighted",
                    "Year: last 5 years, latest highlighted",
                    "Percent change vs previous period in the series",
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
                chartData={{ viewMode, periods: chartData }}
                size="sm"
            />
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Month: last 12 calendar months",
                    "Quarter: last 8 quarters, latest highlighted",
                    "Year: last 5 years, latest highlighted",
                    "Percent change vs previous period in the series",
                ]}
            />
        </div>
    )

    const hasAnySeries =
        monthlyChartData.length > 0 ||
        quarterlyChartData.length > 0 ||
        yearlyChartData.length > 0

    if (!mounted || !hasAnySeries) {
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
                        <ChartLoadingState
                            isLoading={isLoading}
                            skeletonType="bar"
                            emptyTitle={emptyTitle || "No data yet"}
                            emptyDescription={emptyDescription || "No spending data found"}
                        />
                    </div>
                </CardContent>
                        {renderCardFloatingMeta()}
            </Card>
        )
    }

    const bottomTickRotation = viewMode === "year" ? 0 : -45

    const chart = (
        <div className="h-full w-full min-h-[210px] sm:min-h-[250px]" key={`${viewMode}-${colorScheme}`}>
            <ResponsiveBar
                data={chartData}
                keys={["total"]}
                indexBy="period"
                margin={isMobile ? { top: 14, right: 12, bottom: 42, left: 58 } : { top: 20, right: 20, bottom: 50, left: 70 }}
                padding={viewMode === "year" ? 0.4 : 0.3}
                colors={({ data: d }) => d.color as string}
                borderRadius={viewMode === "year" ? 8 : 6}
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
                labelTextColor={{ from: "color", modifiers: [["brighter", 3]] }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                barComponent={HoverableBar as any}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: viewMode === "year" ? 16 : 12,
                    tickRotation: bottomTickRotation,
                    format: (v: string) => {
                        if (viewMode !== "month") return v
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
                    text: { fill: textColor, fontSize: isMobile ? 10 : viewMode === "year" ? 12 : 11 },
                    axis: { ticks: { text: { fill: textColor } } },
                    grid: { line: { stroke: gridColor } },
                }}
                tooltip={({ data: d, color }) => {
                    const changeValue = typeof d.change === "number" ? d.change : 0
                    const prevLabel =
                        viewMode === "year" ? "vs prev year" : "vs prev"
                    return (
                        <NivoChartTooltip
                            title={String(d.period)}
                            titleColor={color}
                            value={formatCurrency(d.total as number)}
                            subValue={
                                changeValue !== 0
                                    ? `${changeValue > 0 ? "+" : ""}${changeValue.toFixed(0)}% ${prevLabel}`
                                    : undefined
                            }
                        />
                    )
                }}
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
ChartYearOverYear.displayName = "ChartYearOverYear"
