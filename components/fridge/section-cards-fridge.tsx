"use client"

import * as React from "react"
import { useMemo } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"

import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

// Trend data point type
type TrendDataPoint = { date: string; value: number }

interface SectionCardsFridgeProps {
    totalSpent?: number;
    shoppingTrips?: number;
    storesVisited?: number;
    averageReceipt?: number;
    tripsFrequency?: number;
    totalSpentChange?: number;
    shoppingTripsChange?: number;
    storesVisitedChange?: number;
    averageReceiptChange?: number;
    tripsFrequencyChange?: number;
    // Trend data arrays for each metric
    totalSpentTrend?: TrendDataPoint[];
    shoppingTripsTrend?: TrendDataPoint[];
    storesVisitedTrend?: TrendDataPoint[];
    averageReceiptTrend?: TrendDataPoint[];
    tripsFrequencyTrend?: TrendDataPoint[];
}

// Blurred trend line background component with real data support
function TrendLineBackground({
    color,
    seed = 0,
    dataPoints = []
}: {
    color: string;
    seed?: number;
    dataPoints?: TrendDataPoint[];
}) {
    const pathData = useMemo(() => {
        // If we don't have enough data points, don't render anything
        if (!dataPoints || dataPoints.length < 2) {
            return null
        }

        const values = dataPoints.map(p => p.value)
        const minVal = Math.min(...values)
        const maxVal = Math.max(...values)
        const range = maxVal - minVal || 1 // Avoid division by zero

        // Normalize values to Y coordinates (40-85 range, inverted because SVG Y is top-down)
        // Lower part of the card (leaving space at top for content)
        const normalizedPoints = values.map((val, i) => {
            const x = (i / (values.length - 1)) * 100
            // Map value to 40-85 range (40 = top of wave area, 85 = bottom)
            const normalizedY = 85 - ((val - minVal) / range) * 45
            return { x, y: normalizedY }
        })

        // Create smooth curve through points using quadratic curves
        let d = `M 0 100 L 0 ${normalizedPoints[0].y}`

        for (let i = 0; i < normalizedPoints.length - 1; i++) {
            const curr = normalizedPoints[i]
            const next = normalizedPoints[i + 1]
            const midX = (curr.x + next.x) / 2
            d += ` Q ${midX} ${curr.y} ${next.x} ${next.y}`
        }

        d += ` L 100 100 Z`
        return d
    }, [dataPoints])

    // Don't render anything if no valid path data
    if (!pathData) {
        return null
    }

    const gradientId = `trend-gradient-${seed}`

    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ filter: 'blur(8px)' }}
        >
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={color} stopOpacity="0" />
                    <stop offset="30%" stopColor={color} stopOpacity="0.08" />
                    <stop offset="70%" stopColor={color} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                </linearGradient>
            </defs>
            <path
                d={pathData}
                fill={`url(#${gradientId})`}
            />
        </svg>
    )
}

export function SectionCardsFridge({
    totalSpent = 0,
    shoppingTrips = 0,
    storesVisited = 0,
    averageReceipt = 0,
    tripsFrequency = 0,
    totalSpentChange = 0,
    shoppingTripsChange = 0,
    storesVisitedChange = 0,
    averageReceiptChange = 0,
    tripsFrequencyChange = 0,
    totalSpentTrend = [],
    shoppingTripsTrend = [],
    storesVisitedTrend = [],
    averageReceiptTrend = [],
    tripsFrequencyTrend = [],
}: SectionCardsFridgeProps) {
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()

    // Get distinct colors from palette for each card
    const trendColors = useMemo(() => {
        const palette = getPalette()
        return [
            palette[0] || "#14b8a6", // Total Spent
            palette[1] || "#22c55e", // Shopping Trips
            palette[2] || "#3b82f6", // Stores Visited
            palette[3] || "#f59e0b", // Average Receipt
            palette[4] || "#8b5cf6", // Trips Frequency
        ]
    }, [getPalette])

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-5 min-w-0">
            <Card className="@container/card relative overflow-hidden h-[7rem] py-4">
                <TrendLineBackground color={trendColors[0]} seed={1} dataPoints={totalSpentTrend} />
                <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                    <CardDescription className="text-xs mb-1 truncate">Total Spent</CardDescription>
                    <div className="flex items-baseline justify-between gap-2">
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl truncate">
                            {formatCurrency(totalSpent)}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs h-6 shrink-0">
                            {totalSpentChange >= 0 ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
                            {totalSpentChange >= 0 ? "+" : ""}
                            {totalSpentChange.toFixed(1)}%
                        </Badge>
                    </div>
                </CardHeader>
            </Card>
            <Card className="@container/card relative overflow-hidden h-[7rem] py-4">
                <TrendLineBackground color={trendColors[1]} seed={2} dataPoints={shoppingTripsTrend} />
                <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                    <CardDescription className="text-xs mb-1 truncate">Shopping Trips</CardDescription>
                    <div className="flex items-baseline justify-between gap-2">
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl truncate">
                            {shoppingTrips}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs h-6 shrink-0">
                            {shoppingTripsChange >= 0 ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
                            {shoppingTripsChange >= 0 ? "+" : ""}
                            {shoppingTripsChange.toFixed(1)}%
                        </Badge>
                    </div>
                </CardHeader>
            </Card>
            <Card className="@container/card relative overflow-hidden h-[7rem] py-4">
                <TrendLineBackground color={trendColors[2]} seed={3} dataPoints={storesVisitedTrend} />
                <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                    <CardDescription className="text-xs mb-1 truncate">Stores Visited</CardDescription>
                    <div className="flex items-baseline justify-between gap-2">
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl truncate">
                            {storesVisited}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs h-6 shrink-0">
                            {storesVisitedChange >= 0 ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
                            {storesVisitedChange >= 0 ? "+" : ""}
                            {storesVisitedChange.toFixed(1)}%
                        </Badge>
                    </div>
                </CardHeader>
            </Card>
            <Card className="@container/card relative overflow-hidden h-[7rem] py-4">
                <TrendLineBackground color={trendColors[3]} seed={4} dataPoints={averageReceiptTrend} />
                <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                    <CardDescription className="text-xs mb-1 truncate">Average Receipt</CardDescription>
                    <div className="flex items-baseline justify-between gap-2">
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl truncate">
                            {formatCurrency(averageReceipt)}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs h-6 shrink-0">
                            {averageReceiptChange >= 0 ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
                            {averageReceiptChange >= 0 ? "+" : ""}
                            {averageReceiptChange.toFixed(1)}%
                        </Badge>
                    </div>
                </CardHeader>
            </Card>
            <Card className="@container/card relative overflow-hidden h-[7rem] py-4">
                <TrendLineBackground color={trendColors[4]} seed={5} dataPoints={tripsFrequencyTrend} />
                <CardHeader className="pb-2 pt-[5px] flex-1 min-h-0">
                    <CardDescription className="text-xs mb-1 truncate">Trips Frequency</CardDescription>
                    <div className="flex items-baseline justify-between gap-2">
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl truncate">
                            {tripsFrequency.toFixed(1)} days
                        </CardTitle>
                        <Badge variant="outline" className="text-xs h-6 shrink-0">
                            {tripsFrequencyChange >= 0 ? <IconTrendingUp className="size-3" /> : <IconTrendingDown className="size-3" />}
                            {tripsFrequencyChange >= 0 ? "+" : ""}
                            {tripsFrequencyChange.toFixed(1)}%
                        </Badge>
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}
