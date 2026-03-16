"use client"

import * as React from "react"
import { useMemo } from "react"
import { IconTrendingDown, IconTrendingUp, IconLock, IconSparkles } from "@tabler/icons-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
    // Fridge score props
    fridgeScore?: number;
    fridgeGrade?: string;
    fridgeScoreTrend?: "improving" | "worsening" | "stable";
    fridgeScoreTrendData?: TrendDataPoint[];
    fridgeScoreEnabled?: boolean;
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

// Fridge Score card
function FridgeScoreCard({
    score,
    grade,
    trend,
    color,
    trendData = [],
    enabled = true,
}: {
    score: number
    grade: string
    trend: "improving" | "worsening" | "stable"
    color: string
    trendData?: TrendDataPoint[]
    enabled?: boolean
}) {
    const subtextUnderValue =
        trend === "improving" ? "Trend improving"
            : trend === "worsening" ? "Trend worsening"
                : "Trend stable"

    return (
        <Card className="@container/card w-full relative group overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
            <TrendLineBackground color={color} seed={42} dataPoints={trendData} />

            {/* Card content — blurred when locked */}
            <CardHeader className={`!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1 ${!enabled ? "blur-sm opacity-40 saturate-50 pointer-events-none select-none" : ""}`}>
                <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Fridge Score</CardDescription>
                <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
                    {score}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
                    {grade}
                </Badge>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground text-balance px-2 leading-tight hidden @[180px]/card:block">
                    {subtextUnderValue}
                </p>
            </CardHeader>

            {/* Lock overlay — shown when feature is gated */}
            {!enabled && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[3px] rounded-xl w-full h-full">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-center w-full">
                        <div className="rounded-full bg-primary/10 border border-primary/20 p-2">
                            <IconLock className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="font-semibold text-[11px] text-center w-full">Fridge Score</p>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-3 w-fit" asChild>
                            <Link href="/settings" className="flex items-center justify-center">
                                <IconSparkles className="h-3 w-3" />
                                <span>Upgrade</span>
                            </Link>
                        </Button>
                    </div>
                </div>
            )}
        </Card>
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
    fridgeScore,
    fridgeGrade,
    fridgeScoreTrend = "stable",
    fridgeScoreTrendData = [],
    fridgeScoreEnabled = true,
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
            palette[5] || "#6366f1", // Fridge Score
        ]
    }, [getPalette])

    const hasFridgeScore = fridgeScore !== undefined && fridgeGrade !== undefined

    const colsClass = hasFridgeScore
        ? "@5xl/main:grid-cols-3 @7xl/main:grid-cols-6"
        : "@5xl/main:grid-cols-3 @7xl/main:grid-cols-5"

    return (
        <div className={`*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @3xl/main:grid-cols-2 ${colsClass} min-w-0`}>
            <Card className="@container/card relative overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
                <TrendLineBackground color={trendColors[0]} seed={1} dataPoints={totalSpentTrend} />
                <CardHeader className="!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1">
                    <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Total Spent</CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
                        {formatCurrency(totalSpent)}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
                        {totalSpentChange >= 0 ? <IconTrendingUp className="size-2.5 mr-0.5" /> : <IconTrendingDown className="size-2.5 mr-0.5" />}
                        {totalSpentChange >= 0 ? "+" : ""}
                        {totalSpentChange.toFixed(1)}%
                    </Badge>
                </CardHeader>
            </Card>
            <Card className="@container/card relative overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
                <TrendLineBackground color={trendColors[1]} seed={2} dataPoints={shoppingTripsTrend} />
                <CardHeader className="!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1">
                    <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Shopping Trips</CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
                        {shoppingTrips}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
                        {shoppingTripsChange >= 0 ? <IconTrendingUp className="size-2.5 mr-0.5" /> : <IconTrendingDown className="size-2.5 mr-0.5" />}
                        {shoppingTripsChange >= 0 ? "+" : ""}
                        {shoppingTripsChange.toFixed(1)}%
                    </Badge>
                </CardHeader>
            </Card>
            <Card className="@container/card relative overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
                <TrendLineBackground color={trendColors[2]} seed={3} dataPoints={storesVisitedTrend} />
                <CardHeader className="!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1">
                    <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Stores Visited</CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
                        {storesVisited}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
                        {storesVisitedChange >= 0 ? <IconTrendingUp className="size-2.5 mr-0.5" /> : <IconTrendingDown className="size-2.5 mr-0.5" />}
                        {storesVisitedChange >= 0 ? "+" : ""}
                        {storesVisitedChange.toFixed(1)}%
                    </Badge>
                </CardHeader>
            </Card>
            <Card className="@container/card relative overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
                <TrendLineBackground color={trendColors[3]} seed={4} dataPoints={averageReceiptTrend} />
                <CardHeader className="!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1">
                    <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Average Receipt</CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
                        {formatCurrency(averageReceipt)}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
                        {averageReceiptChange >= 0 ? <IconTrendingUp className="size-2.5 mr-0.5" /> : <IconTrendingDown className="size-2.5 mr-0.5" />}
                        {averageReceiptChange >= 0 ? "+" : ""}
                        {averageReceiptChange.toFixed(1)}%
                    </Badge>
                </CardHeader>
            </Card>
            <Card className="@container/card relative overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
                <TrendLineBackground color={trendColors[4]} seed={5} dataPoints={tripsFrequencyTrend} />
                <CardHeader className="!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1">
                    <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Trips Frequency</CardDescription>
                    <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
                        {tripsFrequency.toFixed(1)} days
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
                        {tripsFrequencyChange >= 0 ? <IconTrendingUp className="size-2.5 mr-0.5" /> : <IconTrendingDown className="size-2.5 mr-0.5" />}
                        {tripsFrequencyChange >= 0 ? "+" : ""}
                        {tripsFrequencyChange.toFixed(1)}%
                    </Badge>
                </CardHeader>
            </Card>
            {hasFridgeScore && (
                <FridgeScoreCard
                    score={fridgeScore!}
                    grade={fridgeGrade!}
                    trend={fridgeScoreTrend}
                    color={trendColors[5]}
                    trendData={fridgeScoreTrendData}
                    enabled={fridgeScoreEnabled}
                />
            )}
        </div >
    )
}

