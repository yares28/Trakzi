"use client"

// Purchase Size Comparison Chart - Shows distribution of receipt totals by size range
import * as React from "react"
import { useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

interface ReceiptTransaction {
    id: string
    receiptId: string
    receiptDate: string
    receiptTotalAmount: number
    totalPrice: number
    [key: string]: any
}

interface ChartPurchaseSizeComparisonFridgeProps {
    receiptTransactions?: ReceiptTransaction[]
    isLoading?: boolean
}

interface SizeRange {
    label: string
    min: number
    max: number
    count: number
    totalSpent: number
    color: string
}

// Define the size ranges
const SIZE_RANGES = [
    { label: "$0-25", min: 0, max: 25 },
    { label: "$25-50", min: 25, max: 50 },
    { label: "$50-75", min: 50, max: 75 },
    { label: "$75-100", min: 75, max: 100 },
    { label: "$100-150", min: 100, max: 150 },
    { label: "$150-200", min: 150, max: 200 },
    { label: "$200+", min: 200, max: Infinity },
]

export function ChartPurchaseSizeComparisonFridge({
    receiptTransactions = [],
    isLoading = false,
}: ChartPurchaseSizeComparisonFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = useState<{
        label: string
        count: number
        totalSpent: number
        color: string
        x: number
        y: number
    } | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    const palette = useMemo(() => {
        const base = getPalette().filter((color) => color !== "#c3c3c3")
        if (!base.length) {
            return ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#052e16", "#022c22"]
        }
        return base
    }, [getPalette])

    // Format currency
    const currencyFormatter = useMemo(
        () =>
            new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
            }),
        []
    )

    // Calculate size distribution from receipt totals
    const sizeData = useMemo(() => {
        if (!receiptTransactions || receiptTransactions.length === 0) return []

        // Get unique receipts by receiptId
        const receiptMap = new Map<string, number>()
        receiptTransactions.forEach((tx) => {
            if (tx.receiptId && tx.receiptTotalAmount > 0) {
                receiptMap.set(tx.receiptId, tx.receiptTotalAmount)
            }
        })

        // Count receipts in each size range
        const rangeCounts = SIZE_RANGES.map((range, index) => ({
            ...range,
            count: 0,
            totalSpent: 0,
            color: palette[index % palette.length],
        }))

        receiptMap.forEach((amount) => {
            const range = rangeCounts.find((r) => amount >= r.min && amount < r.max)
            if (range) {
                range.count++
                range.totalSpent += amount
            }
        })

        // Filter out ranges with 0 count (dynamic behavior requested by user)
        return rangeCounts.filter((r) => r.count > 0)
    }, [receiptTransactions, palette])

    const maxCount = useMemo(() => {
        return Math.max(...sizeData.map((d) => d.count), 1)
    }, [sizeData])

    const totalReceipts = useMemo(() => {
        return sizeData.reduce((sum, d) => sum + d.count, 0)
    }, [sizeData])

    const handleBarHover = (
        range: SizeRange,
        event: React.MouseEvent<SVGRectElement>
    ) => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip({
            label: range.label,
            count: range.count,
            totalSpent: range.totalSpent,
            color: range.color,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        })
    }

    const handleBarLeave = () => {
        setTooltip(null)
    }

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Purchase Size Comparison"
                description="Distribution of grocery trips by receipt total"
                details={[
                    "Each bar represents a price range for receipt totals.",
                    "Height shows how many shopping trips fell into that range.",
                    "Ranges with no receipts are automatically hidden.",
                ]}
                ignoredFootnote="Based on unique receipt totals from scanned receipts."
            />
            <ChartAiInsightButton
                chartId="fridge:purchaseSizeComparison"
                chartTitle="Purchase Size Comparison"
                chartDescription="Distribution of grocery trips by receipt total"
                chartData={{
                    ranges: sizeData.map((d) => ({ label: d.label, count: d.count })),
                    totalReceipts,
                }}
                size="sm"
            />
        </div>
    )

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"

    if (!mounted || isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:purchaseSizeComparison"
                            chartTitle="Purchase Size Comparison"
                            size="md"
                        />
                        <CardTitle>Purchase Size Comparison</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={true} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (sizeData.length === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:purchaseSizeComparison"
                            chartTitle="Purchase Size Comparison"
                            size="md"
                        />
                        <CardTitle>Purchase Size Comparison</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px] flex items-center justify-center text-muted-foreground">
                        No receipt data available
                    </div>
                </CardContent>
            </Card>
        )
    }

    const barWidth = Math.min(60, (100 / sizeData.length) * 0.7)
    const barGap = (100 - barWidth * sizeData.length) / (sizeData.length + 1)

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="fridge:purchaseSizeComparison"
                        chartTitle="Purchase Size Comparison"
                        size="md"
                    />
                    <CardTitle>Purchase Size Comparison</CardTitle>
                </div>
                <CardDescription>
                    <span className="hidden @[540px]/card:block">
                        Distribution of {totalReceipts} shopping trips by receipt total
                    </span>
                    <span className="@[540px]/card:hidden">{totalReceipts} trips by size</span>
                </CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div
                    ref={containerRef}
                    className="h-full w-full min-h-[250px] relative"
                >
                    <svg
                        viewBox="0 0 100 70"
                        preserveAspectRatio="xMidYMid meet"
                        className="w-full h-full"
                    >
                        {/* Y-axis grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                            <g key={tick}>
                                <line
                                    x1="12"
                                    y1={55 - tick * 45}
                                    x2="98"
                                    y2={55 - tick * 45}
                                    stroke={gridColor}
                                    strokeWidth="0.2"
                                />
                                <text
                                    x="10"
                                    y={55 - tick * 45 + 1}
                                    textAnchor="end"
                                    fontSize="3"
                                    fill={textColor}
                                >
                                    {Math.round(maxCount * tick)}
                                </text>
                            </g>
                        ))}

                        {/* Bars */}
                        {sizeData.map((range, index) => {
                            const barHeight = (range.count / maxCount) * 45
                            const x = 12 + barGap + index * (barWidth + barGap)
                            const y = 55 - barHeight

                            return (
                                <g key={range.label}>
                                    <rect
                                        x={`${x}%`}
                                        y={y}
                                        width={`${barWidth}%`}
                                        height={barHeight}
                                        fill={range.color}
                                        rx="1"
                                        className="cursor-pointer transition-opacity hover:opacity-80"
                                        onMouseMove={(e) => handleBarHover(range, e)}
                                        onMouseLeave={handleBarLeave}
                                    />
                                    {/* Bar label (count) */}
                                    {barHeight > 5 && (
                                        <text
                                            x={`${x + barWidth / 2}%`}
                                            y={y + barHeight / 2 + 1}
                                            textAnchor="middle"
                                            fontSize="3.5"
                                            fill="#ffffff"
                                            fontWeight="bold"
                                        >
                                            {range.count}
                                        </text>
                                    )}
                                    {/* X-axis label */}
                                    <text
                                        x={`${x + barWidth / 2}%`}
                                        y="62"
                                        textAnchor="middle"
                                        fontSize="2.8"
                                        fill={textColor}
                                    >
                                        {range.label}
                                    </text>
                                </g>
                            )
                        })}

                        {/* Y-axis label */}
                        <text
                            x="2"
                            y="30"
                            textAnchor="middle"
                            fontSize="3"
                            fill={textColor}
                            transform="rotate(-90, 2, 30)"
                        >
                            Receipts
                        </text>
                    </svg>

                    {/* Tooltip */}
                    {tooltip && (
                        <div
                            className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                            style={{
                                left: Math.min(tooltip.x + 10, (containerRef.current?.clientWidth || 300) - 120),
                                top: Math.max(tooltip.y - 60, 10),
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 rounded-sm"
                                    style={{ backgroundColor: tooltip.color }}
                                />
                                <span className="font-medium text-foreground">{tooltip.label}</span>
                            </div>
                            <div className="mt-1 text-foreground/80">
                                <div>{tooltip.count} receipt{tooltip.count !== 1 ? "s" : ""}</div>
                                <div className="font-mono">{currencyFormatter.format(tooltip.totalSpent)} total</div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
