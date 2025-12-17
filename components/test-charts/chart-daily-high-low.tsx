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
import { IconArrowUp, IconArrowDown, IconCalendar } from "@tabler/icons-react"

interface ChartDailyHighLowProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartDailyHighLow({
    data,
    isLoading = false,
}: ChartDailyHighLowProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const statsData = useMemo(() => {
        if (!data || data.length === 0) return null

        const dailyTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const date = tx.date.split('T')[0]
            dailyTotals.set(date, (dailyTotals.get(date) || 0) + Math.abs(tx.amount))
        })

        const entries = Array.from(dailyTotals.entries()).sort((a, b) => a[0].localeCompare(b[0]))
        if (entries.length === 0) return null

        const values = entries.map(e => e[1])
        const highestDay = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max)
        const lowestDay = entries.reduce((min, curr) => curr[1] < min[1] ? curr : min)
        const average = values.reduce((a, b) => a + b, 0) / values.length

        return {
            highestDate: highestDay[0],
            highestAmount: highestDay[1],
            lowestDate: lowestDay[0],
            lowestAmount: lowestDay[1],
            average,
            totalDays: entries.length,
        }
    }, [data])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Daily High & Low"
    const chartDescription = "Your biggest and smallest spending days at a glance."

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Shows highest spending day",
                    "Shows lowest spending day",
                    "Compare against your average",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:dailyHighLow"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={statsData || {}}
                size="sm"
            />
        </div>
    )

    if (!mounted || !statsData) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:dailyHighLow" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[180px]"><ChartLoadingState isLoading={isLoading} /></div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:dailyHighLow" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Best & worst days</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[150px] grid grid-cols-2 gap-4">
                    {/* Highest Day */}
                    <div
                        className="flex flex-col justify-center p-4 rounded-xl"
                        style={{ backgroundColor: isDark ? '#7f1d1d' : '#fee2e2' }}
                    >
                        <div className="flex items-center gap-2 text-red-500 mb-2">
                            <IconArrowUp size={20} />
                            <span className="text-xs font-medium">Highest Day</span>
                        </div>
                        <div className="text-2xl font-bold text-red-500">
                            {formatCurrency(statsData.highestAmount)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <IconCalendar size={14} />
                            {formatDate(statsData.highestDate)}
                        </div>
                    </div>

                    {/* Lowest Day */}
                    <div
                        className="flex flex-col justify-center p-4 rounded-xl"
                        style={{ backgroundColor: isDark ? '#064e3b' : '#d1fae5' }}
                    >
                        <div className="flex items-center gap-2 text-emerald-500 mb-2">
                            <IconArrowDown size={20} />
                            <span className="text-xs font-medium">Lowest Day</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-500">
                            {formatCurrency(statsData.lowestAmount)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <IconCalendar size={14} />
                            {formatDate(statsData.lowestDate)}
                        </div>
                    </div>
                </div>

                {/* Average indicator */}
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    Daily average: <span className="font-semibold text-foreground">{formatCurrency(statsData.average)}</span>
                    <span className="text-xs ml-2">({statsData.totalDays} days)</span>
                </div>
            </CardContent>
        </Card>
    )
}
