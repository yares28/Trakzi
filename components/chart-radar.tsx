"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDownIcon, Maximize2Icon, Minimize2Icon } from "lucide-react"
import { ResponsiveRadar } from "@nivo/radar"
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"

const LIGHT_CATEGORY_TEXT = "oklch(0.556 0 0)"
const DARK_CATEGORY_TEXT = "oklch(0.708 0 0)"

type RadarDatum = Record<string, string | number>

type FinancialHealthYearSummary = {
  year: number
  income: number
  expenses: number
  savings: number
}

type FinancialHealthResponse = {
  data: RadarDatum[]
  years: FinancialHealthYearSummary[]
}

interface ChartRadarProps {
  categoryControls?: ChartInfoPopoverCategoryControls
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function ChartRadar({ categoryControls, isExpanded = false, onToggleExpand }: ChartRadarProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [chartData, setChartData] = useState<RadarDatum[]>([])
  const [yearSummaries, setYearSummaries] = useState<FinancialHealthYearSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleCapabilities, setVisibleCapabilities] = useState<string[]>([])
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const palette = getPalette()

  useEffect(() => {
    const controller = new AbortController()

    async function loadNeonData() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/financial-health", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error("Failed to load financial data")
        }
        const payload: FinancialHealthResponse = await response.json()
        if (!payload || !Array.isArray(payload.data)) {
          throw new Error("Unexpected response shape")
        }
        if (!controller.signal.aborted) {
          setChartData(payload.data as RadarDatum[])
          setYearSummaries(
            Array.isArray(payload.years)
              ? (payload.years as FinancialHealthYearSummary[])
              : []
          )
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error("[ChartRadar] Failed to load Neon data:", err)
        setError(err instanceof Error ? err.message : "Failed to load data")
        setChartData([])
        setYearSummaries([])
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadNeonData()

    return () => controller.abort()
  }, [])

  const sanitizedData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    return chartData.map(entry => {
      const sanitized: RadarDatum = {}
      Object.entries(entry).forEach(([key, value]) => {
        sanitized[key] = key === "capability" ? String(value ?? "") : toNumericValue(value)
      })
      return sanitized
    })
  }, [chartData])

  const capabilities = useMemo(() => {
    if (!sanitizedData || sanitizedData.length === 0) return []
    const uniqueCapabilities = new Set<string>()
    sanitizedData.forEach(entry => {
      const capability = entry.capability
      if (typeof capability === "string" && capability.trim()) {
        uniqueCapabilities.add(capability)
      }
    })
    return Array.from(uniqueCapabilities).sort()
  }, [sanitizedData])

  // All capabilities are filterable (Income, Expenses, and spending categories)
  const filterableCapabilities = useMemo(() => {
    return capabilities
  }, [capabilities])

  // Calculate top 7 spending categories by total expense across all years
  const topSpendingCategories = useMemo(() => {
    if (!sanitizedData.length) return []
    
    // Calculate total expense per category (sum across all years)
    // Exclude Income and Expenses from top categories (they're always available)
    const categoryTotals = new Map<string, number>()
    sanitizedData.forEach(entry => {
      const capability = entry.capability
      if (typeof capability === "string" && capability !== "Income" && capability !== "Expenses") {
        let total = 0
        Object.entries(entry).forEach(([key, value]) => {
          if (key !== "capability") {
            total += toNumericValue(value)
          }
        })
        categoryTotals.set(capability, (categoryTotals.get(capability) || 0) + total)
      }
    })

    // Sort by total expense and take top 7
    return Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([category]) => category)
  }, [sanitizedData])

  // Default visible: Income + Expenses + top 7 spending categories (only on initial load)
  useEffect(() => {
    if (filterableCapabilities.length === 0 || hasUserInteracted) {
      return
    }
    setVisibleCapabilities(prev => {
      const filtered = prev.filter(cap => filterableCapabilities.includes(cap))
      // Only set default if no previous selection or if previous selection is invalid
      if (filtered.length === 0) {
        const defaultVisible = ["Income", "Expenses", ...topSpendingCategories].filter(cap => 
          filterableCapabilities.includes(cap)
        )
        return defaultVisible
      }
      return filtered
    })
  }, [filterableCapabilities, topSpendingCategories, hasUserInteracted])

  const filteredData = useMemo(() => {
    if (!sanitizedData.length) return []
    if (!visibleCapabilities.length) return []
    // Include only the selected filterable capabilities (Income, Expenses, and spending categories)
    const capabilitiesToShow = new Set<string>(visibleCapabilities)
    // Filter to only show entries for selected capabilities and ensure uniqueness
    const seenCapabilities = new Set<string>()
    return sanitizedData.filter(entry => {
      const capability = entry.capability
      if (typeof capability !== "string") return false
      if (!capabilitiesToShow.has(capability)) return false
      // Ensure each capability appears only once (keep first occurrence)
      if (seenCapabilities.has(capability)) return false
      seenCapabilities.add(capability)
      return true
    })
  }, [sanitizedData, visibleCapabilities])

  const keys = useMemo(
    () => yearSummaries.map(summary => summary.year.toString()),
    [yearSummaries]
  )

  const themeMode = resolvedTheme === "dark" ? "dark" : "light"
  const categoryTextColor = themeMode === "dark" ? DARK_CATEGORY_TEXT : LIGHT_CATEGORY_TEXT

  const radarTheme = useMemo(
    () => ({
      textColor: categoryTextColor,
      axis: {
        ticks: {
          text: {
            fill: categoryTextColor,
          },
        },
        legend: {
          text: {
            fill: categoryTextColor,
          },
        },
      },
      legends: {
        text: {
          fill: categoryTextColor,
        },
      },
      labels: {
        text: {
          fill: categoryTextColor,
        },
      },
    }),
    [categoryTextColor]
  )

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  )

  const legendEntries = yearSummaries.map((summary, index) => {
    const color = palette[index % palette.length] || palette[0] || "#94a3b8"
    return {
      id: summary.year.toString(),
      label: summary.year.toString(),
      color,
    }
  })

  const toggleCapability = (capability: string) => {
    setHasUserInteracted(true)
    setVisibleCapabilities(prev => {
      if (prev.includes(capability)) {
        return prev.filter(item => item !== capability)
      }
      return [...prev, capability]
    })
  }

  const selectAllCapabilities = () => {
    setHasUserInteracted(true)
    const allSelected = visibleCapabilities.length === filterableCapabilities.length && 
                       filterableCapabilities.every(cap => visibleCapabilities.includes(cap))
    if (allSelected) {
      setVisibleCapabilities([])
    } else {
      setVisibleCapabilities([...filterableCapabilities])
    }
  }

  const selectionSummary =
    visibleCapabilities.length === 0 || visibleCapabilities.length === filterableCapabilities.length
      ? "All categories"
      : visibleCapabilities.length === 1
        ? visibleCapabilities[0]
        : `${visibleCapabilities.length} categories`

  const triggerClassName =
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 w-40"

  const renderInfoTrigger = () => (
    <ChartInfoPopover
      title="Financial Health Score"
      description="Assessment of your financial wellness"
      details={[
        "The radar compares income, expenses, and your top spending categories year over year.",
        "By default, Income, Expenses, and the top 7 spending categories are shown. You can toggle any category using the filter."
      ]}
      ignoredFootnote="We surface at most three years of history."
      categoryControls={categoryControls}
    />
  )

  const renderStatusCard = (message: string) => (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Assessment of your financial wellness</CardDescription>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
          {onToggleExpand && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="ml-auto"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
            >
              {isExpanded ? (
                <Minimize2Icon className="h-4 w-4" />
              ) : (
                <Maximize2Icon className="h-4 w-4" />
              )}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="h-[420px] flex items-center justify-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return renderStatusCard("Loading Neon data…")
  }

  if (error) {
    return renderStatusCard(error)
  }

  if (!sanitizedData || sanitizedData.length === 0 || keys.length === 0) {
    return renderStatusCard("No data available")
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Assessment of your financial wellness</CardDescription>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
          {filterableCapabilities.length > 0 && (
            <DropdownMenu open={isCategorySelectorOpen} onOpenChange={setIsCategorySelectorOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={triggerClassName}
                  aria-label="Select categories to display"
                >
                  <span className="truncate">{selectionSummary}</span>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56"
              >
                <p className="px-2 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                  Select categories to display
                </p>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    selectAllCapabilities()
                  }}
                  className="cursor-pointer font-medium"
                >
                  {visibleCapabilities.length === filterableCapabilities.length && 
                   filterableCapabilities.every(cap => visibleCapabilities.includes(cap))
                    ? "Deselect all"
                    : "Select all"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto">
                  {filterableCapabilities.map(capability => {
                    const checked = visibleCapabilities.includes(capability)
                    return (
                      <DropdownMenuCheckboxItem
                        key={capability}
                        checked={checked}
                        onCheckedChange={() => toggleCapability(capability)}
                        onSelect={(event) => event.preventDefault()}
                        className="capitalize"
                      >
                        <span className="truncate">{capability}</span>
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                  {filterableCapabilities.length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground">No categories</div>
                  )}
                </div>
                <div className="border-t px-2 py-1 text-xs text-muted-foreground">
                  {visibleCapabilities.length === filterableCapabilities.length
                    ? "All categories selected"
                    : `${visibleCapabilities.length}/${filterableCapabilities.length} selected`}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onToggleExpand && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="ml-auto"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Shrink chart" : "Expand chart"}
            >
              {isExpanded ? (
                <Minimize2Icon className="h-4 w-4" />
              ) : (
                <Maximize2Icon className="h-4 w-4" />
              )}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveRadar
          key={`radar-${filteredData.map(d => String(d.capability)).sort().join('-')}`}
          data={filteredData}
          keys={keys}
          indexBy="capability"
          margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
          gridLabelOffset={36}
          dotSize={10}
          dotColor={{ theme: "background" }}
          dotBorderWidth={2}
          blendMode="multiply"
          colors={palette}
          theme={radarTheme}
          legends={legendEntries.length ? [
            {
              anchor: "top-left",
              direction: "column",
              translateX: -50,
              translateY: -40,
              itemWidth: 240,
              itemHeight: 18,
              symbolShape: "circle",
              symbolSize: 12,
              symbolBorderColor: "currentColor",
              data: legendEntries,
            },
          ] : []}
        />
      </CardContent>
    </Card>
  )
}

