"use client"

// Day of Week Spending by Category Chart for Fridge
import * as React from "react"
import { useMemo } from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { getChartTextColor, getChartAxisLineColor, DEFAULT_FALLBACK_PALETTE } from "@/lib/chart-colors"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { HoverableBar } from "@/components/chart-hoverable-bar"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
    Card,
  CardAction,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

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

interface ChartDayOfWeekSpendingFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    isLoading?: boolean
}

const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function normalizeCategoryName(value: string | null | undefined) {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
}

export const ChartDayOfWeekSpendingCategoryFridge = React.memo(function ChartDayOfWeekSpendingCategoryFridge({ receiptTransactions = [], isLoading = false }: ChartDayOfWeekSpendingFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette, colorScheme } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(() => getPalette(), [getPalette])

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const axisLineColor = getChartAxisLineColor(isDark)

    // Process receipt transactions to group by day of week and category
    const processedData = useMemo(() => {
        if (!receiptTransactions || receiptTransactions.length === 0) return []

        const grouped = new Map<number, Map<string, number>>()
        dayNamesShort.forEach((_, dayIndex) => {
            grouped.set(dayIndex, new Map<string, number>())
        })

        receiptTransactions.forEach((item) => {
            if (!item.receiptDate) return
            const date = new Date(item.receiptDate)
            // Convert to Monday-based week (0 = Monday, 6 = Sunday)
            const jsDay = date.getDay()
            const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1
            const category = normalizeCategoryName(item.categoryName)
            const spend = Number(item.totalPrice) || 0

            const dayMap = grouped.get(dayOfWeek)
            if (dayMap) {
                dayMap.set(category, (dayMap.get(category) || 0) + spend)
            }
        })

        const flatData: Array<{ day: number; dayName: string; category: string; amount: number }> = []
        grouped.forEach((categoryMap, dayIndex) => {
            categoryMap.forEach((amount, category) => {
                if (amount > 0) {
                    flatData.push({ day: dayIndex, dayName: dayNamesShort[dayIndex], category, amount })
                }
            })
        })

        return flatData
    }, [receiptTransactions])

    // Get visible categories
    const categories = useMemo(() => {
        const totals = new Map<string, number>()
        processedData.forEach((d) => {
            totals.set(d.category, (totals.get(d.category) ?? 0) + d.amount)
        })
        return Array.from(totals.entries())
            .filter(([, total]) => total > 0)
            .map(([category]) => category)
            .sort()
    }, [processedData])

    const categoryColors = useMemo(() => {
        const colorMap = new Map<string, string>()
        categories.forEach((category, index) => {
            colorMap.set(category, palette[index % palette.length] || DEFAULT_FALLBACK_PALETTE[0])
        })
        return colorMap
    }, [categories, palette])

    const nivoData = useMemo(() => {
        return dayNamesShort.map((dayName, dayIndex) => {
            const obj: Record<string, number | string> = { day: dayName }
            processedData
                .filter(d => d.day === dayIndex)
                .forEach(d => { obj[d.category] = d.amount })
            return obj
        })
    }, [processedData])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Day of Week Spending by Category"
                description="See which categories you spend the most on each day of the week."
                details={[
                    "This chart shows grocery spending broken down by category for each day.",
                    "Each day has multiple bars, one for each spending category.",
                    "Data is aggregated from your uploaded receipts.",
                ]}
                ignoredFootnote="Only receipt transactions with assigned categories are included."
            />
            <ChartAiInsightButton
                chartId="fridge:dayOfWeekSpending"
                chartTitle="Day of Week Spending by Category"
                chartDescription="Grocery spending by category for each day of the week."
                chartData={{
                    totalSpent: processedData.reduce((sum, d) => sum + d.amount, 0),
                    categoriesCount: categories.length,
                    topCategories: categories.slice(0, 5),
                }}
                size="sm"
            />
        </div>
    )

    const nivoTheme = {
        text: { fill: textColor, fontSize: 11 },
        axis: {
            ticks: { text: { fill: textColor } },
            domain: { line: { stroke: axisLineColor } },
        },
        grid: {
            line: {
                stroke: axisLineColor,
                strokeWidth: 0.5,
                strokeDasharray: "3,3",
            },
        },
    }

    if (isLoading || receiptTransactions.length === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:dayOfWeekSpending" chartTitle="Day of Week Spending by Category" size="md" />
                        <CardTitle>Day of Week Spending by Category</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
                    <ChartLoadingState isLoading={isLoading} />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="fridge:dayOfWeekSpending" chartTitle="Day of Week Spending by Category" size="md" />
                    <CardTitle>Day of Week Spending by Category</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex flex-col">
                <div className="h-full w-full min-h-[210px]" key={colorScheme}>
                    <ResponsiveBar
                        data={nivoData}
                        keys={categories}
                        indexBy="day"
                        groupMode="grouped"
                        margin={{ top: 16, right: 16, bottom: 40, left: 60 }}
                        padding={0.2}
                        innerPadding={2}
                        colors={({ id }) => {
                            const idx = categories.indexOf(id as string)
                            return palette[idx % palette.length] || DEFAULT_FALLBACK_PALETTE[0]
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
                        theme={nivoTheme}
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
                {categories.length > 0 && (
                    <div className="px-4 pb-2 pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
                        {categories.slice(0, 10).map((category) => (
                            <div key={category} className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColors.get(category) || DEFAULT_FALLBACK_PALETTE[0] }} />
                                <span className="text-muted-foreground">{category}</span>
                            </div>
                        ))}
                        {categories.length > 10 && <span className="text-muted-foreground">+{categories.length - 10} more</span>}
                    </div>
                )}
            </CardContent>
        </Card>
    )
})

ChartDayOfWeekSpendingCategoryFridge.displayName = "ChartDayOfWeekSpendingCategoryFridge"
