"use client"

// Time of Day Shopping Chart for Fridge - Shows when you tend to go grocery shopping
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

interface ChartTimeOfDayShoppingFridgeProps {
    receiptTransactions?: ReceiptTransactionRow[]
    isLoading?: boolean
}

// Mock data for time of day shopping - will be replaced with real data when DB fetches hour info
const MOCK_TIME_DATA: { hour: number; trips: number; spending: number }[] = [
    { hour: 6, trips: 2, spending: 45.50 },
    { hour: 7, trips: 5, spending: 112.30 },
    { hour: 8, trips: 8, spending: 185.20 },
    { hour: 9, trips: 12, spending: 298.75 },
    { hour: 10, trips: 18, spending: 456.80 },
    { hour: 11, trips: 22, spending: 587.40 },
    { hour: 12, trips: 15, spending: 376.50 },
    { hour: 13, trips: 10, spending: 245.80 },
    { hour: 14, trips: 8, spending: 198.60 },
    { hour: 15, trips: 14, spending: 342.90 },
    { hour: 16, trips: 20, spending: 512.40 },
    { hour: 17, trips: 28, spending: 725.80 },
    { hour: 18, trips: 32, spending: 845.60 },
    { hour: 19, trips: 25, spending: 678.30 },
    { hour: 20, trips: 18, spending: 456.20 },
    { hour: 21, trips: 10, spending: 268.40 },
    { hour: 22, trips: 4, spending: 98.50 },
]

const HOUR_LABELS = [
    "12AM", "1AM", "2AM", "3AM", "4AM", "5AM",
    "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
    "12PM", "1PM", "2PM", "3PM", "4PM", "5PM",
    "6PM", "7PM", "8PM", "9PM", "10PM", "11PM"
]

export function ChartTimeOfDayShoppingFridge({ receiptTransactions = [], isLoading = false }: ChartTimeOfDayShoppingFridgeProps) {
    const { resolvedTheme } = useTheme()
    const { getPalette } = useColorScheme()
    const { formatCurrency } = useCurrency()
    const palette = useMemo(() => getPalette().filter((color) => color !== "#c3c3c3"), [getPalette])
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const tooltipElementRef = useRef<HTMLDivElement | null>(null)
    const [tooltip, setTooltip] = useState<{ hour: string; trips: number; spending: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const hasAnimatedRef = useRef(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Process data - using mock data for now since DB doesn't have hour info yet
    // In the future, this will parse receiptTime from receiptTransactions
    const processedData = useMemo(() => {
        // TODO: When database provides hour data, replace this with actual processing:
        // receiptTransactions.forEach((item) => {
        //   if (!item.receiptTime) return
        //   const hour = parseInt(item.receiptTime.split(":")[0], 10)
        //   // aggregate by hour...
        // })

        // For now, use mock data
        // Create full 24-hour array with zeros for missing hours
        const fullDayData: { hour: number; trips: number; spending: number }[] = []
        for (let h = 0; h < 24; h++) {
            const existing = MOCK_TIME_DATA.find(d => d.hour === h)
            if (existing) {
                fullDayData.push(existing)
            } else {
                fullDayData.push({ hour: h, trips: 0, spending: 0 })
            }
        }
        return fullDayData
    }, [receiptTransactions])

    const renderInfoTrigger = () => (
        <div className="flex flex-col items-center gap-2">
            <ChartInfoPopover
                title="Time of Day Shopping"
                description="See when you typically go grocery shopping throughout the day."
                details={[
                    "This chart shows your shopping trip frequency by hour of day.",
                    "Taller bars indicate more frequent shopping times.",
                    "Hover to see trip count and total spending for each hour.",
                    "Note: Currently using sample data - will show real data when available.",
                ]}
                ignoredFootnote="Data will be computed from receipt timestamps when available."
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

    const isDark = resolvedTheme === "dark"
    const textColor = isDark ? "#9ca3af" : "#6b7280"
    const gridColor = isDark ? "#e5e7eb" : "#e5e7eb"
    const axisColor = gridColor
    const barColor = palette[0] || "#0f766e"
    const barHoverColor = palette[1] || "#14b8a6"

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

            const numTicks = 5
            for (let i = 0; i <= numTicks; i++) {
                const value = Math.round((maxTrips / numTicks) * i)
                const yPos = chartHeight - (i / numTicks) * chartHeight

                const tickText = document.createElementNS("http://www.w3.org/2000/svg", "text")
                tickText.setAttribute("x", "-10")
                tickText.setAttribute("y", yPos.toString())
                tickText.setAttribute("text-anchor", "end")
                tickText.setAttribute("alignment-baseline", "middle")
                tickText.setAttribute("fill", textColor)
                tickText.setAttribute("font-size", "11")
                tickText.textContent = value.toString()
                yAxisGroup.appendChild(tickText)
            }

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

            for (let i = 1; i <= numTicks; i++) {
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
                if (!containerRef.current || !tooltipElementRef.current) return
                const container = containerRef.current
                const rect = container.getBoundingClientRect()
                const x = Math.min(Math.max(event.clientX - rect.left + 16, 8), container.clientWidth - 120)
                const y = Math.min(Math.max(event.clientY - rect.top - 16, 8), container.clientHeight - 60)
                tooltipElementRef.current.style.left = `${x}px`
                tooltipElementRef.current.style.top = `${y}px`
            }

            const showTooltip = (hour: number, trips: number, spending: number) => {
                setTooltip({
                    hour: HOUR_LABELS[hour],
                    trips,
                    spending,
                })
            }
            const hideTooltip = () => { setTooltip(null) }

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
    }, [processedData, isDark, textColor, gridColor, axisColor, barColor, barHoverColor, mounted])

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

    return (
        <Card className="@container/card">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GridStackCardDragHandle />
                    <ChartFavoriteButton chartId="fridge:time-of-day-spending" chartTitle="Time of Day Shopping" size="md" />
                    <CardTitle>Time of Day Shopping</CardTitle>
                </div>
                <CardDescription>See when you typically go grocery shopping</CardDescription>
                <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                    {renderInfoTrigger()}
                </CardAction>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex-1 min-h-0">
                <div ref={containerRef} className="relative w-full h-full min-h-[250px]">
                    <svg ref={svgRef} width="100%" height="100%" preserveAspectRatio="none" style={{ display: "block" }} />
                    {tooltip && (
                        <div
                            ref={tooltipElementRef}
                            className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
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
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
