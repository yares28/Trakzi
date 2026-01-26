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

interface ChartPaymentMethodsProps {
    data: Array<{
        date: string
        amount: number
        description: string
    }>
    isLoading?: boolean
}

export function ChartPaymentMethods({
    data,
    isLoading = false,
}: ChartPaymentMethodsProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        const methodTotals = new Map<string, number>()

        // Try to detect payment method from description
        data.forEach((tx) => {
            if (tx.amount >= 0) return
            const desc = tx.description.toLowerCase()

            let method = 'Other'
            if (desc.includes('card') || desc.includes('visa') || desc.includes('mastercard') || desc.includes('amex')) {
                method = 'Card'
            } else if (desc.includes('paypal')) {
                method = 'PayPal'
            } else if (desc.includes('venmo') || desc.includes('zelle') || desc.includes('transfer')) {
                method = 'Transfer'
            } else if (desc.includes('cash') || desc.includes('atm') || desc.includes('withdrawal')) {
                method = 'Cash'
            } else if (desc.includes('check') || desc.includes('cheque')) {
                method = 'Check'
            } else if (desc.includes('apple pay') || desc.includes('google pay') || desc.includes('samsung pay')) {
                method = 'Mobile Pay'
            } else if (desc.includes('ach') || desc.includes('direct')) {
                method = 'ACH/Direct'
            }

            methodTotals.set(method, (methodTotals.get(method) || 0) + Math.abs(tx.amount))
        })

        const paletteLength = palette?.length || 0
        return Array.from(methodTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([method, total], i) => ({
                id: method,
                label: method,
                value: total,
                color: paletteLength > 0 ? (palette[i % paletteLength] || "#6b7280") : "#6b7280",
            }))
    }, [data, palette])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"

    const chartTitle = "Payment Methods"
    const chartDescription = "How you're paying - card, cash, transfers, and more."

    const total = chartData.reduce((sum, d) => sum + d.value, 0)

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Based on transaction descriptions",
                    "Shows spending by method",
                    "May vary by bank format",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:paymentMethods"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ methods: chartData }}
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
                        <ChartFavoriteButton chartId="testCharts:paymentMethods" chartTitle={chartTitle} size="md" />
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
                    <ChartFavoriteButton chartId="testCharts:paymentMethods" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">Payment breakdown</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsivePie
                        data={chartData}
                        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                        innerRadius={0.5}
                        padAngle={2}
                        cornerRadius={6}
                        activeOuterRadiusOffset={8}
                        colors={{ datum: "data.color" }}
                        borderWidth={0}
                        arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor={textColor}
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: "color" }}
                        arcLabelsSkipAngle={25}
                        arcLabelsTextColor="#ffffff"
                        valueFormat={(v) => `${((v / total) * 100).toFixed(0)}%`}
                        tooltip={({ datum }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: datum.color }} />
                                    <span className="font-medium text-foreground">{datum.label}</span>
                                </div>
                                <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">{formatCurrency(Number(datum.value))}</div>
                                <div className="text-[0.7rem] text-foreground/60">{((Number(datum.value) / total) * 100).toFixed(1)}%</div>
                            </div>
                        )}
                        theme={{ text: { fill: textColor, fontSize: 12 } }}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
