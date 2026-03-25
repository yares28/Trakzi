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
const CHART_TITLE = "Seasonal Spending"
const CHART_DESCRIPTION = "Compare your spending across seasons. See if your habits change with the weather."
interface ChartSeasonalSpendingProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}
export const ChartSeasonalSpending = memo(function ChartSeasonalSpending({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartSeasonalSpendingProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const seasonTotals = { Spring: 0, Summer: 0, Fall: 0, Winter: 0 }
        const seasonCounts = { Spring: 0, Summer: 0, Fall: 0, Winter: 0 }
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = new Date(tx.date).getMonth()
            let season: keyof typeof seasonTotals
            if (month >= 2 && month <= 4) season = 'Spring'
            else if (month >= 5 && month <= 7) season = 'Summer'
            else if (month >= 8 && month <= 10) season = 'Fall'
            else season = 'Winter'
            seasonTotals[season] += Math.abs(tx.amount)
            seasonCounts[season]++
        })
        return ['Winter', 'Spring', 'Summer', 'Fall'].map((season, index) => ({
            season,
            total: seasonTotals[season as keyof typeof seasonTotals],
            count: seasonCounts[season as keyof typeof seasonCounts],
            avg: seasonCounts[season as keyof typeof seasonCounts] > 0
                ? seasonTotals[season as keyof typeof seasonTotals] / seasonCounts[season as keyof typeof seasonCounts]
                : 0,
            paletteIndex: index,
        }))
    }, [data])
    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const maxSeason = chartData.reduce((max, curr) => curr.total > max.total ? curr : max, chartData[0] || { season: '', total: 0 })
    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Winter: Dec, Jan, Feb",
                    "Spring: Mar, Apr, May",
                    "Summer: Jun, Jul, Aug",
                    "Fall: Sep, Oct, Nov",
                ]}
            />
            <ChartAiInsightButton
                chartId="seasonalSpending"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ seasons: chartData, peakSeason: maxSeason?.season }}
                size="sm"
            />
        </div>
    )
    if (!mounted || chartData.length === 0 || chartData.every(d => d.total === 0)) {
        return (
            <Card className="@container/card h-full relative" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="seasonalSpending" chartTitle={CHART_TITLE} size="md" />
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
                            emptyTitle={emptyTitle || "No seasonal data yet"}
                            emptyDescription={emptyDescription || "Import your bank statements to see your seasonal spending breakdown."}
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
                        indexBy="season"
                        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                        padding={0.4}
                        colors={({ index }) => palette[index % palette.length]}
                        borderRadius={8}
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
                        <ChartFavoriteButton chartId="seasonalSpending" chartTitle={CHART_TITLE} size="md" />
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
                            indexBy="season"
                            margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
                            padding={0.4}
                            colors={({ index }) => palette[index % palette.length]}
                            borderRadius={8}
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
ChartSeasonalSpending.displayName = "ChartSeasonalSpending"
