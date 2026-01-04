"use client"

// All Months Category Spending Chart for Fridge - Shows category spending across all months
import * as React from "react"
import { useMemo, useEffect, useRef, useState } from "react"
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

export function ChartAllMonthsCategoryFridge({ receiptTransactions = [], monthlyCategoriesData, isLoading = false }: ChartAllMonthsCategoryFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency, symbol } = useCurrency()
    const palette = useMemo(() => getPalette().filter((color) => color !== "#c3c3c3"), [getPalette])
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = useState<{ month: string; category: string; amount: number; isTotal: boolean; breakdown?: Array<{ category: string; amount: number }>; color?: string } | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Process receipt transactions to group by month and category
    const processedData = useMemo(() => {
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
            colorMap.set(category, palette[index % palette.length] || "#8884d8")
        })
        return colorMap
    }, [categories, palette])

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

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#e5e7eb" : "#e5e7eb"
    const axisColor = gridColor

    // Render D3-style grouped bar chart
    useEffect(() => {
        if (!svgRef.current || processedData.length === 0 || !mounted) return

        const svg = svgRef.current
        const handleSvgMouseLeave = () => {
            setTooltip(null)
            setTooltipPosition(null)
        }
        svg.addEventListener("mouseleave", handleSvgMouseLeave)

        let lastWidth: number | null = null
        let lastHeight: number | null = null

        const renderChart = (forcedWidth?: number, forcedHeight?: number) => {
            svg.innerHTML = ""

            const marginTop = 20
            const marginRight = 20
            const marginBottom = 40
            const marginLeft = 60

            const container = svg.parentElement
            const containerRect = container?.getBoundingClientRect()
            const width = forcedWidth ?? containerRect?.width ?? svg.clientWidth ?? 800
            const height = forcedHeight ?? containerRect?.height ?? svg.clientHeight ?? 400

            svg.setAttribute("width", width.toString())
            svg.setAttribute("height", height.toString())

            const chartWidth = Math.max(0, width - marginLeft - marginRight)
            const chartHeight = Math.max(0, height - marginTop - marginBottom)

            const fxStep = chartWidth / monthNamesShort.length
            const fxPadding = fxStep * 0.1
            const fxBandwidth = fxStep - fxPadding * 2

            const fx = (monthIndex: number) => marginLeft + monthIndex * fxStep + fxPadding

            const xStep = categories.length ? fxBandwidth / categories.length : fxBandwidth
            const xPadding = xStep * 0.05
            const xBandwidth = xStep - xPadding * 2

            const x = (category: string) => {
                const categoryIndex = categories.indexOf(category)
                return categoryIndex * xStep + xPadding
            }

            const dataByMonth = new Map<number, typeof processedData>()
            monthNamesShort.forEach((_, monthIndex) => {
                dataByMonth.set(monthIndex, processedData.filter((d) => d.month === monthIndex))
            })

            const monthTotals = new Map<number, number>()
            const monthCategoryBreakdown = new Map<number, Array<{ category: string; amount: number }>>()
            dataByMonth.forEach((monthData, monthIndex) => {
                const total = monthData.reduce((sum, d) => sum + d.amount, 0)
                monthTotals.set(monthIndex, total)
                monthCategoryBreakdown.set(monthIndex, monthData.map((d) => ({ category: d.category, amount: d.amount })))
            })

            const maxIndividual = processedData.length > 0 ? Math.max(...processedData.map((d) => d.amount), 0) : 0
            const maxTotal = monthTotals.size > 0 ? Math.max(...Array.from(monthTotals.values()), 0) : 0
            const maxAmount = Math.max(maxIndividual, maxTotal)

            const y = (amount: number) => {
                if (maxAmount === 0) return chartHeight
                return chartHeight - (amount / maxAmount) * chartHeight
            }
            const yHeight = (amount: number) => {
                if (maxAmount === 0) return 0
                return (amount / maxAmount) * chartHeight
            }

            dataByMonth.forEach((monthData, monthIndex) => {
                const monthGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
                monthGroup.setAttribute("transform", `translate(${fx(monthIndex)},${marginTop})`)

                const totalAmount = monthTotals.get(monthIndex) || 0
                if (totalAmount > 0) {
                    const totalBar = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                    const totalYPos = y(totalAmount)
                    const totalBarHeight = yHeight(totalAmount)

                    totalBar.setAttribute("x", "0")
                    totalBar.setAttribute("y", totalYPos.toString())
                    totalBar.setAttribute("width", fxBandwidth.toString())
                    totalBar.setAttribute("height", totalBarHeight.toString())
                    totalBar.setAttribute("fill", isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)")
                    totalBar.setAttribute("rx", "2")
                    totalBar.setAttribute("stroke", isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)")
                    totalBar.setAttribute("stroke-width", "1")
                    totalBar.setAttribute("stroke-dasharray", "2,2")
                    totalBar.style.cursor = "pointer"
                    totalBar.setAttribute("data-month", monthNamesShort[monthIndex])
                    totalBar.setAttribute("data-is-total", "true")
                    totalBar.setAttribute("data-total-amount", totalAmount.toString())
                    totalBar.setAttribute("data-breakdown", JSON.stringify(monthCategoryBreakdown.get(monthIndex) || []))

                    monthGroup.appendChild(totalBar)
                }

                monthData.forEach((d) => {
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                    const xPos = x(d.category)
                    const barY = y(d.amount)
                    const barHeight = yHeight(d.amount)

                    rect.setAttribute("x", xPos.toString())
                    rect.setAttribute("y", barY.toString())
                    rect.setAttribute("width", xBandwidth.toString())
                    rect.setAttribute("height", barHeight.toString())
                    rect.setAttribute("fill", categoryColors.get(d.category) || "#8884d8")
                    rect.setAttribute("rx", "2")
                    rect.style.cursor = "pointer"
                    rect.setAttribute("data-month", monthNamesShort[monthIndex])
                    rect.setAttribute("data-category", d.category)
                    rect.setAttribute("data-amount", d.amount.toString())
                    rect.setAttribute("data-is-total", "false")

                    monthGroup.appendChild(rect)
                })

                svg.appendChild(monthGroup)
            })

            // X axis
            const xAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
            xAxisGroup.setAttribute("transform", `translate(0,${height - marginBottom})`)
            const xAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
            xAxisLine.setAttribute("x1", marginLeft.toString())
            xAxisLine.setAttribute("y1", "0")
            xAxisLine.setAttribute("x2", (width - marginRight).toString())
            xAxisLine.setAttribute("y2", "0")
            xAxisLine.setAttribute("stroke", axisColor)
            xAxisGroup.appendChild(xAxisLine)

            monthNamesShort.forEach((monthName, index) => {
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
                const xPos = fx(index) + fxBandwidth / 2
                text.setAttribute("x", xPos.toString())
                text.setAttribute("y", "20")
                text.setAttribute("text-anchor", "middle")
                text.setAttribute("fill", textColor)
                text.setAttribute("font-size", "12")
                text.textContent = monthName
                xAxisGroup.appendChild(text)
            })
            svg.appendChild(xAxisGroup)

            // Y axis
            const yAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
            yAxisGroup.setAttribute("transform", `translate(${marginLeft},${marginTop})`)
            const yAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
            yAxisLine.setAttribute("x1", "0")
            yAxisLine.setAttribute("y1", "0")
            yAxisLine.setAttribute("x2", "0")
            yAxisLine.setAttribute("y2", chartHeight.toString())
            yAxisLine.setAttribute("stroke", axisColor)
            yAxisGroup.appendChild(yAxisLine)

            const numTicks = 5
            for (let i = 0; i <= numTicks; i++) {
                const value = (maxAmount / numTicks) * i
                const yPos = chartHeight - (i / numTicks) * chartHeight
                const tickText = document.createElementNS("http://www.w3.org/2000/svg", "text")
                tickText.setAttribute("x", "-10")
                tickText.setAttribute("y", yPos.toString())
                tickText.setAttribute("text-anchor", "end")
                tickText.setAttribute("alignment-baseline", "middle")
                tickText.setAttribute("fill", textColor)
                tickText.setAttribute("font-size", "12")
                tickText.textContent = formatCurrency(value, { maximumFractionDigits: 0 })
                yAxisGroup.appendChild(tickText)
            }
            svg.appendChild(yAxisGroup)

            // Tooltip handlers
            const showTooltip = (event: MouseEvent, month: string, category: string, amount: number, isTotal: boolean, breakdown?: Array<{ category: string; amount: number }>, color?: string) => {
                if (!containerRef.current) return
                const rect = containerRef.current.getBoundingClientRect()
                setTooltipPosition({ x: event.clientX - rect.left, y: event.clientY - rect.top })
                setTooltip({ month, category, amount, isTotal, breakdown, color })
            }
            const hideTooltip = () => { setTooltip(null); setTooltipPosition(null) }

            const bars = svg.querySelectorAll("rect[data-month]")
            bars.forEach((bar) => {
                bar.addEventListener("mouseenter", (e) => {
                    const target = e.target as SVGElement
                    const month = target.getAttribute("data-month") || ""
                    const isTotal = target.getAttribute("data-is-total") === "true"
                    if (isTotal) {
                        const totalAmount = parseFloat(target.getAttribute("data-total-amount") || "0")
                        let breakdown: Array<{ category: string; amount: number }> = []
                        try { breakdown = JSON.parse(target.getAttribute("data-breakdown") || "[]") } catch { }
                        showTooltip(e as unknown as MouseEvent, month, "", totalAmount, true, breakdown)
                    } else {
                        const category = target.getAttribute("data-category") || ""
                        const amount = parseFloat(target.getAttribute("data-amount") || "0")
                        const color = target.getAttribute("fill") || undefined
                        showTooltip(e as unknown as MouseEvent, month, category, amount, false, undefined, color)
                    }
                })
                bar.addEventListener("mouseleave", hideTooltip)
                bar.addEventListener("mousemove", (e) => {
                    if (!containerRef.current) return
                    const rect = containerRef.current.getBoundingClientRect()
                    setTooltipPosition({ x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top })
                })
            })
        }

        const initialContainer = svg.parentElement
        const initialRect = initialContainer?.getBoundingClientRect()
        if (initialRect) {
            lastWidth = initialRect.width
            lastHeight = initialRect.height
            renderChart(initialRect.width, initialRect.height)
        } else {
            renderChart()
        }

        const container = svg.parentElement
        let resizeObserver: ResizeObserver | null = null
        if (container && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver((entries) => {
                const entry = entries[0]
                if (!entry) return
                const { width, height } = entry.contentRect
                if (lastWidth === width && lastHeight === height) return
                lastWidth = width
                lastHeight = height
                renderChart(width, height)
            })
            resizeObserver.observe(container)
        }

        return () => {
            if (resizeObserver && container) resizeObserver.unobserve(container)
            svg.removeEventListener("mouseleave", handleSvgMouseLeave)
        }
    }, [processedData, categories, categoryColors, isDark, textColor, gridColor, axisColor, mounted])

    if (!mounted || isLoading || receiptTransactions.length === 0) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:allMonthsCategory" chartTitle="All Months Category Spending" size="md" />
                        <CardTitle>All Months Category Spending</CardTitle>
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
                    <ChartFavoriteButton chartId="fridge:allMonthsCategory" chartTitle="All Months Category Spending" size="md" />
                    <CardTitle>All Months Category Spending</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex flex-col">
                <div ref={containerRef} className="relative w-full flex-1 min-h-0">
                    <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }} />
                    {tooltip && tooltipPosition && (
                        <div
                            className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
                            style={{
                                left: Math.min(Math.max(tooltipPosition.x + 16, 8), (containerRef.current?.clientWidth || 800) - 8),
                                top: Math.min(Math.max(tooltipPosition.y - 16, 8), (containerRef.current?.clientHeight || 250) - 8),
                            }}
                        >
                            {tooltip.isTotal && tooltip.breakdown ? (
                                <>
                                    <div className="font-medium mb-2 text-foreground">{tooltip.month} - Total</div>
                                    <div className="border-t border-border/60 pt-1.5 mb-1.5">
                                        {tooltip.breakdown.sort((a, b) => b.amount - a.amount).map((item, idx) => (
                                            <div key={idx} className="flex justify-between gap-3 mb-1">
                                                <span className="text-foreground/80">{item.category}:</span>
                                                <span className="font-semibold text-foreground">{formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-border/60 pt-1.5 mt-1">
                                        <div className="flex justify-between gap-3 font-bold text-foreground">
                                            <span>Total:</span>
                                            <span>{formatCurrency(tooltip.amount)}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-1">
                                        {tooltip.color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tooltip.color }} />}
                                        <span className="font-medium text-foreground">{tooltip.month}</span>
                                    </div>
                                    <div className="text-foreground/80 mb-0.5">{tooltip.category}:</div>
                                    <div className="font-mono text-[0.7rem] text-foreground/80">{formatCurrency(tooltip.amount)}</div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                {categories.length > 0 && (
                    <div className="px-4 pb-2 pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
                        {categories.slice(0, 8).map((category) => (
                            <div key={category} className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColors.get(category) || "#8884d8" }} />
                                <span className="text-muted-foreground">{category}</span>
                            </div>
                        ))}
                        {categories.length > 8 && <span className="text-muted-foreground">+{categories.length - 8} more</span>}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
