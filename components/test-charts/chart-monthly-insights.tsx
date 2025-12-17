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
import { IconChartBar, IconCalendarStats, IconCash, IconChartPie } from "@tabler/icons-react"

interface ChartMonthlyInsightsProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartMonthlyInsights({
    data,
    isLoading = false,
}: ChartMonthlyInsightsProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const insightsData = useMemo(() => {
        if (!data || data.length === 0) return null

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        let totalSpent = 0
        let transactionCount = 0
        let largestPurchase = 0
        let largestPurchaseDesc = ''
        const categoryCount = new Set<string>()
        const dailySpending = new Map<number, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const txDate = new Date(tx.date)
            if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) return

            const amount = Math.abs(tx.amount)
            totalSpent += amount
            transactionCount++
            categoryCount.add(tx.category || 'Other')

            const day = txDate.getDate()
            dailySpending.set(day, (dailySpending.get(day) || 0) + amount)

            if (amount > largestPurchase) {
                largestPurchase = amount
            }
        })

        // Find busiest day
        const busiestDay = Array.from(dailySpending.entries()).sort((a, b) => b[1] - a[1])[0]
        const avgPerTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0
        const daysWithSpending = dailySpending.size

        return {
            totalSpent,
            transactionCount,
            largestPurchase,
            avgPerTransaction,
            categoriesUsed: categoryCount.size,
            busiestDay: busiestDay ? busiestDay[0] : null,
            busiestDayAmount: busiestDay ? busiestDay[1] : 0,
            daysWithSpending,
        }
    }, [data])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Monthly Insights"
    const chartDescription = "Key statistics and insights about your spending this month."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Current month statistics",
                    "Key spending metrics",
                    "Updated in real-time",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:monthlyInsights"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={insightsData || {}}
                size="sm"
            />
        </div>
    )

    if (!mounted || !insightsData) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:monthlyInsights" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[200px]"><ChartLoadingState isLoading={isLoading} /></div>
                </CardContent>
            </Card>
        )
    }

    const insights = [
        {
            icon: <IconCash size={24} style={{ color: palette[0] || '#fe8339' }} />,
            label: 'Total Spent',
            value: formatCurrency(insightsData.totalSpent),
            sub: `${insightsData.transactionCount} transactions`,
        },
        {
            icon: <IconChartBar size={24} style={{ color: palette[1] || '#10b981' }} />,
            label: 'Avg Transaction',
            value: formatCurrency(insightsData.avgPerTransaction),
            sub: `${insightsData.daysWithSpending} active days`,
        },
        {
            icon: <IconCalendarStats size={24} style={{ color: palette[2] || '#3b82f6' }} />,
            label: 'Busiest Day',
            value: insightsData.busiestDay ? `Day ${insightsData.busiestDay}` : 'N/A',
            sub: formatCurrency(insightsData.busiestDayAmount),
        },
        {
            icon: <IconChartPie size={24} style={{ color: palette[3] || '#8b5cf6' }} />,
            label: 'Categories',
            value: insightsData.categoriesUsed.toString(),
            sub: 'unique categories',
        },
    ]

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:monthlyInsights" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Month stats</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[160px] grid grid-cols-2 gap-4">
                    {insights.map((insight, i) => (
                        <div
                            key={i}
                            className="flex flex-col justify-center p-3 rounded-xl"
                            style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {insight.icon}
                                <span className="text-xs text-muted-foreground">{insight.label}</span>
                            </div>
                            <div className="text-lg font-bold text-foreground">{insight.value}</div>
                            <div className="text-xs text-muted-foreground">{insight.sub}</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
