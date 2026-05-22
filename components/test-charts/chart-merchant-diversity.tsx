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
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"

const CHART_TITLE = "Merchant Diversity Over Time"
const CHART_DESCRIPTION =
    "Are you shopping at more or fewer different places each month?"

interface TestChartsTransaction {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

interface ChartMerchantDiversityProps {
    data: TestChartsTransaction[]
    isLoading?: boolean
}

export const ChartMerchantDiversity = memo(function ChartMerchantDiversity({
    data,
    isLoading = false,
}: ChartMerchantDiversityProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Group expense transactions by month, count unique descriptions
        const monthMap = new Map<string, Set<string>>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const month = tx.date.slice(0, 7)
            if (!monthMap.has(month)) monthMap.set(month, new Set())
            monthMap.get(month)!.add(tx.description.trim().toLowerCase())
        })

        const sortedMonths = Array.from(monthMap.keys()).sort()
        if (sortedMonths.length === 0) return []

        const counts = sortedMonths.map((m) => monthMap.get(m)!.size)

        // 3-month rolling average
        const rollingAvg = counts.map((_, i) => {
            const start = Math.max(0, i - 2)
            const slice = counts.slice(start, i + 1)
            return Math.round(slice.reduce((s, v) => s + v, 0) / slice.length)
        })

        return [
            {
                id: "Unique Merchants",
                color: palette[0] || "#fe8339",
                data: sortedMonths.map((m, i) => ({ x: m, y: counts[i] })),
            },
            {
                id: "3-Month Avg",
                color: palette[3] || "#10b981",
                data: sortedMonths.map((m, i) => ({ x: m, y: rollingAvg[i] })),
            },
        ]
    }, [data, palette])

    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Rising line = expanding merchant variety",
                    "Falling line = consolidating to fewer stores",
                    "Low diversity may mean better loyalty deals",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:merchantDiversity"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ months: chartData[0]?.data?.length ?? 0 }}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.length === 0 || !chartData[0]?.data?.length) {
        return (
            <Card className="@container/card h-full flex flex-col" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:merchantDiversity" chartTitle={CHART_TITLE} size="md" />
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
                            emptyTitle="No data"
                            emptyDescription="Upload transactions to see merchant diversity"
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const chart = (
        <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            <ResponsiveLine
                data={chartData}
                margin={{ top: 20, right: 110, bottom: 55, left: 55 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: 0, max: "auto" }}
                curve="monotoneX"
                colors={chartData.map((d) => d.color)}
                lineWidth={2}
                pointSize={6}
                pointColor={{ theme: "background" }}
                pointBorderWidth={2}
                pointBorderColor={{ from: "serieColor" }}
                enableGridX={false}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 10,
                    tickRotation: -40,
                    format: (v: string) => {
                        const parts = v.split("-")
                        return months[parseInt(parts[1]) - 1]
                    },
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    legend: "Unique merchants",
                    legendOffset: -45,
                    legendPosition: "middle",
                }}
                legends={[
                    {
                        anchor: "bottom-right",
                        direction: "column",
                        translateX: 100,
                        itemWidth: 90,
                        itemHeight: 20,
                        itemTextColor: textColor,
                        symbolSize: 12,
                        symbolShape: "circle",
                    },
                ]}
                theme={{
                    text: { fill: textColor, fontSize: 11 },
                    axis: { ticks: { text: { fill: textColor } }, legend: { text: { fill: textColor } } },
                    grid: { line: { stroke: gridColor } },
                }}
                useMesh={true}
                tooltip={({ point }) => (
                    <NivoChartTooltip
                        title={String(point.data.xFormatted)}
                        titleColor={point.color}
                        value={`${point.data.y} merchants`}
                        subValue={point.seriesId}
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
                headerActions={renderInfoTrigger(true)}
            >
                <div className="h-full w-full min-h-[400px]" key={colorScheme}>
                    {chart}
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:merchantDiversity" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    {chart}
                </CardContent>
            </Card>
        </>
    )
})

ChartMerchantDiversity.displayName = "ChartMerchantDiversity"

