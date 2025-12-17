"use client"

import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ResponsiveLine } from "@nivo/line"
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

interface ChartBalanceHistoryProps {
    data: Array<{
        date: string
        amount: number
        balance?: number | null
    }>
    isLoading?: boolean
}

export function ChartBalanceHistory({
    data,
    isLoading = false,
}: ChartBalanceHistoryProps) {
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

        // Sort by date and get daily balances
        const sortedData = [...data]
            .filter(tx => tx.balance !== null && tx.balance !== undefined)
            .sort((a, b) => a.date.localeCompare(b.date))

        if (sortedData.length === 0) {
            // If no balance data, calculate running balance
            let balance = 0
            const calculated = [...data]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(tx => {
                    balance += tx.amount
                    return { date: tx.date.slice(0, 10), balance }
                })

            // Get unique dates with last balance of each day
            const dailyBalances = new Map<string, number>()
            calculated.forEach(({ date, balance }) => {
                dailyBalances.set(date, balance)
            })

            const entries = Array.from(dailyBalances.entries()).slice(-30)
            return [{
                id: "Balance",
                data: entries.map(([date, balance]) => ({ x: date, y: balance })),
            }]
        }

        // Use actual balance data
        const dailyBalances = new Map<string, number>()
        sortedData.forEach(tx => {
            dailyBalances.set(tx.date.slice(0, 10), tx.balance!)
        })

        const entries = Array.from(dailyBalances.entries()).slice(-30)
        return [{
            id: "Balance",
            data: entries.map(([date, balance]) => ({ x: date, y: balance })),
        }]
    }, [data])

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#374151" : "#e5e7eb"

    const chartTitle = "Balance History"
    const chartDescription = "Track your account balance over the last 30 days."

    const latestBalance = chartData[0]?.data?.[chartData[0].data.length - 1]?.y ?? 0
    const startBalance = chartData[0]?.data?.[0]?.y ?? 0
    const change = latestBalance - startBalance

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title={chartTitle}
                description={chartDescription}
                details={[
                    "Shows last 30 days",
                    "Based on transaction balances",
                    "Rising line = growing balance",
                ]}
            />
            <ChartAiInsightButton
                chartId="testCharts:balanceHistory"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={{ latestBalance, change }}
                size="sm"
            />
        </div>
    )

    if (!mounted || chartData.length === 0 || !chartData[0]?.data?.length) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="testCharts:balanceHistory" chartTitle={chartTitle} size="md" />
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

    const minBalance = Math.min(...chartData[0].data.map(d => d.y))
    const maxBalance = Math.max(...chartData[0].data.map(d => d.y))

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="testCharts:balanceHistory" chartTitle={chartTitle} size="md" />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">{chartDescription}</span>
                    <span className="@[540px]/card:hidden">30-day balance</span>
                </CardDescription>
                <CardAction>{renderInfoTrigger()}</CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsiveLine
                        data={chartData}
                        margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
                        xScale={{ type: "point" }}
                        yScale={{ type: "linear", min: minBalance * 0.95, max: maxBalance * 1.05 }}
                        curve="monotoneX"
                        colors={[change >= 0 ? "#10b981" : "#ef4444"]}
                        lineWidth={2}
                        pointSize={0}
                        enableGridX={false}
                        enableArea={true}
                        areaOpacity={0.1}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 12,
                            tickRotation: -45,
                            tickValues: 5,
                            format: (v: string) => {
                                const date = new Date(v)
                                return `${date.getMonth() + 1}/${date.getDate()}`
                            },
                        }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `$${v}`,
                        }}
                        theme={{
                            text: { fill: textColor, fontSize: 11 },
                            axis: { ticks: { text: { fill: textColor } } },
                            grid: { line: { stroke: gridColor } },
                        }}
                        useMesh={true}
                        tooltip={({ point }) => (
                            <div className="rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                                <div className="text-[0.7rem] text-foreground/60">{point.data.xFormatted}</div>
                                <div className="mt-1 font-mono font-semibold text-foreground">
                                    {formatCurrency(point.data.y as number)}
                                </div>
                            </div>
                        )}
                        animate={true}
                        motionConfig="gentle"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
