"use client"

// Time of Day Shopping Chart for Fridge - Shows when you tend to go grocery shopping
import * as React from "react"
import { useMemo, useEffect, useRef, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { getChartTextColor, CHART_GRID_COLOR, DEFAULT_FALLBACK_PALETTE } from "@/lib/chart-colors"
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
import { isChartResizePaused, useChartResizeResume } from "@/lib/chart-resize-context"

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

interface ChartTimeOfDayShoppingFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    hourlyActivityData?: Array<{ hour: number; total: number; count: number }>
    isLoading?: boolean
}

const HOUR_LABELS = [
    "12AM", "1AM", "2AM", "3AM", "4AM", "5AM",
    "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
    "12PM", "1PM", "2PM", "3PM", "4PM", "5PM",
    "6PM", "7PM", "8PM", "9PM", "10PM", "11PM"
]

function parseReceiptHour(value?: string | null) {
    if (!value) return null
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null

    const match = normalized.match(/(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?/)
    if (!match) return null

    let hour = parseInt(match[1], 10)
    if (Number.isNaN(hour)) return null

    const meridiem = match[4]
    if (meridiem) {
        if (meridiem === "pm" && hour < 12) hour += 12
        if (meridiem === "am" && hour === 12) hour = 0
    }

    if (hour === 24) hour = 0
    if (hour < 0 || hour > 23) return null
    return hour
}

export const ChartTimeOfDayShoppingFridge = React.memo(function ChartTimeOfDayShoppingFridge({ receiptTransactions = [], hourlyActivityData, isLoading = false }: ChartTimeOfDayShoppingFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getShuffledPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = useState<{ hour: string; trips: number; spending: number } | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const hasAnimatedRef = useRef(false)
    const renderChartRef = useRef<(animate: boolean) => void>(() => {})

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleResizeResume = useCallback(() => {
        if (!isChartResizePaused()) renderChartRef.current(false)
    }, [])
    useChartResizeResume(handleResizeResume)

    const processedData = useMemo(() => {
        const fullDayData: { hour: number; trips: number; spending: number }[] = Array.from(
            { length: 24 },
            (_, hour) => ({ hour, trips: 0, spending: 0 })
        )

        // Use bundle data if available (pre-computed by server)
        if (hourlyActivityData && hourlyActivityData.length > 0) {
            hourlyActivityData.forEach(h => {
                if (h.hour >= 0 && h.hour < 24) {
                    fullDayData[h.hour].trips = h.count
                    fullDayData[h.hour].spending = h.total
                }
            })
            return fullDayData
        }

        // Fallback to raw transactions
        if (!Array.isArray(receiptTransactions) || receiptTransactions.length === 0) {
            return fullDayData
        }

        const receiptBuckets = new Map<string, { hour: number | null; receiptTotal: number; lineTotal: number; hasReceiptTotal: boolean }>()

        receiptTransactions.forEach((item) => {
            const receiptId = item.receiptId || String(item.id)
            if (!receiptId) return

            const hour = parseReceiptHour(item.receiptTime)
            const receiptTotal = Number(item.receiptTotalAmount) || 0
            const lineTotal = Number(item.totalPrice) || 0

            const existing = receiptBuckets.get(receiptId)
            if (existing) {
                if (existing.hour === null && hour !== null) {
                    existing.hour = hour
                }
                if (!existing.hasReceiptTotal && receiptTotal > 0) {
                    existing.receiptTotal = receiptTotal
                    existing.hasReceiptTotal = true
                }
                if (!existing.hasReceiptTotal) {
                    existing.lineTotal += lineTotal
                }
            } else {
                receiptBuckets.set(receiptId, {
                    hour,
                    receiptTotal: receiptTotal > 0 ? receiptTotal : 0,
                    lineTotal: receiptTotal > 0 ? 0 : lineTotal,
                    hasReceiptTotal: receiptTotal > 0
                })
            }
        })

        receiptBuckets.forEach(({ hour, receiptTotal, lineTotal, hasReceiptTotal }) => {
            if (hour === null) return
            const total = hasReceiptTotal ? receiptTotal : lineTotal
            fullDayData[hour].trips += 1
            fullDayData[hour].spending += total
        })

        return fullDayData
    }, [receiptTransactions, hourlyActivityData])

    const { missingTimeReceiptCount, totalUniqueReceipts } = useMemo(() => {
        if (!Array.isArray(receiptTransactions) || receiptTransactions.length === 0) {
            return { missingTimeReceiptCount: 0, totalUniqueReceipts: 0 }
        }

        const receiptTimePresence = new Map<string, { hasTime: boolean }>()

        receiptTransactions.forEach((item) => {
            const receiptId = item.receiptId || String(item.id)
            if (!receiptId) return

            const existing = receiptTimePresence.get(receiptId) ?? { hasTime: false }
            const hour = parseReceiptHour(item.receiptTime)

            if (hour !== null) {
                existing.hasTime = true
            }

            receiptTimePresence.set(receiptId, existing)
        })

        let missing = 0
        receiptTimePresence.forEach((value) => {
            if (!value.hasTime) missing += 1
        })

        return {
            missingTimeReceiptCount: missing,
            totalUniqueReceipts: receiptTimePresence.size,
        }
    }, [receiptTransactions])

    const renderInfoTrigger = () => {
        const baseDetails = [
            "This chart shows your shopping trip frequency by hour of day.",
            "Taller bars indicate more frequent shopping times.",
            "Hover to see trip count and total spending for each hour.",
            "Only receipts with time data are included in the distribution.",
        ]

        if (totalUniqueReceipts > 0 && missingTimeReceiptCount > 0) {
            baseDetails.push(
                `${missingTimeReceiptCount} of ${totalUniqueReceipts} receipts are missing time information and are excluded from this chart.`
            )
        }

        return (
            <div className="flex flex-col items-center gap-2">
                <ChartInfoPopover
                    title="Time of Day Shopping"
                    description="See when you typically go grocery shopping throughout the day."
                    details={baseDetails}
                    ignoredFootnote="Receipt times are extracted from your uploads."
                />
                <ChartAiInsightButton
                    chartId="fridge:time-of-day-spending"
                    chartTitle="Time of Day Shopping"
                    chartDescription="Shopping patterns by hour of day."
                    chartData={{
                        peakHour: processedData.reduce((max, d) => d.trips > max.trips ? d : max, processedData[0]),
                        totalTrips: processedData.reduce((sum, d) => sum + d.trips, 0),
                        totalSpending: processedData.reduce((sum, d) => sum + d.spending, 0),
                    }}
                    size="sm"
                />
            </div>
        )
    }

    const isDark = resolvedTheme === "dark"
    const textColor = getChartTextColor(isDark)
    const gridColor = CHART_GRID_COLOR
    const axisColor = gridColor
    const barColor = palette[0] || DEFAULT_FALLBACK_PALETTE[0]
    const barHoverColor = palette[1] || DEFAULT_FALLBACK_PALETTE[1]

    // Render D3-style bar chart
    useEffect(() => {
        if (!svgRef.current || processedData.length === 0 || !mounted) return

        const svg = svgRef.current

        const renderChart = (animate: boolean = false) => {
            svg.innerHTML = ""

            const marginTop = 20
            const marginRight = 20
            const marginBottom = 50
            const marginLeft = 60

            const container = svg.parentElement
            const containerRect = container?.getBoundingClientRect()
            const width = containerRect?.width || svg.clientWidth || 800
            const height = containerRect?.height || svg.clientHeight || 300

            svg.setAttribute("width", width.toString())
            svg.setAttribute("height", height.toString())

            const chartWidth = Math.max(0, width - marginLeft - marginRight)
            const chartHeight = Math.max(0, height - marginTop - marginBottom)

            const barWidth = chartWidth / 24
            const barPadding = barWidth * 0.2
            const actualBarWidth = barWidth - barPadding * 2

            const maxTrips = Math.max(...processedData.map(d => d.trips), 1)

            const y = (trips: number) => {
                return chartHeight - (trips / maxTrips) * chartHeight
            }
            const yHeight = (trips: number) => {
                return (trips / maxTrips) * chartHeight
            }

            // Draw bars
            processedData.forEach((d, index) => {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
                const xPos = marginLeft + index * barWidth + barPadding
                const finalYPos = marginTop + y(d.trips)
                const barHeight = yHeight(d.trips)

                rect.setAttribute("x", xPos.toString())
                rect.setAttribute("width", actualBarWidth.toString())

                if (animate) {
                    rect.setAttribute("y", (marginTop + chartHeight).toString())
                    rect.setAttribute("height", "0")
                } else {
                    rect.setAttribute("y", finalYPos.toString())
                    rect.setAttribute("height", barHeight.toString())
                }

                rect.setAttribute("fill", barColor)
                rect.setAttribute("rx", "3")
                rect.style.cursor = "pointer"
                rect.style.transition = "fill 0.2s ease"

                if (animate) {
                    rect.style.transition = "height 0.6s ease-out, y 0.6s ease-out, fill 0.2s ease"
                    rect.style.transitionDelay = `${index * 0.02}s`
                }

                rect.setAttribute("data-hour", index.toString())
                rect.setAttribute("data-trips", d.trips.toString())
                rect.setAttribute("data-spending", d.spending.toString())

                // Hover effects
                rect.addEventListener("mouseenter", () => {
                    rect.setAttribute("fill", barHoverColor)
                })
                rect.addEventListener("mouseleave", () => {
                    rect.setAttribute("fill", barColor)
                })

                svg.appendChild(rect)

                if (animate) {
                    setTimeout(() => {
                        rect.setAttribute("height", barHeight.toString())
                        rect.setAttribute("y", finalYPos.toString())
                    }, 50 + index * 20)
                }
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

            // Show every 3rd hour label to avoid crowding
            for (let i = 0; i < 24; i += 3) {
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
                const xPos = marginLeft + i * barWidth + barWidth / 2
                text.setAttribute("x", xPos.toString())
                text.setAttribute("y", "25")
                text.setAttribute("text-anchor", "middle")
                text.setAttribute("fill", textColor)
                text.setAttribute("font-size", "11")
                text.textContent = HOUR_LABELS[i]
                xAxisGroup.appendChild(text)
            }
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

            // Generate unique tick values - avoid duplicates when maxTrips is low
            const numTicks = Math.min(5, maxTrips)
            const tickValues: number[] = []

            if (maxTrips <= 5) {
                // For small values, show each integer from 0 to maxTrips
                for (let i = 0; i <= maxTrips; i++) {
                    tickValues.push(i)
                }
            } else {
                // For larger values, distribute ticks evenly
                for (let i = 0; i <= numTicks; i++) {
                    const value = Math.round((maxTrips / numTicks) * i)
                    // Avoid duplicate values
                    if (tickValues.length === 0 || tickValues[tickValues.length - 1] !== value) {
                        tickValues.push(value)
                    }
                }
            }

            tickValues.forEach((value) => {
                const yPos = chartHeight - (value / maxTrips) * chartHeight

                const tickText = document.createElementNS("http://www.w3.org/2000/svg", "text")
                tickText.setAttribute("x", "-10")
                tickText.setAttribute("y", yPos.toString())
                tickText.setAttribute("text-anchor", "end")
                tickText.setAttribute("alignment-baseline", "middle")
                tickText.setAttribute("fill", textColor)
                tickText.setAttribute("font-size", "11")
                tickText.textContent = value.toString()
                yAxisGroup.appendChild(tickText)
            })

            // Y axis label
            const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text")
            yLabel.setAttribute("x", (-chartHeight / 2).toString())
            yLabel.setAttribute("y", "-45")
            yLabel.setAttribute("text-anchor", "middle")
            yLabel.setAttribute("fill", textColor)
            yLabel.setAttribute("font-size", "12")
            yLabel.setAttribute("transform", "rotate(-90)")
            yLabel.textContent = "Trips"
            yAxisGroup.appendChild(yLabel)

            svg.appendChild(yAxisGroup)

            // Grid lines
            const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
            gridGroup.setAttribute("stroke", gridColor)
            gridGroup.setAttribute("stroke-width", "0.5")
            gridGroup.setAttribute("stroke-dasharray", "3,3")
            gridGroup.setAttribute("opacity", "0.5")

            // Draw grid lines for each non-zero tick value
            tickValues.filter(v => v > 0).forEach((value) => {
                const yPos = marginTop + chartHeight - (value / maxTrips) * chartHeight
                const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
                gridLine.setAttribute("x1", marginLeft.toString())
                gridLine.setAttribute("y1", yPos.toString())
                gridLine.setAttribute("x2", (width - marginRight).toString())
                gridLine.setAttribute("y2", yPos.toString())
                gridGroup.appendChild(gridLine)
            })
            svg.insertBefore(gridGroup, svg.firstChild)

            // Tooltip handlers
            const updateTooltipPosition = (event: MouseEvent) => {
                setTooltipPosition({ x: event.clientX, y: event.clientY })
            }

            const showTooltip = (hour: number, trips: number, spending: number) => {
                setTooltip({
                    hour: HOUR_LABELS[hour],
                    trips,
                    spending,
                })
            }
            const hideTooltip = () => { setTooltip(null); setTooltipPosition(null) }

            const bars = svg.querySelectorAll("rect[data-hour]")
            bars.forEach((bar) => {
                bar.addEventListener("mouseenter", (e) => {
                    const target = e.target as SVGElement
                    const hour = parseInt(target.getAttribute("data-hour") || "0", 10)
                    const trips = parseInt(target.getAttribute("data-trips") || "0", 10)
                    const spending = parseFloat(target.getAttribute("data-spending") || "0")
                    updateTooltipPosition(e as unknown as MouseEvent)
                    showTooltip(hour, trips, spending)
                })
                bar.addEventListener("mouseleave", hideTooltip)
                bar.addEventListener("mousemove", (e) => { updateTooltipPosition(e as unknown as MouseEvent) })
            })
        }

        renderChartRef.current = renderChart
        const shouldAnimate = !hasAnimatedRef.current
        renderChart(shouldAnimate)
        hasAnimatedRef.current = true

        const container = svg.parentElement
        let resizeObserver: ResizeObserver | null = null
        if (container && typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                if (isChartResizePaused()) return
                renderChart(false)
            })
            resizeObserver.observe(container)
        }

        return () => {
            if (resizeObserver && container) resizeObserver.unobserve(container)
        }
    }, [processedData, isDark, textColor, gridColor, axisColor, barColor, barHoverColor, mounted])

    const hasTimeData = processedData.some((entry) => entry.trips > 0 || entry.spending > 0)

    if (!mounted || isLoading) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:time-of-day-spending" chartTitle="Time of Day Shopping" size="md" />
                        <CardTitle>Time of Day Shopping</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
                        <ChartLoadingState isLoading={isLoading} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!hasTimeData) {
        return (
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <GridStackCardDragHandle />
                        <ChartFavoriteButton chartId="fridge:time-of-day-spending" chartTitle="Time of Day Shopping" size="md" />
                        <CardTitle>Time of Day Shopping</CardTitle>
                    </div>
                    <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        {renderInfoTrigger()}
                    </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                    <div className="h-full w-full min-h-[250px]">
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
                    <ChartFavoriteButton chartId="fridge:time-of-day-spending" chartTitle="Time of Day Shopping" size="md" />
                    <CardTitle>Time of Day Shopping</CardTitle>
                </div>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div ref={containerRef} className="relative w-full h-full min-h-[250px]">
                    <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }} />
                    {mounted && tooltip && tooltipPosition && createPortal(
                        <div
                            className="pointer-events-none fixed z-[9999] rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl select-none"
                            style={{
                                left: tooltipPosition.x + 12 + 180 > window.innerWidth ? tooltipPosition.x - 192 : tooltipPosition.x + 12,
                                top: tooltipPosition.y - 80 < 0 ? tooltipPosition.y + 12 : tooltipPosition.y - 80,
                            }}
                        >
                            <div className="font-medium text-foreground mb-1">{tooltip.hour}</div>
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between gap-3">
                                    <span className="text-foreground/80">Trips:</span>
                                    <span className="font-semibold text-foreground">{tooltip.trips}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-foreground/80">Spent:</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(tooltip.spending)}</span>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>
            </CardContent>
        </Card>
    )
})

ChartTimeOfDayShoppingFridge.displayName = "ChartTimeOfDayShoppingFridge"
