"use client"

import { useMemo, useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"
import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    const categorySet = new Set<string>()
    processedData.forEach(d => categorySet.add(d.category))
    return Array.from(categorySet).sort()
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
  const borderColor = isDark ? "#374151" : "#e5e7eb" // border color for axis lines
  const gridColor = isDark ? "#374151" : "#e5e7eb"
  const axisColor = borderColor // Use borderColor for axis lines to match Nivo

  // Render D3-style grouped bar chart
  useEffect(() => {
    if (!svgRef.current || processedData.length === 0) return

    const svg = svgRef.current
    
    const renderChart = () => {
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
        totalBar.setAttribute("y", totalYPos.toString())
        totalBar.setAttribute("width", fxBandwidth.toString())
        totalBar.setAttribute("height", "0") // Start at 0 for animation
        totalBar.setAttribute("fill", isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)")
        totalBar.setAttribute("rx", "2")
        totalBar.setAttribute("ry", "2")
        totalBar.setAttribute("stroke", isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)")
        totalBar.setAttribute("stroke-width", "1")
        totalBar.setAttribute("stroke-dasharray", "2,2")
        totalBar.style.cursor = "pointer"
        totalBar.style.pointerEvents = "all"
        totalBar.style.transition = "height 0.6s ease-out, y 0.6s ease-out"
        totalBar.style.transitionDelay = "0s"
        
        // Add tooltip data for total bar
        totalBar.setAttribute("data-day", dayNamesShort[dayIndex])
        totalBar.setAttribute("data-is-total", "true")
        totalBar.setAttribute("data-total-amount", totalAmount.toString())
        const breakdown = dayCategoryBreakdown.get(dayIndex) || []
        totalBar.setAttribute("data-breakdown", JSON.stringify(breakdown))
        
        dayGroup.appendChild(totalBar)
        
        // Animate the total bar
        setTimeout(() => {
          totalBar.setAttribute("height", totalBarHeight.toString())
          totalBar.setAttribute("y", totalYPos.toString())
        }, 10)
      }

      // Create bars for each category within this day
      dayData.forEach((d, categoryIndex) => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        const xPos = x(d.category)
        const finalYPos = y(d.amount)
        const barHeight = yHeight(d.amount)
        
        // Start animation from bottom
        rect.setAttribute("x", xPos.toString())
        rect.setAttribute("y", chartHeight.toString()) // Start at bottom
        rect.setAttribute("width", xBandwidth.toString())
        rect.setAttribute("height", "0") // Start at 0 height
        rect.setAttribute("fill", categoryColors.get(d.category) || "#8884d8")
        rect.setAttribute("rx", "2")
        rect.setAttribute("ry", "2")
        rect.style.cursor = "pointer"
        rect.style.transition = "height 0.6s ease-out, y 0.6s ease-out"
        rect.style.transitionDelay = `${categoryIndex * 0.05}s` // Stagger animation
        
        // Add tooltip data
        rect.setAttribute("data-day", dayNamesShort[dayIndex])
        rect.setAttribute("data-category", d.category)
        rect.setAttribute("data-amount", d.amount.toString())
        rect.setAttribute("data-is-total", "false")
        
        dayGroup.appendChild(rect)
        
        // Animate the bar with a slight delay for staggered effect
        setTimeout(() => {
          rect.setAttribute("height", barHeight.toString())
          rect.setAttribute("y", finalYPos.toString())
        }, 50 + categoryIndex * 30)
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

    // Add tooltip functionality (tooltip is declared outside renderChart)
    const createTooltip = () => {
      if (tooltip) return tooltip
      tooltip = document.createElement("div")
      tooltip.style.position = "absolute"
      tooltip.style.pointerEvents = "none"
      tooltip.style.backgroundColor = isDark ? "#1f2937" : "#ffffff"
      tooltip.style.border = `1px solid ${gridColor}`
      tooltip.style.borderRadius = "6px"
      tooltip.style.padding = "8px"
      tooltip.style.fontSize = "12px"
      tooltip.style.color = textColor
      tooltip.style.display = "none"
      tooltip.style.zIndex = "1000"
      document.body.appendChild(tooltip)
    }

    const showTooltip = (event: MouseEvent, day: string, category: string, amount: number, isTotal: boolean, breakdown?: Array<{ category: string; amount: number }>) => {
      if (!tooltip) createTooltip()
      if (!tooltip) return
      
      if (isTotal && breakdown) {
        // Show total with category breakdown
        const breakdownHtml = breakdown
          .sort((a, b) => b.amount - a.amount)
          .map(item => `
            <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px;">
              <span style="color: ${textColor};">${item.category}:</span>
              <span style="font-weight: 600;">$${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          `).join("")
        
        tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">${day} - Total</div>
          <div style="border-top: 1px solid ${gridColor}; padding-top: 6px; margin-bottom: 6px;">
            ${breakdownHtml}
          </div>
          <div style="border-top: 1px solid ${gridColor}; padding-top: 6px; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; gap: 12px; font-weight: 700; font-size: 13px;">
              <span>Total:</span>
              <span>$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        `
      } else {
        // Show individual category
        tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">${day}</div>
          <div style="margin-bottom: 2px;"><strong>${category}:</strong></div>
          <div>$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        `
      }
      
      tooltip.style.display = "block"
      tooltip.style.left = `${event.pageX + 10}px`
      tooltip.style.top = `${event.pageY + 10}px`
    }

    const hideTooltip = () => {
      if (tooltip) {
        tooltip.style.display = "none"
      }
    }

    // Add event listeners to bars
    const bars = svg.querySelectorAll("rect[data-day]")
    bars.forEach((bar) => {
      bar.addEventListener("mouseenter", (e) => {
        const target = e.target as SVGElement
        const day = target.getAttribute("data-day") || ""
        const isTotal = target.getAttribute("data-is-total") === "true"
        
        if (isTotal) {
          const totalAmount = parseFloat(target.getAttribute("data-total-amount") || "0")
          const breakdownStr = target.getAttribute("data-breakdown") || "[]"
          let breakdown: Array<{ category: string; amount: number }> = []
          try {
            breakdown = JSON.parse(breakdownStr)
          } catch (e) {
            // Ignore parse errors
          }
          showTooltip(e as unknown as MouseEvent, day, "", totalAmount, true, breakdown)
        } else {
          const category = target.getAttribute("data-category") || ""
          const amount = parseFloat(target.getAttribute("data-amount") || "0")
          showTooltip(e as unknown as MouseEvent, day, category, amount, false)
        }
      })
      bar.addEventListener("mouseleave", hideTooltip)
      bar.addEventListener("mousemove", (e) => {
        const target = e.target as SVGElement
        const day = target.getAttribute("data-day") || ""
        const isTotal = target.getAttribute("data-is-total") === "true"
        
        if (isTotal) {
          const totalAmount = parseFloat(target.getAttribute("data-total-amount") || "0")
          const breakdownStr = target.getAttribute("data-breakdown") || "[]"
          let breakdown: Array<{ category: string; amount: number }> = []
          try {
            breakdown = JSON.parse(breakdownStr)
          } catch (e) {
            // Ignore parse errors
          }
          showTooltip(e as unknown as MouseEvent, day, "", totalAmount, true, breakdown)
        } else {
          const category = target.getAttribute("data-category") || ""
          const amount = parseFloat(target.getAttribute("data-amount") || "0")
          showTooltip(e as unknown as MouseEvent, day, category, amount, false)
        }
      })
    })
    } // End of renderChart function

    // Declare tooltip outside renderChart so it persists across renders
    let tooltip: HTMLDivElement | null = null

    // Initial render
    renderChart()

    // Set up ResizeObserver to handle container size changes
    const container = svg.parentElement
    let resizeObserver: ResizeObserver | null = null

    if (container && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        renderChart()
      })
      resizeObserver.observe(container)
    }

    return () => {
      if (resizeObserver && container) {
        resizeObserver.unobserve(container)
      }
      if (tooltip && document.body.contains(tooltip)) {
        document.body.removeChild(tooltip)
      }
    }
  }, [processedData, categories, categoryColors, isDark, textColor, gridColor, axisColor, hiddenCategories])

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Day of Week Spending by Category</CardTitle>
            <CardDescription>See which categories you spend the most on each day</CardDescription>
          </div>
          <CardAction>{renderInfoTrigger()}</CardAction>
        </CardHeader>
        <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Day of Week Spending by Category</CardTitle>
          <CardDescription>See which categories you spend the most on each day</CardDescription>
        </div>
        <CardAction>{renderInfoTrigger()}</CardAction>
      </CardHeader>
      <CardContent className="h-[420px] p-0 flex flex-col">
        <div className="w-full flex-1 min-h-0">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          />
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

