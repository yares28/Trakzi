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
import { IconAlertTriangle, IconCheck, IconInfoCircle } from "@tabler/icons-react"

interface ChartSpendingAlertsProps {
    data: Array<{
        date: string
        amount: number
        category?: string
    }>
    isLoading?: boolean
    monthlyBudget?: number
}

export function ChartSpendingAlerts({
    data,
    isLoading = false,
    monthlyBudget = 3000,
}: ChartSpendingAlertsProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const alertsData = useMemo(() => {
        if (!data || data.length === 0) return { alerts: [], score: 100 }

        const alerts: Array<{ type: 'warning' | 'danger' | 'info'; message: string }> = []
        let score = 100

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const dayOfMonth = now.getDate()
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

        let currentMonthTotal = 0
        let largestTransaction = 0
        const categorySpending = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const txDate = new Date(tx.date)
            if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) return

            const amount = Math.abs(tx.amount)
            currentMonthTotal += amount
            if (amount > largestTransaction) largestTransaction = amount

            const category = tx.category || 'Other'
            categorySpending.set(category, (categorySpending.get(category) || 0) + amount)
        })

        // Check pace
        const expectedPace = (monthlyBudget / daysInMonth) * dayOfMonth
        if (currentMonthTotal > expectedPace * 1.2) {
            alerts.push({ type: 'warning', message: `Spending ${((currentMonthTotal / expectedPace - 1) * 100).toFixed(0)}% above pace` })
            score -= 20
        }

        // Check budget
        if (currentMonthTotal > monthlyBudget) {
            alerts.push({ type: 'danger', message: `Over budget by ${formatCurrency(currentMonthTotal - monthlyBudget)}` })
            score -= 30
        } else if (currentMonthTotal > monthlyBudget * 0.9) {
            alerts.push({ type: 'warning', message: 'Approaching budget limit' })
            score -= 10
        }

        // Check large transaction
        if (largestTransaction > monthlyBudget * 0.3) {
            alerts.push({ type: 'info', message: `Large transaction: ${formatCurrency(largestTransaction)}` })
        }

        // Check category concentration
        const topCategory = Array.from(categorySpending.entries()).sort((a, b) => b[1] - a[1])[0]
        if (topCategory && topCategory[1] > currentMonthTotal * 0.5) {
            alerts.push({ type: 'info', message: `${topCategory[0]} is 50%+ of spending` })
        }

        if (alerts.length === 0) {
            alerts.push({ type: 'info', message: 'All spending looks healthy!' })
        }

        return { alerts, score: Math.max(0, score) }
    }, [data, monthlyBudget, formatCurrency])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Spending Alerts"
    const chartDescription = "Real-time alerts about your spending patterns."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Tracks budget pace",
                    "Flags large transactions",
                    "Monitors category balance",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:spendingAlerts"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={alertsData}
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
                        <ChartFavoriteButton chartId="testCharts:spendingAlerts" chartTitle={chartTitle} size="md" />
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

    const getAlertIcon = (type: string) => {
        switch (type) {
            case 'danger': return <IconAlertTriangle size={20} className="text-red-500" />
            case 'warning': return <IconAlertTriangle size={20} className="text-amber-500" />
            default: return <IconInfoCircle size={20} className="text-blue-500" />
        }
    }

    const getAlertBg = (type: string) => {
        switch (type) {
            case 'danger': return isDark ? '#7f1d1d' : '#fee2e2'
            case 'warning': return isDark ? '#78350f' : '#fef3c7'
            default: return isDark ? '#1e3a5f' : '#dbeafe'
        }
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:spendingAlerts" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Alerts</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[150px] flex flex-col gap-3">
                    {alertsData.alerts.map((alert, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ backgroundColor: getAlertBg(alert.type) }}
                        >
                            {getAlertIcon(alert.type)}
                            <span className="text-sm text-foreground">{alert.message}</span>
                        </div>
                    ))}

                    {alertsData.alerts.every(a => a.type === 'info') && (
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: isDark ? '#064e3b' : '#d1fae5' }}>
                            <IconCheck size={20} className="text-emerald-500" />
                            <span className="text-sm text-foreground">No critical alerts</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
