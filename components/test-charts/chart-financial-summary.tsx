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
import { IconCoin, IconReceipt, IconShoppingCart, IconArrowUp, IconArrowDown } from "@tabler/icons-react"

interface ChartFinancialSummaryProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartFinancialSummary({
    data,
    isLoading = false,
}: ChartFinancialSummaryProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const summaryData = useMemo(() => {
        if (!data || data.length === 0) return null

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const prevDate = new Date(now)
        prevDate.setMonth(prevDate.getMonth() - 1)
        const prevMonth = prevDate.getMonth()
        const prevYear = prevDate.getFullYear()

        let currentIncome = 0, currentExpenses = 0, currentCount = 0
        let prevIncome = 0, prevExpenses = 0

        data.forEach((tx) => {
            const txDate = new Date(tx.date)
            const txMonth = txDate.getMonth()
            const txYear = txDate.getFullYear()

            if (txMonth === currentMonth && txYear === currentYear) {
                if (tx.amount > 0) currentIncome += tx.amount
                else {
                    currentExpenses += Math.abs(tx.amount)
                    currentCount++
                }
            } else if (txMonth === prevMonth && txYear === prevYear) {
                if (tx.amount > 0) prevIncome += tx.amount
                else prevExpenses += Math.abs(tx.amount)
            }
        })

        const netFlow = currentIncome - currentExpenses
        const expenseChange = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0
        const avgTransaction = currentCount > 0 ? currentExpenses / currentCount : 0

        return {
            income: currentIncome,
            expenses: currentExpenses,
            netFlow,
            transactionCount: currentCount,
            avgTransaction,
            expenseChange,
        }
    }, [data])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Financial Summary"
    const chartDescription = "Quick overview of your current month's financial activity."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Income vs expenses this month",
                    "Net cash flow",
                    "Transaction statistics",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:financialSummary"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={summaryData || {}}
                size="sm"
            />
        </div>
    )

    if (!mounted || !summaryData) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:financialSummary" chartTitle={chartTitle} size="md" />
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

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:financialSummary" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Month overview</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[180px] grid grid-cols-2 gap-4">
                    {/* Income */}
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: isDark ? '#064e3b' : '#d1fae5' }}>
                        <IconCoin size={32} className="text-emerald-500" />
                        <div>
                            <div className="text-xs text-muted-foreground">Income</div>
                            <div className="text-lg font-bold text-emerald-500">{formatCurrency(summaryData.income)}</div>
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: isDark ? '#7f1d1d' : '#fee2e2' }}>
                        <IconShoppingCart size={32} className="text-red-500" />
                        <div>
                            <div className="text-xs text-muted-foreground">Expenses</div>
                            <div className="text-lg font-bold text-red-500">{formatCurrency(summaryData.expenses)}</div>
                        </div>
                    </div>

                    {/* Net Flow */}
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}>
                        {summaryData.netFlow >= 0 ? (
                            <IconArrowUp size={32} className="text-emerald-500" />
                        ) : (
                            <IconArrowDown size={32} className="text-red-500" />
                        )}
                        <div>
                            <div className="text-xs text-muted-foreground">Net Flow</div>
                            <div className="text-lg font-bold" style={{ color: summaryData.netFlow >= 0 ? '#10b981' : '#ef4444' }}>
                                {formatCurrency(summaryData.netFlow)}
                            </div>
                        </div>
                    </div>

                    {/* Transactions */}
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}>
                        <IconReceipt size={32} style={{ color: palette[0] || '#fe8339' }} />
                        <div>
                            <div className="text-xs text-muted-foreground">Transactions</div>
                            <div className="text-lg font-bold text-foreground">{summaryData.transactionCount}</div>
                        </div>
                    </div>
                </div>

                {/* Change indicator */}
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    vs last month:
                    <span
                        className="ml-2 font-semibold"
                        style={{ color: summaryData.expenseChange > 0 ? '#ef4444' : '#10b981' }}
                    >
                        {summaryData.expenseChange > 0 ? '+' : ''}{summaryData.expenseChange.toFixed(1)}%
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
