"use client"

// Grocery Shopping Heatmap - Days of Week (Y) x Months (X)
// Shows shopping patterns across days and months
import * as React from "react"
import { useMemo, useState, useEffect, useRef } from "react"
import ReactECharts from "echarts-for-react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

interface ReceiptTransaction {
    id: string | number
    receiptId: string
    receiptDate: string
    receiptTotalAmount: number
    [key: string]: any
}

interface ChartShoppingHeatmapDaysMonthsFridgeProps {
    receiptTransactions?: ReceiptTransaction[]
    dayMonthHeatmapData?: Array<{ dayOfWeek: number; month: number; total: number; count: number }>
    isLoading?: boolean
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function ChartShoppingHeatmapDaysMonthsFridge({
    receiptTransactions = [],
    dayMonthHeatmapData,
    isLoading = false,
}: ChartShoppingHeatmapDaysMonthsFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency, symbol } = useCurrency()
    const [mounted, setMounted] = useState(false)
    const chartRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Custom tooltip state
    const [tooltip, setTooltip] = useState<{ day: string; month: string; amount: number } | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    const palette = useMemo(() => {
        const base = getPalette().filter((color) => color !== "#c3c3c3")
        // Use a different color than the hours heatmap for visual distinction
        return base.length > 1 ? base[1] : base.length > 0 ? base[0] : "#3b82f6"
    }, [getPalette])

    // Process data into heatmap format
    const { heatmapData, maxValue, totalSpent, activeMonths } = useMemo(() => {
        // Use bundle data if available (pre-computed by server)
        if (dayMonthHeatmapData && dayMonthHeatmapData.length > 0) {
            const monthsWithData = new Set<number>()
            const amountMatrix = new Map<string, number>()
            let total = 0
            let max = 0

            dayMonthHeatmapData.forEach(h => {
                // Convert dayOfWeek from SQL (0=Sun) to display (0=Mon)
                const day = h.dayOfWeek === 0 ? 6 : h.dayOfWeek - 1
                const month = h.month - 1 // SQL months are 1-12, convert to 0-11
                const key = `${month}-${day}`
                amountMatrix.set(key, h.total)
                total += h.total
                if (h.total > max) max = h.total
                monthsWithData.add(month)
            })

            const sortedMonths = Array.from(monthsWithData).sort((a, b) => a - b)
            const data: [number, number, number][] = []

            sortedMonths.forEach((month, monthIndex) => {
                for (let day = 0; day < 7; day++) {
                    const key = `${month}-${day}`
                    const amount = amountMatrix.get(key) || 0
                    data.push([monthIndex, day, Number(amount.toFixed(2))])
                }
            })

            return { heatmapData: data, maxValue: max, totalSpent: total, activeMonths: sortedMonths.map(m => MONTHS[m]) }
        }

        // Fallback to raw transactions
        if (!receiptTransactions || receiptTransactions.length === 0) {
            return { heatmapData: [], maxValue: 0, totalSpent: 0, activeMonths: [] }
        }

        // Process unique receipts
        const receiptMap = new Map<string, { day: number; month: number; amount: number }>()
        const monthsWithData = new Set<number>()

        receiptTransactions.forEach((tx) => {
            if (!tx.receiptId || !tx.receiptDate) return
            if (receiptMap.has(tx.receiptId)) return

            const date = new Date(tx.receiptDate)
            const dayOfWeek = (date.getDay() + 6) % 7
            const month = date.getMonth()

            receiptMap.set(tx.receiptId, {
                day: dayOfWeek,
                month,
                amount: tx.receiptTotalAmount || tx.totalPrice || 0
            })
            monthsWithData.add(month)
        })

        // Get sorted list of months with data
        const sortedMonths = Array.from(monthsWithData).sort((a, b) => a - b)

        // Build spending matrix
        const amountMatrix = new Map<string, number>()
        let total = 0
        receiptMap.forEach(({ day, month, amount }) => {
            const key = `${month}-${day}`
            amountMatrix.set(key, (amountMatrix.get(key) || 0) + amount)
            total += amount
        })

        const data: [number, number, number][] = []
        let max = 0

        sortedMonths.forEach((month, monthIndex) => {
            for (let day = 0; day < 7; day++) {
                const key = `${month}-${day}`
                const amount = amountMatrix.get(key) || 0
                data.push([monthIndex, day, Number(amount.toFixed(2))])
                if (amount > max) max = amount
            }
        })

        return {
            heatmapData: data,
            maxValue: max,
            totalSpent: total,
            activeMonths: sortedMonths.map(m => MONTHS[m])
        }
    }, [receiptTransactions, dayMonthHeatmapData])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const bgColor = isDark ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"

    const currencyFormatter = useMemo(() => ({
        format: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 })
    }), [formatCurrency])

    // Handle ECharts events for custom tooltip
    const onEvents = useMemo(() => ({
        mouseover: (params: any) => {
            if (params.componentType === 'series' && params.data) {
                const month = activeMonths[params.data[0]]
                const day = DAYS[params.data[1]]
                const amount = params.data[2]
                setTooltip({ day, month, amount })
            }
        },
        mouseout: () => {
            setTooltip(null)
            setTooltipPosition(null)
        },
        globalout: () => {
            setTooltip(null)
            setTooltipPosition(null)
        }
    }), [activeMonths])

    // Track mouse position for smooth tooltip
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect()
            const position = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            }
            if (tooltip) {
                setTooltipPosition(position)
            }
        }

        const handleMouseLeave = () => {
            setTooltip(null)
            setTooltipPosition(null)
        }

        container.addEventListener("mousemove", handleMouseMove)
        container.addEventListener("mouseleave", handleMouseLeave)

        return () => {
            container.removeEventListener("mousemove", handleMouseMove)
            container.removeEventListener("mouseleave", handleMouseLeave)
        }
    }, [tooltip])

    const option = useMemo(() => {
        if (heatmapData.length === 0 || activeMonths.length === 0) return null

        return {
            backgroundColor: bgColor,
            tooltip: {
                show: false, // Disable ECharts tooltip, we'll use custom React tooltip
            },
            grid: {
                top: 10,
                bottom: 60,
                left: 50,
                right: 60,
            },
            xAxis: {
                type: "category",
                data: activeMonths,
                splitArea: { show: true },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    rotate: activeMonths.length > 6 ? 45 : 0,
                },
                axisLine: { lineStyle: { color: textColor } },
            },
            yAxis: {
                type: "category",
                data: DAYS,
                splitArea: { show: true },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                },
                axisLine: { lineStyle: { color: textColor } },
            },
            visualMap: {
                min: 0,
                max: Math.max(maxValue, 1),
                calculable: false,
                orient: "vertical",
                right: 0,
                top: "center",
                text: [currencyFormatter.format(maxValue), `${symbol}0`],
                textStyle: { color: textColor, fontSize: 10 },
                inRange: {
                    color: isDark
                        ? ["#1e293b", palette]
                        : ["#f1f5f9", palette],
                },
            },
            series: [
                {
                    name: "Spending",
                    type: "heatmap",
                    data: heatmapData,
                    label: {
                        show: false,
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: "rgba(0, 0, 0, 0.5)",
                        },
                    },
                },
            ],
        }
    }, [heatmapData, maxValue, activeMonths, textColor, bgColor, palette, isDark, currencyFormatter, symbol])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Monthly Shopping Patterns"
                description="Shopping frequency by day of week across months"
                details={[
                    "Y-axis shows days of the week.",
                    "X-axis shows months with shopping data.",
                    "Darker cells indicate more shopping trips on that day in that month.",
                ]}
                ignoredFootnote="Based on receipt dates. Only months with data are shown."
            />
            <ChartAiInsightButton
                chartId="fridge:shoppingHeatmapDaysMonths"
                chartTitle="Monthly Shopping Patterns"
                chartDescription="Shopping frequency by day of week across months"
                chartData={{
                    totalSpent,
                    maxSpentAtOnce: maxValue,
                    monthsWithData: activeMonths.length,
                }}
                size="sm"
            />
        </div>
    )

    if (!mounted || isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:shoppingHeatmapDaysMonths"
                            chartTitle="Monthly Shopping Patterns"
                            size="md"
                        />
                        <CardTitle>Monthly Shopping Patterns</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={true} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!option || totalSpent === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:shoppingHeatmapDaysMonths"
                            chartTitle="Monthly Shopping Patterns"
                            size="md"
                        />
                        <CardTitle>Monthly Shopping Patterns</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState emptyIcon="receipt" emptyDescription="Scan receipts to see monthly shopping patterns" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    const spendingFormatter = {
        format: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 })
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="fridge:shoppingHeatmapDaysMonths"
                        chartTitle="Monthly Shopping Patterns"
                        size="md"
                    />
                    <CardTitle>Monthly Shopping Patterns</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Shopping spending by day across {activeMonths.length} month{activeMonths.length !== 1 ? "s" : ""}
                    </span>
                    <span className="@[540px]/card:hidden">Days × Months</span>
                </CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div ref={containerRef} className="relative h-full w-full min-h-[250px]">
                    <ReactECharts
                        ref={chartRef}
                        option={option}
                        style={{ height: "100%", width: "100%" }}
                        opts={{ renderer: "svg" }}
                        notMerge={true}
                        onEvents={onEvents}
                    />
                    {/* Custom React tooltip */}
                    <div
                        className={`pointer-events-none absolute z-10 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl transition-opacity duration-150 ${tooltip && tooltipPosition ? 'opacity-100' : 'opacity-0'
                            }`}
                        style={{
                            left: tooltipPosition ? `${tooltipPosition.x + 16}px` : 0,
                            top: tooltipPosition ? `${tooltipPosition.y - 16}px` : 0,
                            transform: 'translate(0, -100%)',
                        }}
                    >
                        {tooltip && (
                            <>
                                <div className="font-medium text-foreground mb-1.5">
                                    {tooltip.day} in {tooltip.month}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                        style={{ backgroundColor: palette }}
                                    />
                                    <span className="text-muted-foreground">Spent</span>
                                    <span className="text-foreground font-mono font-medium tabular-nums">
                                        {formatCurrency(tooltip.amount)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
