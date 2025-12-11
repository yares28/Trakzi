"use client"

import { useMemo, useEffect, useRef, useCallback, useState } from "react"
import { useTheme } from "next-themes"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"
interface ChartDayOfWeekSpendingProps {
  data?: Array<{
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
  }>
  categoryControls?: ChartInfoPopoverCategoryControls
}

// Week starts on Monday (ISO 8601 standard)
const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const dayNamesShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function ChartDayOfWeekSpending({ data = [], categoryControls: propCategoryControls }: ChartDayOfWeekSpendingProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const palette = getPalette().filter(color => color !== "#c3c3c3")
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ day: string; category: string; amount: number; isTotal: boolean; breakdown?: Array<{ category: string; amount: number }>; color?: string } | null>(null)
  const tooltipElementRef = useRef<HTMLDivElement | null>(null)
  const hasAnimatedRef = useRef(false)
  // Small card size: always full width within its grid column
  const cardWidthClass = "w-full"
  
  const normalizeCategoryName = useCallback((value?: string | null) => {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
  }, [])

  const chartVisibility = useChartCategoryVisibility({
    chartId: "analytics:day-of-week-spending",
    storageScope: "analytics",
    normalizeCategory: normalizeCategoryName,
  })

  const { hiddenCategorySet, buildCategoryControls, hiddenCategories } = chartVisibility

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
      <ChartInfoPopover
        title="Day of Week Spending by Category"
        description="See which categories you spend the most on each day of the week."
        details={[
          "This chart shows your spending broken down by category for each day of the week.",
          "Each day has multiple bars, one for each spending category.",
          "Only expense transactions (negative amounts) are included.",
          "The chart respects your selected time period filter."
        ]}
        categoryControls={categoryControls}
      />
      <ChartAiInsightButton
        chartId="dayOfWeekCategory"
        chartTitle="Day of Week Spending by Category"
        chartDescription="See which categories you spend the most on each day of the week."
        size="sm"
      />
    </div>
  )

  // Process data to group by day of week and category
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    // Group by day of week and category
    const grouped = new Map<number, Map<string, number>>()
    
    // Initialize all days
    dayNames.forEach((_, dayIndex) => {
      grouped.set(dayIndex, new Map<string, number>())
    })

    // Sum expenses by day of week and category
    data.forEach((tx) => {
      const amount = Number(tx.amount) || 0
      // Only include expenses (negative amounts)
      if (amount < 0) {
        const date = new Date(tx.date)
        // Convert to Monday-based week (0 = Monday, 6 = Sunday)
        // JavaScript's getDay() returns 0 = Sunday, 6 = Saturday
        // We want 0 = Monday, so we shift: (getDay() + 6) % 7
        const dayOfWeek = (date.getDay() + 6) % 7 // 0 = Monday, 6 = Sunday
        const category = normalizeCategoryName(tx.category)
        
        // Filter out hidden categories
        if (hiddenCategories.includes(category)) {
          return
        }
        
        const dayMap = grouped.get(dayOfWeek)
        if (dayMap) {
          const currentTotal = dayMap.get(category) || 0
          dayMap.set(category, currentTotal + Math.abs(amount))
        }
      }
    })

    // Convert to flat array format: [{ day: 0, category: "Groceries", amount: 100 }, ...]
    const flatData: Array<{ day: number; dayName: string; category: string; amount: number }> = []
    grouped.forEach((categoryMap, dayIndex) => {
      categoryMap.forEach((amount, category) => {
        if (amount > 0) {
          flatData.push({
            day: dayIndex,
            dayName: dayNamesShort[dayIndex],
            category,
            amount,
          })
        }
      })
    })

    return flatData
  }, [data, hiddenCategories, normalizeCategoryName])

  // Get all unique categories (including hidden ones for the controls)
  const allCategories = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }
    const categorySet = new Set<string>()
    data.forEach((tx) => {
      const amount = Number(tx.amount) || 0
      if (amount < 0) {
        const category = normalizeCategoryName(tx.category)
        categorySet.add(category)
      }
    })
    return Array.from(categorySet).sort()
  }, [data, normalizeCategoryName])

  // Get visible categories (for rendering)
  const categories = useMemo(() => {
    // Compute total amount per category across all days
    const totals = new Map<string, number>()
    processedData.forEach((d) => {
      const currentTotal = totals.get(d.category) ?? 0
      totals.set(d.category, currentTotal + d.amount)
    })

    // Only include categories that have a non-zero total so we don't
    // render legend entries or bar groups for categories that are 0
    return Array.from(totals.entries())
      .filter(([, total]) => total > 0)
      .map(([category]) => category)
      .sort()
  }, [processedData])

  // Build category controls - always build internally to ensure they stay in sync with hiddenCategories
  const categoryControls = useMemo(() => {
    // Use prop controls if provided, but prefer building internally to ensure freshness
    // The prop might be stale if hiddenCategories changed
    return buildCategoryControls(allCategories)
  }, [buildCategoryControls, allCategories, hiddenCategories])

  // Create color scale for categories
  const categoryColors = useMemo(() => {
    const colorMap = new Map<string, string>()
    categories.forEach((category, index) => {
      colorMap.set(category, palette[index % palette.length] || "#8884d8")
    })
    return colorMap
  }, [categories, palette])

  const isDark = resolvedTheme === "dark"
  // Match Nivo chart axis styling
  const textColor = isDark ? "#9ca3af" : "#6b7280" // muted-foreground
  const borderColor = isDark ? "#e5e7eb" : "#e5e7eb" // border color for axis lines
  const gridColor = isDark ? "#e5e7eb" : "#e5e7eb"
  const axisColor = borderColor // Use borderColor for axis lines to match Nivo

  // Render D3-style grouped bar chart
  useEffect(() => {
    if (!svgRef.current || processedData.length === 0) return

    const svg = svgRef.current

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "chart-day-of-week-spending.tsx:renderChart:entry",
        message: "renderChart entry",
        data: {
          processedDataLength: processedData.length,
          categoriesLength: categories.length,
          animateParamReceived: undefined,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const renderChart = (animate: boolean = false) => {
      // Clear previous content
      svg.innerHTML = ""

      // Chart dimensions
      const marginTop = 20
      const marginRight = 20
      const marginBottom = 40
      const marginLeft = 60
      
      // Get actual dimensions from the SVG element's container
      const container = svg.parentElement
      const containerRect = container?.getBoundingClientRect()
      const width = containerRect?.width || svg.clientWidth || 800
      const height = containerRect?.height || svg.clientHeight || 400
      
      // Ensure SVG has explicit dimensions
      svg.setAttribute("width", width.toString())
      svg.setAttribute("height", height.toString())
      
      const chartWidth = Math.max(0, width - marginLeft - marginRight)
      const chartHeight = Math.max(0, height - marginTop - marginBottom)

    // Create scales (D3-style band scales)
    // fx encodes the day of week (outer grouping)
    const fxStep = chartWidth / dayNamesShort.length
    const fxPadding = fxStep * 0.1 // 10% padding
    const fxBandwidth = fxStep - fxPadding * 2
    
    const fx = (dayIndex: number) => {
      return marginLeft + dayIndex * fxStep + fxPadding
    }

    // x encodes the category within each day (inner grouping)
    const xStep = fxBandwidth / categories.length
    const xPadding = xStep * 0.05 // 5% padding between categories
    const xBandwidth = xStep - xPadding * 2
    
    const x = (category: string) => {
      const categoryIndex = categories.indexOf(category)
      return categoryIndex * xStep + xPadding
    }

    // Group data by day first to calculate totals
    const dataByDay = new Map<number, typeof processedData>()
    dayNamesShort.forEach((_, dayIndex) => {
      dataByDay.set(dayIndex, processedData.filter(d => d.day === dayIndex))
    })

    // Calculate totals per day for the transparent overlay
    const dayTotals = new Map<number, number>()
    const dayCategoryBreakdown = new Map<number, Array<{ category: string; amount: number }>>()
    dataByDay.forEach((dayData, dayIndex) => {
      const total = dayData.reduce((sum, d) => sum + d.amount, 0)
      dayTotals.set(dayIndex, total)
      dayCategoryBreakdown.set(dayIndex, dayData.map(d => ({ category: d.category, amount: d.amount })))
    })

    // y encodes the amount - use max of individual amounts or totals, whichever is higher
    const maxIndividual = processedData.length > 0 ? Math.max(...processedData.map(d => d.amount), 0) : 0
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

    // Create groups for each day (like D3's nested groups)
    dataByDay.forEach((dayData, dayIndex) => {
      const dayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      dayGroup.setAttribute("transform", `translate(${fx(dayIndex)},${marginTop})`)

      // Add transparent total bar behind category bars
      const totalAmount = dayTotals.get(dayIndex) || 0
      if (totalAmount > 0) {
        const totalBar = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        const totalYPos = y(totalAmount)
        const totalBarHeight = yHeight(totalAmount)
        
        totalBar.setAttribute("x", "0")
        totalBar.setAttribute("width", fxBandwidth.toString())
        // If we're animating, start from height 0 and grow; otherwise draw at final size immediately
        if (animate) {
          totalBar.setAttribute("y", chartHeight.toString())
          totalBar.setAttribute("height", "0")
        } else {
          totalBar.setAttribute("y", totalYPos.toString())
          totalBar.setAttribute("height", totalBarHeight.toString())
        }
        totalBar.setAttribute("fill", isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)")
        totalBar.setAttribute("rx", "2")
        totalBar.setAttribute("ry", "2")
        totalBar.setAttribute("stroke", isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)")
        totalBar.setAttribute("stroke-width", "1")
        totalBar.setAttribute("stroke-dasharray", "2,2")
        totalBar.style.cursor = "pointer"
        totalBar.style.pointerEvents = "all"
        if (animate) {
          totalBar.style.transition = "height 0.6s ease-out, y 0.6s ease-out"
          totalBar.style.transitionDelay = "0s"
        }
        
        // Add tooltip data for total bar
        totalBar.setAttribute("data-day", dayNamesShort[dayIndex])
        totalBar.setAttribute("data-is-total", "true")
        totalBar.setAttribute("data-total-amount", totalAmount.toString())
        const breakdown = dayCategoryBreakdown.get(dayIndex) || []
        totalBar.setAttribute("data-breakdown", JSON.stringify(breakdown))
        
        dayGroup.appendChild(totalBar)
        
        // Animate the total bar only on the initial render to avoid re-running
        // the animation when React re-renders due to tooltip or other UI state.
        if (animate) {
          setTimeout(() => {
            totalBar.setAttribute("height", totalBarHeight.toString())
            totalBar.setAttribute("y", totalYPos.toString())
          }, 10)
        }
      }

      // Create bars for each category within this day
      dayData.forEach((d, categoryIndex) => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        const xPos = x(d.category)
        const finalYPos = y(d.amount)
        const barHeight = yHeight(d.amount)
        
        rect.setAttribute("x", xPos.toString())
        rect.setAttribute("width", xBandwidth.toString())

        if (animate) {
          // Start animation from bottom
          rect.setAttribute("y", chartHeight.toString())
          rect.setAttribute("height", "0")
        } else {
          // Draw in final position without animation
          rect.setAttribute("y", finalYPos.toString())
          rect.setAttribute("height", barHeight.toString())
        }
        rect.setAttribute("fill", categoryColors.get(d.category) || "#8884d8")
        rect.setAttribute("rx", "2")
        rect.setAttribute("ry", "2")
        rect.style.cursor = "pointer"
        if (animate) {
          rect.style.transition = "height 0.6s ease-out, y 0.6s ease-out"
          rect.style.transitionDelay = `${categoryIndex * 0.05}s` // Stagger animation
        }
        
        // Add tooltip data
        rect.setAttribute("data-day", dayNamesShort[dayIndex])
        rect.setAttribute("data-category", d.category)
        rect.setAttribute("data-amount", d.amount.toString())
        rect.setAttribute("data-is-total", "false")
        
        dayGroup.appendChild(rect)
        
        // Animate the bar with a slight delay for staggered effect (initial render only)
        if (animate) {
          setTimeout(() => {
            rect.setAttribute("height", barHeight.toString())
            rect.setAttribute("y", finalYPos.toString())
          }, 50 + categoryIndex * 30)
        }
      })

      svg.appendChild(dayGroup)
    })

    // Add delimiters between days (vertical lines separating day groups)
    const delimiterGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
    delimiterGroup.setAttribute("stroke", axisColor)
    delimiterGroup.setAttribute("stroke-width", "1")
    delimiterGroup.setAttribute("opacity", "0.4")
    
    // Add delimiter after each day (except the last one)
    // Position at the boundary: end of day i = start of day i+1 minus padding
    for (let i = 0; i < dayNamesShort.length - 1; i++) {
      const delimiterLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      // Calculate position: end of current day group = start of next day group - padding
      const xPos = marginLeft + (i + 1) * fxStep - fxPadding
      delimiterLine.setAttribute("x1", xPos.toString())
      delimiterLine.setAttribute("y1", marginTop.toString())
      delimiterLine.setAttribute("x2", xPos.toString())
      delimiterLine.setAttribute("y2", (marginTop + chartHeight).toString())
      delimiterLine.setAttribute("stroke-dasharray", "3,3")
      delimiterGroup.appendChild(delimiterLine)
    }
    // Insert delimiters after grid but before day groups so they appear behind bars
    const firstDayGroup = svg.querySelector("g[transform*='translate']")
    if (firstDayGroup) {
      svg.insertBefore(delimiterGroup, firstDayGroup)
    } else {
      svg.appendChild(delimiterGroup)
    }

    // Add X axis (days) - match Nivo styling
    const xAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
    xAxisGroup.setAttribute("transform", `translate(0,${height - marginBottom})`)
    
    // X axis domain line (bottom line)
    const xAxisDomainLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
    xAxisDomainLine.setAttribute("x1", marginLeft.toString())
    xAxisDomainLine.setAttribute("y1", "0")
    xAxisDomainLine.setAttribute("x2", (width - marginRight).toString())
    xAxisDomainLine.setAttribute("y2", "0")
    xAxisDomainLine.setAttribute("stroke", axisColor)
    xAxisDomainLine.setAttribute("stroke-width", "1")
    xAxisGroup.appendChild(xAxisDomainLine)

    dayNamesShort.forEach((dayName, index) => {
      // Tick line
      const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      const xPos = fx(index) + fxBandwidth / 2
      tickLine.setAttribute("x1", xPos.toString())
      tickLine.setAttribute("y1", "0")
      tickLine.setAttribute("x2", xPos.toString())
      tickLine.setAttribute("y2", "5")
      tickLine.setAttribute("stroke", axisColor)
      tickLine.setAttribute("stroke-width", "1")
      xAxisGroup.appendChild(tickLine)
      
      // Tick label
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
      text.setAttribute("x", xPos.toString())
      text.setAttribute("y", "20")
      text.setAttribute("text-anchor", "middle")
      text.setAttribute("fill", textColor)
      text.setAttribute("font-size", "12")
      text.setAttribute("font-family", 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"')
      text.textContent = dayName
      xAxisGroup.appendChild(text)
    })
    svg.appendChild(xAxisGroup)

    // Add Y axis (amount) - match Nivo styling
    const yAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
    yAxisGroup.setAttribute("transform", `translate(${marginLeft},${marginTop})`)

    // Y axis domain line (left line)
    const yAxisDomainLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
    yAxisDomainLine.setAttribute("x1", "0")
    yAxisDomainLine.setAttribute("y1", "0")
    yAxisDomainLine.setAttribute("x2", "0")
    yAxisDomainLine.setAttribute("y2", chartHeight.toString())
    yAxisDomainLine.setAttribute("stroke", axisColor)
    yAxisDomainLine.setAttribute("stroke-width", "1")
    yAxisGroup.appendChild(yAxisDomainLine)

    // Y axis ticks (reuse maxAmount from above)
    const numTicks = 5
    for (let i = 0; i <= numTicks; i++) {
      const value = (maxAmount / numTicks) * i
      const yPos = chartHeight - (i / numTicks) * chartHeight
      
      // Tick line
      const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      tickLine.setAttribute("x1", "0")
      tickLine.setAttribute("y1", yPos.toString())
      tickLine.setAttribute("x2", "-5")
      tickLine.setAttribute("y2", yPos.toString())
      tickLine.setAttribute("stroke", axisColor)
      tickLine.setAttribute("stroke-width", "1")
      yAxisGroup.appendChild(tickLine)
      
      // Tick label
      const tickText = document.createElementNS("http://www.w3.org/2000/svg", "text")
      tickText.setAttribute("x", "-10")
      tickText.setAttribute("y", yPos.toString())
      tickText.setAttribute("text-anchor", "end")
      tickText.setAttribute("alignment-baseline", "middle")
      tickText.setAttribute("fill", textColor)
      tickText.setAttribute("font-size", "12")
      tickText.setAttribute("font-family", 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"')
      tickText.textContent = `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      yAxisGroup.appendChild(tickText)
    }
    svg.appendChild(yAxisGroup)

    // Add grid lines - match Nivo styling (strokeWidth 0.5)
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

    // Tooltip helpers: keep content updates and position updates separate and
    // move the tooltip DOM directly for very cheap mouse-move handling.
    const updateTooltipPosition = (event: MouseEvent) => {
      if (!containerRef.current || !tooltipElementRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const rawX = event.clientX - rect.left
      const rawY = event.clientY - rect.top

      const maxWidth = container.clientWidth || 800
      const maxHeight = container.clientHeight || 250

      const x = Math.min(Math.max(rawX + 16, 8), maxWidth - 8)
      const y = Math.min(Math.max(rawY - 16, 8), maxHeight - 8)

      const el = tooltipElementRef.current
      el.style.left = `${x}px`
      el.style.top = `${y}px`
    }

    const showTooltip = (
      day: string,
      category: string,
      amount: number,
      isTotal: boolean,
      breakdown?: Array<{ category: string; amount: number }>,
      color?: string,
    ) => {
      setTooltip((prev) => {
        // Avoid re-setting identical tooltip content to prevent unnecessary renders.
        if (
          prev &&
          prev.day === day &&
          prev.category === category &&
          prev.amount === amount &&
          prev.isTotal === isTotal &&
          prev.color === color
        ) {
          return prev
        }
        return {
          day,
          category,
          amount,
          isTotal,
          breakdown,
          color,
        }
      })
    }

    const hideTooltip = () => {
      setTooltip(null)
    }

    // Add event listeners to bars
    const bars = svg.querySelectorAll("rect[data-day]")
    bars.forEach((bar) => {
      bar.addEventListener("mouseenter", (e) => {
        const target = e.target as SVGElement
        const day = target.getAttribute("data-day") || ""
        const isTotal = target.getAttribute("data-is-total") === "true"

        // On initial hover, set both content and position.
        updateTooltipPosition(e as unknown as MouseEvent)

        if (isTotal) {
          const totalAmount = parseFloat(target.getAttribute("data-total-amount") || "0")
          const breakdownStr = target.getAttribute("data-breakdown") || "[]"
          let breakdown: Array<{ category: string; amount: number }> = []
          try {
            breakdown = JSON.parse(breakdownStr)
          } catch (e) {
            // Ignore parse errors
          }
          showTooltip(day, "", totalAmount, true, breakdown)
        } else {
          const category = target.getAttribute("data-category") || ""
          const amount = parseFloat(target.getAttribute("data-amount") || "0")
          const color = target.getAttribute("fill") || undefined
          showTooltip(day, category, amount, false, undefined, color)
        }
      })
      bar.addEventListener("mouseleave", hideTooltip)
      bar.addEventListener("mousemove", (e) => {
        const target = e.target as SVGElement
        const isTotal = target.getAttribute("data-is-total") === "true"

        // On mouse move, only update the tooltip position to keep it responsive
        // without re-running all the content work.
        updateTooltipPosition(e as unknown as MouseEvent)
      })
    })
    } // End of renderChart function

    // Decide whether to animate this render.
    // We animate only the first time (or when new data appears), and then
    // render subsequent updates without animation so that hover/state
    // changes don't cause the entire chart to "replay" its entrance.
    const shouldAnimate = !hasAnimatedRef.current
    renderChart(shouldAnimate)
    hasAnimatedRef.current = true

    // Set up ResizeObserver to handle container size changes
    const container = svg.parentElement
    let resizeObserver: ResizeObserver | null = null

    if (container && typeof ResizeObserver !== "undefined") {
      // #region agent log
      fetch("http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "pre-fix",
          hypothesisId: "H5",
          location: "chart-day-of-week-spending.tsx:resizeObserver:setup",
          message: "ResizeObserver set up",
          data: {
            containerWidth: container.clientWidth,
            containerHeight: container.clientHeight,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      resizeObserver = new ResizeObserver(() => {
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "pre-fix",
            hypothesisId: "H4",
            location: "chart-day-of-week-spending.tsx:resizeObserver:render",
            message: "ResizeObserver triggering renderChart",
            data: {
              animateParamPassed: false,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        renderChart(false)
      })
      resizeObserver.observe(container)
    }

    return () => {
      if (resizeObserver && container) {
        resizeObserver.unobserve(container)
      }
    }
  }, [processedData, categories, categoryColors, isDark, textColor, gridColor, axisColor, hiddenCategories])

  if (!data || data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartFavoriteButton
              chartId="dayOfWeekSpending"
              chartTitle="Day of Week Spending by Category"
              size="md"
            />
            <CardTitle>Day of Week Spending by Category</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ChartFavoriteButton
            chartId="dayOfWeekSpending"
            chartTitle="Day of Week Spending by Category"
            size="md"
          />
          <CardTitle>Day of Week Spending by Category</CardTitle>
        </div>
        <CardDescription>See which categories you spend the most on each day</CardDescription>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex flex-col">
        <div ref={containerRef} className="relative w-full flex-1 min-h-0">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          />
          {tooltip && (
            <div
              ref={tooltipElementRef}
              className="pointer-events-none absolute z-10 rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg"
            >
              {tooltip.isTotal && tooltip.breakdown ? (
                <>
                  <div className="font-medium mb-2 text-foreground">{tooltip.day} - Total</div>
                  <div className="border-t border-border/60 pt-1.5 mb-1.5">
                    {tooltip.breakdown
                      .sort((a, b) => b.amount - a.amount)
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between gap-3 mb-1">
                          <span className="text-foreground/80">{item.category}:</span>
                          <span className="font-semibold text-foreground">
                            ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="border-t border-border/60 pt-1.5 mt-1">
                    <div className="flex justify-between gap-3 font-bold text-foreground">
                      <span>Total:</span>
                      <span>${tooltip.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    {tooltip.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-border/50"
                        style={{ backgroundColor: tooltip.color, borderColor: tooltip.color }}
                      />
                    )}
                    <span className="font-medium text-foreground">{tooltip.day}</span>
                  </div>
                  <div className="text-foreground/80 mb-0.5">{tooltip.category}:</div>
                  <div className="font-mono text-[0.7rem] text-foreground/80">
                    ${tooltip.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {categories.length > 0 && (
          <div className="px-4 pb-4 pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
            {categories.slice(0, 10).map((category) => (
              <div key={category} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: categoryColors.get(category) || "#8884d8",
                  }}
                />
                <span className="text-muted-foreground">{category}</span>
              </div>
            ))}
            {categories.length > 10 && (
              <span className="text-muted-foreground">+{categories.length - 10} more</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

