"use client"

import * as React from "react"
import ReactECharts from "echarts-for-react"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
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

interface ChartDayOfWeekCategoryFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    dayOfWeekCategoryData?: Array<{ dayOfWeek: number; category: string; total: number }>
    isLoading?: boolean
}

type DayOfWeekData = {
    category: string
    dayOfWeek: number
    total: number
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function normalizeCategoryName(value: string | null | undefined) {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
}

export const ChartDayOfWeekCategoryFridge = React.memo(function ChartDayOfWeekCategoryFridge({ receiptTransactions = [], dayOfWeekCategoryData, isLoading = false }: ChartDayOfWeekCategoryFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette, colorScheme } = useColorScheme()
    const { formatCurrency, symbol } = useCurrency()
    const [mounted, setMounted] = React.useState(false)
    const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
    const chartRef = React.useRef<any>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = React.useState<{ label: string; value: number; color: string } | null>(null)
    const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number; y: number } | null>(null)
    const mousePositionRef = React.useRef<{ x: number; y: number } | null>(null)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    // Aggregate receipt transactions by category and day of week
    const { allData, availableDays } = React.useMemo(() => {
        // Use bundle data if available (pre-computed by server)
        if (dayOfWeekCategoryData && dayOfWeekCategoryData.length > 0) {
            const daysWithData = new Set<number>()
            const allData: DayOfWeekData[] = []

            dayOfWeekCategoryData.forEach(d => {
                // Convert dayOfWeek from SQL (0=Sun) to display (0=Mon)
                const displayDay = d.dayOfWeek === 0 ? 6 : d.dayOfWeek - 1
                daysWithData.add(displayDay)
                allData.push({ category: d.category, dayOfWeek: displayDay, total: d.total })
            })

            return { allData, availableDays: Array.from(daysWithData).sort((a, b) => a - b) }
        }

        // Fallback to raw transactions
        const dayTotals = new Map<number, Map<string, number>>()
        const daysWithData = new Set<number>()

        receiptTransactions.forEach((item) => {
            if (!item.receiptDate) return
            const date = new Date(item.receiptDate)
            // getDay() returns 0=Sunday, 1=Monday, etc.
            // Convert to 0=Monday, 1=Tuesday, ..., 6=Sunday
            const jsDay = date.getDay()
            const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1 // Convert Sunday (0) to 6, and shift others

            const category = normalizeCategoryName(item.categoryName)
            const spend = Number(item.totalPrice) || 0

            daysWithData.add(dayOfWeek)

            if (!dayTotals.has(dayOfWeek)) {
                dayTotals.set(dayOfWeek, new Map())
            }
            const categoryMap = dayTotals.get(dayOfWeek)!
            categoryMap.set(category, (categoryMap.get(category) || 0) + spend)
        })

        const allData: DayOfWeekData[] = []
        dayTotals.forEach((categoryMap, dayOfWeek) => {
            categoryMap.forEach((total, category) => {
                allData.push({ category, dayOfWeek, total })
            })
        })

        const availableDays = Array.from(daysWithData).sort((a, b) => a - b)

        return { allData, availableDays }
    }, [receiptTransactions, dayOfWeekCategoryData])

    // Set initial selected day
    React.useEffect(() => {
        if (availableDays.length > 0 && selectedDay === null) {
            setSelectedDay(availableDays[0])
        } else if (availableDays.length > 0 && selectedDay !== null && !availableDays.includes(selectedDay)) {
            setSelectedDay(availableDays[0])
        }
    }, [availableDays, selectedDay])

    // Filter data for selected day
    const data = React.useMemo(() => {
        if (selectedDay === null) return []
        return allData
            .filter((item) => item.dayOfWeek === selectedDay)
            .sort((a, b) => b.total - a.total)
    }, [allData, selectedDay])

    const palette = React.useMemo(() => {
        let base = getPalette().filter((color) => color !== "#c3c3c3")

        if (colorScheme === "colored") {
            const isDark = resolvedTheme === "dark"
            if (isDark) {
                base = base.filter((color) => color !== "#2F1B15")
            } else {
                base = base.filter((color) => color !== "#E8DCCA")
            }
        }

        if (!base.length) {
            return ["#0f766e", "#14b8a6", "#22c55e", "#84cc16", "#eab308"]
        }
        return base
    }, [getPalette, colorScheme, resolvedTheme])

    const valueFormatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    })

    const handleChartMouseOver = React.useCallback(
        (params: any) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            let mouseX = 0
            let mouseY = 0
            const ecEvent = (params && (params.event?.event || params.event)) as
                | (MouseEvent & { offsetX?: number; offsetY?: number })
                | undefined

            if (ecEvent) {
                if (typeof ecEvent.clientX === "number" && typeof ecEvent.clientY === "number") {
                    mouseX = ecEvent.clientX - rect.left
                    mouseY = ecEvent.clientY - rect.top
                } else if (typeof ecEvent.offsetX === "number" && typeof ecEvent.offsetY === "number") {
                    mouseX = ecEvent.offsetX
                    mouseY = ecEvent.offsetY
                }
            }

            const position = { x: mouseX, y: mouseY }
            mousePositionRef.current = position
            setTooltipPosition(position)

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
        },
        [palette],
    )

    const handleChartMouseOut = React.useCallback(() => {
        setTooltip(null)
        setTooltipPosition(null)
        mousePositionRef.current = null
    }, [])

    const chartEvents = React.useMemo(
        () => ({
            mouseover: handleChartMouseOver,
            mouseout: handleChartMouseOut,
            globalout: handleChartMouseOut,
        }),
        [handleChartMouseOver, handleChartMouseOut],
    )

    React.useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect()
            const position = { x: e.clientX - rect.left, y: e.clientY - rect.top }
            mousePositionRef.current = position
            if (tooltip) {
                setTooltipPosition(position)
            }
        }

        const handleMouseLeave = () => {
            setTooltip(null)
            setTooltipPosition(null)
            mousePositionRef.current = null
        }

        container.addEventListener('mousemove', handleMouseMove)
        container.addEventListener('mouseleave', handleMouseLeave)

        return () => {
            container.removeEventListener('mousemove', handleMouseMove)
            container.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [tooltip])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Day of Week Category Spending"
                description="Compare grocery spending across categories for a selected day of the week."
                details={[
                    "Each bar represents total spending in a category for the selected day.",
                    "Data is aggregated from your uploaded receipts.",
                    "Use the day selector to switch between different days of the week.",
                ]}
                ignoredFootnote="Only receipt transactions with assigned categories are included."
            />
            <ChartAiInsightButton
                chartId="fridge:dayOfWeekCategory"
                chartTitle="Day of Week Category Spending"
                chartDescription="Compare grocery spending across categories for a selected day of the week."
                chartData={{
                    selectedDay: selectedDay !== null ? DAY_NAMES[selectedDay] : null,
                    totalSpent: data.reduce((sum, item) => sum + item.total, 0),
                    topCategories: data.slice(0, 5).map(d => ({ category: d.category, amount: d.total })),
                }}
                size="sm"
            />
        </div>
    )

    const option = React.useMemo(() => {
        if (!data.length || selectedDay === null) return null

        const topCategories = data.slice(0, 10)
        if (!topCategories.length) return null

        const barColors = topCategories.map((_, index) => palette[index % palette.length])

        const datasetSource: any[] = [["category", "Amount"]]
        topCategories.forEach((item) => {
            datasetSource.push([item.category, item.total])
        })

        const backgroundColor = resolvedTheme === "dark" ? "rgba(15,23,42,0)" : "rgba(248,250,252,0)"
        const textColor = resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"

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
                        color: (params: any) => barColors[params.dataIndex] ?? palette[params.dataIndex % palette.length],
                    },
                },
            ],
        }
    }, [data, selectedDay, palette, resolvedTheme])

    React.useEffect(() => {
        if (!chartRef.current) return
        const instance = chartRef.current.getEchartsInstance?.()
        if (!instance || !instance.getZr) return

        const zr = instance.getZr()
        const handleGlobalOut = () => {
            setTooltip(null)
            setTooltipPosition(null)
            mousePositionRef.current = null
        }

        zr.on("globalout", handleGlobalOut)
        return () => {
            zr.off("globalout", handleGlobalOut)
        }
    }, [])

    const chartElement = React.useMemo(() => {
        if (!option) return null
        return (
            <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "svg" }}
                notMerge={true}
                onEvents={chartEvents}
            />
        )
    }, [option, chartEvents])

    if (!mounted || isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:dayOfWeekCategory"
                            chartTitle="Day of Week Category Spending"
                            size="md"
                        />
                        <CardTitle>Day of Week Category Spending</CardTitle>
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

    if (!availableDays.length || selectedDay === null) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:dayOfWeekCategory"
                            chartTitle="Day of Week Category Spending"
                            size="md"
                        />
                        <CardTitle>Day of Week Category Spending</CardTitle>
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
                    <ChartFavoriteButton
                        chartId="fridge:dayOfWeekCategory"
                        chartTitle="Day of Week Category Spending"
                        size="md"
                    />
                    <CardTitle>Day of Week Category Spending</CardTitle>
                </div>
                <CardDescription>Compare grocery spending across categories by day</CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                    <Select
                        value={selectedDay !== null ? selectedDay.toString() : ""}
                        onValueChange={(value) => setSelectedDay(parseInt(value, 10))}
                    >
                        <SelectTrigger
                            className="w-32"
                            size="sm"
                            aria-label="Select day of week"
                        >
                            <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {availableDays.map((day) => (
                                <SelectItem key={day} value={day.toString()} className="rounded-lg">
                                    {DAY_NAMES[day]}
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
                            {chartElement}
                            {tooltip && tooltipPosition && (
                                <div
                                    className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                                    style={{
                                        left: Math.min(Math.max(tooltipPosition.x + 16, 8), (containerRef.current?.clientWidth || 800) - 8),
                                        top: Math.min(Math.max(tooltipPosition.y - 16, 8), (containerRef.current?.clientHeight || 250) - 8),
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full border border-border/50"
                                            style={{ backgroundColor: tooltip.color, borderColor: tooltip.color }}
                                        />
                                        <span className="font-medium text-foreground whitespace-nowrap">{tooltip.label}</span>
                                    </div>
                                    <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                                        {valueFormatter.format(tooltip.value)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        No data for selected day
                    </div>
                )}
            </CardContent>
        </Card>
    )
})

ChartDayOfWeekCategoryFridge.displayName = "ChartDayOfWeekCategoryFridge"
