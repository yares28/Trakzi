"use client"

import { memo, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"

import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { HoverableBar } from "@/components/chart-hoverable-bar"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { getChartAxisLineColor, getChartTextColor } from "@/lib/chart-colors"

const CHART_ID = "testCharts:weekendSpendingShare"
const CHART_TITLE = "Weekend Spending Share"
const CHART_DESCRIPTION =
    "Track how much of each month’s spending lands on weekends. A rising share usually points to more social, leisure, or impulse-driven spending."

interface ChartWeekendSpendingShareProps {
    data?: Array<{
        date: string
        amount: number
        description?: string
        category?: string
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}

export const ChartWeekendSpendingShare = memo(function ChartWeekendSpendingShare({
    data = [],
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartWeekendSpendingShareProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette, colorScheme } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const [isFullscreen, setIsFullscreen] = useState(false)

    const isDark = resolvedTheme === "dark"

    const chartColors = useMemo(() => {
        const palette = getPalette().filter((color) => color !== "#c3c3c3")
        return isDark ? [...palette].reverse() : palette
    }, [getPalette, isDark])

    const chartData = useMemo(() => {
        const monthlyTotals = new Map<
            string,
            { monthKey: string; total: number; weekend: number; count: number }
        >()

        for (const transaction of data) {
            if (transaction.amount >= 0) continue

            const date = new Date(`${transaction.date}T12:00:00`)
            if (Number.isNaN(date.getTime())) continue

            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            const amount = Math.abs(transaction.amount)
            const day = date.getDay()
            const isWeekendDay = day === 0 || day === 6

            const current = monthlyTotals.get(monthKey) ?? {
                monthKey,
                total: 0,
                weekend: 0,
                count: 0,
            }

            current.total += amount
            current.weekend += isWeekendDay ? amount : 0
            current.count += 1

            monthlyTotals.set(monthKey, current)
        }

        return Array.from(monthlyTotals.values())
            .sort((left, right) => left.monthKey.localeCompare(right.monthKey))
            .slice(-8)
            .map((entry, index, collection) => {
                const weekendShare = entry.total > 0 ? (entry.weekend / entry.total) * 100 : 0
                const previousShare =
                    index > 0 && collection[index - 1]
                        ? collection[index - 1].total > 0
                            ? (collection[index - 1].weekend / collection[index - 1].total) * 100
                            : 0
                        : weekendShare
                const delta = weekendShare - previousShare
                const date = new Date(`${entry.monthKey}-01T12:00:00`)
                const label = new Intl.DateTimeFormat("en", {
                    month: "short",
                    year: "2-digit",
                }).format(date)
                const isLatest = index === collection.length - 1
                const subduedColor = isDark ? "#52525b" : "#d4d4d8"
                const color =
                    isLatest
                        ? chartColors[0] ?? "#e78a53"
                        : weekendShare >= 38
                            ? chartColors[2] ?? chartColors[0] ?? "#e78a53"
                            : weekendShare >= 30
                                ? chartColors[4] ?? chartColors[1] ?? "#f59e0b"
                                : subduedColor

                return {
                    month: label,
                    weekendShare,
                    weekendSpend: entry.weekend,
                    weekdaySpend: Math.max(entry.total - entry.weekend, 0),
                    totalSpend: entry.total,
                    transactionCount: entry.count,
                    delta,
                    color,
                }
            })
    }, [chartColors, data, isDark])

    const summary = useMemo(() => {
        if (chartData.length === 0) {
            return null
        }

        const latest = chartData[chartData.length - 1]
        const averageShare =
            chartData.reduce((sum, item) => sum + item.weekendShare, 0) / chartData.length
        const highestShare = chartData.reduce(
            (highest, item) => (item.weekendShare > highest.weekendShare ? item : highest),
            chartData[0],
        )

        return {
            latestShare: latest.weekendShare,
            latestWeekendSpend: latest.weekendSpend,
            averageShare,
            highestMonth: highestShare.month,
            highestShare: highestShare.weekendShare,
            changeVsPrevious: latest.delta,
        }
    }, [chartData])

    const textColor = getChartTextColor(isDark)
    const gridColor = getChartAxisLineColor(isDark)

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Based on expense transactions only",
                    "Weekend means Saturday and Sunday",
                    "Best used to spot lifestyle drift across months",
                ]}
            />
            <ChartAiInsightButton
                chartId={CHART_ID}
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={{
                    summary,
                    months: chartData.map((item) => ({
                        month: item.month,
                        share: Number(item.weekendShare.toFixed(1)),
                        weekendSpend: item.weekendSpend,
                        weekdaySpend: item.weekdaySpend,
                    })),
                }}
                size="sm"
            />
        </div>
    )

    const chart = (
        <div className="h-full w-full min-h-[260px]" key={colorScheme}>
            <ResponsiveBar
                data={chartData}
                keys={["weekendShare"]}
                indexBy="month"
                margin={{ top: 12, right: 18, bottom: 48, left: 58 }}
                padding={0.32}
                colors={({ data: datum }) => String(datum.color)}
                borderRadius={8}
                enableLabel
                label={(datum) => `${Math.round(Number(datum.value))}%`}
                labelSkipWidth={28}
                labelSkipHeight={18}
                labelTextColor={{ from: "color", modifiers: [["brighter", 2.8]] }}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 12,
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (value: number) => `${Math.round(value)}%`,
                }}
                valueScale={{ type: "linear", min: 0, max: 100 }}
                enableGridY
                enableGridX={false}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                barComponent={HoverableBar as any}
                theme={{
                    text: { fill: textColor, fontSize: 11 },
                    axis: { ticks: { text: { fill: textColor } } },
                    grid: { line: { stroke: gridColor, strokeDasharray: "4 4" } },
                }}
                tooltip={({ data: datum, color }) => (
                    <NivoChartTooltip
                        title={`${datum.month} · ${Math.round(Number(datum.weekendShare))}% weekend share`}
                        titleColor={color}
                        value={formatCurrency(Number(datum.weekendSpend))}
                        subValue={`${formatCurrency(Number(datum.weekdaySpend))} weekday`}
                    />
                )}
                animate
                motionConfig="gentle"
            />
        </div>
    )

    if (isLoading || chartData.length === 0 || !summary) {
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
                    <div className="h-full w-full min-h-[320px]">
                        <ChartLoadingState
                            isLoading={isLoading}
                            skeletonType="bar"
                            emptyTitle={emptyTitle ?? "No weekend signal yet"}
                            emptyDescription={
                                emptyDescription ??
                                "Import transactions to see how much of your monthly spending lands on weekends."
                            }
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
                headerActions={renderInfoTrigger()}
            >
                {chart}
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
                <CardContent className="flex flex-1 min-h-0 flex-col gap-4 px-3 pt-3 sm:px-6 sm:pt-6">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/50 bg-muted/35 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Latest month
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-foreground">
                                {summary.latestShare.toFixed(1)}%
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                {formatCurrency(summary.latestWeekendSpend)} weekend spend
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/50 bg-muted/35 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Multi-month baseline
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-foreground">
                                {summary.averageShare.toFixed(1)}%
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                {summary.changeVsPrevious >= 0 ? "+" : ""}
                                {summary.changeVsPrevious.toFixed(1)} pts vs previous month
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/50 bg-muted/35 px-4 py-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Peak weekend tilt
                            </div>
                            <div className="mt-2 text-2xl font-semibold text-foreground">
                                {summary.highestShare.toFixed(1)}%
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                Highest share in {summary.highestMonth}
                            </div>
                        </div>
                    </div>

                    {chart}
                </CardContent>
            </Card>
        </>
    )
})

ChartWeekendSpendingShare.displayName = "ChartWeekendSpendingShare"
