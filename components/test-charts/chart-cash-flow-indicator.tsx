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

interface ChartCashFlowIndicatorProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
}

export function ChartCashFlowIndicator({
    data,
    isLoading = false,
}: ChartCashFlowIndicatorProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [animatedValue, setAnimatedValue] = useState(50)

    useEffect(() => {
        setMounted(true)
    }, [])

    const cashFlowData = useMemo(() => {
        if (!data || data.length === 0) return { income: 0, expenses: 0, netFlow: 0, flowPercentage: 50 }

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        let income = 0
        let expenses = 0

        data.forEach((tx) => {
            const txDate = new Date(tx.date)
            if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) return

            if (tx.amount > 0) {
                income += tx.amount
            } else {
                expenses += Math.abs(tx.amount)
            }
        })

        const netFlow = income - expenses
        // Map net flow to 0-100 scale where 50 is break-even
        // Positive flow pushes toward 100, negative toward 0
        const maxRange = Math.max(income, expenses) * 2
        const flowPercentage = maxRange > 0
            ? Math.max(0, Math.min(100, 50 + (netFlow / maxRange) * 50))
            : 50

        return { income, expenses, netFlow, flowPercentage }
    }, [data])

    useEffect(() => {
        if (!mounted) return
        const target = cashFlowData.flowPercentage
        const duration = 1500
        const startTime = Date.now()
        const startValue = 50

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setAnimatedValue(startValue + (target - startValue) * easeOut)
            if (progress < 1) requestAnimationFrame(animate)
        }

        requestAnimationFrame(animate)
    }, [mounted, cashFlowData.flowPercentage])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Cash Flow Indicator"
    const chartDescription = "Visualize your income vs expenses this month. Stay in the green zone!"

    const getFlowStatus = () => {
        if (cashFlowData.flowPercentage >= 70) return { text: 'Excellent', color: '#10b981' }
        if (cashFlowData.flowPercentage >= 55) return { text: 'Good', color: '#22c55e' }
        if (cashFlowData.flowPercentage >= 45) return { text: 'Break-even', color: '#f59e0b' }
        if (cashFlowData.flowPercentage >= 30) return { text: 'Deficit', color: '#ef4444' }
        return { text: 'Critical', color: '#dc2626' }
    }

    const status = getFlowStatus()

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Measures income vs expenses",
                    "50% = break-even",
                    "> 50% = positive cash flow",
                    "< 50% = negative cash flow",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:cashFlowIndicator"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={cashFlowData}
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
                        <ChartFavoriteButton chartId="testCharts:cashFlowIndicator" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:cashFlowIndicator" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Income vs expenses</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[200px] flex flex-col items-center justify-center gap-6">
                    {/* Gauge */}
                    <div className="relative w-full max-w-xs">
                        <div className="h-6 rounded-full overflow-hidden flex" style={{ backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }}>
                            <div
                                className="h-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${animatedValue}%`,
                                    background: `linear-gradient(to right, #ef4444, #f59e0b 30%, #22c55e 50%, #10b981 70%, #10b981)`,
                                }}
                            />
                        </div>
                        {/* Marker */}
                        <div
                            className="absolute top-0 w-1 h-8 -mt-1 bg-white border-2 border-foreground rounded-sm transition-all duration-1000 ease-out"
                            style={{ left: `calc(${animatedValue}% - 2px)` }}
                        />
                        {/* Labels */}
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                            <span>Deficit</span>
                            <span>Break-even</span>
                            <span>Surplus</span>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="text-center">
                        <div className="text-3xl font-bold" style={{ color: status.color }}>{status.text}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                            Net Flow: <span className="font-semibold" style={{ color: cashFlowData.netFlow >= 0 ? '#10b981' : '#ef4444' }}>
                                {cashFlowData.netFlow >= 0 ? '+' : ''}{formatCurrency(cashFlowData.netFlow)}
                            </span>
                        </div>
                    </div>

                    {/* Income/Expense breakdown */}
                    <div className="flex gap-8 text-center">
                        <div>
                            <div className="text-sm text-muted-foreground">Income</div>
                            <div className="text-lg font-semibold text-emerald-500">{formatCurrency(cashFlowData.income)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Expenses</div>
                            <div className="text-lg font-semibold text-red-500">{formatCurrency(cashFlowData.expenses)}</div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
