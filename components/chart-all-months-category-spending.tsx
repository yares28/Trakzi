"use client"

import { useMemo, useEffect, useRef, useCallback, useState } from "react"
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
import { deduplicatedFetch } from "@/lib/request-deduplication"
interface ChartAllMonthsCategorySpendingProps {
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

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function ChartAllMonthsCategorySpending({ data = [], categoryControls: propCategoryControls }: ChartAllMonthsCategorySpendingProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const palette = getPalette().filter((color) => color !== "#c3c3c3")
  const svgRef = useRef<SVGSVGElement>(null)
  const [actualMonthTotals, setActualMonthTotals] = useState<Map<number, number>>(new Map())
  // Small card size: always full width within its grid column
  const cardWidthClass = "w-full"

  const normalizeCategoryName = useCallback((value?: string | null) => {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
  }, [])

  // Extract hidden categories from prop category controls
  const hiddenCategories = useMemo(() => {
    return propCategoryControls?.hiddenCategories || []
  }, [propCategoryControls?.hiddenCategories])

  // Create a Set for efficient lookup
  const hiddenCategorySet = useMemo(() => {
    return new Set(hiddenCategories.map((cat) => normalizeCategoryName(cat)))
  }, [hiddenCategories, normalizeCategoryName])

  // Fetch actual month totals from database (unfiltered) for accurate tooltip display
  useEffect(() => {
    const fetchActualTotals = async () => {
      try {
        // Calculate totals for all 12 months using batch API call
        const totals = new Map<number, number>()
        monthNames.forEach((_, monthIndex) => {
          totals.set(monthIndex, 0)
        })

        // Use batch API to fetch all 12 months in a single request
        const allMonths = Array.from({ length: 12 }, (_, i) => i + 1).join(',')
        try {
          const result = await deduplicatedFetch<{ data: Record<number, Array<{ category: string; month: number; total: number }>>; availableMonths: number[] }>(
            `/api/analytics/monthly-category-duplicate?months=${allMonths}`
          )
          
          // Result is now an object with month numbers as keys
          if (result.data && typeof result.data === 'object') {
            Object.entries(result.data).forEach(([monthStr, monthData]: [string, any]) => {
              const monthNum = parseInt(monthStr, 10) - 1 // Convert 1-12 to 0-11
              if (!isNaN(monthNum) && Array.isArray(monthData)) {
                const monthTotal = monthData.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0)
                totals.set(monthNum, monthTotal)
              }
            })
          }
        } catch (err) {
          console.warn(`[All Months Category Spending] Error fetching batch months:`, err)
        }
        
        console.log(`[All Months Category Spending] Fetched actual month totals from database:`, {
          januaryTotal: totals.get(0)?.toFixed(2) || "0.00",
          allMonths: Array.from(totals.entries()).map(([month, total]) => ({
            month: monthNamesShort[month],
            total: total.toFixed(2)
          }))
        })
        
        setActualMonthTotals(totals)
      } catch (error) {
        console.error('[All Months Category Spending] Error fetching actual totals:', error)
      }
    }

    fetchActualTotals()
  }, []) // Only fetch once on mount

  // Process data to group by month of year and category
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    // Group by month index (0-11) and category
    const grouped = new Map<number, Map<string, number>>()

    monthNames.forEach((_, monthIndex) => {
      grouped.set(monthIndex, new Map<string, number>())
    })

    let januaryTotal = 0
    const monthYearMap = new Map<string, number>() // Track totals by "month-year" for debugging
    
    data.forEach((tx) => {
      const amount = Number(tx.amount) || 0
      if (amount < 0) {
        // Parse date string directly to avoid timezone issues
        // tx.date is in format "YYYY-MM-DD", extract month directly
        let monthIndex: number
        let year: number | null = null
        if (typeof tx.date === 'string') {
          // Extract month and year from "YYYY-MM-DD" format (month is 1-12, convert to 0-11)
          const parts = tx.date.split('-')
          if (parts.length >= 3) {
            year = parseInt(parts[0], 10)
            monthIndex = parseInt(parts[1], 10) - 1 // Convert 1-12 to 0-11
          } else if (parts.length >= 2) {
            monthIndex = parseInt(parts[1], 10) - 1
          } else {
            // Fallback to Date parsing if format is unexpected - use UTC to avoid timezone issues
            const date = new Date(tx.date)
            monthIndex = date.getUTCMonth()
            year = date.getUTCFullYear()
          }
        } else {
          // For non-string dates, use UTC methods to avoid timezone shifts
          const date = new Date(tx.date)
          monthIndex = date.getUTCMonth()
          year = date.getUTCFullYear()
        }
        
        const category = normalizeCategoryName(tx.category)

        if (hiddenCategorySet.has(category)) {
          // Log when Transport category is filtered out for debugging
          if (category === 'Transport' || category.toLowerCase().includes('transport')) {
            console.warn(`[All Months Category Spending] Transport category transaction filtered out:`, {
              date: tx.date,
              amount: Math.abs(amount),
              category: tx.category,
              normalizedCategory: category
            })
          }
          return
        }

        const monthMap = grouped.get(monthIndex)
        if (monthMap) {
          const currentTotal = monthMap.get(category) || 0
          const absAmount = Math.abs(amount)
          monthMap.set(category, currentTotal + absAmount)
          if (monthIndex === 0) { // January
            januaryTotal += absAmount
            // Track by year-month for debugging
            if (year !== null) {
              const key = `Jan-${year}`
              monthYearMap.set(key, (monthYearMap.get(key) || 0) + absAmount)
            }
          }
        }
      }
    })
    
    console.log(`[All Months Category Spending] Total January spending: $${januaryTotal.toFixed(2)}`)
    console.log(`[All Months Category Spending] Total transactions processed: ${data.length}`)
    console.log(`[All Months Category Spending] Hidden categories:`, Array.from(hiddenCategorySet))
    console.log(`[All Months Category Spending] January by year:`, Array.from(monthYearMap.entries()))
    
    // Debug: Check for January 1st transactions
    const jan1Transactions = data.filter(tx => {
      const amount = Number(tx.amount) || 0
      if (amount >= 0) return false
      if (typeof tx.date === 'string') {
        return tx.date.startsWith('2025-01-01') || tx.date.startsWith('2024-01-01')
      }
      return false
    })
    if (jan1Transactions.length > 0) {
      console.log(`[All Months Category Spending] Found ${jan1Transactions.length} January 1st transactions:`, jan1Transactions.map(tx => ({
        date: tx.date,
        amount: tx.amount,
        category: tx.category
      })))
    }
    
    // Log month totals for debugging
    const monthTotals = new Map<number, number>()
    grouped.forEach((categoryMap, monthIndex) => {
      let total = 0
      categoryMap.forEach((amount) => {
        total += amount
      })
      if (total > 0) {
        monthTotals.set(monthIndex, total)
      }
    })
    console.log(`[All Months Category Spending] Month totals:`, Array.from(monthTotals.entries()).map(([month, total]) => ({
      month: monthNamesShort[month],
      total: total.toFixed(2)
    })))

    const flatData: Array<{ month: number; monthName: string; category: string; amount: number }> = []
    grouped.forEach((categoryMap, monthIndex) => {
      categoryMap.forEach((amount, category) => {
        if (amount > 0) {
          flatData.push({
            month: monthIndex,
            monthName: monthNamesShort[monthIndex],
            category,
            amount,
          })
        }
      })
    })

    return flatData
  }, [data, hiddenCategorySet, normalizeCategoryName])

  // All categories (for controls)
  const allCategories = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }
    const categorySet = new Set<string>()
    data.forEach((tx) => {
      const amount = Number(tx.amount) || 0
      if (amount < 0) {
        const category = normalizeCategoryName(tx.category)
        if (!category || category.trim() === '') {
          console.warn('[All Months Category Spending] Found empty/null category in transaction:', tx)
        }
        categorySet.add(category)
      }
    })
    const categories = Array.from(categorySet).sort()
    console.log(`[All Months Category Spending] All categories found:`, categories)
    return categories
  }, [data, normalizeCategoryName])

  // Visible categories (non-zero totals)
  const categories = useMemo(() => {
    const totals = new Map<string, number>()
    processedData.forEach((d) => {
      const currentTotal = totals.get(d.category) ?? 0
      totals.set(d.category, currentTotal + d.amount)
    })

    return Array.from(totals.entries())
      .filter(([, total]) => total > 0)
      .map(([category]) => category)
      .sort()
  }, [processedData])

  const categoryControls = useMemo(() => {
    // Use propCategoryControls if provided
    return propCategoryControls
  }, [propCategoryControls])

  const categoryColors = useMemo(() => {
    const colorMap = new Map<string, string>()
    categories.forEach((category, index) => {
      colorMap.set(category, palette[index % palette.length] || "#8884d8")
    })
    return colorMap
  }, [categories, palette])

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="All Months Category Spending"
      description="See which categories you spend the most on each month of the year (all 12 months shown)."
      details={[
        "This chart shows your spending broken down by category for each month of the year.",
        "All 12 months (January through December) are displayed side-by-side.",
        "Each month has multiple bars, one for each spending category.",
        "Only expense transactions (negative amounts) are included.",
        "The chart respects your selected time period filter.",
      ]}
      categoryControls={categoryControls}
    />
  )

  const isDark = resolvedTheme === "dark"
  const textColor = isDark ? "#9ca3af" : "#6b7280"
  const borderColor = isDark ? "#374151" : "#e5e7eb"
  const gridColor = isDark ? "#374151" : "#e5e7eb"
  const axisColor = borderColor

  // Render D3-style grouped bar chart
  useEffect(() => {
    if (!svgRef.current || processedData.length === 0) return

    const svg = svgRef.current
    
    const renderChart = () => {
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

      // Outer band: months
      const fxStep = chartWidth / monthNamesShort.length
      const fxPadding = fxStep * 0.1
      const fxBandwidth = fxStep - fxPadding * 2

      const fx = (monthIndex: number) => {
        return marginLeft + monthIndex * fxStep + fxPadding
      }

      // Inner band: categories within month
      const xStep = categories.length ? fxBandwidth / categories.length : fxBandwidth
      const xPadding = xStep * 0.05
      const xBandwidth = xStep - xPadding * 2

      const x = (category: string) => {
        const categoryIndex = categories.indexOf(category)
        return categoryIndex * xStep + xPadding
      }

      // Group data by month
      const dataByMonth = new Map<number, typeof processedData>()
      monthNamesShort.forEach((_, monthIndex) => {
        dataByMonth.set(
          monthIndex,
          processedData.filter((d) => d.month === monthIndex),
        )
      })

      const monthTotals = new Map<number, number>()
      const monthCategoryBreakdown = new Map<number, Array<{ category: string; amount: number }>>()
      dataByMonth.forEach((monthData, monthIndex) => {
        const total = monthData.reduce((sum, d) => sum + d.amount, 0)
        monthTotals.set(monthIndex, total)
        monthCategoryBreakdown.set(
          monthIndex,
          monthData.map((d) => ({ category: d.category, amount: d.amount })),
        )
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

        const visibleTotal = monthTotals.get(monthIndex) || 0
        const actualTotal = actualMonthTotals.get(monthIndex) || 0
        
        // Debug logging for January
        if (monthIndex === 0 && (visibleTotal > 0 || actualTotal > 0)) {
          console.log(`[All Months Category Spending] January totals:`, {
            visibleTotal: visibleTotal.toFixed(2),
            actualTotal: actualTotal.toFixed(2),
            difference: (actualTotal - visibleTotal).toFixed(2),
            breakdownCount: monthCategoryBreakdown.get(monthIndex)?.length || 0
          })
        }
        
        if (visibleTotal > 0 || actualTotal > 0) {
          const totalBar = document.createElementNS("http://www.w3.org/2000/svg", "rect")
          // Use visible total for bar height (visual representation)
          const totalYPos = y(visibleTotal)
          const totalBarHeight = yHeight(visibleTotal)

          totalBar.setAttribute("x", "0")
          totalBar.setAttribute("y", totalYPos.toString())
          totalBar.setAttribute("width", fxBandwidth.toString())
          totalBar.setAttribute("height", "0")
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

          totalBar.setAttribute("data-month", monthNamesShort[monthIndex])
          totalBar.setAttribute("data-is-total", "true")
          // Store actual total (including hidden categories) for tooltip
          totalBar.setAttribute("data-total-amount", actualTotal.toString())
          const breakdown = monthCategoryBreakdown.get(monthIndex) || []
          totalBar.setAttribute("data-breakdown", JSON.stringify(breakdown))
          
          // Debug: Log the attribute value being set
          if (monthIndex === 0) {
            console.log(`[All Months Category Spending] Setting data-total-amount for January: ${actualTotal.toString()}`)
          }

          monthGroup.appendChild(totalBar)

          setTimeout(() => {
            totalBar.setAttribute("height", totalBarHeight.toString())
            totalBar.setAttribute("y", totalYPos.toString())
          }, 10)
        }

        monthData.forEach((d, categoryIndex) => {
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
          const xPos = x(d.category)
          const finalYPos = y(d.amount)
          const barHeight = yHeight(d.amount)

          rect.setAttribute("x", xPos.toString())
          rect.setAttribute("y", chartHeight.toString())
          rect.setAttribute("width", xBandwidth.toString())
          rect.setAttribute("height", "0")
          rect.setAttribute("fill", categoryColors.get(d.category) || "#8884d8")
          rect.setAttribute("rx", "2")
          rect.setAttribute("ry", "2")
          rect.style.cursor = "pointer"
          rect.style.transition = "height 0.6s ease-out, y 0.6s ease-out"
          rect.style.transitionDelay = `${categoryIndex * 0.05}s`

          rect.setAttribute("data-month", monthNamesShort[monthIndex])
          rect.setAttribute("data-category", d.category)
          rect.setAttribute("data-amount", d.amount.toString())
          rect.setAttribute("data-is-total", "false")

          monthGroup.appendChild(rect)

          setTimeout(() => {
            rect.setAttribute("height", barHeight.toString())
            rect.setAttribute("y", finalYPos.toString())
          }, 50 + categoryIndex * 30)
        })

        svg.appendChild(monthGroup)
      })

      // Delimiters between months
      const delimiterGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      delimiterGroup.setAttribute("stroke", axisColor)
      delimiterGroup.setAttribute("stroke-width", "1")
      delimiterGroup.setAttribute("opacity", "0.4")

      for (let i = 0; i < monthNamesShort.length - 1; i++) {
        const delimiterLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
        const xPos = marginLeft + (i + 1) * fxStep - fxPadding
        delimiterLine.setAttribute("x1", xPos.toString())
        delimiterLine.setAttribute("y1", marginTop.toString())
        delimiterLine.setAttribute("x2", xPos.toString())
        delimiterLine.setAttribute("y2", (marginTop + chartHeight).toString())
        delimiterLine.setAttribute("stroke-dasharray", "3,3")
        delimiterGroup.appendChild(delimiterLine)
      }

      const firstMonthGroup = svg.querySelector("g[transform*='translate']")
      if (firstMonthGroup) {
        svg.insertBefore(delimiterGroup, firstMonthGroup)
      } else {
        svg.appendChild(delimiterGroup)
      }

      // X axis (months)
      const xAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      xAxisGroup.setAttribute("transform", `translate(0,${height - marginBottom})`)

      const xAxisDomainLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      xAxisDomainLine.setAttribute("x1", marginLeft.toString())
      xAxisDomainLine.setAttribute("y1", "0")
      xAxisDomainLine.setAttribute("x2", (width - marginRight).toString())
      xAxisDomainLine.setAttribute("y2", "0")
      xAxisDomainLine.setAttribute("stroke", axisColor)
      xAxisDomainLine.setAttribute("stroke-width", "1")
      xAxisGroup.appendChild(xAxisDomainLine)

      monthNamesShort.forEach((monthName, index) => {
        const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
        const xPos = fx(index) + fxBandwidth / 2
        tickLine.setAttribute("x1", xPos.toString())
        tickLine.setAttribute("y1", "0")
        tickLine.setAttribute("x2", xPos.toString())
        tickLine.setAttribute("y2", "5")
        tickLine.setAttribute("stroke", axisColor)
        tickLine.setAttribute("stroke-width", "1")
        xAxisGroup.appendChild(tickLine)

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text")
        text.setAttribute("x", xPos.toString())
        text.setAttribute("y", "20")
        text.setAttribute("text-anchor", "middle")
        text.setAttribute("fill", textColor)
        text.setAttribute("font-size", "12")
        text.setAttribute(
          "font-family",
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        )
        text.textContent = monthName
        xAxisGroup.appendChild(text)
      })
      svg.appendChild(xAxisGroup)

      // Y axis
      const yAxisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
      yAxisGroup.setAttribute("transform", `translate(${marginLeft},${marginTop})`)

      const yAxisDomainLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
      yAxisDomainLine.setAttribute("x1", "0")
      yAxisDomainLine.setAttribute("y1", "0")
      yAxisDomainLine.setAttribute("x2", "0")
      yAxisDomainLine.setAttribute("y2", chartHeight.toString())
      yAxisDomainLine.setAttribute("stroke", axisColor)
      yAxisDomainLine.setAttribute("stroke-width", "1")
      yAxisGroup.appendChild(yAxisDomainLine)

      const numTicks = 5
      for (let i = 0; i <= numTicks; i++) {
        const value = (maxAmount / numTicks) * i
        const yPos = chartHeight - (i / numTicks) * chartHeight

        const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line")
        tickLine.setAttribute("x1", "0")
        tickLine.setAttribute("y1", yPos.toString())
        tickLine.setAttribute("x2", "-5")
        tickLine.setAttribute("y2", yPos.toString())
        tickLine.setAttribute("stroke", axisColor)
        tickLine.setAttribute("stroke-width", "1")
        yAxisGroup.appendChild(tickLine)

        const tickText = document.createElementNS("http://www.w3.org/2000/svg", "text")
        tickText.setAttribute("x", "-10")
        tickText.setAttribute("y", yPos.toString())
        tickText.setAttribute("text-anchor", "end")
        tickText.setAttribute("alignment-baseline", "middle")
        tickText.setAttribute("fill", textColor)
        tickText.setAttribute("font-size", "12")
        tickText.setAttribute(
          "font-family",
          'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
        )
        tickText.textContent = `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
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

      const showTooltip = (
        event: MouseEvent,
        month: string,
        category: string,
        amount: number,
        isTotal: boolean,
        breakdown?: Array<{ category: string; amount: number }>,
      ) => {
        if (!tooltip) createTooltip()
        if (!tooltip) return

        if (isTotal && breakdown) {
          const visibleTotal = breakdown.reduce((sum, item) => sum + item.amount, 0)
          const hasHiddenCategories = Math.abs(amount - visibleTotal) > 0.01 // Account for floating point precision
          const hiddenAmount = amount - visibleTotal

          const breakdownHtml = breakdown
            .sort((a, b) => b.amount - a.amount)
            .map(
              (item) => `
            <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px;">
              <span style="color: ${textColor};">${item.category}:</span>
              <span style="font-weight: 600;">$${item.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
          `,
            )
            .join("")

          const hiddenCategoriesNote = hasHiddenCategories
            ? `
          <div style="border-top: 1px solid ${gridColor}; padding-top: 6px; margin-top: 4px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: ${textColor}; font-style: italic;">
              <span>Hidden categories:</span>
              <span>$${hiddenAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          `
            : ""

          tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 13px;">${month} - Total</div>
          <div style="border-top: 1px solid ${gridColor}; padding-top: 6px; margin-bottom: 6px;">
            ${breakdownHtml}
          </div>
          ${hiddenCategoriesNote}
          <div style="border-top: 1px solid ${gridColor}; padding-top: 6px; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; gap: 12px; font-weight: 700; font-size: 13px;">
              <span>Total:</span>
              <span>$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        `
        } else {
          tooltip.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">${month}</div>
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
      const bars = svg.querySelectorAll("rect[data-month]")
      bars.forEach((bar) => {
        bar.addEventListener("mouseenter", (e) => {
          const target = e.target as SVGElement
          const month = target.getAttribute("data-month") || ""
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
            // Debug logging
            if (month === "Jan") {
              console.log(`[All Months Category Spending] Tooltip for January:`, {
                month,
                totalAmount,
                dataAttribute: target.getAttribute("data-total-amount"),
                breakdownTotal: breakdown.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
                breakdownCount: breakdown.length
              })
            }
            showTooltip(e as unknown as MouseEvent, month, "", totalAmount, true, breakdown)
          } else {
            const category = target.getAttribute("data-category") || ""
            const amount = parseFloat(target.getAttribute("data-amount") || "0")
            showTooltip(e as unknown as MouseEvent, month, category, amount, false)
          }
        })
        bar.addEventListener("mouseleave", hideTooltip)
        bar.addEventListener("mousemove", (e) => {
          const target = e.target as SVGElement
          const month = target.getAttribute("data-month") || ""
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
            showTooltip(e as unknown as MouseEvent, month, "", totalAmount, true, breakdown)
          } else {
            const category = target.getAttribute("data-category") || ""
            const amount = parseFloat(target.getAttribute("data-amount") || "0")
            showTooltip(e as unknown as MouseEvent, month, category, amount, false)
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
  }, [processedData, categories, categoryColors, isDark, textColor, gridColor, axisColor, hiddenCategorySet, actualMonthTotals])

  if (!data || data.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <div>
            <CardTitle>All Months Category Spending</CardTitle>
            <CardDescription>See which categories you spend the most on each month (all 12 months shown)</CardDescription>
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
        <div>
          <CardTitle>All Months Category Spending</CardTitle>
          <CardDescription>See which categories you spend the most on each month (all 12 months shown)</CardDescription>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px] flex flex-col">
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

