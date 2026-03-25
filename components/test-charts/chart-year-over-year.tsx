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
const CHART_ID = "yearOverYear"
const CHART_TITLE = "Year Over Year"
const CHART_DESCRIPTION = "Compare your annual spending across years to spot long-term trends."
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
    const palette = getShuffledPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const isDark = resolvedTheme === "dark"
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const yearlyTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const year = tx.date.slice(0, 4)
            yearlyTotals.set(year, (yearlyTotals.get(year) || 0) + Math.abs(tx.amount))
        })
        return Array.from(yearlyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-5)
            .map(([year, total], i, arr) => {
                const prevTotal = i > 0 ? arr[i - 1][1] : total
                const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0
                return {
                    year,
                    total,
                    change,
                    color: i === arr.length - 1 ? palette[0] : (isDark ? '#6b7280' : '#9ca3af'),
                }
            })
    }, [data, palette, isDark])
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Shows up to 5 years",
                    "Current year highlighted",
                    "Track long-term changes",
                ]}
            />
            <ChartAiInsightButton
                chartId={CHART_ID}
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ years: chartData }}
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
                        <ChartLoadingState isLoading={isLoading} skeletonType="bar" emptyTitle={emptyTitle || "No data yet"} emptyDescription={emptyDescription || "No yearly data found"} />
                    </div>
                </CardContent>
            </Card>
        )
    }
    const chart = (
        <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            <ResponsiveBar
                data={chartData}
                keys={["total"]}
                indexBy="year"
                margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
                padding={0.4}
                colors={({ data: d }) => d.color as string}
                borderRadius={8}
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
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 16,
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                }}
                theme={{
                    text: { fill: textColor, fontSize: 12 },
                    axis: { ticks: { text: { fill: textColor } } },
                    grid: { line: { stroke: gridColor } },
                }}
                tooltip={({ data: d, color }) => {
                    const changeValue = typeof d.change === 'number' ? d.change : 0
                    return (
                        <NivoChartTooltip
                            title={String(d.year)}
                            titleColor={color}
                            value={formatCurrency(d.total as number)}
                            subValue={changeValue !== 0 ? `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(0)}% vs prev year` : undefined}
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
ChartYearOverYear.displayName = "ChartYearOverYear"
