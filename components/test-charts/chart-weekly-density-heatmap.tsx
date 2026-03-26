"use client"
import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
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

const CHART_TITLE = "Weekly Transaction Density"
const CHART_DESCRIPTION =
    "Which weeks of the year are your busiest? Each cell = one week, color = transaction count."

interface TestChartsTransaction {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

interface ChartWeeklyDensityHeatmapProps {
    data: TestChartsTransaction[]
    isLoading?: boolean
}

function getISOWeek(date: Date): { year: number; week: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return {
        year: d.getUTCFullYear(),
        week: Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7),
    }
}

export const ChartWeeklyDensityHeatmap = memo(function ChartWeeklyDensityHeatmap({
    data,
    isLoading = false,
}: ChartWeeklyDensityHeatmapProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; count: number; expense: number } | null>(null)

    useEffect(() => { setMounted(true) }, [])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const { weekMap, maxCount, years } = useMemo(() => {
        if (!data || data.length === 0) return { weekMap: new Map<string, { count: number; expense: number }>(), maxCount: 0, years: [] as number[] }

        const map = new Map<string, { count: number; expense: number }>()
        const yearSet = new Set<number>()

        data.forEach((tx) => {
            const d = new Date(tx.date)
            const { year, week } = getISOWeek(d)
            yearSet.add(year)
            const key = `${year}-W${String(week).padStart(2, "0")}`
            const existing = map.get(key) || { count: 0, expense: 0 }
            existing.count += 1
            if (tx.amount < 0) existing.expense += Math.abs(tx.amount)
            map.set(key, existing)
        })

        const max = Math.max(...Array.from(map.values()).map((v) => v.count), 1)
        return { weekMap: map, maxCount: max, years: Array.from(yearSet).sort() }
    }, [data])

    const baseColor = palette[0] || "#fe8339"

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 254, g: 131, b: 57 }
    }

    const { r, g, b } = hexToRgb(baseColor)

    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Darker = more transactions that week",
                    "Identify high-activity periods",
                    "Useful for spotting seasonal shopping patterns",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:weeklyDensityHeatmap"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{ totalWeeks: weekMap.size, maxCount }}
                size="sm"
            />
        </div>
    )

    if (!mounted || weekMap.size === 0) {
        return (
            <Card className="@container/card h-full flex flex-col" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:weeklyDensityHeatmap" chartTitle={CHART_TITLE} size="md" />
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
                            emptyDescription="Upload transactions to see weekly density"
                        />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    const renderHeatmap = (compact = false) => (
        <div className={`h-full w-full min-h-[250px] overflow-x-auto ${compact ? "" : "min-h-[300px]"}`} key={colorScheme}>
            {years.map((year) => (
                <div key={year} className="mb-4">
                    <div className="text-xs font-semibold mb-2" style={{ color: textColor }}>{year}</div>
                    <div className="flex gap-0.5 flex-wrap">
                        {monthLabels.map((monthLabel, monthIdx) => {
                            const weeksInMonth: { key: string; label: string }[] = []
                            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
                            const seenWeeks = new Set<number>()
                            for (let day = 1; day <= daysInMonth; day++) {
                                const d = new Date(year, monthIdx, day)
                                const { week } = getISOWeek(d)
                                if (!seenWeeks.has(week)) {
                                    seenWeeks.add(week)
                                    const key = `${year}-W${String(week).padStart(2, "0")}`
                                    weeksInMonth.push({ key, label: `Week ${week}` })
                                }
                            }
                            return (
                                <div key={monthLabel} className="flex flex-col items-center gap-0.5">
                                    <span className="text-[9px]" style={{ color: gridColor }}>{monthLabel}</span>
                                    <div className="flex flex-col gap-0.5">
                                        {weeksInMonth.map(({ key, label }) => {
                                            const entry = weekMap.get(key)
                                            const count = entry?.count || 0
                                            const expense = entry?.expense || 0
                                            const opacity = count > 0 ? 0.15 + 0.85 * (count / maxCount) : 0.07
                                            return (
                                                <div
                                                    key={key}
                                                    className="w-4 h-4 rounded-sm cursor-pointer transition-transform hover:scale-125"
                                                    style={{ backgroundColor: `rgba(${r},${g},${b},${opacity})`, border: `1px solid ${gridColor}` }}
                                                    title={`${label}: ${count} txns, ${formatCurrency(expense)}`}
                                                    onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, label: `${year} ${label}`, count, expense })}
                                                    onMouseLeave={() => setTooltip(null)}
                                                />
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
            {tooltip && (
                <div
                    className="fixed z-50 pointer-events-none rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                    style={{ top: tooltip.y - 70, left: tooltip.x + 12 }}
                >
                    <div className="font-medium text-foreground">{tooltip.label}</div>
                    <div className="text-foreground/70">{tooltip.count} transactions</div>
                    <div className="font-mono text-foreground/80">{formatCurrency(tooltip.expense)} spent</div>
                </div>
            )}
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
                    {renderHeatmap()}
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="testCharts:weeklyDensityHeatmap" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    {renderHeatmap(true)}
                </CardContent>
            </Card>
        </>
    )
})

ChartWeeklyDensityHeatmap.displayName = "ChartWeeklyDensityHeatmap"
