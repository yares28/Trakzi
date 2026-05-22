"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, TooltipProps, ReferenceLine } from "recharts"
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
import { CHART_GRID_COLOR } from "@/lib/chart-colors"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { ChartTooltipWrapper } from "@/components/chart-tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

const CHART_TITLE = "Month-over-Month Growth"
const CHART_DESCRIPTION =
    "Track your spending growth rate month-over-month. Positive values indicate increased spending, negative values indicate decreased spending."

interface ChartMoMGrowthProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}

interface FlatGrowthPoint {
    month: string
    growth: number
    prevValue: number
    currValue: number
}

interface MoMGrowthChartProps {
    flatData: FlatGrowthPoint[]
    growthColor: string
    forFullscreen?: boolean
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_NAMES_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const MoMGrowthChart = memo(function MoMGrowthChart({
    flatData,
    growthColor,
    forFullscreen = false,
}: MoMGrowthChartProps) {
    const isMobile = useIsMobile()
    const [useRealData, setUseRealData] = useState(false)
    useEffect(() => {
        const rafId = requestAnimationFrame(() => setUseRealData(true))
        return () => cancelAnimationFrame(rafId)
    }, [])
    const displayData = useRealData ? flatData : []

    const chartConfig = {
        growth: {
            label: "Growth Rate",
            theme: { light: growthColor, dark: growthColor },
        },
    } satisfies ChartConfig

    const tooltipContent = (props: TooltipProps<number, string>) => {
        const { active, payload } = props
        if (!active || !payload?.length) return null
        const point = payload[0]?.payload as FlatGrowthPoint
        const pct = point.growth
        const sign = pct > 0 ? "+" : ""
        const [year, month] = point.month.split("-")
        return (
            <ChartTooltipWrapper>
                <div className="font-medium text-foreground mb-1 whitespace-nowrap">
                    {MONTH_NAMES_LONG[parseInt(month) - 1]} {year}
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: growthColor }} />
                    <span className="text-foreground/80">Growth:</span>
                    <span className="font-mono text-[0.7rem] text-foreground font-medium">
                        {sign}{pct.toFixed(1)}%
                    </span>
                </div>
                <div className="text-[0.65rem] text-foreground/50 mt-1">vs previous month</div>
            </ChartTooltipWrapper>
        )
    }

    const chartHeight = forFullscreen ? "h-full" : `h-full ${isMobile ? "min-h-[210px]" : "min-h-[280px]"}`

    return (
        <ChartContainer config={chartConfig} className={`${chartHeight} flex-1 w-full min-w-0`}>
            <AreaChart data={displayData} margin={{ top: 10, right: 10, bottom: 8, left: 0 }}>
                <defs>
                    <linearGradient id="fillGrowthMoM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-growth)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-growth)" stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={30}
                    tickFormatter={(v) => {
                        const [year, month] = v.split("-")
                        return `${MONTH_NAMES_SHORT[parseInt(month) - 1]} ${year.slice(2)}`
                    }}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
                    width={50}
                />
                <ReferenceLine y={0} stroke={CHART_GRID_COLOR} strokeDasharray="4 4" strokeWidth={1.5} />
                <Area
                    dataKey="growth"
                    type="monotone"
                    fill="url(#fillGrowthMoM)"
                    stroke="var(--color-growth)"
                    strokeWidth={2.5}
                    baseValue={0}
                    connectNulls
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-out"
                />
                <Tooltip cursor={false} content={tooltipContent} />
            </AreaChart>
        </ChartContainer>
    )
})

MoMGrowthChart.displayName = "MoMGrowthChart"

export const ChartMoMGrowth = memo(function ChartMoMGrowth({
    data,
    isLoading = false,
    emptyTitle,
    emptyDescription,
}: ChartMoMGrowthProps) {
    const { getPalette } = useColorScheme()
    const isMobile = useIsMobile()
    const [mounted, setMounted] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const palette = useMemo(() => getPalette(), [getPalette])
    const growthColor = palette[2] || "#8b5cf6"

    useEffect(() => {
        setMounted(true)
    }, [])

    const { flatData, hasInsufficientData } = useMemo(() => {
        if (!data || data.length === 0) return { flatData: [], hasInsufficientData: false }

        const monthlyTotals = new Map<string, number>()
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = new Date(tx.date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
            monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + Math.abs(tx.amount))
        })

        if (monthlyTotals.size < 2) return { flatData: [], hasInsufficientData: true }

        const sortedMonths = Array.from(monthlyTotals.keys()).sort()
        const points: FlatGrowthPoint[] = []
        for (let i = 1; i < sortedMonths.length; i++) {
            const prevValue = monthlyTotals.get(sortedMonths[i - 1]) || 0
            const currValue = monthlyTotals.get(sortedMonths[i]) || 0
            points.push({
                month: sortedMonths[i],
                growth: prevValue > 0 ? ((currValue - prevValue) / prevValue) * 100 : 0,
                prevValue,
                currValue,
            })
        }

        return { flatData: points, hasInsufficientData: false }
    }, [data])

    const chartDataForAI = useMemo(() => {
        if (!flatData.length) return {}
        const values = flatData.map((d) => d.growth)
        return {
            averageGrowth: values.reduce((a, b) => a + b, 0) / values.length,
            latestGrowth: values[values.length - 1],
            months: values.length,
        }
    }, [flatData])

    const renderInfoTrigger = (forFullscreen = false) => (
        <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
            <ChartInfoPopover
                title={CHART_TITLE}
                description={CHART_DESCRIPTION}
                details={[
                    "Positive = spending increased",
                    "Negative = spending decreased",
                    "0% = same as previous month",
                    "Based on total monthly expenses",
                ]}
            />
            <ChartAiInsightButton
                chartId="momGrowth"
                chartTitle={CHART_TITLE}
                chartDescription={CHART_DESCRIPTION}
                chartData={chartDataForAI}
                size="sm"
            />
        </div>
    )

    const isEmpty = !mounted || isLoading || hasInsufficientData || !flatData.length

    if (isEmpty) {
        return (
            <Card className="@container/card h-full relative" suppressHydrationWarning>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="momGrowth" chartTitle={CHART_TITLE} size="md" />
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
                            skeletonType="area"
                            emptyTitle={hasInsufficientData ? "Not enough data" : (emptyTitle || "No spending data yet")}
                            emptyDescription={hasInsufficientData ? "Need data from 2+ months to calculate growth" : (emptyDescription || "Import your bank statements to track month-over-month growth.")}
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
                headerActions={renderInfoTrigger(true)}
            >
                <div className="h-full w-full min-h-[400px]">
                    <MoMGrowthChart flatData={flatData} growthColor={growthColor} forFullscreen />
                </div>
            </ChartFullscreenModal>

            <Card className="@container/card h-full relative">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton chartId="momGrowth" chartTitle={CHART_TITLE} size="md" />
                        <CardTitle>{CHART_TITLE}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-2 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
                    <div className="flex min-h-0 flex-1">
                        <MoMGrowthChart flatData={flatData} growthColor={growthColor} />
                    </div>
                    <div
                        className={`mt-2 flex items-center justify-center text-muted-foreground ${isMobile ? "flex-col gap-1 text-[11px]" : "flex-wrap gap-x-3 gap-y-1 text-xs"}`}
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: growthColor }} />
                            <span className="font-medium text-foreground">Growth Rate</span>
                        </div>
                        <span className="text-[0.7rem]">
                            {(() => {
                                const latest = flatData[flatData.length - 1]?.growth ?? 0
                                return `${latest > 0 ? "+" : ""}${latest.toFixed(1)}% latest`
                            })()}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </>
    )
})

ChartMoMGrowth.displayName = "ChartMoMGrowth"
