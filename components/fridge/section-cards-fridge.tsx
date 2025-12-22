"use client"

import * as React from "react"
import { useMemo } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"

import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
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
        const palette = getPalette().filter(c => c !== "#c3c3c3")
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
            <Card className="@container/card relative overflow-hidden">
                <TrendLineBackground color={trendColors[0]} seed={1} dataPoints={totalSpentTrend} />
                <CardHeader>
                    <CardDescription>Total Spent</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {formatCurrency(totalSpent)}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {totalSpentChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {totalSpentChange >= 0 ? "+" : ""}
                            {totalSpentChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {totalSpentChange >= 0 ? "Spending up" : "Spending down"}{" "}
                        {totalSpentChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">
                        Compared to previous period
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card relative overflow-hidden">
                <TrendLineBackground color={trendColors[1]} seed={2} dataPoints={shoppingTripsTrend} />
                <CardHeader>
                    <CardDescription>Shopping Trips</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {shoppingTrips}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {shoppingTripsChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {shoppingTripsChange >= 0 ? "+" : ""}
                            {shoppingTripsChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {shoppingTripsChange >= 0 ? "More trips" : "Fewer trips"}{" "}
                        {shoppingTripsChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">
                        Compared to previous period
                    </div>
                </CardFooter>
            </Card>
            <Card className="@container/card relative overflow-hidden">
                <TrendLineBackground color={trendColors[2]} seed={3} dataPoints={storesVisitedTrend} />
                <CardHeader>
                    <CardDescription>Stores Visited</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {storesVisited}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {storesVisitedChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {storesVisitedChange >= 0 ? "+" : ""}
                            {storesVisitedChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {storesVisitedChange >= 0 ? "Shopping across more stores" : "Shopping across fewer stores"}{" "}
                        {storesVisitedChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">Compared to previous period</div>
                </CardFooter>
            </Card>
            <Card className="@container/card relative overflow-hidden">
                <TrendLineBackground color={trendColors[3]} seed={4} dataPoints={averageReceiptTrend} />
                <CardHeader>
                    <CardDescription>Average Receipt</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {formatCurrency(averageReceipt)}
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {averageReceiptChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {averageReceiptChange >= 0 ? "+" : ""}
                            {averageReceiptChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {averageReceiptChange >= 0 ? "Cost per trip rising" : "Cost per trip falling"}{" "}
                        {averageReceiptChange >= 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">Compared to previous period</div>
                </CardFooter>
            </Card>
            <Card className="@container/card relative overflow-hidden">
                <TrendLineBackground color={trendColors[4]} seed={5} dataPoints={tripsFrequencyTrend} />
                <CardHeader>
                    <CardDescription>Trips Frequency</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        {tripsFrequency.toFixed(1)} days
                    </CardTitle>
                    <CardAction>
                        <Badge variant="outline">
                            {tripsFrequencyChange >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
                            {tripsFrequencyChange >= 0 ? "+" : ""}
                            {tripsFrequencyChange.toFixed(1)}%
                        </Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {tripsFrequencyChange >= 0 ? "Shopping less often" : "Shopping more often"}{" "}
                        {tripsFrequencyChange >= 0 ? <IconTrendingDown className="size-4" /> : <IconTrendingUp className="size-4" />}
                    </div>
                    <div className="text-muted-foreground">Average days between trips</div>
                </CardFooter>
            </Card>
        </div>
    )
}
