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
    id: string
    receiptId: string
    receiptDate: string
    receiptTotalAmount: number
    [key: string]: any
}

interface ChartShoppingHeatmapDaysMonthsFridgeProps {
    receiptTransactions?: ReceiptTransaction[]
    isLoading?: boolean
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function ChartShoppingHeatmapDaysMonthsFridge({
    receiptTransactions = [],
    isLoading = false,
}: ChartShoppingHeatmapDaysMonthsFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)
    const chartRef = useRef<any>(null)

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
    }, [receiptTransactions])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const bgColor = isDark ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"

    const currencyFormatter = useMemo(() =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
        [])

    const option = useMemo(() => {
        if (heatmapData.length === 0 || activeMonths.length === 0) return null

        return {
            backgroundColor: bgColor,
            tooltip: {
                position: "top",
                formatter: (params: any) => {
                    const month = activeMonths[params.data[0]]
                    const day = DAYS[params.data[1]]
                    const amount = params.data[2]
                    return `
            <div style="font-size: 12px">
              <strong>${day} in ${month}</strong><br/>
              $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent
            </div>
          `
                },
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
                text: [currencyFormatter.format(maxValue), "$0"],
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
                        show: maxValue > 0, // Show labels logic
                        formatter: (params: any) => "", // Hide text inside cells for cleaner look with amounts
                        fontSize: 10,
                        color: textColor,
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
    }, [heatmapData, maxValue, activeMonths, textColor, bgColor, palette, isDark, currencyFormatter])

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
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center text-muted-foreground">
                        No shopping data available
                    </div>
                </CardContent>
            </Card>
        )
    }

    const spendingFormatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
    })

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
                <div className="h-full w-full min-h-[250px]">
                    <ReactECharts
                        ref={chartRef}
                        option={option}
                        style={{ height: "100%", width: "100%" }}
                        opts={{ renderer: "svg" }}
                        notMerge={true}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
