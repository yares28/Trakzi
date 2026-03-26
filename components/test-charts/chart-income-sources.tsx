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
import { HoverableHorizontalBar } from "@/components/chart-hoverable-bar"
const CHART_ID = "incomeSources"
const CHART_TITLE = "Income Sources"
const CHART_DESCRIPTION = "Breakdown of where your income comes from. Diversification is key to financial stability."
interface ChartIncomeSourcesProps {
    data: Array<{
        date: string
        amount: number
        description: string
        category?: string
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}
export const ChartIncomeSources = memo(function ChartIncomeSources({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartIncomeSourcesProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(
        () => getShuffledPalette("analytics:incomeSources"),
        [getShuffledPalette],
    )
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        const sourceTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount <= 0) return // Only income
            // Try to categorize income source
            let source = tx.category || 'Other Income'
            const desc = tx.description.toLowerCase()
            if (desc.includes('salary') || desc.includes('payroll') || desc.includes('paycheck')) {
                source = 'Salary'
            } else if (desc.includes('dividend') || desc.includes('interest')) {
                source = 'Investments'
            } else if (desc.includes('refund') || desc.includes('return')) {
                source = 'Refunds'
            } else if (desc.includes('transfer') || desc.includes('deposit')) {
                source = 'Transfers'
            } else if (desc.includes('freelance') || desc.includes('consulting')) {
                source = 'Freelance'
            }
            sourceTotals.set(source, (sourceTotals.get(source) || 0) + tx.amount)
        })
        const paletteLength = palette?.length || 0
        return Array.from(sourceTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .reverse()
            .map(([source, total], i) => ({
                source,
                total,
                color: paletteLength > 0 ? (palette[i % paletteLength] || "#10b981") : "#10b981",
            }))
    }, [data, palette])
    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)
    const totalIncome = chartData.reduce((sum, d) => sum + d.total, 0)
    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Groups positive transactions by type",
                    "Auto-categorizes common sources",
                    "Shows top 6 sources",
                ]}
            />
            <ChartAiInsightButton
                chartId={CHART_ID}
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ sources: chartData, totalIncome }}
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
                        <ChartLoadingState isLoading={isLoading} skeletonType="bar" emptyTitle={emptyTitle || "No data yet"} emptyDescription={emptyDescription || "No income sources found"} />
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
                indexBy="source"
                layout="horizontal"
                margin={{ top: 10, right: 60, bottom: 30, left: 100 }}
                padding={0.3}
                colors={({ data: d }) => d.color as string}
                borderRadius={6}
                enableLabel={true}
                label={(d) => formatCurrency(d.value as number, { maximumFractionDigits: 0 })}
                labelSkipWidth={50}
                labelTextColor="#ffffff"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                barComponent={HoverableHorizontalBar as any}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : formatCurrency(v, { maximumFractionDigits: 0 }),
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                }}
                theme={{
                    text: { fill: textColor, fontSize: 11 },
                    axis: { ticks: { text: { fill: textColor } } },
                    grid: { line: { stroke: gridColor } },
                }}
                tooltip={({ data: d, color }) => {
                    const pct = totalIncome > 0 ? ((d.total as number) / totalIncome) * 100 : 0
                    return (
                        <NivoChartTooltip
                            title={String(d.source)}
                            titleColor={color}
                            value={formatCurrency(d.total as number)}
                            subValue={`${pct.toFixed(1)}% of income`}
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
ChartIncomeSources.displayName = "ChartIncomeSources"
