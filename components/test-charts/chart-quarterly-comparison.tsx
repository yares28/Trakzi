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
const CHART_ID = "quarterlyComparison"
const CHART_TITLE = "Quarterly Comparison"
const CHART_DESCRIPTION = "Compare your spending across quarters to spot seasonal patterns."
interface ChartQuarterlyComparisonProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}
export const ChartQuarterlyComparison = memo(function ChartQuarterlyComparison({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartQuarterlyComparisonProps) {
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
        const quarterlyTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = new Date(tx.date)
            const year = date.getFullYear()
            const quarter = Math.floor(date.getMonth() / 3) + 1
            const key = `${year} Q${quarter}`
            quarterlyTotals.set(key, (quarterlyTotals.get(key) || 0) + Math.abs(tx.amount))
        })
        return Array.from(quarterlyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-8)
            .map(([quarter, total], i, arr) => {
                const prevTotal = i > 0 ? arr[i - 1][1] : total
                const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0
                const isLatest = i === arr.length - 1
                return {
                    quarter,
                    total,
                    change,
                    color: isLatest ? palette[0] : (isDark ? '#4b5563' : '#9ca3af'),
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
                    "Shows up to 8 quarters",
                    "Current quarter highlighted",
                    "Identify seasonal trends",
                ]}
            />
            <ChartAiInsightButton
                chartId={CHART_ID}
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ quarters: chartData }}
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
                        <ChartLoadingState isLoading={isLoading} skeletonType="bar" emptyTitle={emptyTitle || "No data yet"} emptyDescription={emptyDescription || "No quarterly data found"} />
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
                indexBy="quarter"
                margin={{ top: 20, right: 20, bottom: 50, left: 70 }}
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
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 12,
                    tickRotation: -45,
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
                tooltip={({ data: d, color }) => {
                    const changeValue = typeof d.change === 'number' ? d.change : 0
                    return (
                        <NivoChartTooltip
                            title={String(d.quarter)}
                            titleColor={color}
                            value={formatCurrency(d.total as number)}
                            subValue={changeValue !== 0 ? `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(0)}% vs prev` : undefined}
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
ChartQuarterlyComparison.displayName = "ChartQuarterlyComparison"
