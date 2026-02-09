"use client"

// Grocery Category Rankings Chart for Fridge - Shows category spending rankings over time
import * as React from "react"
import { useMemo, useState, useEffect, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveAreaBump } from "@nivo/bump"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { getChartTextColor, CHART_GRID_COLOR } from "@/lib/chart-colors"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { type DateFilterType } from "@/components/date-filter"
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
import { NivoChartTooltip } from "@/components/chart-tooltip"

type ReceiptTransactionRow = {
    id: number
    receiptId: string
    storeName: string | null
    receiptDate: string
    receiptTime: string
    receiptTotalAmount: number
    receiptStatus: string
    description: string
    quantity: number
    pricePerUnit: number
    totalPrice: number
    categoryId: number | null
    categoryTypeId?: number | null
    categoryName: string | null
    categoryColor: string | null
    categoryTypeName?: string | null
    categoryTypeColor?: string | null
}

interface ChartCategoryFlowFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    monthlyCategoriesData?: Array<{ month: number; category: string; total: number }>
    isLoading?: boolean
    dateFilter?: DateFilterType | null
}

function normalizeCategoryName(value: string | null | undefined) {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
}

export const ChartCategoryFlowFridge = memo(function ChartCategoryFlowFridge({ receiptTransactions = [], monthlyCategoriesData, isLoading = false, dateFilter }: ChartCategoryFlowFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Determine time granularity based on date filter
    const getTimeKey = (date: Date): string => {
        if (!dateFilter) {
            // All time: use months
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        }

        switch (dateFilter) {
            case "last7days":
                // Daily grouping for 7 days
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
            case "last30days":
                // Weekly grouping for 30 days
                const weekStart = new Date(date)
                weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
                return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`
            case "last3months":
            case "last6months":
            case "lastyear":
            default:
                // Monthly grouping for longer periods
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        }
    }

    // Format time key for display based on granularity
    const formatTimeLabel = (timeKey: string): string => {
        const parts = timeKey.split("-")
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        if (parts.length === 3) {
            // Daily or weekly format (YYYY-MM-DD)
            const month = monthNames[parseInt(parts[1], 10) - 1]
            const day = parseInt(parts[2], 10)
            if (dateFilter === "last7days") {
                // Show "Mon DD" format for daily
                return `${month} ${day}`
            } else {
                // Show "Week of Mon DD" format for weekly
                return `${month} ${day}`
            }
        } else if (parts.length === 2) {
            // Monthly format (YYYY-MM)
            return monthNames[parseInt(parts[1], 10) - 1]
        }
        return timeKey
    }

    // Process receipt transactions to compute category rankings over time periods
    const data = useMemo(() => {
        // Use bundle data if available (pre-computed monthly categories)
        if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            // Group by month
            const periodTotals = new Map<number, Map<string, number>>()
            monthlyCategoriesData.forEach(d => {
                if (!periodTotals.has(d.month)) {
                    periodTotals.set(d.month, new Map())
                }
                const catMap = periodTotals.get(d.month)!
                catMap.set(d.category, (catMap.get(d.category) || 0) + d.total)
            })

            let sortedMonths = Array.from(periodTotals.keys()).sort((a, b) => a - b)
            const allCategories = new Set<string>()
            periodTotals.forEach(catMap => catMap.forEach((_, cat) => allCategories.add(cat)))

            // Calculate rankings and percentages per month (higher y = higher spending = top)
            const categoryRankings = new Map<string, { x: string; y: number; percentage: number }[]>()
            allCategories.forEach(cat => categoryRankings.set(cat, []))

            sortedMonths.forEach(month => {
                const catMap = periodTotals.get(month)!
                const totals: { category: string; total: number }[] = []
                let periodTotal = 0
                allCategories.forEach(cat => {
                    const catTotal = catMap.get(cat) || 0
                    totals.push({ category: cat, total: catTotal })
                    periodTotal += catTotal
                })
                totals.sort((a, b) => b.total - a.total)
                const numCategories = totals.length
                totals.forEach((item, index) => {
                    const percentage = periodTotal > 0 ? (item.total / periodTotal) * 100 : 0
                    // Invert rank so highest spending has highest y value (appears at top)
                    const invertedRank = numCategories - index
                    categoryRankings.get(item.category)!.push({ x: monthNames[month - 1], y: invertedRank, percentage })
                })
            })

            // Area Bump needs 2 distinct x-points to draw the band
            if (sortedMonths.length === 1) {
                const soleMonth = sortedMonths[0]
                const soleLabel = monthNames[soleMonth - 1]
                const continuationLabel = soleLabel + "\u200B" // zero-width space = distinct key, same display
                // Duplicate rankings for continuation (including percentage)
                allCategories.forEach(cat => {
                    const rankings = categoryRankings.get(cat)!
                    if (rankings.length > 0) {
                        rankings.push({ x: continuationLabel, y: rankings[0].y, percentage: rankings[0].percentage })
                    }
                })
            }

            // Get top 7 categories by total
            const categoryTotals: { category: string; total: number }[] = []
            allCategories.forEach(cat => {
                let total = 0
                periodTotals.forEach(catMap => total += catMap.get(cat) || 0)
                categoryTotals.push({ category: cat, total })
            })
            categoryTotals.sort((a, b) => b.total - a.total)

            return categoryTotals.slice(0, 7).map(item => ({
                id: item.category,
                data: categoryRankings.get(item.category) || []
            }))
        }

        // Fallback to raw transactions
        if (!receiptTransactions || receiptTransactions.length === 0) return []

        // Group by time period and category
        const periodCategoryTotals = new Map<string, Map<string, number>>()

        receiptTransactions.forEach((item) => {
            if (!item.receiptDate) return
            const date = new Date(item.receiptDate)
            const periodKey = getTimeKey(date)
            const category = normalizeCategoryName(item.categoryName)
            const spend = Number(item.totalPrice) || 0

            if (!periodCategoryTotals.has(periodKey)) {
                periodCategoryTotals.set(periodKey, new Map())
            }
            const categoryMap = periodCategoryTotals.get(periodKey)!
            categoryMap.set(category, (categoryMap.get(category) || 0) + spend)
        })

        // Get sorted time periods
        let sortedPeriods = Array.from(periodCategoryTotals.keys()).sort()
        if (sortedPeriods.length === 0) return []

        // Get all unique categories across all periods
        const allCategories = new Set<string>()
        periodCategoryTotals.forEach((categoryMap) => {
            categoryMap.forEach((_, category) => allCategories.add(category))
        })

        // Calculate rank and percentage for each category in each period (higher y = higher spending = top)
        const categoryRankings = new Map<string, { x: string; y: number; percentage: number }[]>()
        allCategories.forEach((category) => {
            categoryRankings.set(category, [])
        })

        sortedPeriods.forEach((periodKey) => {
            const categoryMap = periodCategoryTotals.get(periodKey)!

            // Get all categories with their totals for this period
            const totals: { category: string; total: number }[] = []
            let periodTotal = 0
            allCategories.forEach((category) => {
                const catTotal = categoryMap.get(category) || 0
                totals.push({ category, total: catTotal })
                periodTotal += catTotal
            })

            // Sort by total descending to assign ranks
            totals.sort((a, b) => b.total - a.total)
            const numCategories = totals.length

            // Assign inverted ranks and percentages (higher y = higher spending = top of chart)
            totals.forEach((item, index) => {
                const rankings = categoryRankings.get(item.category)!
                const displayLabel = formatTimeLabel(periodKey)
                const percentage = periodTotal > 0 ? (item.total / periodTotal) * 100 : 0
                // Invert rank so highest spending has highest y value (appears at top)
                const invertedRank = numCategories - index
                rankings.push({ x: displayLabel, y: invertedRank, percentage })
            })
        })

        // Area Bump needs 2 distinct x-points to draw the band
        if (sortedPeriods.length === 1) {
            const sole = sortedPeriods[0]
            const soleLabel = formatTimeLabel(sole)
            const continuationLabel = soleLabel + "\u200B" // zero-width space = distinct key, same display
            // Duplicate rankings for continuation (including percentage)
            allCategories.forEach(category => {
                const rankings = categoryRankings.get(category)!
                if (rankings.length > 0) {
                    rankings.push({ x: continuationLabel, y: rankings[0].y, percentage: rankings[0].percentage })
                }
            })
        }

        // Convert to Nivo format and filter to top categories
        const result: { id: string; data: { x: string; y: number; percentage: number }[] }[] = []

        // Calculate total spending per category to get top N
        const categoryTotals: { category: string; total: number }[] = []
        allCategories.forEach((category) => {
            let total = 0
            periodCategoryTotals.forEach((categoryMap) => {
                total += categoryMap.get(category) || 0
            })
            categoryTotals.push({ category, total })
        })
        categoryTotals.sort((a, b) => b.total - a.total)

        // Take top 7 categories
        const topCategories = categoryTotals.slice(0, 7).map((item) => item.category)

        topCategories.forEach((category) => {
            result.push({
                id: category,
                data: categoryRankings.get(category) || [],
            })
        })

        return result
    }, [receiptTransactions, dateFilter, monthlyCategoriesData])


    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const borderColor = CHART_GRID_COLOR

    const palette = getShuffledPalette()
    const numCategories = data.length

    const orderedPalette = isDark ? [...palette].reverse() : palette
    let colorConfig = orderedPalette.slice(0, numCategories)

    while (colorConfig.length < numCategories) {
        colorConfig.push(...orderedPalette.slice(0, numCategories - colorConfig.length))
    }
    colorConfig = colorConfig.slice(0, numCategories)

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Grocery Category Rankings"
                description="Ranks your grocery categories by spend over time (1 = highest)."
                details={[
                    "Each colored area represents a category; the higher it sits, the larger its share that month.",
                    "Use this to see which aisles dominate and how your mix changes.",
                ]}
                ignoredFootnote="Rankings are computed from receipt line items."
            />
            <ChartAiInsightButton
                chartId="fridge:categoryRankings"
                chartTitle="Grocery Category Rankings"
                chartDescription="Ranks grocery categories by spend over time."
                chartData={{
                    categories: data.map((series) => series.id),
                    points: data.reduce((sum, series) => sum + series.data.length, 0),
                }}
                size="sm"
            />
        </div>
    )

    // Loading or empty state
    if (!mounted || isLoading || data.length === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:categoryRankings"
                            chartTitle="Grocery Category Rankings"
                            size="md"
                        />
                        <CardTitle>Grocery Category Rankings</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} skeletonType="flow" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton
                        chartId="fridge:categoryRankings"
                        chartTitle="Grocery Category Rankings"
                        size="md"
                    />
                    <CardTitle>Grocery Category Rankings</CardTitle>
                </div>
                <CardDescription>
                </CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="relative h-full w-full min-h-[250px]">
                    <ResponsiveAreaBump
                        data={data}
                        margin={{ top: 40, right: 40, bottom: 24, left: 140 }}
                        spacing={12}
                        colors={colorConfig}
                        blendMode="normal"
                        startLabel={(serie) => serie.id}
                        endLabel={false}
                        startLabelTextColor={textColor}
                        startLabelPadding={12}
                        endLabelPadding={0}
                        interpolation="smooth"
                        axisTop={{
                            tickSize: 5,
                            tickPadding: 5,
                            tickRotation: 0,
                            legend: "",
                            legendPosition: "middle",
                            legendOffset: -36,
                        }}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 0,
                            tickRotation: 0,
                            legend: "",
                            legendPosition: "middle",
                            legendOffset: 32,
                            format: () => "",
                        }}
                        theme={{
                            text: {
                                fill: textColor,
                                fontSize: 12,
                                fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                            },
                            axis: {
                                domain: {
                                    line: {
                                        stroke: borderColor,
                                        strokeWidth: 1,
                                    },
                                },
                                ticks: {
                                    line: {
                                        stroke: borderColor,
                                        strokeWidth: 1,
                                    },
                                },
                            },
                            grid: {
                                line: {
                                    stroke: borderColor,
                                    strokeWidth: 0.5,
                                },
                            },
                        }}
                        tooltip={({ serie }) => {
                            const originalSerie = data.find((d) => d.id === serie.id)
                            const lastPoint = originalSerie?.data[originalSerie.data.length - 1]
                            const percentage = lastPoint?.percentage ?? 0

                            return (
                                <NivoChartTooltip
                                    title={serie.id}
                                    titleColor={serie.color}
                                    value={`${percentage.toFixed(1)}%`}
                                />
                            )
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    )
})

ChartCategoryFlowFridge.displayName = "ChartCategoryFlowFridge"
