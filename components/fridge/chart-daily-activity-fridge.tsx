"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import ReactECharts from "echarts-for-react"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { formatDateForDisplay } from "@/lib/date"
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartLoadingState } from "@/components/chart-loading-state"

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

interface ChartDailyActivityFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    isLoading?: boolean
}

export function ChartDailyActivityFridge({ receiptTransactions = [], isLoading = false }: ChartDailyActivityFridgeProps) {
    const currentYear = new Date().getFullYear()
    const [selectedYear, setSelectedYear] = useState(currentYear.toString())
    const { resolvedTheme } = useTheme()
    const { colorScheme, getPalette } = useColorScheme()
    const [mounted, setMounted] = useState(false)
    const chartRef = React.useRef<any>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = useState<{ date: string; value: number; color: string } | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

    // Check if YTD is selected
    const isYTD = selectedYear === "YTD"

    useEffect(() => {
        setMounted(true)
    }, [])

    // Aggregate receipt transactions by date
    const dailyData = useMemo(() => {
        const totals = new Map<string, number>()

        receiptTransactions.forEach((item) => {
            const date = item.receiptDate
            if (!date) return
            const spend = Number(item.totalPrice) || 0
            totals.set(date, (totals.get(date) || 0) + spend)
        })

        return Array.from(totals.entries())
            .map(([day, value]) => ({ day, value: Number(value.toFixed(2)) }))
            .sort((a, b) => a.day.localeCompare(b.day))
    }, [receiptTransactions])

    // Generate list of available years from data
    const availableYears = React.useMemo(() => {
        const years = new Set<number>()
        dailyData.forEach(item => {
            const year = new Date(item.day).getFullYear()
            years.add(year)
        })
        if (years.size === 0) {
            years.add(currentYear)
        }
        return Array.from(years).sort((a, b) => b - a)
    }, [dailyData, currentYear])

    // Calculate date range based on year selection
    const { fromDate, toDate } = useMemo(() => {
        if (isYTD) {
            const today = new Date()
            const oneYearAgo = new Date(today)
            oneYearAgo.setDate(oneYearAgo.getDate() - 365)
            return {
                fromDate: oneYearAgo.toISOString().split("T")[0],
                toDate: today.toISOString().split("T")[0],
            }
        }

        return {
            fromDate: `${selectedYear}-01-01`,
            toDate: `${selectedYear}-12-31`,
        }
    }, [isYTD, selectedYear])

    // Filter data based on selection
    const filteredData = useMemo(() => {
        const today = new Date().toISOString().split('T')[0]
        return dailyData.filter((item) => {
            const itemDate = item.day
            if (item.value <= 0 || itemDate > today) return false
            if (fromDate && itemDate < fromDate) return false
            if (toDate && itemDate > toDate) return false
            return true
        })
    }, [dailyData, fromDate, toDate])

    // Format data for ECharts
    const chartData = useMemo(() => {
        return filteredData.map((item) => [item.day, item.value])
    }, [filteredData])

    // Auto-switch to year with data if current selection is empty
    useEffect(() => {
        if (!dailyData || dailyData.length === 0 || availableYears.length === 0) return
        if (chartData.length > 0) return

        const closestYear = availableYears.reduce((best, year) => {
            const bestDiff = Math.abs(best - currentYear)
            const yearDiff = Math.abs(year - currentYear)
            if (yearDiff < bestDiff) return year
            if (yearDiff === bestDiff) return year > best ? year : best
            return best
        }, availableYears[0])

        if (selectedYear !== closestYear.toString()) {
            setSelectedYear(closestYear.toString())
        }
    }, [chartData, dailyData, availableYears, currentYear, selectedYear])

    // Calculate max value for visualMap
    const maxValue = useMemo(() => {
        if (chartData.length === 0) return 1000
        return Math.max(...chartData.map(([, value]) => value as number), 10)
    }, [chartData])

    const isDark = resolvedTheme === "dark"

    // Get colors from color scheme provider (3 colors for legend)
    const palette = useMemo(() => {
        const colors = getPalette().filter(color => color !== "#c3c3c3")
        const reversed = [...colors].reverse()
        if (reversed.length >= 3) {
            return [reversed[0], reversed[Math.floor(reversed.length / 2)], reversed[reversed.length - 1]]
        }
        return reversed.slice(0, 3)
    }, [getPalette])

    // Get color for a value based on the palette
    const getColorForValue = (value: number): string => {
        if (palette.length === 0) return "#c3c3c3"
        if (maxValue === 0) return palette[0]

        const normalizedValue = Math.min(value / maxValue, 1)

        if (palette.length === 1) return palette[0]
        if (palette.length === 2) {
            return normalizedValue < 0.5 ? palette[0] : palette[1]
        }

        const segmentSize = 1 / (palette.length - 1)
        const segmentIndex = Math.min(Math.floor(normalizedValue / segmentSize), palette.length - 1)
        return palette[segmentIndex] || palette[palette.length - 1]
    }

    // Format currency value
    const valueFormatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    })

    // ECharts event handlers for custom tooltip
    const handleChartMouseOver = (params: any, event?: any) => {
        if (!containerRef.current) return

        const echartsInstance = chartRef.current?.getEchartsInstance()
        if (!echartsInstance) return

        const rect = containerRef.current.getBoundingClientRect()
        let mouseX = 0
        let mouseY = 0

        if (event && event.offsetX !== undefined && event.offsetY !== undefined) {
            mouseX = event.offsetX
            mouseY = event.offsetY
        } else if (event && event.clientX !== undefined && event.clientY !== undefined) {
            mouseX = event.clientX - rect.left
            mouseY = event.clientY - rect.top
        } else {
            const zr = echartsInstance.getZr()
            const handler = zr.handler
            if (handler && handler.lastOffset) {
                mouseX = handler.lastOffset[0]
                mouseY = handler.lastOffset[1]
            }
        }

        setTooltipPosition({ x: mouseX, y: mouseY })

        if (params.data && Array.isArray(params.data) && params.data.length >= 2) {
            const date = params.data[0] as string
            const value = params.data[1] as number
            const color = getColorForValue(value)

            setTooltip({ date, value, color })
        }
    }

    const handleChartMouseOut = () => {
        setTooltip(null)
        setTooltipPosition(null)
    }

    // Global mousemove listener when tooltip is visible
    useEffect(() => {
        if (tooltip && containerRef.current) {
            const handleMouseMove = (e: MouseEvent) => {
                if (!containerRef.current) return
                const rect = containerRef.current.getBoundingClientRect()
                setTooltipPosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                })
            }

            window.addEventListener('mousemove', handleMouseMove)
            return () => {
                window.removeEventListener('mousemove', handleMouseMove)
            }
        }
    }, [tooltip])

    // ECharts option configuration
    const option = useMemo(() => ({
        tooltip: { show: false },
        title: { show: false },
        visualMap: {
            min: 0,
            max: maxValue,
            show: false,
            inRange: { color: palette }
        },
        calendar: {
            top: 30,
            left: 30,
            right: 30,
            bottom: 30,
            cellSize: ['auto', 13],
            range: [fromDate, toDate],
            itemStyle: {
                borderWidth: 0.5,
                borderColor: isDark ? '#e5e7eb' : '#e5e7eb'
            },
            yearLabel: { show: false },
            dayLabel: {
                color: isDark ? '#9ca3af' : '#6b7280',
                fontSize: 11
            },
            monthLabel: {
                color: isDark ? '#9ca3af' : '#6b7280',
                fontSize: 11
            }
        },
        series: {
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: chartData
        }
    }), [chartData, maxValue, fromDate, toDate, isDark, palette])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Daily Grocery Activity"
                description="Your grocery spending patterns throughout the year - darker means more spending"
                details={[
                    "Each cell represents a day, colored by the total grocery amount you spent.",
                    "Data is aggregated from your uploaded receipts.",
                ]}
                ignoredFootnote="Only days with receipt transactions are shown."
            />
            <ChartAiInsightButton
                chartId="fridge:dailyActivity"
                chartTitle="Daily Grocery Activity"
                chartDescription="Your grocery spending patterns throughout the year"
                chartData={{
                    totalDays: chartData.length,
                    totalSpent: chartData.reduce((sum, [, value]) => sum + (value as number), 0),
                    maxDailySpend: maxValue,
                }}
                size="sm"
            />
        </div>
    )

    if (!mounted || isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:dailyActivity"
                            chartTitle="Daily Grocery Activity"
                            size="md"
                        />
                        <CardTitle>Daily Grocery Activity</CardTitle>
                    </div>
                    <CardAction className="flex flex-wrap items-center gap-2">
                        {renderInfoTrigger()}
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-32" size="sm" aria-label="Select year">
                                <SelectValue placeholder={selectedYear === "YTD" ? "YTD" : selectedYear || currentYear.toString()} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="YTD" className="rounded-lg">YTD</SelectItem>
                                {availableYears.map((year) => (
                                    <SelectItem key={year} value={year.toString()} className="rounded-lg">
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <div className="h-[250px] w-full flex items-center justify-center">
                        <ChartLoadingState isLoading={true} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (chartData.length === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton
                            chartId="fridge:dailyActivity"
                            chartTitle="Daily Grocery Activity"
                            size="md"
                        />
                        <CardTitle>Daily Grocery Activity</CardTitle>
                    </div>
                    <CardAction className="flex flex-wrap items-center gap-2">
                        {renderInfoTrigger()}
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-32" size="sm" aria-label="Select year">
                                <SelectValue placeholder={selectedYear === "YTD" ? "YTD" : selectedYear || currentYear.toString()} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="YTD" className="rounded-lg">YTD</SelectItem>
                                {availableYears.map((year) => (
                                    <SelectItem key={year} value={year.toString()} className="rounded-lg">
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                    <div className="h-[250px] w-full flex items-center justify-center">
                        <ChartLoadingState isLoading={false} />
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
                        chartId="fridge:dailyActivity"
                        chartTitle="Daily Grocery Activity"
                        size="md"
                    />
                    <CardTitle>Daily Grocery Activity</CardTitle>
                </div>
                <CardAction className="flex flex-wrap items-center gap-2">
                    {renderInfoTrigger()}
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-32" size="sm" aria-label="Select year">
                            <SelectValue placeholder={selectedYear === "YTD" ? "YTD" : selectedYear || currentYear.toString()} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="YTD" className="rounded-lg">YTD</SelectItem>
                            {availableYears.map((year) => (
                                <SelectItem key={year} value={year.toString()} className="rounded-lg">
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <div ref={containerRef} className="relative h-[250px] w-full" style={{ minHeight: 0, minWidth: 0 }}>
                    <ReactECharts
                        ref={chartRef}
                        option={option}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'svg' }}
                        notMerge={true}
                        onEvents={{
                            mouseover: handleChartMouseOver,
                            mouseout: handleChartMouseOut,
                        }}
                    />
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
                                <span className="font-medium text-foreground whitespace-nowrap">
                                    {formatDateForDisplay(tooltip.date, "en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>
                            <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                                {valueFormatter.format(tooltip.value)}
                            </div>
                        </div>
                    )}
                </div>
                {/* Color Legend */}
                <div className="mt-4 flex items-center justify-center gap-3 px-2 sm:px-6">
                    <span className="text-xs text-muted-foreground">Less</span>
                    <div className="flex h-4 items-center gap-0.5">
                        {palette.slice(0, 3).map((color, index) => (
                            <div
                                key={index}
                                className="h-full w-3 rounded-sm"
                                style={{ backgroundColor: color }}
                                title={`Spending level ${index + 1}`}
                            />
                        ))}
                    </div>
                    <span className="text-xs text-muted-foreground">More</span>
                </div>
            </CardContent>
        </Card>
    )
}
