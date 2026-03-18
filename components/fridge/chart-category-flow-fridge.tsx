"use client"

import * as React from "react"
import { useMemo, useState, useEffect, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveAreaBump } from "@nivo/bump"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { getChartTextColor, CHART_GRID_COLOR } from "@/lib/chart-colors"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
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
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

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
    monthlyCategoriesData?: Array<{ month: string | number; category: string; total: number }>
    isLoading?: boolean
    dateFilter?: string | null
}

function normalizeCategoryName(value: string | null | undefined) {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
}

type FridgeAreaBumpSerie = { id: string; data: Array<{ x: string; y: number; percentage: number }> }

// ─── Extracted sub-components ────────────────────────────────────────────────

interface FridgeCategoryFlowInfoTriggerProps {
    forFullscreen?: boolean
    data: FridgeAreaBumpSerie[]
}

const FridgeCategoryFlowInfoTrigger = memo(function FridgeCategoryFlowInfoTrigger({
    forFullscreen = false,
    data,
}: FridgeCategoryFlowInfoTriggerProps) {
    return (
        <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
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
})
FridgeCategoryFlowInfoTrigger.displayName = "FridgeCategoryFlowInfoTrigger"

interface FridgeCategoryFlowChartProps {
    data: FridgeAreaBumpSerie[]
    colorConfig: string[]
    textColor: string
    borderColor: string
    getMonthAbbreviation: (monthStr: string) => string
}

const FridgeCategoryFlowFullChart = memo(function FridgeCategoryFlowFullChart({
    data,
    colorConfig,
    textColor,
    borderColor,
    getMonthAbbreviation,
}: FridgeCategoryFlowChartProps) {
    return (
        <ResponsiveAreaBump
            data={data}
            margin={{ top: 20, right: 15, bottom: 20, left: 85 }}
            spacing={10}
            colors={colorConfig}
            blendMode="normal"
            startLabel={(serie) => {
                const label = serie.id as string
                return label.length > 12 ? label.slice(0, 11) + '…' : label
            }}
            endLabel={false}
            startLabelTextColor={textColor}
            startLabelPadding={8}
            interpolation="smooth"
            axisTop={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "",
                legendPosition: "middle",
                legendOffset: -36,
                format: (value) => getMonthAbbreviation(String(value)),
            }}
            axisBottom={null}
            theme={{
                text: {
                    fill: textColor,
                    fontSize: 11,
                    fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                },
                axis: {
                    domain: { line: { stroke: borderColor, strokeWidth: 1 } },
                    ticks: { line: { stroke: borderColor, strokeWidth: 1 } },
                },
                grid: { line: { stroke: borderColor, strokeWidth: 0.5 } },
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
    )
})
FridgeCategoryFlowFullChart.displayName = "FridgeCategoryFlowFullChart"

const FridgeCategoryFlowMobileChart = memo(function FridgeCategoryFlowMobileChart({
    data,
    colorConfig,
    textColor,
    borderColor,
    getMonthAbbreviation,
}: FridgeCategoryFlowChartProps) {
    return (
        <ResponsiveAreaBump
            data={data}
            margin={{ top: 24, right: 10, bottom: 24, left: 10 }}
            spacing={8}
            colors={colorConfig}
            blendMode="normal"
            startLabel={false}
            endLabel={false}
            interpolation="smooth"
            axisTop={{
                tickSize: 3,
                tickPadding: 3,
                tickRotation: 0,
                legend: "",
                legendPosition: "middle",
                legendOffset: -20,
                format: (value) => getMonthAbbreviation(String(value)),
            }}
            axisBottom={null}
            theme={{
                text: {
                    fill: textColor,
                    fontSize: 9,
                    fontFamily: 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
                },
                axis: {
                    domain: { line: { stroke: borderColor, strokeWidth: 1 } },
                    ticks: { line: { stroke: borderColor, strokeWidth: 1 } },
                },
                grid: { line: { stroke: borderColor, strokeWidth: 0.5 } },
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
    )
})
FridgeCategoryFlowMobileChart.displayName = "FridgeCategoryFlowMobileChart"

interface FridgeCategoryFlowMobileLegendProps {
    data: FridgeAreaBumpSerie[]
    colorConfig: string[]
}

const FridgeCategoryFlowMobileLegend = memo(function FridgeCategoryFlowMobileLegend({
    data,
    colorConfig,
}: FridgeCategoryFlowMobileLegendProps) {
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-2 pt-2 pb-1 text-[10px] text-muted-foreground">
            {data.slice(0, 8).map((serie, index) => (
                <div key={serie.id} className="flex items-center gap-1">
                    <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: colorConfig[index] }}
                    />
                    <span className="truncate max-w-[80px]">{serie.id}</span>
                </div>
            ))}
            {data.length > 8 && (
                <span className="text-muted-foreground/70">+{data.length - 8} more</span>
            )}
        </div>
    )
})
FridgeCategoryFlowMobileLegend.displayName = "FridgeCategoryFlowMobileLegend"

// ─── Module-scope helpers ─────────────────────────────────────────────────────

// Month abbreviation helper - converts various formats to short labels.
// Defined at module scope so memo-wrapped children receive a stable reference.
function getMonthAbbreviation(monthStr: string): string {
    if (monthStr.endsWith("\u200B")) return ""
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const yyyyMmMatch = monthStr.match(/^(\d{4})-(\d{1,2})$/)
    if (yyyyMmMatch) {
        const year = yyyyMmMatch[1].slice(-2)
        const monthIndex = parseInt(yyyyMmMatch[2], 10) - 1
        if (monthIndex >= 0 && monthIndex < 12) {
            return `${monthNames[monthIndex]}'${year}`
        }
    }
    const mmMatch = monthStr.match(/^(\d{1,2})$/)
    if (mmMatch) {
        const monthIndex = parseInt(mmMatch[1], 10) - 1
        if (monthIndex >= 0 && monthIndex < 12) {
            return monthNames[monthIndex]
        }
    }
    return monthStr
}

// ─── Main component ───────────────────────────────────────────────────────────

export const ChartCategoryFlowFridge = memo(function ChartCategoryFlowFridge({ receiptTransactions = [], monthlyCategoriesData, isLoading = false, dateFilter }: ChartCategoryFlowFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette } = useColorScheme()
    const [isFullscreen, setIsFullscreen] = useState(false)
    const isMobile = useIsMobile()
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

            // Group by month - handle both number (1-12) and string ("Jan 2024") formats
            const periodTotals = new Map<number, Map<string, number>>()
            monthlyCategoriesData.forEach(d => {
                const monthKey = typeof d.month === 'number' ? d.month : parseInt(String(d.month).split(' ')[0].split('-')[0], 10)
                if (isNaN(monthKey)) return
                if (!periodTotals.has(monthKey)) {
                    periodTotals.set(monthKey, new Map())
                }
                const catMap = periodTotals.get(monthKey)!
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

            // Only use monthly bundle data when there are multiple distinct months.
            // Single month → fall through to raw transactions for weekly within-month breakdown.
            if (sortedMonths.length > 1) {
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
            // Single month: fall through to raw transactions for weekly breakdown
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

        // Weekly fallback: if only 1 time period, rebuild with week-of-month buckets
        // so the chart shows how spending shifted within the month.
        if (sortedPeriods.length === 1 && receiptTransactions.length > 0) {
            periodCategoryTotals.clear()
            receiptTransactions.forEach((item) => {
                if (!item.receiptDate) return
                const date = new Date(item.receiptDate)
                // Week bucket keyed by Sunday start date (YYYY-MM-DD)
                const weekStart = new Date(date)
                weekStart.setDate(date.getDate() - date.getDay())
                const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`
                const category = normalizeCategoryName(item.categoryName)
                const spend = Number(item.totalPrice) || 0
                if (!periodCategoryTotals.has(weekKey)) {
                    periodCategoryTotals.set(weekKey, new Map())
                }
                const catMap = periodCategoryTotals.get(weekKey)!
                catMap.set(category, (catMap.get(category) || 0) + spend)
            })
            sortedPeriods = Array.from(periodCategoryTotals.keys()).sort()

            // Rebuild allCategories and categoryRankings with new weekly periods
            allCategories.clear()
            periodCategoryTotals.forEach((catMap) => {
                catMap.forEach((_, category) => allCategories.add(category))
            })
            allCategories.forEach((category) => categoryRankings.set(category, []))

            sortedPeriods.forEach((periodKey) => {
                const catMap = periodCategoryTotals.get(periodKey)!
                const totals: { category: string; total: number }[] = []
                let periodTotal = 0
                allCategories.forEach((category) => {
                    const catTotal = catMap.get(category) || 0
                    totals.push({ category, total: catTotal })
                    periodTotal += catTotal
                })
                totals.sort((a, b) => b.total - a.total)
                const numCats = totals.length
                totals.forEach((item, index) => {
                    const percentage = periodTotal > 0 ? (item.total / periodTotal) * 100 : 0
                    const invertedRank = numCats - index
                    categoryRankings.get(item.category)!.push({
                        x: formatTimeLabel(periodKey),
                        y: invertedRank,
                        percentage,
                    })
                })
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

    // Loading or empty state
    if (!mounted || isLoading || data.length === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
                        <ChartFavoriteButton
                            chartId="fridge:categoryRankings"
                            chartTitle="Grocery Category Rankings"
                            size="md"
                        />
                        <CardTitle>Grocery Category Rankings</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <FridgeCategoryFlowInfoTrigger data={data} />
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
        <>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title="Grocery Category Rankings"
                headerActions={<FridgeCategoryFlowInfoTrigger forFullscreen data={data} />}
            >
                <div className="h-full w-full">
                    <FridgeCategoryFlowFullChart
                        data={data}
                        colorConfig={colorConfig}
                        textColor={textColor}
                        borderColor={borderColor}
                        getMonthAbbreviation={getMonthAbbreviation}
                    />
                </div>
            </ChartFullscreenModal>

            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartExpandButton onClick={() => setIsFullscreen(true)} />
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
                        <FridgeCategoryFlowInfoTrigger data={data} />
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="relative h-full w-full min-h-[250px]">
                        {isMobile
                            ? <FridgeCategoryFlowMobileChart
                                data={data}
                                colorConfig={colorConfig}
                                textColor={textColor}
                                borderColor={borderColor}
                                getMonthAbbreviation={getMonthAbbreviation}
                              />
                            : <FridgeCategoryFlowFullChart
                                data={data}
                                colorConfig={colorConfig}
                                textColor={textColor}
                                borderColor={borderColor}
                                getMonthAbbreviation={getMonthAbbreviation}
                              />
                        }
                    </div>
                    {isMobile && (
                        <FridgeCategoryFlowMobileLegend data={data} colorConfig={colorConfig} />
                    )}
                </CardContent>
            </Card>
        </>
    )
})

ChartCategoryFlowFridge.displayName = "ChartCategoryFlowFridge"
