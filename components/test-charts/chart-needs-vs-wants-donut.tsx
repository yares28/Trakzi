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
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"

interface ChartNeedsVsWantsDonutProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

const NEEDS_CATEGORIES = [
    'groceries', 'utilities', 'rent', 'mortgage', 'insurance', 'healthcare',
    'medical', 'pharmacy', 'gas', 'fuel', 'transportation', 'bills'
]

export function ChartNeedsVsWantsDonut({
    data,
    isLoading = false,
}: ChartNeedsVsWantsDonutProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        let needsTotal = 0
        let wantsTotal = 0

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const category = tx.category?.toLowerCase() || ''
            const isNeed = NEEDS_CATEGORIES.some(need => category.includes(need))

            if (isNeed) {
                needsTotal += Math.abs(tx.amount)
            } else {
                wantsTotal += Math.abs(tx.amount)
            }
        })

        if (needsTotal === 0 && wantsTotal === 0) return []

        return [
            { id: "Needs", label: "Needs", value: needsTotal, color: palette[1] || "#10b981" },
            { id: "Wants", label: "Wants", value: wantsTotal, color: palette[0] || "#fe8339" },
        ]
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"

    const chartTitle = "Needs vs Wants"
    const chartDescription = "See how much of your spending goes to necessities vs discretionary purchases."

    const total = chartData.reduce((sum, d) => sum + d.value, 0)
    const needsPercent = chartData.length > 0 ? (chartData[0].value / total) * 100 : 0

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Needs: groceries, utilities, bills, etc.",
                    "Wants: everything else",
                    "Aim for 50% or less on wants",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:needsVsWantsDonut"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ needsPercent, total }}
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
                        <ChartFavoriteButton chartId="testCharts:needsVsWantsDonut" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:needsVsWantsDonut" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Necessities vs extras</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsivePie
                        data={chartData}
                        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                        innerRadius={0.6}
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
                        valueFormat={(v) => `${((v / total) * 100).toFixed(0)}%`}
                        tooltip={({ datum }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: datum.color }} />
                                    <span className="font-medium text-foreground">{datum.label}</span>
                                </div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(Number(datum.value))}</div>
                                <div className="text-[0.7rem] text-foreground/60">{((Number(datum.value) / total) * 100).toFixed(1)}%</div>
                            </div>
                        )}
                        theme={{ text: { fill: textColor, fontSize: 12 } }}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
