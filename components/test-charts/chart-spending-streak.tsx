"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardAction,
} from "@/components/ui/card"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"

interface ChartSpendingStreakProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartSpendingStreak({
    data,
    isLoading = false,
}: ChartSpendingStreakProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const streakData = useMemo(() => {
        if (!data || data.length === 0) return { currentStreak: 0, longestStreak: 0, noSpendDays: 0, avgDailySpend: 0 }

        const dailySpending = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = tx.date.split("T")[0]
            dailySpending.set(date, (dailySpending.get(date) || 0) + Math.abs(tx.amount))
        })

        if (dailySpending.size === 0) return { currentStreak: 0, longestStreak: 0, noSpendDays: 0, avgDailySpend: 0 }

        const sortedDates = Array.from(dailySpending.keys()).sort()
        const startDate = new Date(sortedDates[0])
        const endDate = new Date(sortedDates[sortedDates.length - 1])

        // Generate all dates in range
        const allDates: string[] = []
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            allDates.push(d.toISOString().split("T")[0])
        }

        // Find streaks (consecutive days WITHOUT spending = good!)
        let currentStreak = 0
        let longestStreak = 0
        let tempStreak = 0
        let noSpendDays = 0

        allDates.forEach((date, i) => {
            if (!dailySpending.has(date)) {
                tempStreak++
                noSpendDays++
                if (i === allDates.length - 1 || dailySpending.has(allDates[i + 1])) {
                    longestStreak = Math.max(longestStreak, tempStreak)
                }
            } else {
                tempStreak = 0
            }
        })

        // Current no-spend streak from today backward
        const today = new Date().toISOString().split("T")[0]
        for (let i = allDates.length - 1; i >= 0; i--) {
            if (allDates[i] <= today && !dailySpending.has(allDates[i])) {
                currentStreak++
            } else {
                break
            }
        }

        const totalSpending = Array.from(dailySpending.values()).reduce((a, b) => a + b, 0)
        const avgDailySpend = totalSpending / allDates.length

        return { currentStreak, longestStreak, noSpendDays, avgDailySpend, totalDays: allDates.length }
    }, [data])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Spending Streak"
    const chartDescription = "Track your no-spend streaks. More consecutive days without spending = better financial discipline."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Tracks consecutive no-spend days",
                    "Helps build saving habits",
                    "Compare current vs best streak",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:spendingStreak"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={streakData}
                size="sm"
            />
        </div>
    )

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:spendingStreak" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]"><ChartLoadingState isLoading={isLoading} /></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:spendingStreak" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">No-spend day streaks</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[200px] flex flex-col items-center justify-center gap-6">
                    {/* Main streak display */}
                    <div className="flex gap-8 items-center">
                        <div className="text-center">
                            <div className="text-5xl font-bold" style={{ color: palette[1] || "#10b981" }}>
                                {streakData.currentStreak}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">Current Streak</div>
                            <div className="text-xs text-muted-foreground/60">days without spending</div>
                        </div>
                        <div className="h-16 w-px bg-border" />
                        <div className="text-center">
                            <div className="text-4xl font-bold" style={{ color: palette[0] || "#fe8339" }}>
                                {streakData.longestStreak}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">Best Streak</div>
                            <div className="text-xs text-muted-foreground/60">days record</div>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-6 text-center">
                        <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}>
                            <div className="text-lg font-semibold text-foreground">{streakData.noSpendDays}</div>
                            <div className="text-xs text-muted-foreground">Total No-Spend Days</div>
                        </div>
                        <div className="px-4 py-3 rounded-lg" style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}>
                            <div className="text-lg font-semibold text-foreground">{formatCurrency(streakData.avgDailySpend)}</div>
                            <div className="text-xs text-muted-foreground">Avg Daily Spend</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full max-w-xs">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress to beat record</span>
                            <span>{Math.min(100, Math.round((streakData.currentStreak / Math.max(streakData.longestStreak, 1)) * 100))}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${Math.min(100, (streakData.currentStreak / Math.max(streakData.longestStreak, 1)) * 100)}%`,
                                    backgroundColor: palette[1] || "#10b981"
                                }}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
