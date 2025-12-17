"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
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

interface ChartRecurringVsOneTimeProps {
    data: Array<{
        date: string
        amount: number
        isRecurring?: boolean
        description: string
    }>
    isLoading?: boolean
}

export function ChartRecurringVsOneTime({
    data,
    isLoading = false,
}: ChartRecurringVsOneTimeProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Heuristic to detect recurring transactions
    const isLikelyRecurring = (description: string): boolean => {
        const keywords = [
            'subscription', 'netflix', 'spotify', 'amazon prime', 'gym', 'membership',
            'insurance', 'rent', 'mortgage', 'utility', 'phone', 'internet', 'electric',
            'water', 'gas', 'loan', 'payment', 'monthly', 'annual', 'hulu', 'disney',
        ]
        const lower = description.toLowerCase()
        return keywords.some(kw => lower.includes(kw))
    }

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        let recurringTotal = 0
        let oneTimeTotal = 0

        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const amount = Math.abs(tx.amount)
            const recurring = tx.isRecurring ?? isLikelyRecurring(tx.description)

            if (recurring) {
                recurringTotal += amount
            } else {
                oneTimeTotal += amount
            }
        })

        if (recurringTotal === 0 && oneTimeTotal === 0) return []

        return [
            { id: "Recurring", label: "Recurring", value: recurringTotal, color: palette[0] || "#fe8339" },
            { id: "One-Time", label: "One-Time", value: oneTimeTotal, color: palette[2] || "#3b82f6" },
        ].filter(d => d.value > 0)
    }, [data, palette])

    const total = chartData.reduce((sum, d) => sum + d.value, 0)
    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"

    const chartTitle = "Recurring vs One-Time"
    const chartDescription = "See how much of your spending is on subscriptions and recurring bills versus one-time purchases."

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Recurring: subscriptions, bills, memberships",
                    "One-Time: individual purchases",
                    "Detected using transaction descriptions",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:recurringVsOneTime"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ categories: chartData, total }}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.length === 0) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:recurringVsOneTime" chartTitle={chartTitle} size="md" />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction>{renderInfoTrigger()}</CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:recurringVsOneTime" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Recurring vs one-time spend</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsivePie
                        data={chartData}
                        margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
                        innerRadius={0.6}
                        padAngle={2}
                        cornerRadius={6}
                        activeOuterRadiusOffset={8}
                        colors={{ datum: "data.color" }}
                        borderWidth={0}
                        arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor={textColor}
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: "color" }}
                        arcLabelsSkipAngle={20}
                        arcLabelsTextColor="#ffffff"
                        valueFormat={(v) => formatCurrency(v)}
                        tooltip={({ datum }) => {
                            const pct = total > 0 ? (Number(datum.value) / total) * 100 : 0
                            return (
                                <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: datum.color }} />
                                        <span className="font-medium text-foreground">{datum.label}</span>
                                    </div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(Number(datum.value))}</div>
                                    <div className="text-[0.7rem] text-foreground/60">{pct.toFixed(1)}% of total</div>
                                </div>
                            )
                        }}
                        theme={{ text: { fill: textColor, fontSize: 12 } }}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
