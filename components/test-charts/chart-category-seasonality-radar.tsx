"use client"
import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveRadar } from "@nivo/radar"
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
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"

const CHART_TITLE = "Category Seasonality Radar"
const CHART_DESCRIPTION =
    "How do your top spending categories shift across quarters? Each axis = a category, each shape = a quarter."

interface TestChartsTransaction {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

interface ChartCategorySeasonalityRadarProps {
    data: TestChartsTransaction[]
    isLoading?: boolean
}

export const ChartCategorySeasonalityRadar = memo(function ChartCategorySeasonalityRadar({
    data,
    isLoading = false,
}: ChartCategorySeasonalityRadarProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const { chartData, keys } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], keys: [] }

        // Get top 6 expense categories by total
        const categoryTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const cat = tx.category?.trim() || "Other"
            categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(tx.amount))
        })

        const topCategories = Array.from(categoryTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([cat]) => cat)

        if (topCategories.length === 0) return { chartData: [], keys: [] }

        // Compute per-quarter totals for each category
        const quarters = ["Q1", "Q2", "Q3", "Q4"] as const
        const quarterData: Record<string, Record<string, number>> = {
            Q1: {}, Q2: {}, Q3: {}, Q4: {},
        }

        topCategories.forEach((cat) => {
            quarters.forEach((q) => { quarterData[q][cat] = 0 })
        })

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const cat = tx.category?.trim() || "Other"
            if (!topCategories.includes(cat)) return
            const month = new Date(tx.date).getMonth() + 1
            const quarter = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4"
            quarterData[quarter][cat] += Math.abs(tx.amount)
        })

        // Find max per category across quarters for normalization
        const categoryMax: Record<string, number> = {}
        topCategories.forEach((cat) => {
            categoryMax[cat] = Math.max(...quarters.map((q) => quarterData[q][cat]))
        })

        // Normalize each category to 0–100
        const result = quarters.map((quarter) => {
            const obj: Record<string, number | string> = { quarter }
            topCategories.forEach((cat) => {
                const maxVal = categoryMax[cat]
                obj[cat] = maxVal > 0 ? Math.round((quarterData[quarter][cat] / maxVal) * 100) : 0
            })
            return obj
        })

        return { chartData: result, keys: topCategories }
    }, [data])

    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Each axis = a spending category",
                    "Each shape = one quarter",
                    "Spikes show seasonal peaks per category",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:categorySeasonalityRadar"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ quarters: chartData, categories: keys }}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.length === 0) {
        return (
            <Card className="@container/card h-full flex flex-col" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:categorySeasonalityRadar" chartTitle={CHART_TITLE} size="md" />
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
                            emptyDescription="Upload transactions to see category seasonality"
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const quarterColors = [palette[0], palette[2], palette[4], palette[6]].map((c) => c || "#fe8339")

    const chart = (
        <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            <ResponsiveRadar
                data={chartData}
                keys={keys}
                indexBy="quarter"
                maxValue={100}
                margin={{ top: 50, right: 80, bottom: 40, left: 80 }}
                curve="linearClosed"
                borderWidth={2}
                borderColor={({ key }) => {
                    const idx = keys.indexOf(key as string)
                    return quarterColors[idx % quarterColors.length]
                }}
                gridLevels={5}
                gridShape="circular"
                gridLabelOffset={16}
                enableDots={true}
                dotSize={6}
                dotColor={{ theme: "background" }}
                dotBorderWidth={2}
                dotBorderColor={({ key }) => {
                    const idx = keys.indexOf(key as string)
                    return quarterColors[idx % quarterColors.length]
                }}
                colors={quarterColors}
                fillOpacity={0.15}
                blendMode="normal"
                theme={{
                    text: { fill: textColor, fontSize: 11 },
                    grid: { line: { stroke: gridColor } },
                }}
                legends={[
                    {
                        anchor: "top-left",
                        direction: "column",
                        translateX: -60,
                        translateY: -40,
                        itemWidth: 80,
                        itemHeight: 20,
                        itemTextColor: textColor,
                        symbolSize: 12,
                        symbolShape: "circle",
                    },
                ]}
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
                        <ChartFavoriteButton chartId="testCharts:categorySeasonalityRadar" chartTitle={CHART_TITLE} size="md" />
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

ChartCategorySeasonalityRadar.displayName = "ChartCategorySeasonalityRadar"
