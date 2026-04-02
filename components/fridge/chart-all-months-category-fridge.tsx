"use client"

// All Months Category Spending Chart for Fridge - Shows category spending across all months
import * as React from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { getChartTextColor, getChartAxisLineColor, DEFAULT_FALLBACK_PALETTE } from "@/lib/chart-colors"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { HoverableBar } from "@/components/chart-hoverable-bar"

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

interface ChartAllMonthsCategoryFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    monthlyCategoriesData?: Array<{ month: number; category: string; total: number }>
    isLoading?: boolean
}

const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function normalizeCategoryName(value: string | null | undefined) {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
}

export const ChartAllMonthsCategoryFridge = React.memo(function ChartAllMonthsCategoryFridge({
    receiptTransactions = [],
    monthlyCategoriesData,
    isLoading = false,
}: ChartAllMonthsCategoryFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette, colorScheme } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = React.useMemo(() => getPalette(), [getPalette])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const axisLineColor = getChartAxisLineColor(isDark)

    // Process receipt transactions to group by month and category
    const processedData = React.useMemo(() => {
        // Use bundle data if available
        if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
            return monthlyCategoriesData.map(d => ({
                month: d.month - 1, // Convert from SQL 1-12 to JS 0-11
                monthName: monthNamesShort[d.month - 1],
                category: d.category,
                amount: d.total
            })).filter(d => d.amount > 0)
        }

        // Fallback to raw transactions
        if (!receiptTransactions || receiptTransactions.length === 0) return []

        const grouped = new Map<number, Map<string, number>>()
        monthNamesShort.forEach((_, monthIndex) => {
            grouped.set(monthIndex, new Map<string, number>())
        })

        receiptTransactions.forEach((item) => {
            if (!item.receiptDate) return
            const date = new Date(item.receiptDate)
            const monthIndex = date.getMonth() // 0-11
            const category = normalizeCategoryName(item.categoryName)
            const spend = Number(item.totalPrice) || 0

            const monthMap = grouped.get(monthIndex)
            if (monthMap) {
                monthMap.set(category, (monthMap.get(category) || 0) + spend)
            }
        })

        const flatData: Array<{ month: number; monthName: string; category: string; amount: number }> = []
        grouped.forEach((categoryMap, monthIndex) => {
            categoryMap.forEach((amount, category) => {
                if (amount > 0) {
                    flatData.push({ month: monthIndex, monthName: monthNamesShort[monthIndex], category, amount })
                }
            })
        })

        return flatData
    }, [receiptTransactions, monthlyCategoriesData])

    // Get visible categories sorted alphabetically
    const categories = React.useMemo(() => {
        const totals = new Map<string, number>()
        processedData.forEach((d) => {
            totals.set(d.category, (totals.get(d.category) ?? 0) + d.amount)
        })
        return Array.from(totals.entries())
            .filter(([, total]) => total > 0)
            .map(([cat]) => cat)
            .sort()
    }, [processedData])

    const categoryColors = React.useMemo(() => {
        const colorMap = new Map<string, string>()
        categories.forEach((category, index) => {
            colorMap.set(category, palette[index % palette.length] || DEFAULT_FALLBACK_PALETTE[0])
        })
        return colorMap
    }, [categories, palette])

    const nivoData = React.useMemo(() => {
        return monthNamesShort.map((monthName, monthIndex) => {
            const obj: Record<string, number | string> = { month: monthName }
            processedData
                .filter(d => d.month === monthIndex)
                .forEach(d => { obj[d.category] = d.amount })
            return obj
        })
    }, [processedData])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="All Months Category Spending"
                description="See grocery spending by category across all months of the year."
                details={[
                    "This chart shows your grocery spending broken down by category for each month.",
                    "All 12 months are displayed side-by-side.",
                    "Data is aggregated from your uploaded receipts.",
                ]}
                ignoredFootnote="Only receipt transactions with assigned categories are included."
            />
            <ChartAiInsightButton
                chartId="fridge:allMonthsCategory"
                chartTitle="All Months Category Spending"
                chartDescription="Grocery spending by category across all months."
                chartData={{
                    totalSpent: processedData.reduce((sum, d) => sum + d.amount, 0),
                    categoriesCount: categories.length,
                    topCategories: categories.slice(0, 5),
                }}
                size="sm"
            />
        </div>
    )

    const renderChart = () => (
        <div className="h-full w-full min-h-[210px]" key={colorScheme}>
            <ResponsiveBar
                data={nivoData}
                keys={categories}
                indexBy="month"
                margin={{ top: 16, right: 16, bottom: 40, left: 60 }}
                padding={0.3}
                colors={({ id }) => {
                    const idx = categories.indexOf(id as string)
                    return palette[idx % palette.length]
                }}
                borderRadius={4}
                enableLabel={false}
                axisBottom={{ tickSize: 0, tickPadding: 8 }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (v) => formatCurrency(v as number, { maximumFractionDigits: 0 }),
                }}
                enableGridY={true}
                gridYValues={5}
                theme={{
                    text: { fill: textColor, fontSize: 11 },
                    axis: {
                        ticks: { text: { fill: textColor } },
                        domain: { line: { stroke: axisLineColor } },
                    },
                    grid: {
                        line: { stroke: axisLineColor, strokeWidth: 0.5, strokeDasharray: "3,3" },
                    },
                }}
                tooltip={({ id, value, indexValue, color }) => (
                    <NivoChartTooltip
                        title={`${indexValue} — ${id}`}
                        titleColor={color}
                        value={formatCurrency(value as number)}
                    />
                )}
                animate={true}
                motionConfig="gentle"
                barComponent={HoverableBar}
            />
        </div>
    )

    if (isLoading || receiptTransactions.length === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:allMonthsCategory" chartTitle="All Months Category Spending" size="md" />
                        <CardTitle>All Months Category Spending</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
                    <ChartLoadingState isLoading={isLoading} />
                </CardContent>
                <CardFooter className="pb-3 gap-2">
                    {renderInfoTrigger()}
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="fridge:allMonthsCategory" chartTitle="All Months Category Spending" size="md" />
                    <CardTitle>All Months Category Spending</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex flex-col">
                <div className="flex-1 min-h-0">
                    {renderChart()}
                </div>
                {categories.length > 0 && (
                    <div className="px-4 pb-2 pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
                        {categories.slice(0, 8).map((category) => (
                            <div key={category} className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColors.get(category) || DEFAULT_FALLBACK_PALETTE[0] }} />
                                <span className="text-muted-foreground">{category}</span>
                            </div>
                        ))}
                        {categories.length > 8 && <span className="text-muted-foreground">+{categories.length - 8} more</span>}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pb-3 gap-2">
                {renderInfoTrigger()}
            </CardFooter>
        </Card>
    )
})

ChartAllMonthsCategoryFridge.displayName = "ChartAllMonthsCategoryFridge"
