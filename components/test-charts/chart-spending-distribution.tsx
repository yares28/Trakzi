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

const CHART_ID = "spendingDistribution"
const CHART_TITLE = "Spending Distribution"
const CHART_DESCRIPTION =
    "A histogram showing how your transactions are distributed across different spending ranges. See where most of your spending falls."

interface ChartSpendingDistributionProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}

export const ChartSpendingDistribution = memo(function ChartSpendingDistribution({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartSpendingDistributionProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(
        () => getShuffledPalette("analytics:spendingDistribution"),
        [getShuffledPalette],
    )
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Define spending buckets
        const buckets = [
            { label: "$0-10", min: 0, max: 10, count: 0 },
            { label: "$10-25", min: 10, max: 25, count: 0 },
            { label: "$25-50", min: 25, max: 50, count: 0 },
            { label: "$50-100", min: 50, max: 100, count: 0 },
            { label: "$100-250", min: 100, max: 250, count: 0 },
            { label: "$250-500", min: 250, max: 500, count: 0 },
            { label: "$500+", min: 500, max: Infinity, count: 0 },
        ]

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const amount = Math.abs(tx.amount)

            for (const bucket of buckets) {
                if (amount >= bucket.min && amount < bucket.max) {
                    bucket.count++
                    break
                }
            }
        })

        return buckets
            .filter((bucket) => bucket.count > 0)
            .map((bucket) => ({
                range: bucket.label,
                count: bucket.count,
            }))
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const chartDataForAI = useMemo(() => {
        if (chartData.length === 0) return {}
        const mostCommon = chartData.reduce((prev, curr) =>
            curr.count > prev.count ? curr : prev
        )
        const totalTx = chartData.reduce((sum, b) => sum + b.count, 0)
        return {
            mostCommonRange: mostCommon.range,
            mostCommonCount: mostCommon.count,
            totalTransactions: totalTx,
            mostCommonPercent: totalTx > 0 ? ((mostCommon.count / totalTx) * 100).toFixed(1) : 0,
        }
    }, [chartData])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Groups transactions by amount",
                    "Shows frequency in each range",
                    "Helps identify spending patterns",
                    "Higher bars = more transactions",
                ]}
            />
            <ChartAiInsightButton
                chartId={CHART_ID}
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={chartDataForAI}
                size="sm"
            />
        </div>
    )

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId={CHART_ID}
                            chartTitle={CHART_TITLE}
                            size="md"
                        />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" />
                </CardContent>
            </Card>
        )
    }

    const chart = (
        <div className="h-full w-full min-h-[250px]" key={colorScheme}>
            <ResponsiveBar
                data={chartData}
                keys={["count"]}
                indexBy="range"
                margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                padding={0.3}
                colors={({ index }) => palette[index % palette.length] || "#10b981"}
                borderRadius={6}
                enableLabel={true}
                label={(d) => (d.value as number) > 0 ? String(d.value) : ""}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{
                    from: "color",
                    modifiers: [["darker", 2]],
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                barComponent={HoverableBar as any}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 8,
                    tickRotation: -35,
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    tickRotation: 0,
                }}
                theme={{
                    text: { fill: textColor, fontSize: 11 },
                    axis: {
                        ticks: { text: { fill: textColor } },
                    },
                    grid: { line: { stroke: gridColor, strokeWidth: 1 } },
                }}
                tooltip={({ id, value, indexValue, color }) => (
                    <NivoChartTooltip
                        title={String(indexValue)}
                        titleColor={color}
                        value={`${value} transaction${Number(value) !== 1 ? "s" : ""}`}
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
                        <ChartFavoriteButton
                            chartId={CHART_ID}
                            chartTitle={CHART_TITLE}
                            size="md"
                        />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-1">
                            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                            {renderInfoTrigger()}
                        </div>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    {isLoading || chartData.length === 0 ? (
                        <div className="h-full w-full min-h-[250px] flex items-center justify-center">
                            <ChartLoadingState isLoading={isLoading} skeletonType="bar" emptyTitle={emptyTitle || "No data yet"} emptyDescription={emptyDescription || "No transactions found"} />
                        </div>
                    ) : (
                        chart
                    )}
                </CardContent>
            </Card>
        </>
    )
})

ChartSpendingDistribution.displayName = "ChartSpendingDistribution"
