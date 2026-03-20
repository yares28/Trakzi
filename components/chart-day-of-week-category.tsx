"use client"

import * as React from "react"
import ReactDOM from "react-dom"
import { useTheme } from "next-themes"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { DEFAULT_FALLBACK_PALETTE, getChartTextColor, CHART_GRID_COLOR } from "@/lib/chart-colors"
import { deduplicatedFetch, getCachedResponse } from "@/lib/request-deduplication"
import { ChartLoadingState } from "@/components/chart-loading-state"
import {
  useIsInsideAnalyticsProvider,
  useAnalyticsChartData,
} from "@/contexts/analytics-data-context"
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
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"

interface ChartDayOfWeekCategoryProps {
  dateFilter?: string | null
  // Optional: pass bundle data directly (for context-based rendering)
  bundleData?: Array<{ dayOfWeek: number; category: string; total: number }>
  bundleLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

type DayOfWeekData = {
  category: string
  dayOfWeek: number
  total: number
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface DayOfWeekCategoryInfoTriggerProps {
  forFullscreen?: boolean
}

const DayOfWeekCategoryInfoTrigger = React.memo(function DayOfWeekCategoryInfoTrigger({
  forFullscreen = false,
}: DayOfWeekCategoryInfoTriggerProps) {
  return (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Day of Week Category Spending"
        description="Compare spending across categories for a selected day of the week."
        details={[
          "Each bar represents total spending in a category for the selected day of the week.",
          "Only the most spent categories are shown for each day.",
          "Use the day selector to switch between different days of the week.",
        ]}
        ignoredFootnote="Only expense transactions (amount < 0) are included."
      />
      <ChartAiInsightButton
        chartId="dayOfWeekCategory"
        chartTitle="Day of Week Category Spending"
        chartDescription="Compare spending across categories for a selected day of the week."
        size="sm"
      />
    </div>
  )
})

DayOfWeekCategoryInfoTrigger.displayName = "DayOfWeekCategoryInfoTrigger"

const buildDayOfWeekUrl = (params: URLSearchParams) =>
  `/api/analytics/day-of-week-category?${params.toString()}`

export const ChartDayOfWeekCategory = React.memo(function ChartDayOfWeekCategory({
  dateFilter,
  bundleData,
  bundleLoading,
  emptyTitle,
  emptyDescription
}: ChartDayOfWeekCategoryProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const buildDayParams = React.useCallback(
    (day?: number | null) => {
      const params = new URLSearchParams()
      if (dateFilter) {
        params.append("filter", dateFilter)
      }
      if (typeof day === "number") {
        params.append("dayOfWeek", day.toString())
      }
      return params
    },
    [dateFilter],
  )
  const availableUrl = buildDayOfWeekUrl(buildDayParams())
  const cachedAvailable = getCachedResponse<{
    data: Array<{ category: string; dayOfWeek: number; total: number }>
    availableDays: number[]
  }>(availableUrl)
  const initialAvailableDays = cachedAvailable?.availableDays ?? []
  const initialSelectedDay =
    initialAvailableDays.length > 0 ? initialAvailableDays[0] : null
  const cachedSelected = initialSelectedDay !== null
    ? getCachedResponse<{
      data: Array<{ category: string; dayOfWeek: number; total: number }>
      availableDays: number[]
    }>(buildDayOfWeekUrl(buildDayParams(initialSelectedDay)))
    : undefined
  const [mounted, setMounted] = React.useState(false)
  const [data, setData] = React.useState<DayOfWeekData[]>(
    () => cachedSelected?.data ?? [],
  )
  const [availableDays, setAvailableDays] = React.useState<number[]>(
    () => initialAvailableDays,
  )
  const [selectedDay, setSelectedDay] = React.useState<number | null>(
    () => initialSelectedDay,
  )
  const [loading, setLoading] = React.useState(
    () => initialAvailableDays.length > 0 && cachedSelected === undefined,
  )
  const svgRef = React.useRef<SVGSVGElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = React.useState<{ label: string; value: number; color: string; tooltipKey: number } | null>(null)
  const [tooltipPos, setTooltipPos] = React.useState<{ x: number; y: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch available days first (without selected day) when dateFilter changes
  React.useEffect(() => {
    if (bundleLoading !== undefined) {
      if (bundleLoading) {
        setLoading(true)
        return
      }
      if (bundleData && bundleData.length > 0) {
        const days = [...new Set(bundleData.map(d => d.dayOfWeek))].sort((a, b) => a - b)
        setAvailableDays(days)
        if (days.length > 0) {
          setSelectedDay((prev) => {
            if (prev === null || !days.includes(prev)) {
              return days[0]
            }
            return prev
          })
        } else {
          setSelectedDay(null)
        }
        setLoading(false)
        return
      }
    }

    const fetchAvailableDays = async () => {
      try {
        const cached = getCachedResponse<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          availableUrl,
        )
        if (cached) {
          const days = cached.availableDays || []
          setAvailableDays(days)

          if (days.length > 0) {
            setSelectedDay((prev) => {
              if (prev === null || !days.includes(prev)) {
                return days[0]
              }
              return prev
            })
          } else {
            setSelectedDay(null)
            setLoading(false)
          }
          return
        }

        const result = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          availableUrl
        )
        const days = result.availableDays || []
        setAvailableDays(days)

        if (days.length > 0) {
          setSelectedDay((prev) => {
            if (prev === null || !days.includes(prev)) {
              return days[0]
            }
            return prev
          })
        } else {
          setSelectedDay(null)
          setLoading(false)
        }
      } catch (error) {
        setAvailableDays([])
        setSelectedDay(null)
        setLoading(false)
      }
    }

    if (mounted) {
      fetchAvailableDays()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, mounted, availableUrl, bundleData, bundleLoading])

  // Fetch data when selectedDay changes
  React.useEffect(() => {
    if (bundleLoading !== undefined) {
      if (bundleLoading) {
        return
      }
      if (bundleData && bundleData.length > 0) {
        if (selectedDay === null) {
          setData([])
        } else {
          const filtered = bundleData.filter(d => d.dayOfWeek === selectedDay)
          setData(filtered)
        }
        setLoading(false)
        return
      }
    }

    const fetchData = async () => {
      if (selectedDay === null) {
        setData([])
        setLoading(false)
        return
      }

      const dataUrl = buildDayOfWeekUrl(buildDayParams(selectedDay))
      const cached = getCachedResponse<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
        dataUrl,
      )
      if (cached) {
        setData(cached.data || [])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
          dataUrl
        )
        const fetchedData = result.data || []

        if (fetchedData.length === 0 && availableDays.length > 1) {
          for (const day of availableDays) {
            if (day === selectedDay) continue

            const altUrl = buildDayOfWeekUrl(buildDayParams(day))
            const cachedAlt = getCachedResponse<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
              altUrl,
            )
            if (cachedAlt?.data && cachedAlt.data.length > 0) {
              setSelectedDay(day)
              setData(cachedAlt.data)
              setLoading(false)
              return
            }

            const altResult = await deduplicatedFetch<{ data: Array<{ category: string; dayOfWeek: number; total: number }>; availableDays: number[] }>(
              altUrl
            )

            if (altResult.data && altResult.data.length > 0) {
              setSelectedDay(day)
              setData(altResult.data)
              setLoading(false)
              return
            }
          }
        }

        setData(fetchedData)
      } catch (error) {
        setData([])
      } finally {
        setLoading(false)
      }
    }

    if (mounted && selectedDay !== null) {
      fetchData()
    }
  }, [selectedDay, dateFilter, mounted, availableDays, buildDayParams, bundleData, bundleLoading])

  const palette = React.useMemo(() => {
    const p = getPalette()
    return p.length ? p : DEFAULT_FALLBACK_PALETTE
  }, [getPalette])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)
  const gridColor = CHART_GRID_COLOR

  // Top 10 categories sorted by total descending (data is already sorted by API)
  const topCategories = React.useMemo(() => data.slice(0, 10), [data])

  // SVG bar chart rendering + ResizeObserver
  React.useEffect(() => {
    if (!svgRef.current || topCategories.length === 0) return

    const svg = svgRef.current

    const handleSvgMouseLeave = () => {
      setTooltip(null)
      setTooltipPos(null)
    }
    svg.addEventListener("mouseleave", handleSvgMouseLeave)

    let lastWidth: number | null = null
    let lastHeight: number | null = null
    let tooltipKeyCounter = 0

    const computeTooltipPos = (event: MouseEvent) => {
      const TOOLTIP_W = 200
      const TOOLTIP_H = 70
      const OFFSET = 16
      const MARGIN = 8

      const vw = window.innerWidth
      const vh = window.innerHeight
      const cx = event.clientX
      const cy = event.clientY

      let x = cx + OFFSET
      let y = cy - OFFSET

      if (x + TOOLTIP_W + MARGIN > vw) x = cx - TOOLTIP_W - OFFSET
      if (x < MARGIN) x = MARGIN
      if (y + TOOLTIP_H + MARGIN > vh) y = cy - TOOLTIP_H - OFFSET
      if (y < MARGIN) y = MARGIN

      return { x, y }
    }

    const renderChart = (forcedWidth?: number, forcedHeight?: number) => {
      svg.innerHTML = ""

      const marginTop = 16
      const marginRight = 16
      const marginBottom = 72  // room for rotated category labels
      const marginLeft = 70

      const container = svg.parentElement
      const containerRect = container?.getBoundingClientRect()
      const width = forcedWidth ?? containerRect?.width ?? 800
      const height = forcedHeight ?? containerRect?.height ?? 250

      svg.setAttribute("width", width.toString())
      svg.setAttribute("height", height.toString())

      const chartWidth = Math.max(0, width - marginLeft - marginRight)
      const chartHeight = Math.max(0, height - marginTop - marginBottom)

      const n = topCategories.length
      const barStep = n > 0 ? chartWidth / n : chartWidth
      const barPadding = barStep * 0.15
      const barBandwidth = Math.max(1, barStep - barPadding * 2)

      const maxAmount = n > 0 ? Math.max(...topCategories.map(d => d.total)) : 0

      const xPos = (index: number) => marginLeft + index * barStep + barPadding
      const yPos = (amount: number) => {
        if (maxAmount === 0) return chartHeight + marginTop
        return marginTop + chartHeight - (amount / maxAmount) * chartHeight
      }
      const barH = (amount: number) => {
        if (maxAmount === 0) return 0
        return (amount / maxAmount) * chartHeight
      }

      // Grid lines
      const numTicks = 5
      const gridGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      gridGroup.setAttribute("stroke", gridColor)
      gridGroup.setAttribute("stroke-width", "0.5")
      gridGroup.setAttribute("stroke-dasharray", "3,3")
      gridGroup.setAttribute("opacity", "0.5")

      for (let i = 0; i <= numTicks; i++) {
        const gy = marginTop + chartHeight - (i / numTicks) * chartHeight
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.setAttribute("x1", marginLeft.toString())
        line.setAttribute("y1", gy.toString())
        line.setAttribute("x2", (marginLeft + chartWidth).toString())
        line.setAttribute("y2", gy.toString())
        gridGroup.appendChild(line)
      }
      svg.appendChild(gridGroup)

      // Bars
      topCategories.forEach((item, index) => {
        const color = palette[index % palette.length]
        const bx = xPos(index)
        const finalY = yPos(item.total)
        const bh = barH(item.total)

        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        rect.setAttribute("x", bx.toString())
        rect.setAttribute("y", (marginTop + chartHeight).toString())
        rect.setAttribute("width", barBandwidth.toString())
        rect.setAttribute("height", "0")
        rect.setAttribute("fill", color)
        rect.setAttribute("rx", "4")
        rect.setAttribute("ry", "4")
        rect.style.cursor = "pointer"
        rect.style.transition = `height 0.5s ease-out, y 0.5s ease-out`
        rect.style.transitionDelay = `${index * 0.04}s`

        svg.appendChild(rect)

        // Animate in
        setTimeout(() => {
          rect.setAttribute("height", bh.toString())
          rect.setAttribute("y", finalY.toString())
        }, 30 + index * 30)

        rect.addEventListener("mouseenter", (e) => {
          const pos = computeTooltipPos(e as MouseEvent)
          setTooltipPos(pos)
          setTooltip((prev) => {
            const newKey =
              prev && prev.label === item.category ? prev.tooltipKey : ++tooltipKeyCounter
            return { label: item.category, value: item.total, color, tooltipKey: newKey }
          })
        })
        rect.addEventListener("mousemove", (e) => {
          setTooltipPos(computeTooltipPos(e as MouseEvent))
        })
        rect.addEventListener("mouseleave", () => {
          setTooltip(null)
          setTooltipPos(null)
        })
      })

      // X axis line
      const xAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      xAxisGroup.setAttribute("transform", `translate(0,${marginTop + chartHeight})`)

      const xDomainLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      xDomainLine.setAttribute("x1", marginLeft.toString())
      xDomainLine.setAttribute("y1", "0")
      xDomainLine.setAttribute("x2", (marginLeft + chartWidth).toString())
      xDomainLine.setAttribute("y2", "0")
      xDomainLine.setAttribute("stroke", gridColor)
      xDomainLine.setAttribute("stroke-width", "1")
      xAxisGroup.appendChild(xDomainLine)

      // X axis category labels (rotated -45°)
      topCategories.forEach((item, index) => {
        const lx = xPos(index) + barBandwidth / 2
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
        text.setAttribute("x", lx.toString())
        text.setAttribute("y", "12")
        text.setAttribute("text-anchor", "end")
        text.setAttribute("fill", textColor)
        text.setAttribute("font-size", "11")
        text.setAttribute(
          "font-family",
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        )
        text.setAttribute("transform", `rotate(-40, ${lx}, 12)`)
        // Truncate long labels
        const label = item.category.length > 14 ? item.category.slice(0, 13) + "…" : item.category
        text.textContent = label
        xAxisGroup.appendChild(text)
      })
      svg.appendChild(xAxisGroup)

      // Y axis
      const yAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      yAxisGroup.setAttribute("transform", `translate(${marginLeft},${marginTop})`)

      const yDomainLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      yDomainLine.setAttribute("x1", "0")
      yDomainLine.setAttribute("y1", "0")
      yDomainLine.setAttribute("x2", "0")
      yDomainLine.setAttribute("y2", chartHeight.toString())
      yDomainLine.setAttribute("stroke", gridColor)
      yDomainLine.setAttribute("stroke-width", "1")
      yAxisGroup.appendChild(yDomainLine)

      for (let i = 0; i <= numTicks; i++) {
        const value = (maxAmount / numTicks) * i
        const gy = chartHeight - (i / numTicks) * chartHeight

        const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
        tickLine.setAttribute("x1", "0")
        tickLine.setAttribute("y1", gy.toString())
        tickLine.setAttribute("x2", "-5")
        tickLine.setAttribute("y2", gy.toString())
        tickLine.setAttribute("stroke", gridColor)
        tickLine.setAttribute("stroke-width", "1")
        yAxisGroup.appendChild(tickLine)

        const tickText = document.createElementNS("http://www.w3.org/2000/svg", "text")
        tickText.setAttribute("x", "-10")
        tickText.setAttribute("y", gy.toString())
        tickText.setAttribute("text-anchor", "end")
        tickText.setAttribute("alignment-baseline", "middle")
        tickText.setAttribute("fill", textColor)
        tickText.setAttribute("font-size", "11")
        tickText.setAttribute(
          "font-family",
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        )
        tickText.textContent = formatCurrency(value, { maximumFractionDigits: 0 })
        yAxisGroup.appendChild(tickText)
      }
      svg.appendChild(yAxisGroup)
    }

    // Initial render
    const initialContainer = svg.parentElement
    const initialRect = initialContainer?.getBoundingClientRect()
    if (typeof initialRect?.width === "number" && typeof initialRect?.height === "number") {
      lastWidth = initialRect.width
      lastHeight = initialRect.height
      renderChart(initialRect.width, initialRect.height)
    } else {
      renderChart()
    }

    // ResizeObserver for responsiveness
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
      if (resizeObserver && container) {
        resizeObserver.unobserve(container)
      }
      svg.removeEventListener("mouseleave", handleSvgMouseLeave)
    }
  }, [topCategories, palette, isDark, textColor, gridColor, formatCurrency])

  if (!mounted) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <DayOfWeekCategoryInfoTrigger />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <DayOfWeekCategoryInfoTrigger />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            isLoading
            skeletonType="bar"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
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
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <DayOfWeekCategoryInfoTrigger />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
          <ChartLoadingState
            skeletonType="bar"
            emptyTitle={emptyTitle || "No spending data"}
            emptyDescription={emptyDescription || "Import your bank statements to see spending by day of week"}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title="Day of Week Category Spending"
        description="Compare spending across categories by day"
        headerActions={<DayOfWeekCategoryInfoTrigger forFullscreen />}
      >
        <div className="h-full w-full min-h-[400px] text-center flex items-center justify-center text-muted-foreground">
          Fullscreen view - Select a day to see category spending
        </div>
      </ChartFullscreenModal>

      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="dayOfWeekCategory"
              chartTitle="Day of Week Category Spending"
              size="md"
            />
            <CardTitle>Day of Week Category Spending</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
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
            <DayOfWeekCategoryInfoTrigger />
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex flex-col">
          {topCategories.length > 0 ? (
            <div ref={containerRef} className="relative w-full flex-1 min-h-0">
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                style={{ display: "block" }}
              />
            </div>
          ) : (
            <ChartLoadingState
              skeletonType="bar"
              emptyTitle={emptyTitle || "No spending data"}
              emptyDescription={emptyDescription || "No transactions recorded for this day yet"}
            />
          )}
          {typeof document !== "undefined" && tooltip && tooltipPos && ReactDOM.createPortal(
            <div
              key={tooltip.tooltipKey}
              className="pointer-events-none fixed z-[9999] rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tooltip.color }}
                />
                <span className="font-medium text-foreground whitespace-nowrap">{tooltip.label}</span>
              </div>
              <div className="mt-1 font-mono text-[0.7rem] text-foreground/80 pl-4">
                {formatCurrency(tooltip.value)}
              </div>
            </div>,
            document.body
          )}
        </CardContent>
      </Card>
    </>
  )
})

ChartDayOfWeekCategory.displayName = "ChartDayOfWeekCategory"
