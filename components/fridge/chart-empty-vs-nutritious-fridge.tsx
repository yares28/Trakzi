"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"

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

interface ChartEmptyVsNutritiousFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    categorySpendingData?: Array<{ category: string; total: number }>
    categoryControls?: ChartInfoPopoverCategoryControls
    isLoading?: boolean
}

// Categories considered "empty calories" - snacks and sugary drinks without nutritional value
const EMPTY_CALORIE_CATEGORIES = new Set([
    "snacks",
    "soda & cola",
    "energy drinks",
    "alcohol",
    "beverages",
    "drinks",
])

// Helper function to determine if a category is "empty calories"
function isEmptyCalorieCategory(categoryName: string | null | undefined): boolean {
    if (!categoryName) return false
    const normalized = categoryName.trim().toLowerCase()
    return EMPTY_CALORIE_CATEGORIES.has(normalized)
}

// Dark colors that require white text
const darkColors = ["#696969", "#464646", "#2F2F2F", "#252525"]

// Gold palette colors that require white text (black and brown)
const goldDarkColors = ["#000000", "#361c1b", "#754232", "#cd894a"]

// Helper function to determine text color based on slice color
const getTextColor = (sliceColor: string, colorScheme?: string): string => {
    if (colorScheme === "gold") {
        return goldDarkColors.includes(sliceColor) ? "#ffffff" : "#000000"
    }
    return darkColors.includes(sliceColor) ? "#ffffff" : "#000000"
}

export const ChartEmptyVsNutritiousFridge = memo(function ChartEmptyVsNutritiousFridge({ receiptTransactions = [], categorySpendingData, categoryControls, isLoading = false }: ChartEmptyVsNutritiousFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Group transactions by calorie type (Empty vs Nutritious)
    const calorieData = useMemo(() => {
        // Use bundle data if available
        if (categorySpendingData && categorySpendingData.length > 0) {
            let nutritiousTotal = 0
            let emptyTotal = 0

            categorySpendingData.forEach((item) => {
                if (isEmptyCalorieCategory(item.category)) {
                    emptyTotal += item.total
                } else {
                    nutritiousTotal += item.total
                }
            })

            const result: Array<{ id: string; label: string; value: number }> = []
            if (nutritiousTotal > 0) {
                result.push({ id: "Nutritious", label: "Nutritious", value: Number(nutritiousTotal.toFixed(2)) })
            }
            if (emptyTotal > 0) {
                result.push({ id: "Empty Calories", label: "Empty Calories", value: Number(emptyTotal.toFixed(2)) })
            }
            return result
        }

        // Fallback to raw transactions
        let nutritiousTotal = 0
        let emptyTotal = 0

        receiptTransactions.forEach((item) => {
            const spend = Number(item.totalPrice) || 0
            if (isEmptyCalorieCategory(item.categoryName)) {
                emptyTotal += spend
            } else {
                nutritiousTotal += spend
            }
        })

        const result: Array<{ id: string; label: string; value: number }> = []

        if (nutritiousTotal > 0) {
            result.push({
                id: "Nutritious",
                label: "Nutritious",
                value: Number(nutritiousTotal.toFixed(2)),
            })
        }

        if (emptyTotal > 0) {
            result.push({
                id: "Empty Calories",
                label: "Empty Calories",
                value: Number(emptyTotal.toFixed(2)),
            })
        }

        return result
    }, [receiptTransactions, categorySpendingData])

    const sanitizedBaseData = useMemo(() => calorieData.map(item => ({
        ...item,
        value: toNumericValue(item.value)
    })), [calorieData])

    // Assign colors: Nutritious gets a vibrant color, Empty gets a muted color
    const dataWithColors = useMemo(() => {
        const palette = getPalette().filter(color => color !== "#c3c3c3")

        // Sort by value descending (highest first) and assign colors
        const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value)
        // Use first color for highest value, last color for lowest
        const reversedPalette = [...palette].reverse()

        return sorted.map((item, index) => ({
            ...item,
            color: reversedPalette[index % reversedPalette.length]
        }))
    }, [sanitizedBaseData, colorScheme, getPalette])

    const data = dataWithColors

    // Calculate total for percentage calculations
    const total = useMemo(() => {
        return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0)
    }, [sanitizedBaseData])

    const colorConfig = { datum: "data.color" as const }

    const isDark = resolvedTheme === "dark"

    const textColor = isDark ? "#9ca3af" : "#4b5563"
    const arcLinkLabelColor = isDark ? "#d1d5db" : "#374151"

    // Format currency value using user's preferred currency
    const valueFormatter = useMemo(() => ({
        format: (value: number) => formatCurrency(value)
    }), [formatCurrency])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Empty vs Nutritious Calories"
                description="This pie chart shows how your grocery spending is split between nutritious whole foods and empty calories."
                details={[
                    "Nutritious: Meat, dairy, fruits, vegetables, grains, frozen foods, etc.",
                    "Empty Calories: Snacks, soda, energy drinks, alcohol, sugary beverages.",
                    "Empty calories refer to foods with minimal nutritional value beyond energy.",
                ]}
                ignoredFootnote="Only receipt transactions with assigned categories are included."
                categoryControls={categoryControls}
            />
            <ChartAiInsightButton
                chartId="fridge:emptyVsNutritious"
                chartTitle="Empty vs Nutritious Calories"
                chartDescription="This pie chart shows how grocery spending is split between nutritious whole foods and empty calories."
                chartData={{
                    totalExpenses: total,
                    breakdown: data.map(d => ({ type: d.label, amount: d.value })),
                    nutritiousAmount: data.find(d => d.id === "Nutritious")?.value || 0,
                    emptyCaloriesAmount: data.find(d => d.id === "Empty Calories")?.value || 0,
                }}
                size="sm"
            />
        </div>
    )

    if (!mounted) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:emptyVsNutritious"
                            chartTitle="Empty vs Nutritious Calories"
                            size="md"
                        />
                        <CardTitle>Empty vs Nutritious Calories</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]" />
                </CardContent>
            </Card>
        )
    }

    // Don't render chart if data is empty
    if (!sanitizedBaseData || sanitizedBaseData.length === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:emptyVsNutritious"
                            chartTitle="Empty vs Nutritious Calories"
                            size="md"
                        />
                        <CardTitle>Empty vs Nutritious Calories</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} skeletonType="pie" />
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
                        chartId="fridge:emptyVsNutritious"
                        chartTitle="Empty vs Nutritious Calories"
                        size="md"
                    />
                    <CardTitle>Empty vs Nutritious Calories</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div className="h-full w-full min-h-[250px]" key={colorScheme}>
                    <ResponsivePie
                        data={data}
                        margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
                        innerRadius={0.5}
                        padAngle={0.7}
                        cornerRadius={3}
                        activeOuterRadiusOffset={8}
                        borderWidth={0}
                        arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor={arcLinkLabelColor}
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: "color" }}
                        arcLabelsSkipAngle={20}
                        arcLabelsTextColor={(d: { color: string }) => getTextColor(d.color, colorScheme)}
                        valueFormat={(value) => formatCurrency(value)}
                        colors={colorConfig}
                        tooltip={({ datum }) => {
                            const percentage = total > 0 ? (Number(datum.value) / total) * 100 : 0

                            return (
                                <NivoChartTooltip>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full border border-border/50"
                                            style={{ backgroundColor: datum.color as string, borderColor: datum.color as string }}
                                        />
                                        <span className="font-medium text-foreground whitespace-nowrap">
                                            {datum.label as string}
                                        </span>
                                    </div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                                        {valueFormatter.format(Number(datum.value))}
                                    </div>
                                    <div className="mt-0.5 text-[0.7rem] text-foreground/80">
                                        {percentage.toFixed(1)}%
                                    </div>
                                </NivoChartTooltip>
                            )
                        }}
                        theme={{
                            text: {
                                fill: textColor,
                                fontSize: 12,
                            },
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    )
})

ChartEmptyVsNutritiousFridge.displayName = "ChartEmptyVsNutritiousFridge"
