"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveTreeMap } from "@nivo/treemap"
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
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"

interface ChartCategoryBubblesProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

interface TreeMapNode {
    id: string
    value: number
    color?: string
    children?: TreeMapNode[]
}

export function ChartCategoryBubbles({
    data,
    isLoading = false,
}: ChartCategoryBubblesProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo((): TreeMapNode | null => {
        if (!data || data.length === 0) return null
        if (!palette || !Array.isArray(palette) || palette.length === 0) return null

        const categoryTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const category = tx.category?.trim() || "Other"
            categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(tx.amount))
        })

        const paletteLength = palette.length
        const children: TreeMapNode[] = Array.from(categoryTotals.entries())
            .filter(([_, value]) => value > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([name, value], i) => ({
                id: name,
                value,
                color: palette[i % paletteLength] || "#6b7280",
            }))

        if (children.length === 0) return null

        return {
            id: "root",
            value: 0,
            children,
        }
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#ffffff" : "#1f2937"

    const chartTitle = "Category Treemap"
    const chartDescription = "Visualize spending categories as tiles. Larger tiles = more spending in that category."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Tile size = spending amount",
                    "Shows top 12 categories",
                    "Hover for details",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:categoryBubbles"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ categories: chartData?.children?.slice(0, 5) }}
                size="sm"
            />
        </div>
    )

    if (!mounted || !chartData) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:categoryBubbles" chartTitle={chartTitle} size="md" />
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
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:categoryBubbles" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Category spending tiles</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveTreeMap
                        data={chartData}
                        identity="id"
                        value="value"
                        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                        labelSkipSize={40}
                        labelTextColor="#ffffff"
                        colors={(node) => (node.data as TreeMapNode).color || "#6b7280"}
                        borderWidth={2}
                        borderColor={{ from: "color", modifiers: [["darker", 0.3]] }}
                        nodeOpacity={1}
                        tooltip={({ node }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="font-medium text-foreground">{node.id}</div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(node.value)}</div>
                            </div>
                        )}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
