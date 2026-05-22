"use client"

// Time of Day Shopping Chart for Fridge - Shows when you tend to go grocery shopping
import * as React from "react"
import { useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { getChartTextColor, getChartAxisLineColor } from "@/lib/chart-colors"
import { useCurrency } from "@/components/currency-provider"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { HoverableBar } from "@/components/chart-hoverable-bar"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
    Card,
  CardAction,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

type ReceiptTransactionRow = {
    id: number
    receiptId: string
    storeName: string | null
    receiptDate: string
    receiptTime: string
    receiptTotalAmount: number
    receiptStatus: string
    description: string
    quantity: number
    pricePerUnit: number
    totalPrice: number
    categoryId: number | null
    categoryTypeId?: number | null
    categoryName: string | null
    categoryColor: string | null
    categoryTypeName?: string | null
    categoryTypeColor?: string | null
}

interface ChartTimeOfDayShoppingFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    hourlyActivityData?: Array<{ hour: number; total: number; count: number }>
    isLoading?: boolean
}

const HOUR_LABELS = [
    "12AM", "1AM", "2AM", "3AM", "4AM", "5AM",
    "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
    "12PM", "1PM", "2PM", "3PM", "4PM", "5PM",
    "6PM", "7PM", "8PM", "9PM", "10PM", "11PM"
]

function parseReceiptHour(value?: string | null) {
    if (!value) return null
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null

    const match = normalized.match(/(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?/)
    if (!match) return null

    let hour = parseInt(match[1], 10)
    if (Number.isNaN(hour)) return null

    const meridiem = match[4]
    if (meridiem) {
        if (meridiem === "pm" && hour < 12) hour += 12
        if (meridiem === "am" && hour === 12) hour = 0
    }

    if (hour === 24) hour = 0
    if (hour < 0 || hour > 23) return null
    return hour
}

interface TimeOfDayInfoTriggerProps {
    processedData: Array<{ hour: number; trips: number; spending: number }>
    missingTimeReceiptCount: number
    totalUniqueReceipts: number
}

const TimeOfDayInfoTrigger = React.memo(function TimeOfDayInfoTrigger({
    processedData,
    missingTimeReceiptCount,
    totalUniqueReceipts,
}: TimeOfDayInfoTriggerProps) {
    const baseDetails = [
        "This chart shows your shopping trip frequency by hour of day.",
        "Taller bars indicate more frequent shopping times.",
        "Hover to see trip count and total spending for each hour.",
        "Only receipts with time data are included in the distribution.",
    ]

    if (totalUniqueReceipts > 0) {
        if (missingTimeReceiptCount > 0) {
            baseDetails.push(
                `${missingTimeReceiptCount} of ${totalUniqueReceipts} receipts in this date range are missing time information and are excluded from this chart.`
            )
        } else {
            baseDetails.push(
                `All ${totalUniqueReceipts} receipts in this date range include time information and are counted in this chart.`
            )
        }
    }

    return (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Time of Day Shopping"
                description="See when you typically go grocery shopping throughout the day."
                details={baseDetails}
                ignoredFootnote="Receipt times are extracted from your uploads."
            />
            <ChartAiInsightButton
                chartId="fridge:time-of-day-spending"
                chartTitle="Time of Day Shopping"
                chartDescription="Shopping patterns by hour of day."
                chartData={{
                    peakHour: processedData.reduce((max, d) => d.trips > max.trips ? d : max, processedData[0]),
                    totalTrips: processedData.reduce((sum, d) => sum + d.trips, 0),
                    totalSpending: processedData.reduce((sum, d) => sum + d.spending, 0),
                }}
                size="sm"
            />
        </div>
    )
})

TimeOfDayInfoTrigger.displayName = "TimeOfDayInfoTrigger"

export const ChartTimeOfDayShoppingFridge = React.memo(function ChartTimeOfDayShoppingFridge({ receiptTransactions = [], hourlyActivityData, isLoading = false }: ChartTimeOfDayShoppingFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette, colorScheme } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const axisLineColor = getChartAxisLineColor(isDark)

    const processedData = useMemo(() => {
        const fullDayData: { hour: number; trips: number; spending: number }[] = Array.from(
            { length: 24 },
            (_, hour) => ({ hour, trips: 0, spending: 0 })
        )

        // Use bundle data if available (pre-computed by server)
        if (hourlyActivityData && hourlyActivityData.length > 0) {
            hourlyActivityData.forEach(h => {
                // Be strict about hour being a valid number between 0–23
                if (typeof h.hour === "number" && h.hour >= 0 && h.hour < 24) {
                    fullDayData[h.hour].trips = h.count
                    fullDayData[h.hour].spending = h.total
                }
            })
            return fullDayData
        }

        // Fallback to raw transactions
        if (!Array.isArray(receiptTransactions) || receiptTransactions.length === 0) {
            return fullDayData
        }

        const receiptBuckets = new Map<string, { hour: number | null; receiptTotal: number; lineTotal: number; hasReceiptTotal: boolean }>()

        receiptTransactions.forEach((item) => {
            const receiptId = item.receiptId || String(item.id)
            if (!receiptId) return

            const hour = parseReceiptHour(item.receiptTime)
            const receiptTotal = Number(item.receiptTotalAmount) || 0
            const lineTotal = Number(item.totalPrice) || 0

            const existing = receiptBuckets.get(receiptId)
            if (existing) {
                if (existing.hour === null && hour !== null) {
                    existing.hour = hour
                }
                if (!existing.hasReceiptTotal && receiptTotal > 0) {
                    existing.receiptTotal = receiptTotal
                    existing.hasReceiptTotal = true
                }
                if (!existing.hasReceiptTotal) {
                    existing.lineTotal += lineTotal
                }
            } else {
                receiptBuckets.set(receiptId, {
                    hour,
                    receiptTotal: receiptTotal > 0 ? receiptTotal : 0,
                    lineTotal: receiptTotal > 0 ? 0 : lineTotal,
                    hasReceiptTotal: receiptTotal > 0
                })
            }
        })

        receiptBuckets.forEach(({ hour, receiptTotal, lineTotal, hasReceiptTotal }) => {
            // Guard against null/undefined/invalid hours to prevent indexing issues
            if (typeof hour !== "number" || hour < 0 || hour > 23) return
            const total = hasReceiptTotal ? receiptTotal : lineTotal
            fullDayData[hour].trips += 1
            fullDayData[hour].spending += total
        })

        return fullDayData
    }, [receiptTransactions, hourlyActivityData])

    const { missingTimeReceiptCount, totalUniqueReceipts } = useMemo(() => {
        if (!Array.isArray(receiptTransactions) || receiptTransactions.length === 0) {
            return { missingTimeReceiptCount: 0, totalUniqueReceipts: 0 }
        }

        const receiptTimePresence = new Map<string, { hasTime: boolean }>()

        receiptTransactions.forEach((item) => {
            const receiptId = item.receiptId || String(item.id)
            if (!receiptId) return

            const existing = receiptTimePresence.get(receiptId) ?? { hasTime: false }
            const hour = parseReceiptHour(item.receiptTime)

            if (hour !== null) {
                existing.hasTime = true
            }

            receiptTimePresence.set(receiptId, existing)
        })

        let missing = 0
        receiptTimePresence.forEach((value) => {
            if (!value.hasTime) missing += 1
        })

        return {
            missingTimeReceiptCount: missing,
            totalUniqueReceipts: receiptTimePresence.size,
        }
    }, [receiptTransactions])

    const chartData = useMemo(() => {
        return processedData
            .map((d, i) => ({
                hour: HOUR_LABELS[d.hour] ?? `${d.hour}h`,
                total: d.trips,
                count: d.trips,
                spending: d.spending,
                color: palette[i % palette.length],
            }))
            .filter(d => d.total > 0)
    }, [processedData, palette])

    const hasTimeData = processedData.some((entry) => entry.trips > 0 || entry.spending > 0)

    const nivoTheme = {
        text: { fill: textColor, fontSize: 11 },
        axis: {
            ticks: { text: { fill: textColor } },
            domain: { line: { stroke: axisLineColor } },
        },
        grid: {
            line: {
                stroke: axisLineColor,
                strokeWidth: 0.5,
                strokeDasharray: "3,3",
            },
        },
    }

    if (isLoading) {
        return (
            <Card className="@container/card" suppressHydrationWarning>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:time-of-day-spending" chartTitle="Time of Day Shopping" size="md" />
                        <CardTitle>Time of Day Shopping</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <TimeOfDayInfoTrigger processedData={processedData} missingTimeReceiptCount={missingTimeReceiptCount} totalUniqueReceipts={totalUniqueReceipts} />
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!hasTimeData) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:time-of-day-spending" chartTitle="Time of Day Shopping" size="md" />
                        <CardTitle>Time of Day Shopping</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <TimeOfDayInfoTrigger processedData={processedData} missingTimeReceiptCount={missingTimeReceiptCount} totalUniqueReceipts={totalUniqueReceipts} />
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={false} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="fridge:time-of-day-spending" chartTitle="Time of Day Shopping" size="md" />
                    <CardTitle>Time of Day Shopping</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <TimeOfDayInfoTrigger processedData={processedData} missingTimeReceiptCount={missingTimeReceiptCount} totalUniqueReceipts={totalUniqueReceipts} />
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveBar
                        data={chartData}
                        keys={["total"]}
                        indexBy="hour"
                        margin={{ top: 16, right: 16, bottom: 60, left: 60 }}
                        padding={0.3}
                        colors={({ index }) => chartData[index]?.color ?? palette[index % palette.length]}
                        borderRadius={6}
                        enableLabel={false}
                        axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -35 }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v) => `${v}`,
                        }}
                        enableGridY={true}
                        gridYValues={5}
                        theme={nivoTheme}
                        tooltip={({ indexValue, color, data }) => (
                            <NivoChartTooltip
                                title={`${indexValue} (${(data as Record<string, unknown>).count ?? 0} trips)`}
                                titleColor={color}
                                value={formatCurrency((data as Record<string, unknown>).spending as number ?? 0)}
                            />
                        )}
                        animate={true}
                        motionConfig="gentle"
                        barComponent={HoverableBar}
                    />
                </div>
            </CardContent>
        </Card>
    )
})

ChartTimeOfDayShoppingFridge.displayName = "ChartTimeOfDayShoppingFridge"
