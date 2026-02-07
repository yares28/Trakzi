"use client"

import { useState, useEffect, useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { ResponsivePie } from "@nivo/pie"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { getContrastTextColor, getChartTextColor } from "@/lib/chart-colors"
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

// Categories considered "nutritious" - whole foods with good nutritional value
const NUTRITIOUS_CATEGORIES = new Set([
    "fruits",
    "vegetables",
    "herbs & fresh aromatics",
    "meat & poultry",
    "fish & seafood",
    "eggs",
    "dairy (milk/yogurt)",
    "cheese",
    "deli / cold cuts",
    "legumes",
    "pasta, rice & grains",
    "bread",
    "frozen vegetables & fruit",
    "nuts & seeds",
    "water",
])

// Helper function to determine if a category is "nutritious"
function isNutritiousCategory(categoryName: string | null | undefined): boolean {
    if (!categoryName) return false
    const normalized = categoryName.trim().toLowerCase()
    return NUTRITIOUS_CATEGORIES.has(normalized)
}


export const ChartEmptyVsNutritiousFridge = memo(function ChartEmptyVsNutritiousFridge({ receiptTransactions = [], categorySpendingData, categoryControls, isLoading = false }: ChartEmptyVsNutritiousFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { colorScheme, getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Calculate aggregated nutritious vs total spending
    const calorieData = useMemo(() => {
        // Use bundle data if available
        if (categorySpendingData && categorySpendingData.length > 0) {
            let nutritiousTotal = 0
            let totalSpend = 0

            categorySpendingData.forEach((item) => {
                totalSpend += item.total
                if (isNutritiousCategory(item.category)) {
                    nutritiousTotal += item.total
                }
            })

            const otherSpend = totalSpend - nutritiousTotal
            const nutritiousPercentage = totalSpend > 0 ? (nutritiousTotal / totalSpend) * 100 : 0
            const otherPercentage = totalSpend > 0 ? (otherSpend / totalSpend) * 100 : 0

            return [
                {
                    id: "Nutritious",
                    label: "Nutritious",
                    value: Number(nutritiousPercentage.toFixed(2)),
                    spend: nutritiousTotal,
                    totalSpend: totalSpend,
                },
                {
                    id: "Total",
                    label: "Total",
                    value: Number(otherPercentage.toFixed(2)),
                    spend: otherSpend,
                    totalSpend: totalSpend,
                },
            ].filter(item => item.value > 0)
        }

        // Fallback to raw transactions
        let nutritiousTotal = 0
        let totalSpend = 0

        receiptTransactions.forEach((item) => {
            const spend = Number(item.totalPrice) || 0
            totalSpend += spend
            if (isNutritiousCategory(item.categoryName)) {
                nutritiousTotal += spend
            }
        })

        const otherSpend = totalSpend - nutritiousTotal
        const nutritiousPercentage = totalSpend > 0 ? (nutritiousTotal / totalSpend) * 100 : 0
        const otherPercentage = totalSpend > 0 ? (otherSpend / totalSpend) * 100 : 0

        return [
            {
                id: "Nutritious",
                label: "Nutritious",
                value: Number(nutritiousPercentage.toFixed(2)),
                spend: nutritiousTotal,
                totalSpend: totalSpend,
            },
            {
                id: "Total",
                label: "Total",
                value: Number(otherPercentage.toFixed(2)),
                spend: otherSpend,
                totalSpend: totalSpend,
            },
        ].filter(item => item.value > 0)
    }, [receiptTransactions, categorySpendingData])

    const sanitizedBaseData = useMemo(() => calorieData.map(item => ({
        ...item,
        value: toNumericValue(item.value)
    })), [calorieData])

    // Assign colors: Nutritious gets a vibrant color, Empty gets a muted color
    const dataWithColors = useMemo(() => {
        const palette = getShuffledPalette()
        const sorted = [...sanitizedBaseData].sort((a, b) => b.value - a.value)
        return sorted.map((item, index) => ({
            ...item,
            color: palette[index % palette.length]
        }))
    }, [sanitizedBaseData, colorScheme, getShuffledPalette])

    const data = dataWithColors

    // Calculate total for percentage calculations
    const total = useMemo(() => {
        return sanitizedBaseData.reduce((sum, item) => sum + item.value, 0)
    }, [sanitizedBaseData])

    const colorConfig = { datum: "data.color" as const }

    const isDark = resolvedTheme === "dark"

    const textColor = getChartTextColor(isDark)
    const arcLinkLabelColor = getChartTextColor(isDark)

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
                        arcLabelsTextColor={(d: { color: string }) => getContrastTextColor(d.color)}
                        valueFormat={(value) => `${value.toFixed(1)}%`}
                        colors={colorConfig}
                        tooltip={({ datum }) => {
                            const sliceData = datum.data as typeof data[0]
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
                                    <div className="mt-1 text-[0.7rem] text-foreground/80">
                                        <span className="font-mono">{Number(datum.value).toFixed(1)}%</span>
                                    </div>
                                    <div className="mt-0.5 text-[0.7rem] text-foreground/80">
                                        {valueFormatter.format(sliceData.spend)}
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
