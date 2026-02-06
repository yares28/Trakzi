"use client"

// Day of Week Spending by Category Chart for Fridge
import * as React from "react"
import { useMemo, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
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
    const { getPalette } = useColorScheme()
    const { formatCurrency, symbol } = useCurrency()
    const palette = useMemo(() => getPalette().filter((color) => color !== "#c3c3c3"), [getPalette])
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = useState<{ day: string; category: string; amount: number; isTotal: boolean; breakdown?: Array<{ category: string; amount: number }>; color?: string } | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const hasAnimatedRef = useRef(false)

    useEffect(() => {
        setMounted(true)
    }, [])

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
            colorMap.set(category, palette[index % palette.length] || "#8884d8")
        })
        return colorMap
    }, [categories, palette])

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

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#e5e7eb" : "#e5e7eb"
    const axisColor = gridColor

    // Render D3-style grouped bar chart
    useEffect(() => {
        if (!svgRef.current || processedData.length === 0 || !mounted) return

        const svg = svgRef.current

        const renderChart = (animate: boolean = false) => {
            svg.innerHTML = ""

            const marginTop = 20
            const marginRight = 20
            const marginBottom = 40
            const marginLeft = 60

            const container = svg.parentElement
            const containerRect = container?.getBoundingClientRect()
            const width = containerRect?.width || svg.clientWidth || 800
            const height = containerRect?.height || svg.clientHeight || 400

            svg.setAttribute("width", width.toString())
            svg.setAttribute("height", height.toString())

            const chartWidth = Math.max(0, width - marginLeft - marginRight)
            const chartHeight = Math.max(0, height - marginTop - marginBottom)

            const fxStep = chartWidth / dayNamesShort.length
            const fxPadding = fxStep * 0.1
            const fxBandwidth = fxStep - fxPadding * 2

            const fx = (dayIndex: number) => marginLeft + dayIndex * fxStep + fxPadding

            const xStep = categories.length ? fxBandwidth / categories.length : fxBandwidth
            const xPadding = xStep * 0.05
            const xBandwidth = xStep - xPadding * 2

            const x = (category: string) => {
                const categoryIndex = categories.indexOf(category)
                return categoryIndex * xStep + xPadding
            }

            const dataByDay = new Map<number, typeof processedData>()
            dayNamesShort.forEach((_, dayIndex) => {
                dataByDay.set(dayIndex, processedData.filter((d) => d.day === dayIndex))
            })

            const dayTotals = new Map<number, number>()
            const dayCategoryBreakdown = new Map<number, Array<{ category: string; amount: number }>>()
            dataByDay.forEach((dayData, dayIndex) => {
                const total = dayData.reduce((sum, d) => sum + d.amount, 0)
                dayTotals.set(dayIndex, total)
                dayCategoryBreakdown.set(dayIndex, dayData.map((d) => ({ category: d.category, amount: d.amount })))
            })

            const maxIndividual = processedData.length > 0 ? Math.max(...processedData.map((d) => d.amount), 0) : 0
            const maxTotal = dayTotals.size > 0 ? Math.max(...Array.from(dayTotals.values()), 0) : 0
            const maxAmount = Math.max(maxIndividual, maxTotal)

            const y = (amount: number) => {
                if (maxAmount === 0) return chartHeight
                return chartHeight - (amount / maxAmount) * chartHeight
            }
            const yHeight = (amount: number) => {
                if (maxAmount === 0) return 0
                return (amount / maxAmount) * chartHeight
            }

            dataByDay.forEach((dayData, dayIndex) => {
                const dayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
                dayGroup.setAttribute("transform", `translate(${fx(dayIndex)},${marginTop})`)

                const totalAmount = dayTotals.get(dayIndex) || 0
                if (totalAmount > 0) {
                    const totalBar = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                    const totalYPos = y(totalAmount)
                    const totalBarHeight = yHeight(totalAmount)

                    totalBar.setAttribute("x", "0")
                    totalBar.setAttribute("width", fxBandwidth.toString())
                    if (animate) {
                        totalBar.setAttribute("y", chartHeight.toString())
                        totalBar.setAttribute("height", "0")
                    } else {
                        totalBar.setAttribute("y", totalYPos.toString())
                        totalBar.setAttribute("height", totalBarHeight.toString())
                    }
                    totalBar.setAttribute("fill", isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)")
                    totalBar.setAttribute("rx", "2")
                    totalBar.setAttribute("stroke", isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)")
                    totalBar.setAttribute("stroke-width", "1")
                    totalBar.setAttribute("stroke-dasharray", "2,2")
                    totalBar.style.cursor = "pointer"
                    if (animate) {
                        totalBar.style.transition = "height 0.6s ease-out, y 0.6s ease-out"
                    }
                    totalBar.setAttribute("data-day", dayNamesShort[dayIndex])
                    totalBar.setAttribute("data-is-total", "true")
                    totalBar.setAttribute("data-total-amount", totalAmount.toString())
                    totalBar.setAttribute("data-breakdown", JSON.stringify(dayCategoryBreakdown.get(dayIndex) || []))

                    dayGroup.appendChild(totalBar)

                    if (animate) {
                        setTimeout(() => {
                            totalBar.setAttribute("height", totalBarHeight.toString())
                            totalBar.setAttribute("y", totalYPos.toString())
                        }, 10)
                    }
                }

                dayData.forEach((d, categoryIndex) => {
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                    const xPos = x(d.category)
                    const finalYPos = y(d.amount)
                    const barHeight = yHeight(d.amount)

                    rect.setAttribute("x", xPos.toString())
                    rect.setAttribute("width", xBandwidth.toString())
                    if (animate) {
                        rect.setAttribute("y", chartHeight.toString())
                        rect.setAttribute("height", "0")
                    } else {
                        rect.setAttribute("y", finalYPos.toString())
                        rect.setAttribute("height", barHeight.toString())
                    }
                    rect.setAttribute("fill", categoryColors.get(d.category) || "#8884d8")
                    rect.setAttribute("rx", "2")
                    rect.style.cursor = "pointer"
                    if (animate) {
                        rect.style.transition = "height 0.6s ease-out, y 0.6s ease-out"
                        rect.style.transitionDelay = `${categoryIndex * 0.05}s`
                    }
                    rect.setAttribute("data-day", dayNamesShort[dayIndex])
                    rect.setAttribute("data-category", d.category)
                    rect.setAttribute("data-amount", d.amount.toString())
                    rect.setAttribute("data-is-total", "false")

                    dayGroup.appendChild(rect)

                    if (animate) {
                        setTimeout(() => {
                            rect.setAttribute("height", barHeight.toString())
                            rect.setAttribute("y", finalYPos.toString())
                        }, 50 + categoryIndex * 30)
                    }
                })

                svg.appendChild(dayGroup)
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

            dayNamesShort.forEach((dayName, index) => {
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
                const xPos = fx(index) + fxBandwidth / 2
                text.setAttribute("x", xPos.toString())
                text.setAttribute("y", "20")
                text.setAttribute("text-anchor", "middle")
                text.setAttribute("fill", textColor)
                text.setAttribute("font-size", "12")
                text.textContent = dayName
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

            // Grid lines
            const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
            gridGroup.setAttribute("stroke", gridColor)
            gridGroup.setAttribute("stroke-width", "0.5")
            gridGroup.setAttribute("stroke-dasharray", "3,3")
            gridGroup.setAttribute("opacity", "0.5")
            for (let i = 0; i <= numTicks; i++) {
                const yPos = marginTop + chartHeight - (i / numTicks) * chartHeight
                const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
                gridLine.setAttribute("x1", marginLeft.toString())
                gridLine.setAttribute("y1", yPos.toString())
                gridLine.setAttribute("x2", (width - marginRight).toString())
                gridLine.setAttribute("y2", yPos.toString())
                gridGroup.appendChild(gridLine)
            }
            svg.insertBefore(gridGroup, svg.firstChild)

            // Tooltip handlers
            const updateTooltipPosition = (event: MouseEvent) => {
                setTooltipPosition({ x: event.clientX, y: event.clientY })
            }

            const showTooltip = (day: string, category: string, amount: number, isTotal: boolean, breakdown?: Array<{ category: string; amount: number }>, color?: string) => {
                setTooltip((prev) => {
                    if (prev && prev.day === day && prev.category === category && prev.amount === amount && prev.isTotal === isTotal && prev.color === color) return prev
                    return { day, category, amount, isTotal, breakdown, color }
                })
            }
            const hideTooltip = () => { setTooltip(null); setTooltipPosition(null) }

            const bars = svg.querySelectorAll("rect[data-day]")
            bars.forEach((bar) => {
                bar.addEventListener("mouseenter", (e) => {
                    const target = e.target as SVGElement
                    const day = target.getAttribute("data-day") || ""
                    const isTotal = target.getAttribute("data-is-total") === "true"
                    updateTooltipPosition(e as unknown as MouseEvent)
                    if (isTotal) {
                        const totalAmount = parseFloat(target.getAttribute("data-total-amount") || "0")
                        let breakdown: Array<{ category: string; amount: number }> = []
                        try { breakdown = JSON.parse(target.getAttribute("data-breakdown") || "[]") } catch { }
                        showTooltip(day, "", totalAmount, true, breakdown)
                    } else {
                        const category = target.getAttribute("data-category") || ""
                        const amount = parseFloat(target.getAttribute("data-amount") || "0")
                        const color = target.getAttribute("fill") || undefined
                        showTooltip(day, category, amount, false, undefined, color)
                    }
                })
                bar.addEventListener("mouseleave", hideTooltip)
                bar.addEventListener("mousemove", (e) => { updateTooltipPosition(e as unknown as MouseEvent) })
            })
        }

        const shouldAnimate = !hasAnimatedRef.current
        renderChart(shouldAnimate)
        hasAnimatedRef.current = true

        const container = svg.parentElement
        let resizeObserver: ResizeObserver | null = null
        if (container && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => { renderChart(false) })
            resizeObserver.observe(container)
        }

        return () => {
            if (resizeObserver && container) resizeObserver.unobserve(container)
        }
    }, [processedData, categories, categoryColors, isDark, textColor, gridColor, axisColor, mounted])

    if (!mounted || isLoading || receiptTransactions.length === 0) {
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
                <div ref={containerRef} className="relative w-full flex-1 min-h-0">
                    <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }} />
                    {mounted && tooltip && tooltipPosition && createPortal(
                        <div
                            className="pointer-events-none fixed z-[9999] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl select-none"
                            style={{
                                left: tooltipPosition.x + 12 + 220 > window.innerWidth ? tooltipPosition.x - 232 : tooltipPosition.x + 12,
                                top: tooltipPosition.y - 100 < 0 ? tooltipPosition.y + 12 : tooltipPosition.y - 100,
                            }}
                        >
                            {tooltip.isTotal && tooltip.breakdown ? (
                                <>
                                    <div className="font-medium mb-2 text-foreground">{tooltip.day} - Total</div>
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
                                        <span className="font-medium text-foreground">{tooltip.day}</span>
                                    </div>
                                    <div className="text-foreground/80 mb-0.5">{tooltip.category}:</div>
                                    <div className="font-mono text-[0.7rem] text-foreground/80">{formatCurrency(tooltip.amount)}</div>
                                </>
                            )}
                        </div>,
                        document.body
                    )}
                </div>
                {categories.length > 0 && (
                    <div className="px-4 pb-2 pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
                        {categories.slice(0, 10).map((category) => (
                            <div key={category} className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColors.get(category) || "#8884d8" }} />
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
