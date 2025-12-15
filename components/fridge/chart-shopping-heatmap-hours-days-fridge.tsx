"use client"

// Grocery Shopping Heatmap - Hours (Y) x Days of Week (X)
// Shows when the user typically goes grocery shopping
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
    receiptTime: string | null
    receiptTotalAmount: number
    [key: string]: any
}

interface ChartShoppingHeatmapHoursDaysFridgeProps {
    receiptTransactions?: ReceiptTransaction[]
    isLoading?: boolean
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`)

export function ChartShoppingHeatmapHoursDaysFridge({
    receiptTransactions = [],
    isLoading = false,
}: ChartShoppingHeatmapHoursDaysFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)
    const chartRef = useRef<any>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    const palette = useMemo(() => {
        const base = getPalette().filter((color) => color !== "#c3c3c3")
        return base.length > 0 ? base[0] : "#22c55e"
    }, [getPalette])

    // Process data into heatmap format
    const { heatmapData, maxValue, totalSpent } = useMemo(() => {
        if (!receiptTransactions || receiptTransactions.length === 0) {
            return { heatmapData: [], maxValue: 0, totalSpent: 0 }
        }

        // Process unique receipts
        const receiptMap = new Map<string, { day: number; hour: number; amount: number }>()

        receiptTransactions.forEach((tx) => {
            if (!tx.receiptId || !tx.receiptDate) return
            if (receiptMap.has(tx.receiptId)) return

            const date = new Date(tx.receiptDate)
            const dayOfWeek = (date.getDay() + 6) % 7 // 0 = Mon

            let hour = 12
            if (tx.receiptTime) {
                const timeParts = tx.receiptTime.split(":")
                if (timeParts.length >= 1) {
                    hour = parseInt(timeParts[0], 10)
                    if (isNaN(hour)) hour = 12
                }
            } else {
                const hash = tx.receiptId.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
                hour = 9 + (hash % 12)
            }

            receiptMap.set(tx.receiptId, {
                day: dayOfWeek,
                hour,
                amount: tx.receiptTotalAmount || tx.totalPrice || 0
            })
        })

        // Build spending matrix
        const amountMatrix = new Map<string, number>()
        let total = 0
        receiptMap.forEach(({ day, hour, amount }) => {
            const key = `${day}-${hour}`
            amountMatrix.set(key, (amountMatrix.get(key) || 0) + amount)
            total += amount
        })

        const data: [number, number, number][] = []
        let max = 0

        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const key = `${day}-${hour}`
                const amount = amountMatrix.get(key) || 0
                data.push([day, hour, Number(amount.toFixed(2))])
                if (amount > max) max = amount
            }
        }

        return {
            heatmapData: data,
            maxValue: max,
            totalSpent: total
        }
    }, [receiptTransactions])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const bgColor = isDark ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"

    const currencyFormatter = useMemo(() =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
        [])

    const option = useMemo(() => {
        if (heatmapData.length === 0) return null

        return {
            backgroundColor: bgColor,
            tooltip: {
                position: "top",
                formatter: (params: any) => {
                    const day = DAYS[params.data[0]]
                    const hour = HOURS[params.data[1]]
                    const amount = params.data[2]
                    return `
            <div style="font-size: 12px">
              <strong>${day} at ${hour}</strong><br/>
              $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent
            </div>
          `
                },
            },
            grid: {
                top: 10,
                bottom: 50,
                left: 60,
                right: 60,
            },
            xAxis: {
                type: "category",
                data: DAYS,
                splitArea: { show: true },
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                },
                axisLine: { lineStyle: { color: textColor } },
            },
            yAxis: {
                type: "category",
                data: HOURS,
                splitArea: { show: true },
                axisLabel: {
                    color: textColor,
                    fontSize: 10,
                    interval: 1,
                },
                axisLine: { lineStyle: { color: textColor } },
                inverse: true,
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
    }, [heatmapData, maxValue, textColor, bgColor, palette, isDark, currencyFormatter])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Shopping Hours Heatmap"
                description="When you typically go grocery shopping during the week"
                details={[
                    "Y-axis shows hours of the day (00:00 - 23:00).",
                    "X-axis shows days of the week.",
                    "Darker cells indicate more shopping trips at that time.",
                ]}
                ignoredFootnote="Based on receipt timestamps. Some times may be estimated if not available."
            />
            <ChartAiInsightButton
                chartId="fridge:shoppingHeatmapHoursDays"
                chartTitle="Shopping Hours Heatmap"
                chartDescription="When you typically go grocery shopping during the week"
                chartData={{
                    totalSpent,
                    maxSpentAtOnce: maxValue,
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
                            chartId="fridge:shoppingHeatmapHoursDays"
                            chartTitle="Shopping Hours Heatmap"
                            size="md"
                        />
                        <CardTitle>Shopping Hours Heatmap</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[350px]">
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
                            chartId="fridge:shoppingHeatmapHoursDays"
                            chartTitle="Shopping Hours Heatmap"
                            size="md"
                        />
                        <CardTitle>Shopping Hours Heatmap</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[350px] flex items-center justify-center text-muted-foreground">
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
                        chartId="fridge:shoppingHeatmapHoursDays"
                        chartTitle="Shopping Hours Heatmap"
                        size="md"
                    />
                    <CardTitle>Shopping Hours Heatmap</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        When you spend the most on groceries ({spendingFormatter.format(totalSpent)} total)
                    </span>
                    <span className="@[540px]/card:hidden">{spendingFormatter.format(totalSpent)} total spending</span>
                </CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[350px]">
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
