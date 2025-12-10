"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { ResponsiveRadar, type RadarSliceTooltipProps } from "@nivo/radar"
import { useTheme } from "next-themes"

import { ChartInfoPopover, ChartInfoPopoverCategoryControls } from "@/components/chart-info-popover"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useColorScheme } from "@/components/color-scheme-provider"
import { toNumericValue } from "@/lib/utils"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { deduplicatedFetch } from "@/lib/request-deduplication"

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
}

export function ChartRadar({ categoryControls }: ChartRadarProps) {
  const { resolvedTheme } = useTheme()
  const { getPalette } = useColorScheme()
  const [chartData, setChartData] = useState<RadarDatum[]>([])
  const [yearSummaries, setYearSummaries] = useState<FinancialHealthYearSummary[]>([])
  // Initialize loading to true since we always fetch data on mount
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleCapabilities, setVisibleCapabilities] = useState<string[]>([])
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  
  // In dark mode, use lighter colors (reverse the palette so lightest colors come first)
  const palette = useMemo(() => {
    const basePalette = getPalette()
    return resolvedTheme === "dark" ? [...basePalette].reverse() : basePalette
  }, [getPalette, resolvedTheme])

  useEffect(() => {
    let isMounted = true

    async function loadNeonData() {
      console.log("[ChartRadar] Starting data fetch...")
      setIsLoading(true)
      setError(null)
      try {
        const payload: FinancialHealthResponse = await deduplicatedFetch<FinancialHealthResponse>(
          "/api/financial-health",
          { cache: "no-store" }
        )
        if (!payload) {
          throw new Error("Unexpected response shape: payload is null or undefined")
        }
        if (!Array.isArray(payload.data)) {
          throw new Error("Unexpected response shape: payload.data is not an array")
        }
        if (!Array.isArray(payload.years)) {
          throw new Error("Unexpected response shape: payload.years is not an array")
        }
        if (isMounted) {
          console.log("[ChartRadar] Received payload:", {
            dataLength: payload.data?.length || 0,
            yearsLength: payload.years?.length || 0,
            sampleData: payload.data?.[0],
            years: payload.years
          })
          setChartData(payload.data as RadarDatum[])
          setYearSummaries(payload.years as FinancialHealthYearSummary[])
          
          // If API explicitly returns empty data/years, ensure we show appropriate message
          if (payload.data.length === 0 || payload.years.length === 0) {
            console.warn("[ChartRadar] API returned empty data or years", {
              dataLength: payload.data.length,
              yearsLength: payload.years.length
            })
            // This is a valid response indicating no data - don't set error, just empty state
            // The component will handle this in the render logic
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("[ChartRadar] Failed to load Neon data:", err)
          setError(err instanceof Error ? err.message : "Failed to load data")
          setChartData([])
          setYearSummaries([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadNeonData()

    return () => {
      isMounted = false
    }
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
    const result = Array.from(uniqueCapabilities).sort()
    // Log warning if we have data but no valid capabilities found
    if (sanitizedData.length > 0 && result.length === 0) {
      console.warn("[ChartRadar] Data exists but no valid capabilities found", {
        dataLength: sanitizedData.length,
        sampleEntry: sanitizedData[0],
        allKeys: sanitizedData.length > 0 ? Object.keys(sanitizedData[0]) : []
      })
    }
    return result
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

  // Compute default visible capabilities synchronously to avoid race conditions
  const defaultVisibleCapabilities = useMemo(() => {
    if (filterableCapabilities.length === 0) return []
    // Always include Income and Expenses if they exist, plus top spending categories
    const defaults: string[] = []
    if (filterableCapabilities.includes("Income")) {
      defaults.push("Income")
    }
    if (filterableCapabilities.includes("Expenses")) {
      defaults.push("Expenses")
    }
    // Add top spending categories (excluding Income and Expenses which are already added)
    topSpendingCategories.forEach(cat => {
      if (cat !== "Income" && cat !== "Expenses" && filterableCapabilities.includes(cat)) {
        defaults.push(cat)
      }
    })
    return defaults
  }, [filterableCapabilities, topSpendingCategories])

  // Default visible: Income + Expenses + top 7 spending categories (only on initial load)
  // Sync visibleCapabilities state with defaults when they become available
  useEffect(() => {
    if (filterableCapabilities.length === 0 || hasUserInteracted) {
      return
    }
    // Only update if defaults are available and we don't have a valid selection yet
    if (defaultVisibleCapabilities.length === 0) {
      return
    }
    setVisibleCapabilities(prev => {
      const filtered = prev.filter(cap => filterableCapabilities.includes(cap))
      // Only set default if no previous selection or if previous selection is invalid
      if (filtered.length === 0) {
        // Only update if the new value is different to prevent unnecessary re-renders
        const currentDefaults = defaultVisibleCapabilities
        if (prev.length !== currentDefaults.length || 
            !currentDefaults.every(cap => prev.includes(cap))) {
          return currentDefaults
        }
      }
      return filtered
    })
  }, [filterableCapabilities, defaultVisibleCapabilities, hasUserInteracted])

  // Use effective visible capabilities: user selection or default
  // Always prefer defaults during initialization to avoid race conditions
  const effectiveVisibleCapabilities = useMemo(() => {
    // If we have defaults and no user interaction, use defaults immediately
    // This prevents race conditions where visibleCapabilities hasn't been set yet
    if (!hasUserInteracted && defaultVisibleCapabilities.length > 0) {
      // If user has selected something, use that (filtered to valid capabilities)
      if (visibleCapabilities.length > 0) {
        const filtered = visibleCapabilities.filter(cap => filterableCapabilities.includes(cap))
        // Only use user selection if it's valid, otherwise fall back to defaults
        return filtered.length > 0 ? filtered : defaultVisibleCapabilities
      }
      // No user selection yet, use defaults
      return defaultVisibleCapabilities
    }
    // User has interacted, use their selection (filtered to valid capabilities)
    if (visibleCapabilities.length > 0) {
      const filtered = visibleCapabilities.filter(cap => filterableCapabilities.includes(cap))
      // If filtered selection is empty but we have defaults, use defaults as fallback
      if (filtered.length === 0 && defaultVisibleCapabilities.length > 0) {
        return defaultVisibleCapabilities
      }
      return filtered
    }
    // Fallback to defaults if available
    return defaultVisibleCapabilities
  }, [visibleCapabilities, defaultVisibleCapabilities, filterableCapabilities, hasUserInteracted])

  const filteredData = useMemo(() => {
    if (!sanitizedData.length) return []
    if (!effectiveVisibleCapabilities.length) return []
    // Include only the selected filterable capabilities (Income, Expenses, and spending categories)
    const capabilitiesToShow = new Set<string>(effectiveVisibleCapabilities)
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
  }, [sanitizedData, effectiveVisibleCapabilities])

  const keys = useMemo(
    () => yearSummaries.map(summary => summary.year.toString()),
    [yearSummaries]
  )

  const themeMode = resolvedTheme === "dark" ? "dark" : "light"
  const categoryTextColor = themeMode === "dark" ? DARK_CATEGORY_TEXT : LIGHT_CATEGORY_TEXT

  const radarTheme = useMemo(
    () => ({
      background: "transparent",
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
      grid: {
        line: {
          stroke: themeMode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          strokeWidth: 1,
        },
      },
    }),
    [categoryTextColor, themeMode]
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
    const allSelected = effectiveVisibleCapabilities.length === filterableCapabilities.length && 
                       filterableCapabilities.every(cap => effectiveVisibleCapabilities.includes(cap))
    if (allSelected) {
      setVisibleCapabilities([])
    } else {
      setVisibleCapabilities([...filterableCapabilities])
    }
  }

  const selectionSummary = useMemo(() => {
    const effective = effectiveVisibleCapabilities
    return effective.length === 0 || effective.length === filterableCapabilities.length
      ? "All categories"
      : effective.length === 1
        ? effective[0]
        : `${effective.length} categories`
  }, [effectiveVisibleCapabilities, filterableCapabilities.length])

  const triggerClassName =
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 w-40"

  const renderInfoTrigger = () => (
    <div className="flex flex-col items-center gap-2">
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
      <ChartAiInsightButton
        chartId="financialHealthScore"
        chartTitle="Financial Health Score"
        chartDescription="Radar chart showing financial health metrics including income, expenses, and spending categories across years."
        chartData={{
          years: yearSummaries.map(s => s.year),
          yearSummaries: yearSummaries,
          categories: effectiveVisibleCapabilities,
          categoriesCount: effectiveVisibleCapabilities.length
        }}
        size="sm"
      />
    </div>
  )

  const renderStatusCard = (message: string, isLoading?: boolean) => (
    <Card className="@container/card h-full" data-slot="card">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <ChartFavoriteButton
            chartId="financialHealthScore"
            chartTitle="Financial Health Score"
            size="md"
          />
          <CardTitle>Financial Health Score</CardTitle>
        </div>
        <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {renderInfoTrigger()}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        {isLoading ? <ChartLoadingState isLoading={true} /> : <div className="flex items-center justify-center text-muted-foreground">{message}</div>}
      </CardContent>
    </Card>
  )

  // Debug logging to understand the state (must be before any conditional returns)
  useEffect(() => {
    console.log("[ChartRadar] State update:", {
      isLoading,
      error,
      sanitizedDataLength: sanitizedData?.length || 0,
      keysLength: keys.length,
      filterableCapabilitiesLength: filterableCapabilities.length,
      effectiveVisibleCapabilitiesLength: effectiveVisibleCapabilities.length,
      filteredDataLength: filteredData.length,
      hasUserInteracted,
      defaultVisibleCapabilitiesLength: defaultVisibleCapabilities.length,
      chartDataLength: chartData?.length || 0,
      yearSummariesLength: yearSummaries?.length || 0
    })
  }, [isLoading, error, sanitizedData, keys, filterableCapabilities, effectiveVisibleCapabilities, filteredData, hasUserInteracted, defaultVisibleCapabilities, chartData, yearSummaries])

  if (isLoading) {
    return renderStatusCard("", true)
  }

  if (error) {
    return renderStatusCard(error)
  }

  // Check if we have raw data and years - if not, truly no data available
  if (!sanitizedData || sanitizedData.length === 0 || keys.length === 0) {
    // Only show "No data available" if we're not loading and there's no error
    // (error case is handled above)
    if (!isLoading && !error) {
      console.log("[ChartRadar] Showing 'No data available' - no sanitized data or keys", {
        sanitizedDataLength: sanitizedData?.length || 0,
        keysLength: keys.length,
        chartDataLength: chartData?.length || 0,
        yearSummariesLength: yearSummaries?.length || 0
      })
    }
    return renderStatusCard("No data available")
  }

  // If we have data but filteredData is empty, check if it's because capabilities haven't been initialized yet
  // This can happen during the brief moment between data loading and capability initialization
  if (filteredData.length === 0) {
    // Edge case 1: We have data and capabilities, but defaults haven't been computed yet
    // This happens when sanitizedData exists but capabilities extraction hasn't completed
    if (sanitizedData.length > 0 && filterableCapabilities.length > 0 && defaultVisibleCapabilities.length === 0) {
      // Capabilities exist but defaults not computed yet - this is a timing issue
      // Wait for next render cycle when defaults will be available
      console.log("[ChartRadar] Waiting for default capabilities to compute - showing loading", {
        filterableCapabilitiesLength: filterableCapabilities.length,
        sanitizedDataLength: sanitizedData.length
      })
      return renderStatusCard("", true)
    }
    
    // Edge case 2: We have defaults but effectiveVisibleCapabilities is still empty
    // This shouldn't happen with the fixed effectiveVisibleCapabilities logic, but guard against it
    if (sanitizedData.length > 0 && defaultVisibleCapabilities.length > 0 && effectiveVisibleCapabilities.length === 0 && !hasUserInteracted) {
      console.log("[ChartRadar] Defaults exist but not effective yet - showing loading", {
        defaultVisibleCapabilitiesLength: defaultVisibleCapabilities.length,
        effectiveVisibleCapabilitiesLength: effectiveVisibleCapabilities.length
      })
      return renderStatusCard("", true)
    }
    
    // Edge case 3: User has interacted and deselected everything, or no valid capabilities exist
    // Only show "No data available" if we're sure this is the final state
    if (hasUserInteracted && effectiveVisibleCapabilities.length === 0) {
      // User explicitly deselected everything
      console.log("[ChartRadar] User has deselected all capabilities")
      return renderStatusCard("No data available")
    }
    
    // Edge case 4: No capabilities exist at all (data structure issue)
    if (filterableCapabilities.length === 0 && sanitizedData.length > 0) {
      console.warn("[ChartRadar] Data exists but no valid capabilities found", {
        sanitizedDataLength: sanitizedData.length,
        sampleData: sanitizedData[0],
        allKeys: sanitizedData.length > 0 ? Object.keys(sanitizedData[0]) : []
      })
      return renderStatusCard("No data available")
    }
    
    // Default case: Show no data if we've exhausted all initialization checks
    // This should rarely happen with the fixes above
    console.log("[ChartRadar] Showing 'No data available' - filteredData is empty after all checks", {
      filterableCapabilitiesLength: filterableCapabilities.length,
      effectiveVisibleCapabilitiesLength: effectiveVisibleCapabilities.length,
      defaultVisibleCapabilitiesLength: defaultVisibleCapabilities.length,
      hasUserInteracted,
      sanitizedDataLength: sanitizedData.length
    })
    return renderStatusCard("No data available")
  }

  return (
    <Card className="@container/card h-full" data-slot="card">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <ChartFavoriteButton
            chartId="financialHealthScore"
            chartTitle="Financial Health Score"
            size="md"
          />
          <CardTitle>Financial Health Score</CardTitle>
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
                  {effectiveVisibleCapabilities.length === filterableCapabilities.length && 
                   filterableCapabilities.every(cap => effectiveVisibleCapabilities.includes(cap))
                    ? "Deselect all"
                    : "Select all"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto">
                  {filterableCapabilities.map(capability => {
                    const checked = effectiveVisibleCapabilities.includes(capability)
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
                  {effectiveVisibleCapabilities.length === filterableCapabilities.length
                    ? "All categories selected"
                    : `${effectiveVisibleCapabilities.length}/${filterableCapabilities.length} selected`}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 h-[250px]">
        <div className="h-full w-full [&_svg]:bg-transparent">
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
            blendMode={resolvedTheme === "dark" ? "normal" : "multiply"}
            colors={palette}
            theme={radarTheme}
            fillOpacity={0.6}
            gridLevels={5}
            gridShape="linear"
            sliceTooltip={({ index, data }: RadarSliceTooltipProps) => {
              if (!data || data.length === 0) return null

              const primary = data[0]
              const label = String(primary.id ?? index ?? "")
              const value = primary.value ?? 0
              const color = primary.color

              return (
                <div className="pointer-events-none rounded-md border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-border/50"
                      style={{ backgroundColor: color, borderColor: color }}
                    />
                    <span className="font-medium text-foreground whitespace-nowrap">
                      {label}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                    {currencyFormatter.format(value)}
                  </div>
                </div>
              )
            }}
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
        </div>
      </CardContent>
    </Card>
  )
}

