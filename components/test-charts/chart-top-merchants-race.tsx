"use client"

import { memo, useMemo, useState, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import { useTheme } from "next-themes"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardAction,
} from "@/components/ui/card"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { getChartTextColor } from "@/lib/chart-colors"

interface ChartTopMerchantsRaceProps {
    data: Array<{
        date: string
        amount: number
        description: string
    }>
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
}

export const ChartTopMerchantsRace = memo(function ChartTopMerchantsRace({
    data,
    isLoading = false,
}: ChartTopMerchantsRaceProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(
        () => getShuffledPalette("analytics:topMerchantsRace"),
        [getShuffledPalette],
    )
    const [mounted, setMounted] = useState(false)
    const [animationProgress, setAnimationProgress] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [hoveredMerchant, setHoveredMerchant] = useState<string | null>(null)
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
    const hasAnimated = useRef(false)

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
        const merchantMap = new Map<string, { total: number; count: number }>()

        data.forEach((tx) => {
            if (tx.amount >= 0) return // Only expenses
            const merchant = extractMerchant(tx.description)
            const current = merchantMap.get(merchant) ?? { total: 0, count: 0 }
            merchantMap.set(merchant, { total: current.total + Math.abs(tx.amount), count: current.count + 1 })
        })

        // Get top 5 merchants
        const paletteLength = palette?.length || 0
        return Array.from(merchantMap.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([name, { total, count }], index) => ({
                name,
                total,
                count,
                rank: index + 1,
                color: paletteLength > 0 ? (palette[index % paletteLength] || "#6b7280") : "#6b7280",
            }))
    }, [data, palette])

    // Animate bars (runs once only)
    useEffect(() => {
        if (!mounted || chartData.length === 0) return
        if (hasAnimated.current) return
        hasAnimated.current = true

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

    const isDark = resolvedTheme === "dark"
    const barLabelColor = getChartTextColor(isDark)

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

    const renderInfoTrigger = () => (
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
                chartId="topMerchantsRace"
                chartTitle={chartTitle}
                chartDescription={chartDescription}
                chartData={chartDataForAI}
                size="sm"
            />
        </div>
    )

    const hoveredItem = chartData.find((item) => item.name === hoveredMerchant) ?? null

    const renderBars = () => (
        <div className="h-full w-full min-h-[230px] flex flex-col justify-center gap-3 py-4">
            {chartData.map((item, index) => {
                const barWidth = (item.total / maxTotal) * 100 * animationProgress
                const delay = index * 100

                return (
                    <div
                        key={item.name}
                        className="flex items-center gap-3 group relative"
                        style={{
                            animationDelay: `${delay}ms`,
                            opacity: animationProgress > 0 ? 1 : 0,
                            transition: `opacity 0.3s ease ${delay}ms`
                        }}
                        onMouseEnter={() => setHoveredMerchant(item.name)}
                        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => {
                            setHoveredMerchant(null)
                            setTooltipPos(null)
                        }}
                    >
                        <div className="w-6 text-sm font-bold text-muted-foreground">
                            #{item.rank}
                        </div>
                        <div className="flex-1 relative">
                            <div
                                className="h-10 rounded-lg flex items-center px-3 origin-left hover:scale-x-[1.02]"
                                style={{
                                    width: `${Math.max(barWidth, 5)}%`,
                                    backgroundColor: item.color,
                                    transition: "width 1.5s cubic-bezier(0.4, 0, 0.2, 1), filter 0.15s ease, transform 0.15s ease",
                                    filter: hoveredMerchant === item.name ? "brightness(1.15)" : "brightness(1)",
                                }}
                            >
                                <span
                                    className="text-xs font-semibold truncate"
                                    style={{ color: barLabelColor }}
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
            {hoveredItem && tooltipPos && typeof window !== "undefined" && ReactDOM.createPortal(
                <div style={{ position: "fixed", top: tooltipPos.y - 60, left: tooltipPos.x + 12, zIndex: 9999, pointerEvents: "none" }}>
                    <NivoChartTooltip
                        title={hoveredItem.name}
                        titleColor={hoveredItem.color}
                        value={formatCurrency(hoveredItem.total)}
                        subValue={`${hoveredItem.count} transaction${hoveredItem.count !== 1 ? "s" : ""}`}
                    />
                </div>,
                document.body
            )}
        </div>
    )

    if (!mounted) {
        return (
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="topMerchantsRace"
                            chartTitle={chartTitle}
                            size="md"
                        />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[230px]" />
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title={chartTitle}
                description={chartDescription}
                headerActions={renderInfoTrigger()}
            >
                <div className="h-full w-full min-h-[380px]">
                    {isLoading || chartData.length === 0 ? (
                        <div className="h-full w-full min-h-[380px] flex items-center justify-center">
                            <ChartLoadingState />
                        </div>
                    ) : (
                        renderBars()
                    )}
                </div>
            </ChartFullscreenModal>
            <Card className="@container/card h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="topMerchantsRace"
                            chartTitle={chartTitle}
                            size="md"
                        />
                        <CardTitle>{chartTitle}</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    {isLoading || chartData.length === 0 ? (
                        <div className="h-full w-full min-h-[230px] flex items-center justify-center">
                            <ChartLoadingState />
                        </div>
                    ) : (
                        renderBars()
                    )}
                </CardContent>
            </Card>
        </>
    )
})

ChartTopMerchantsRace.displayName = "ChartTopMerchantsRace"
