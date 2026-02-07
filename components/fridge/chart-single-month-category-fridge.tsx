"use client"

// Single Month Category Spending Chart for Fridge - Shows category spending for a selected month
import * as React from "react"
import { createPortal } from "react-dom"
import ReactECharts from "echarts-for-react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { getChartTextColor, DEFAULT_FALLBACK_PALETTE } from "@/lib/chart-colors"
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

export const ChartSingleMonthCategoryFridge = React.memo(function ChartSingleMonthCategoryFridge({ receiptTransactions = [], monthlyCategoriesData, isLoading = false }: ChartSingleMonthCategoryFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette } = useColorScheme()
    const { formatCurrency, symbol } = useCurrency()
    const [mounted, setMounted] = React.useState(false)
    const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null)
    const chartRef = React.useRef<any>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = React.useState<{ label: string; value: number; color: string } | null>(null)
    const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)

    React.useEffect(() => {
        setMounted(true)
    }, [])

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

    // Filter data for selected month
    const data = React.useMemo(() => {
        if (selectedMonth === null) return []
        return allData
            .filter((item) => item.month === selectedMonth)
            .sort((a, b) => b.total - a.total)
    }, [allData, selectedMonth])

    const palette = React.useMemo(() => {
        const base = getShuffledPalette()
        if (!base.length) {
            return DEFAULT_FALLBACK_PALETTE
        }
        return base
    }, [getShuffledPalette])

    const valueFormatter = {
        format: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 })
    }

    const handleChartMouseOver = (params: any) => {
        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        let mouseX = 0
        let mouseY = 0
        const ecEvent = (params && (params.event?.event || params.event)) as
            | (MouseEvent & { offsetX?: number; offsetY?: number })
            | undefined

        if (ecEvent) {
            if (typeof ecEvent.clientX === "number" && typeof ecEvent.clientY === "number") {
                mouseX = ecEvent.clientX
                mouseY = ecEvent.clientY
            } else if (typeof ecEvent.offsetX === "number" && typeof ecEvent.offsetY === "number") {
                mouseX = rect.left + ecEvent.offsetX
                mouseY = rect.top + ecEvent.offsetY
            }
        }

        setTooltipPosition({ x: mouseX, y: mouseY })

        if (params && params.name) {
            const category = params.name || ""
            let value = 0
            if (Array.isArray(params.value)) {
                value = params.value[1] || params.value[0] || 0
            } else if (params.data && Array.isArray(params.data)) {
                value = params.data[1] || 0
            } else {
                value = params.value || 0
            }
            const index = params.dataIndex || 0
            const color = palette[index % palette.length]

            setTooltip({ label: category, value, color })
        }
    }

    const handleChartMouseOut = () => {
        setTooltip(null)
        setTooltipPosition(null)
    }

    React.useEffect(() => {
        if (tooltip) {
            const handleMouseMove = (e: MouseEvent) => {
                setTooltipPosition({ x: e.clientX, y: e.clientY })
            }

            window.addEventListener('mousemove', handleMouseMove)
            return () => { window.removeEventListener('mousemove', handleMouseMove) }
        }
    }, [tooltip])

    const renderInfoTrigger = () => (
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
                    totalSpent: data.reduce((sum, item) => sum + item.total, 0),
                    topCategories: data.slice(0, 5).map(d => ({ category: d.category, amount: d.total })),
                }}
                size="sm"
            />
        </div>
    )

    const option = React.useMemo(() => {
        if (!data.length || selectedMonth === null) return null

        const topCategories = data.slice(0, 10)
        if (!topCategories.length) return null

        const datasetSource: any[] = [["category", "Amount"]]
        topCategories.forEach((item) => {
            datasetSource.push([item.category, item.total])
        })

        const backgroundColor = resolvedTheme === "dark" ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"
        const textColor = getChartTextColor(resolvedTheme === "dark")

        return {
            backgroundColor,
            textStyle: { color: textColor },
            legend: { show: false },
            tooltip: { show: false },
            dataset: { source: datasetSource },
            xAxis: {
                type: "category",
                axisLabel: { rotate: 45, interval: 0, color: textColor },
                axisTick: { lineStyle: { color: textColor } },
                axisLine: { lineStyle: { color: textColor } },
            },
            yAxis: {
                type: "value",
                axisLabel: { formatter: (value: number) => formatCurrency(value, { maximumFractionDigits: 0 }), color: textColor },
                axisTick: { lineStyle: { color: textColor } },
                axisLine: { lineStyle: { color: textColor } },
                splitLine: { lineStyle: { color: resolvedTheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" } },
            },
            series: [
                {
                    type: "bar",
                    itemStyle: {
                        color: (params: any) => palette[params.dataIndex % palette.length],
                    },
                },
            ],
        }
    }, [data, selectedMonth, palette, resolvedTheme])

    if (!mounted || isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:singleMonthCategory" chartTitle="Single Month Category Spending" size="md" />
                        <CardTitle>Single Month Category Spending</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
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
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
                    <ChartLoadingState isLoading={false} />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="fridge:singleMonthCategory" chartTitle="Single Month Category Spending" size="md" />
                    <CardTitle>Single Month Category Spending</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
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
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
                {option && data.length > 0 ? (
                    <div className="h-full w-full flex flex-col">
                        <div className="mb-2 text-sm font-medium text-foreground text-center">
                            Total: {formatCurrency(data.reduce((sum, item) => sum + item.total, 0))}
                        </div>
                        <div ref={containerRef} className="relative flex-1 min-h-0" style={{ minHeight: 0, minWidth: 0 }}>
                            <ReactECharts
                                ref={chartRef}
                                option={option}
                                style={{ height: "100%", width: "100%" }}
                                opts={{ renderer: "svg" }}
                                notMerge={true}
                                onEvents={{ mouseover: handleChartMouseOver, mouseout: handleChartMouseOut }}
                            />
                            {mounted && tooltip && tooltipPosition && createPortal(
                                <div
                                    className="pointer-events-none fixed z-[9999] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl select-none"
                                    style={{
                                        left: tooltipPosition.x + 12 + 200 > window.innerWidth ? tooltipPosition.x - 212 : tooltipPosition.x + 12,
                                        top: tooltipPosition.y - 60 < 0 ? tooltipPosition.y + 12 : tooltipPosition.y - 60,
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full border border-border/50" style={{ backgroundColor: tooltip.color, borderColor: tooltip.color }} />
                                        <span className="font-medium text-foreground whitespace-nowrap">{tooltip.label}</span>
                                    </div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                                        {valueFormatter.format(tooltip.value)}
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        No data for selected month
                    </div>
                )}
            </CardContent>
        </Card>
    )
})

ChartSingleMonthCategoryFridge.displayName = "ChartSingleMonthCategoryFridge"
