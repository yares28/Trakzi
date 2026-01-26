"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import {
    Card,
    CardContent,
    CardDescription,
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

interface ChartTopCategoriesPieProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartTopCategoriesPie({
    data,
    isLoading = false,
}: ChartTopCategoriesPieProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        const categoryTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const category = tx.category?.trim() || "Other"
            categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(tx.amount))
        })

        const sorted = Array.from(categoryTotals.entries())
            .sort((a, b) => b[1] - a[1])

        // Take top 5, group rest as "Others"
        const top5 = sorted.slice(0, 5)
        const others = sorted.slice(5)
        const othersTotal = others.reduce((sum, [_, val]) => sum + val, 0)

        const paletteLength = palette?.length || 0
        const result = top5.map(([name, value], i) => ({
            id: name,
            label: name,
            value,
            color: paletteLength > 0 ? (palette[i % paletteLength] || "#6b7280") : "#6b7280",
        }))

        if (othersTotal > 0) {
            result.push({
                id: "Others",
                label: "Others",
                value: othersTotal,
                color: resolvedTheme === "dark" ? "#4b5563" : "#9ca3af",
            })
        }

        return result
    }, [data, palette, resolvedTheme])

    const total = chartData.reduce((sum, d) => sum + d.value, 0)
    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"

    const chartTitle = "Top Categories"
    const chartDescription = "Your top 5 spending categories as a pie chart. See where most of your money goes."

    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Shows top 5 categories",
                    "Remaining grouped as 'Others'",
                    "Hover for exact amounts",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:topCategoriesPie"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ categories: chartData.slice(0, 5), total }}
                size="sm"
            />
        </div>
    )

    // Chart content - reused in card and fullscreen modal
    const renderChart = () => (
        <ResponsivePie
            data={chartData}
            margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
            innerRadius={0.5}
            padAngle={2}
            cornerRadius={6}
            activeOuterRadiusOffset={8}
            colors={{ datum: "data.color" }}
            borderWidth={0}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor={textColor}
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: "color" }}
            arcLabelsSkipAngle={25}
            arcLabelsTextColor="#ffffff"
            valueFormat={(v) => formatCurrency(v)}
            tooltip={({ datum }) => {
                const pct = total > 0 ? (Number(datum.value) / total) * 100 : 0
                return (
                    <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: datum.color }} />
                            <span className="font-medium text-foreground">{datum.label}</span>
                        </div>
                        <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(Number(datum.value))}</div>
                        <div className="text-[0.7rem] text-foreground/60">{pct.toFixed(1)}%</div>
                    </div>
                )
            }}
            theme={{ text: { fill: textColor, fontSize: 12 } }}
            animate={true}
            motionConfig="gentle"
        />
    )

    if (!mounted || chartData.length === 0) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:topCategoriesPie" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]"><ChartLoadingState isLoading={isLoading} /></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title={chartTitle}
                description={chartDescription}
                headerActions={renderInfoTrigger(true)}
            >
                <div className="h-full w-full min-h-[400px]" key={`fullscreen-${colorScheme}`}>
                    {renderChart()}
                </div>
            </ChartFullscreenModal>

            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:topCategoriesPie" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardDescription>
                        <span className="hidden @[540px]/card:block">{chartDescription}</span>
                        <span className="@[540px]/card:hidden">Top spending categories</span>
                    </CardDescription>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                        {renderChart()}
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
