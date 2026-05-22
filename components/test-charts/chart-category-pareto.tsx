"use client"
import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts"
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
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"

const CHART_TITLE = "Category Pareto (80/20 Rule)"
const CHART_DESCRIPTION = "Do 20% of your categories account for 80% of spending? Classic Pareto analysis."

interface TestChartsTransaction {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

interface ChartCategoryParetoProps {
    data: TestChartsTransaction[]
    isLoading?: boolean
}

export const ChartCategoryPareto = memo(function ChartCategoryPareto({
    data,
    isLoading = false,
}: ChartCategoryParetoProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        const categoryTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const cat = tx.category?.trim() || "Other"
            categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(tx.amount))
        })

        if (categoryTotals.size === 0) return []

        const sorted = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])
        const total = sorted.reduce((s, [, v]) => s + v, 0)
        if (total === 0) return []

        let cumulative = 0
        const paletteLen = palette.length || 1
        return sorted.slice(0, 12).map(([category, amount], i) => {
            cumulative += amount
            return {
                category: category.length > 12 ? category.slice(0, 12) + "…" : category,
                amount: Math.round(amount * 100) / 100,
                cumulativePct: Math.round((cumulative / total) * 1000) / 10,
                color: palette[i % paletteLen] || "#fe8339",
            }
        })
    }, [data, palette])

    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "80% rule: focus on top few categories",
                    "Use this to identify where cuts matter most",
                    "Cumulative line shows concentration",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:categoryPareto"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ categories: chartData.length }}
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
                        <ChartFavoriteButton chartId="testCharts:categoryPareto" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading || !mounted} skeletonType="bar" emptyTitle="No data" emptyDescription="No expense data available for Pareto analysis." />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const lineColor = palette[Math.min(4, palette.length - 1)] || "#6366f1"

    const renderChart = () => (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 50, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                    dataKey="category"
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                    height={60}
                />
                <YAxis
                    yAxisId="left"
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `$${v}`}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: isDark ? "#1f2937" : "#ffffff",
                        border: `1px solid ${gridColor}`,
                        borderRadius: 8,
                        fontSize: 12,
                        color: isDark ? "#f9fafb" : "#111827",
                    }}
                    formatter={(value: number, name: string) => {
                        if (name === "amount") return [formatCurrency(value), "Spend"]
                        if (name === "cumulativePct") return [`${value}%`, "Cumulative %"]
                        return [value, name]
                    }}
                />
                <Legend
                    wrapperStyle={{ color: textColor, fontSize: 12 }}
                    formatter={(value: string) => value === "amount" ? "Spend" : "Cumulative %"}
                />
                <Bar yAxisId="left" dataKey="amount" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePct"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={{ r: 4, fill: lineColor }}
                    activeDot={{ r: 6 }}
                />
            </ComposedChart>
        </ResponsiveContainer>
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
                    {renderChart()}
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:categoryPareto" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                        {renderChart()}
                    </div>
                </CardContent>
            </Card>
        </>
    )
})
ChartCategoryPareto.displayName = "ChartCategoryPareto"
