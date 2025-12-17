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
import { IconArrowUp, IconArrowDown, IconMinus } from "@tabler/icons-react"

interface ChartQuickStatsProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
}

export function ChartQuickStats({
    data,
    isLoading = false,
}: ChartQuickStatsProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const stats = useMemo(() => {
        if (!data || data.length === 0) return null

        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const prevDate = new Date(now)
        prevDate.setMonth(prevDate.getMonth() - 1)
        const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

        let currentMonthTotal = 0
        let prevMonthTotal = 0
        let largestPurchase = 0
        let numTransactions = 0
        let categoryTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const amount = Math.abs(tx.amount)
            const txMonth = tx.date.slice(0, 7)

            if (txMonth === currentMonth) {
                currentMonthTotal += amount
                numTransactions++
                if (amount > largestPurchase) largestPurchase = amount
                const cat = tx.category || 'Other'
                categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + amount)
            } else if (txMonth === prevMonth) {
                prevMonthTotal += amount
            }
        })

        const monthChange = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0
        const avgTransaction = numTransactions > 0 ? currentMonthTotal / numTransactions : 0
        const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

        return {
            currentMonthTotal,
            monthChange,
            avgTransaction,
            largestPurchase,
            numTransactions,
            topCategory,
        }
    }, [data])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Quick Stats"
    const chartDescription = "At-a-glance metrics for your current month spending activity."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Total: current month spending",
                    "Change: vs previous month",
                    "Plus key transaction stats",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:quickStats"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={stats || {}}
                size="sm"
            />
        </div>
    )

    if (!mounted || !stats) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:quickStats" chartTitle={chartTitle} size="md" />
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

    const statCards = [
        { label: "This Month", value: formatCurrency(stats.currentMonthTotal), sub: `${stats.numTransactions} transactions`, color: palette[0] },
        {
            label: "vs Last Month",
            value: `${stats.monthChange >= 0 ? '+' : ''}${stats.monthChange.toFixed(1)}%`,
            sub: stats.monthChange > 0 ? "More spending" : stats.monthChange < 0 ? "Less spending" : "Same",
            color: stats.monthChange > 0 ? "#ef4444" : stats.monthChange < 0 ? "#10b981" : "#6b7280",
            icon: stats.monthChange > 0 ? IconArrowUp : stats.monthChange < 0 ? IconArrowDown : IconMinus,
        },
        { label: "Avg Transaction", value: formatCurrency(stats.avgTransaction), sub: "Per purchase", color: palette[1] },
        { label: "Largest", value: formatCurrency(stats.largestPurchase), sub: "Single purchase", color: palette[2] },
    ]

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:quickStats" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Key spending metrics</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[180px] grid grid-cols-2 gap-4">
                    {statCards.map((stat, i) => {
                        const Icon = (stat as { icon?: typeof IconArrowUp }).icon
                        return (
                            <div
                                key={stat.label}
                                className="flex flex-col justify-center p-4 rounded-xl transition-all hover:scale-[1.02]"
                                style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}
                            >
                                <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                                <div className="flex items-center gap-2">
                                    {Icon && <Icon size={18} style={{ color: stat.color }} />}
                                    <span className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
                                </div>
                                <div className="text-xs text-muted-foreground/70 mt-1">{stat.sub}</div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
