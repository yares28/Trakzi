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
import { IconFlame, IconSnowflake, IconTrophy } from "@tabler/icons-react"

interface ChartBudgetMilestoneProps {
    data: Array<{
        date: string
        amount: number
    }>
    isLoading?: boolean
    monthlyBudget?: number
}

export function ChartBudgetMilestone({
    data,
    isLoading = false,
    monthlyBudget = 3000,
}: ChartBudgetMilestoneProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [animatedProgress, setAnimatedProgress] = useState(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    const milestoneData = useMemo(() => {
        if (!data || data.length === 0) return { spent: 0, remaining: monthlyBudget, progress: 0 }

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        let spent = 0
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const txDate = new Date(tx.date)
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                spent += Math.abs(tx.amount)
            }
        })

        const remaining = Math.max(0, monthlyBudget - spent)
        const progress = Math.min(100, (spent / monthlyBudget) * 100)

        return { spent, remaining, progress }
    }, [data, monthlyBudget])

    useEffect(() => {
        if (!mounted) return
        const target = milestoneData.progress
        const duration = 1500
        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setAnimatedProgress(target * easeOut)
            if (progress < 1) requestAnimationFrame(animate)
        }

        requestAnimationFrame(animate)
    }, [mounted, milestoneData.progress])

    const isDark = resolvedTheme === "dark"

    const chartTitle = "Budget Milestone"
    const chartDescription = "Track your progress toward your monthly budget goal."

    const getStatusIcon = () => {
        if (milestoneData.progress >= 100) return <IconFlame size={24} className="text-red-500" />
        if (milestoneData.progress >= 75) return <IconFlame size={24} className="text-orange-500" />
        if (milestoneData.progress <= 25) return <IconSnowflake size={24} className="text-blue-500" />
        return <IconTrophy size={24} className="text-yellow-500" />
    }

    const getProgressColor = () => {
        if (milestoneData.progress >= 100) return "#ef4444"
        if (milestoneData.progress >= 75) return "#f59e0b"
        return palette[1] || "#10b981"
    }

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    `Budget: ${formatCurrency(monthlyBudget)}`,
                    "Green = on track",
                    "Yellow = approaching limit",
                    "Red = over budget",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:budgetMilestone"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={milestoneData}
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
                        <ChartFavoriteButton chartId="testCharts:budgetMilestone" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:budgetMilestone" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Budget progress</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[150px] flex flex-col items-center justify-center gap-4">
                    {/* Progress bar */}
                    <div className="w-full max-w-xs">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Spent</span>
                            <span className="font-semibold" style={{ color: getProgressColor() }}>
                                {formatCurrency(milestoneData.spent)}
                            </span>
                        </div>
                        <div className="h-4 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}>
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${Math.min(100, animatedProgress)}%`,
                                    backgroundColor: getProgressColor(),
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                            <span>{animatedProgress.toFixed(0)}% used</span>
                            <span>{formatCurrency(monthlyBudget)} budget</span>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-3 mt-2">
                        {getStatusIcon()}
                        <div className="text-center">
                            <div className="text-lg font-bold text-foreground">
                                {milestoneData.remaining > 0
                                    ? `${formatCurrency(milestoneData.remaining)} left`
                                    : `${formatCurrency(Math.abs(milestoneData.remaining - monthlyBudget + milestoneData.spent))} over!`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
