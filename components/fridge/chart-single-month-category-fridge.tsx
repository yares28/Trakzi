"use client"

// Single Month Category Spending Chart for Fridge - Shows category spending for a selected month
import * as React from "react"
import { useTheme } from "next-themes"
import { ResponsiveBar } from "@nivo/bar"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { getChartTextColor, getChartAxisLineColor, DEFAULT_FALLBACK_PALETTE } from "@/lib/chart-colors"
import { useCurrency } from "@/components/currency-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { HoverableBar } from "@/components/chart-hoverable-bar"
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

interface ChartSingleMonthCategoryFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    monthlyCategoriesData?: Array<{ category: string; month: number; total: number }>
    isLoading?: boolean
}

type MonthData = {
    category: string
    month: number
    total: number
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

function normalizeCategoryName(value: string | null | undefined) {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
}

interface FridgeSingleMonthInfoTriggerProps {
    selectedMonth: number | null
    totalSpent: number
    topCategories: Array<{ category: string; amount: number }>
}

const FridgeSingleMonthInfoTrigger = React.memo(function FridgeSingleMonthInfoTrigger({
    selectedMonth,
    totalSpent,
    topCategories,
}: FridgeSingleMonthInfoTriggerProps) {
    return (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Single Month Category Spending"
                description="Compare grocery spending across categories for a selected month."
                details={[
                    "Each bar represents total spending in a category for the selected month.",
                    "Data is aggregated from your uploaded receipts.",
                    "Use the month selector to switch between different months.",
                ]}
                ignoredFootnote="Only receipt transactions with assigned categories are included."
            />
            <ChartAiInsightButton
                chartId="fridge:singleMonthCategory"
                chartTitle="Single Month Category Spending"
                chartDescription="Compare grocery spending across categories for a selected month."
                chartData={{
                    selectedMonth: selectedMonth !== null ? MONTH_NAMES[selectedMonth - 1] : null,
                    totalSpent,
                    topCategories,
                }}
                size="sm"
            />
        </div>
    )
})

FridgeSingleMonthInfoTrigger.displayName = "FridgeSingleMonthInfoTrigger"

export const ChartSingleMonthCategoryFridge = React.memo(function ChartSingleMonthCategoryFridge({ receiptTransactions = [], monthlyCategoriesData, isLoading = false }: ChartSingleMonthCategoryFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette, colorScheme } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null)
    const [isFullscreen, setIsFullscreen] = React.useState(false)

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const axisLineColor = getChartAxisLineColor(isDark)

    const palette = React.useMemo(() => {
        const base = getShuffledPalette()
        if (!base.length) {
            return DEFAULT_FALLBACK_PALETTE
        }
        return base
    }, [getShuffledPalette])

    // Aggregate receipt transactions by category and month
    const { allData, availableMonths } = React.useMemo(() => {
        // Use bundle data if available
        if (monthlyCategoriesData && monthlyCategoriesData.length > 0) {
            const monthsWithData = new Set<number>()
            monthlyCategoriesData.forEach((item) => monthsWithData.add(item.month))
            return {
                allData: monthlyCategoriesData,
                availableMonths: Array.from(monthsWithData).sort((a, b) => a - b)
            }
        }

        // Fallback to raw transactions
        const monthTotals = new Map<number, Map<string, number>>()
        const monthsWithData = new Set<number>()

        receiptTransactions.forEach((item) => {
            if (!item.receiptDate) return
            const date = new Date(item.receiptDate)
            const month = date.getMonth() + 1 // 1-12
            const category = normalizeCategoryName(item.categoryName)
            const spend = Number(item.totalPrice) || 0

            monthsWithData.add(month)

            if (!monthTotals.has(month)) {
                monthTotals.set(month, new Map())
            }
            const categoryMap = monthTotals.get(month)!
            categoryMap.set(category, (categoryMap.get(category) || 0) + spend)
        })

        const allData: MonthData[] = []
        monthTotals.forEach((categoryMap, month) => {
            categoryMap.forEach((total, category) => {
                allData.push({ category, month, total })
            })
        })

        const availableMonths = Array.from(monthsWithData).sort((a, b) => a - b)

        return { allData, availableMonths }
    }, [receiptTransactions, monthlyCategoriesData])

    // Set initial selected month
    React.useEffect(() => {
        if (availableMonths.length > 0 && selectedMonth === null) {
            setSelectedMonth(availableMonths[0])
        } else if (availableMonths.length > 0 && selectedMonth !== null && !availableMonths.includes(selectedMonth)) {
            setSelectedMonth(availableMonths[0])
        }
    }, [availableMonths, selectedMonth])

    const chartData = React.useMemo(() => {
        if (selectedMonth === null) return []
        return (allData as Array<{ category: string; month: number; total: number }>)
            .filter((d) => d.month === selectedMonth)
            .map((d, i) => ({
                category: d.category,
                total: d.total,
                color: palette[i % palette.length],
            }))
            .sort((a, b) => b.total - a.total)
    }, [allData, selectedMonth, palette])

    const totalSpent = chartData.reduce((sum, item) => sum + item.total, 0)
    const topCategories = chartData.slice(0, 5).map(d => ({ category: d.category, amount: d.total }))

    const renderChart = () => (
        <div className="h-full w-full min-h-[210px]" key={colorScheme}>
            <ResponsiveBar
                data={chartData}
                keys={["total"]}
                indexBy="category"
                margin={{ top: 16, right: 16, bottom: 60, left: 60 }}
                padding={0.3}
                colors={({ index }) => chartData[index]?.color ?? palette[index % palette.length]}
                borderRadius={10}
                enableLabel={false}
                axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -35 }}
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
                tooltip={({ indexValue, value, color }) => (
                    <NivoChartTooltip
                        title={String(indexValue)}
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

    const cardActions = (
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Select
                value={selectedMonth !== null ? selectedMonth.toString() : ""}
                onValueChange={(value) => setSelectedMonth(parseInt(value, 10))}
            >
                <SelectTrigger className="w-32" size="sm" aria-label="Select month">
                    <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                    {availableMonths.map((month) => (
                        <SelectItem key={month} value={month.toString()} className="rounded-lg">
                            {MONTH_NAMES[month - 1]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <FridgeSingleMonthInfoTrigger selectedMonth={selectedMonth} totalSpent={totalSpent} topCategories={topCategories} />
        </CardAction>
    )

    if (isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:singleMonthCategory" chartTitle="Single Month Category Spending" size="md" />
                        <CardTitle>Single Month Category Spending</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <FridgeSingleMonthInfoTrigger selectedMonth={selectedMonth} totalSpent={totalSpent} topCategories={topCategories} />
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
                    <ChartLoadingState isLoading />
                </CardContent>
            </Card>
        )
    }

    if (!availableMonths.length || selectedMonth === null) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:singleMonthCategory" chartTitle="Single Month Category Spending" size="md" />
                        <CardTitle>Single Month Category Spending</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <FridgeSingleMonthInfoTrigger selectedMonth={selectedMonth} totalSpent={totalSpent} topCategories={topCategories} />
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
                    <ChartLoadingState isLoading={false} />
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:singleMonthCategory" chartTitle="Single Month Category Spending" size="md" />
                        <CardTitle>Single Month Category Spending</CardTitle>
                    </div>
                    {cardActions}
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
                    {chartData.length > 0 ? (
                        <div className="h-full w-full flex flex-col">
                            <div className="flex-1 min-h-0">
                                {renderChart()}
                            </div>
                            <div className="flex items-center justify-end gap-1 pt-2 text-xs text-muted-foreground">
                                <span>Total:</span>
                                <span className="font-semibold text-foreground">{formatCurrency(totalSpent)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                            No data for selected month
                        </div>
                    )}
                </CardContent>
            </Card>
            <ChartFullscreenModal
                isOpen={isFullscreen}
                onClose={() => setIsFullscreen(false)}
                title="Single Month Category Spending"
                description="Compare grocery spending across categories for a selected month."
                headerActions={
                    <FridgeSingleMonthInfoTrigger selectedMonth={selectedMonth} totalSpent={totalSpent} topCategories={topCategories} />
                }
                filterControl={
                    <Select
                        value={selectedMonth !== null ? selectedMonth.toString() : ""}
                        onValueChange={(value) => setSelectedMonth(parseInt(value, 10))}
                    >
                        <SelectTrigger className="w-32" size="sm" aria-label="Select month">
                            <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {availableMonths.map((month) => (
                                <SelectItem key={month} value={month.toString()} className="rounded-lg">
                                    {MONTH_NAMES[month - 1]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
                orientation="landscape"
            >
                <div className="h-full w-full flex flex-col">
                    <div className="flex-1 min-h-0">
                        {renderChart()}
                    </div>
                    <div className="flex items-center justify-end gap-1 px-4 py-2 text-xs text-muted-foreground border-t">
                        <span>Total:</span>
                        <span className="font-semibold text-foreground">{formatCurrency(totalSpent)}</span>
                    </div>
                </div>
            </ChartFullscreenModal>
        </>
    )
})

ChartSingleMonthCategoryFridge.displayName = "ChartSingleMonthCategoryFridge"
