"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import {
    Card,
    CardContent,
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

interface ChartTopMerchantsRaceProps {
    data: Array<{
        date: string
        amount: number
        description: string
    }>
    isLoading?: boolean
}

export function ChartTopMerchantsRace({
    data,
    isLoading = false,
}: ChartTopMerchantsRaceProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = getPalette()
    const [mounted, setMounted] = useState(false)
    const [animationProgress, setAnimationProgress] = useState(0)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Extract merchant from description (simplified extraction)
    const extractMerchant = (description: string): string => {
        // Clean up common patterns
        let merchant = description
            .replace(/^(POS|ATM|DEBIT|CREDIT|ACH|TRANSFER|PAYMENT|PURCHASE)\s*/i, "")
            .replace(/\s*(CARD|VISA|MASTERCARD|AMEX|DEBIT)\s*$/i, "")
            .replace(/\d{4,}/g, "") // Remove long numbers
            .replace(/\s+/g, " ")
            .trim()

        // Take first few words as merchant name
        const words = merchant.split(" ").slice(0, 3).join(" ")
        return words.length > 2 ? words : description.slice(0, 25)
    }

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []

        // Group by merchant
        const merchantTotals = new Map<string, number>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const merchant = extractMerchant(tx.description)
            const current = merchantTotals.get(merchant) || 0
            merchantTotals.set(merchant, current + Math.abs(tx.amount))
        })

        // Get top 5 merchants
        return Array.from(merchantTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, total], index) => ({
                name,
                total,
                rank: index + 1,
                color: palette[index % palette.length] || "#6b7280",
            }))
    }, [data, palette])

    // Animate bars
    useEffect(() => {
        if (!mounted || chartData.length === 0) return

        const duration = 1500
        const startTime = Date.now()

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setAnimationProgress(easeOut)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }, [mounted, chartData])

    const theme = resolvedTheme === "dark" ? "dark" : "light"
    const textColor = theme === "dark" ? "#ffffff" : "#1f2937"

    const chartTitle = "Top 5 Merchants"
    const chartDescription =
        "Bar race showing your top 5 merchants by total spending. See where your money goes most frequently."

    const maxTotal = chartData.length > 0 ? chartData[0].total : 1

    const chartDataForAI = useMemo(() => {
        if (chartData.length === 0) return {}
        return {
            topMerchant: chartData[0]?.name ?? "None",
            topMerchantTotal: chartData[0]?.total ?? 0,
            merchantCount: chartData.length,
        }
    }, [chartData])

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="testCharts:topMerchantsRace"
                            chartTitle={chartTitle}
                            size="md"
                        />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card h-full flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="testCharts:topMerchantsRace"
                        chartTitle={chartTitle}
                        size="md"
                    />
                    <CardTitle>{chartTitle}</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-col items-center gap-2">
                        <ChartInfoPopover
                            title={chartTitle}
                            description={chartDescription}
                            details={[
                                "Shows top 5 by total spending",
                                "Extracted from transaction descriptions",
                                "Bar length = relative spending",
                                "Hover for exact amounts",
                            ]}
                        />
                        <ChartAiInsightButton
                            chartId="testCharts:topMerchantsRace"
                            chartTitle={chartTitle}
                            chartDescription={chartDescription}
                            chartData={chartDataForAI}
                            size="sm"
                        />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                {isLoading || chartData.length === 0 ? (
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center">
                        <ChartLoadingState />
                    </div>
                ) : (
                    <div className="h-full w-full min-h-[250px] flex flex-col justify-center gap-3 py-4">
                        {chartData.map((item, index) => {
                            const barWidth = (item.total / maxTotal) * 100 * animationProgress
                            const delay = index * 100

                            return (
                                <div
                                    key={item.name}
                                    className="flex items-center gap-3 group"
                                    style={{
                                        animationDelay: `${delay}ms`,
                                        opacity: animationProgress > 0 ? 1 : 0,
                                        transition: `opacity 0.3s ease ${delay}ms`
                                    }}
                                >
                                    <div className="w-6 text-sm font-bold text-muted-foreground">
                                        #{item.rank}
                                    </div>
                                    <div className="flex-1 relative">
                                        <div
                                            className="h-10 rounded-lg flex items-center px-3 transition-all duration-300 group-hover:brightness-110"
                                            style={{
                                                width: `${Math.max(barWidth, 5)}%`,
                                                backgroundColor: item.color,
                                                transition: "width 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
                                            }}
                                        >
                                            <span
                                                className="text-xs font-semibold truncate"
                                                style={{ color: "#ffffff" }}
                                            >
                                                {item.name}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-24 text-right text-sm font-medium text-foreground">
                                        {formatCurrency(item.total * animationProgress)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
