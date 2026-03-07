"use client"

import { memo, useMemo } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MonthlyScore } from "@/lib/types/challenges"

interface ScoreSparklineProps {
    history: MonthlyScore[]
    currentScore: number | null
    /** If true, lower scores are better (e.g. wantsPercent) */
    lowerIsBetter?: boolean
    className?: string
}

/**
 * Tiny SVG sparkline with trend arrow for leaderboard cards.
 * Shows up to 6 historical data points + the current live score.
 */
export const ScoreSparkline = memo(function ScoreSparkline({
    history,
    currentScore,
    lowerIsBetter = false,
    className,
}: ScoreSparklineProps) {
    const { points, trend } = useMemo(() => {
        const scores = [
            ...history.map(h => h.score),
            ...(currentScore !== null ? [currentScore] : []),
        ]

        if (scores.length < 2) {
            return { points: "", trend: "flat" as const }
        }

        // Normalize to fit in SVG viewBox (60 x 20)
        const min = Math.min(...scores)
        const max = Math.max(...scores)
        const range = max - min || 1

        const svgW = 60
        const svgH = 20
        const padding = 2

        const pts = scores.map((s, i) => {
            const x = padding + (i / (scores.length - 1)) * (svgW - padding * 2)
            const y = padding + (1 - (s - min) / range) * (svgH - padding * 2)
            return `${x},${y}`
        }).join(" ")

        // Determine trend from last two values
        const prev = scores[scores.length - 2]
        const curr = scores[scores.length - 1]
        const diff = curr - prev
        const threshold = range * 0.05 // 5% of range to count as change

        let t: "up" | "down" | "flat" = "flat"
        if (Math.abs(diff) > threshold) {
            t = diff > 0 ? "up" : "down"
        }

        return { points: pts, trend: t }
    }, [history, currentScore])

    if (!points) {
        return (
            <div className={cn("flex items-center gap-0.5 text-muted-foreground", className)}>
                <Minus className="w-3 h-3" />
            </div>
        )
    }

    // For "lower is better" metrics, flip the trend interpretation
    const isPositive = lowerIsBetter ? trend === "down" : trend === "up"
    const isNegative = lowerIsBetter ? trend === "up" : trend === "down"

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <svg
                width="40"
                height="16"
                viewBox="0 0 60 20"
                fill="none"
                className="shrink-0"
            >
                <polyline
                    points={points}
                    stroke={isPositive ? "#22c55e" : isNegative ? "#ef4444" : "#a1a1aa"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </svg>
            {trend === "up" && (
                <TrendingUp className={cn("w-3 h-3", isPositive ? "text-green-500" : "text-red-500")} />
            )}
            {trend === "down" && (
                <TrendingDown className={cn("w-3 h-3", isNegative ? "text-red-500" : "text-green-500")} />
            )}
            {trend === "flat" && (
                <Minus className="w-3 h-3 text-muted-foreground" />
            )}
        </div>
    )
})

ScoreSparkline.displayName = "ScoreSparkline"
