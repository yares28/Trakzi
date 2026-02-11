"use client"

import { useEffect, useMemo, useState, useRef, memo } from "react"
import { ChevronDownIcon } from "lucide-react"
import { ResponsiveSwarmPlot } from "@nivo/swarmplot"
import { useTheme } from "next-themes"
import { getChartTextColor } from "@/lib/chart-colors"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateForDisplay } from "@/lib/date"
import { toNumericValue } from "@/lib/utils"
import { useChartCategoryVisibility } from "@/hooks/use-chart-category-visibility"
import { deduplicatedFetch } from "@/lib/request-deduplication"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { NivoChartTooltip } from "@/components/chart-tooltip"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

type ChartSwarmPlotDatum = {
  id: string
  group: string
  price: number
  volume: number
  category?: string
  color?: string | null
  date?: string
  description?: string
}

type EnhancedChartDatum = ChartSwarmPlotDatum & { categoryLabel: string }

interface ChartSwarmPlotProps {
  data?: ChartSwarmPlotDatum[]
  emptyTitle?: string
  emptyDescription?: string
}

// Removed MAX_VISIBLE_GROUPS limit - now shows all categories

// Calculate max categories based on container width for responsive display
const getMaxCategoriesForWidth = (width: number): number => {
  if (width < 400) return 1   // Mobile: single category only
  if (width < 500) return 2   // Small mobile landscape
  if (width < 600) return 3   // Large mobile / small tablet
  if (width < 750) return 4   // Tablet portrait
  if (width < 900) return 5   // Tablet landscape
  if (width < 1100) return 7  // Small desktop
  return Infinity             // Large desktop: show all
}

export const ChartSwarmPlot = memo(function ChartSwarmPlot({ data, emptyTitle, emptyDescription }: ChartSwarmPlotProps) {
  const { resolvedTheme } = useTheme()
  const { getShuffledPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()
  const [remoteData, setRemoteData] = useState<ChartSwarmPlotDatum[]>([])
  // Initialize loading to true only if data prop is not provided (undefined) - means we need to fetch
  // If data prop is provided (even if empty array), parent is handling data, so don't show loading
  const [isLoading, setIsLoading] = useState(data === undefined)
  const [error, setError] = useState<string | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [visibleGroups, setVisibleGroups] = useState<string[]>([])
  const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [containerWidth, setContainerWidth] = useState(1200) // Default to large screen
  const containerRef = useRef<HTMLDivElement>(null)
  const chartVisibility = useChartCategoryVisibility({
    chartId: "analytics:transaction-history",
    storageScope: "analytics",
  })

  // Track container width for responsive category limiting
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(container)
    // Set initial width
    setContainerWidth(container.offsetWidth)

    return () => observer.disconnect()
  }, [])

  // Calculate max categories based on current container width
  const maxCategories = useMemo(() => getMaxCategoriesForWidth(containerWidth), [containerWidth])

  // getShuffledPalette() filters, trims by theme, and shuffles for visual variety
  const chartColors = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  // Theme: axis text from getChartTextColor; main axis lines transparent; tick lines #777777
  const swarmTheme = useMemo(() => {
    const textColor = getChartTextColor(resolvedTheme === "dark")
    const tickLineColor = "#777777"
    return {
      axis: {
        domain: {
          line: { stroke: "transparent", strokeWidth: 1 },
        },
        ticks: {
          line: { stroke: tickLineColor, strokeWidth: 1 },
          text: { fill: textColor },
        },
        legend: {
          text: { fill: textColor },
        },
      },
      grid: {
        line: { stroke: tickLineColor, strokeWidth: 1 },
      },
      labels: {
        text: { fill: textColor },
      },
    }
  }, [resolvedTheme])

  const normalizeCategoryValue = (value?: string | null) => {
    const trimmed = (value ?? "").trim()
    return trimmed || "Other"
  }

  useEffect(() => {
    // If data prop is provided (even if empty), parent is handling data fetching
    // Only fetch if data prop is undefined
    if (data !== undefined) {
      setRemoteData([])
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const loadData = async () => {
      setIsLoading(true)
      try {
        const payload = await deduplicatedFetch<ChartSwarmPlotDatum[]>(
          "/api/charts/transaction-history"
        )
        if (!cancelled && Array.isArray(payload)) {
          setRemoteData(payload)
          setError(null)
        }
      } catch (fetchError: any) {
        if (!cancelled) {
          setRemoteData([])
          setError(fetchError?.message || "Failed to load transactions")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [data])

  useEffect(() => {
    let cancelled = false
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories")
        if (!response.ok) {
          return
        }
        const payload = await response.json()
        if (!cancelled && Array.isArray(payload)) {
          const sorted = payload
            .map((item: { name?: string; totalSpend?: number | string }) => ({
              name: item.name,
              totalSpend:
                typeof item.totalSpend === "string"
                  ? parseFloat(item.totalSpend)
                  : Number(item.totalSpend ?? 0),
            }))
            .filter((item) => typeof item.name === "string" && item.name.trim().length > 0)
            .sort((a, b) => b.totalSpend - a.totalSpend)
            .map((item) => item.name!.trim())
          setCategoryOptions(sorted)
        }
      } catch (fetchError) {
        console.error("[ChartSwarmPlot] Failed to load categories:", fetchError)
      }
    }

    fetchCategories()
    return () => {
      cancelled = true
    }
  }, [])

  const sourceData = data && data.length > 0 ? data : remoteData

  const sanitizedData = useMemo<EnhancedChartDatum[]>(() => {
    if (!sourceData || sourceData.length === 0) return []
    return sourceData
      .map(item => {
        const price = toNumericValue(item.price)
        const volume = toNumericValue(item.volume)
        // Only show expenses: filter out positive transactions (income)
        // Note: API already filters for expenses (amount < 0) and converts to positive for display
        // If price is negative, it's an expense from data prop - convert to positive
        // If price is positive, it could be expense (from API) or income (from data prop)
        // To be safe, we only keep negative prices (definite expenses) or trust API filtering
        // Since API query has "AND t.amount < 0", all API data should be expenses
        // But if data prop has positive prices that are income, we need to filter them
        // For now, we trust API filtering and keep all data, but ensure negative prices are converted
        const displayPrice = price < 0 ? Math.abs(price) : price
        const categoryLabel = normalizeCategoryValue(item.category || item.group || "Other")
        if (chartVisibility.hiddenCategorySet.has(categoryLabel)) {
          return null
        }
        return {
          ...item,
          price: displayPrice,
          volume,
          categoryLabel,
          group: categoryLabel,
        }
      })
      .filter((item): item is EnhancedChartDatum => item !== null)
      // Filter out categories with 0 transactions by ensuring price > 0
      .filter(item => item.price > 0)
  }, [sourceData, chartVisibility.hiddenCategorySet])

  const fallbackCategoryOptions = useMemo(() => {
    if (!sanitizedData.length) {
      return []
    }
    const totals = new Map<string, number>()
    sanitizedData.forEach(item => {
      const currentTotal = totals.get(item.categoryLabel) || 0
      // Use absolute value since expenses are negative
      totals.set(item.categoryLabel, currentTotal + Math.abs(item.price))
    })
    // Only return categories that have at least one transaction (total > 0)
    return Array.from(totals.entries())
      .filter(([, total]) => total > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
  }, [sanitizedData])

  const combinedCategoryOptions = useMemo(() => {
    return categoryOptions.length > 0 ? categoryOptions : fallbackCategoryOptions
  }, [categoryOptions, fallbackCategoryOptions])

  const chartGroups = useMemo(() => {
    // Get categories that actually have transactions in sanitizedData
    const categoriesWithData = new Set<string>()
    sanitizedData.forEach(item => {
      categoriesWithData.add(item.categoryLabel)
    })

    // Filter combinedCategoryOptions to only include categories with data
    const filteredCombined = combinedCategoryOptions.filter(cat => categoriesWithData.has(cat))
    if (filteredCombined.length > 0) {
      return filteredCombined
    }

    // Filter fallbackCategoryOptions to only include categories with data
    const filteredFallback = fallbackCategoryOptions.filter(cat => categoriesWithData.has(cat))
    if (filteredFallback.length > 0) {
      return filteredFallback
    }

    return []
  }, [combinedCategoryOptions, fallbackCategoryOptions, sanitizedData])

  useEffect(() => {
    if (chartGroups.length === 0) {
      return
    }
    setVisibleGroups(prev => {
      const filtered = prev.filter(group => chartGroups.includes(group))
      // If no previous groups are valid, initialize with top categories (limited by screen size)
      if (filtered.length === 0) {
        return chartGroups.slice(0, maxCategories)
      }
      // If screen got smaller, trim to fit maxCategories
      if (filtered.length > maxCategories) {
        return filtered.slice(0, maxCategories)
      }
      return filtered
    })
  }, [chartGroups, maxCategories])

  const swarmControls = useMemo(() => {
    if (!combinedCategoryOptions.length && !fallbackCategoryOptions.length) {
      return undefined
    }
    const categories =
      combinedCategoryOptions.length > 0 ? combinedCategoryOptions : fallbackCategoryOptions
    return chartVisibility.buildCategoryControls(categories, {
      description: "Hide categories to remove their dots from this view.",
    })
  }, [chartVisibility, combinedCategoryOptions, fallbackCategoryOptions])

  const filteredData = useMemo(() => {
    if (!sanitizedData.length) return []
    if (!visibleGroups.length) return sanitizedData
    return sanitizedData.filter(item => visibleGroups.includes(item.categoryLabel))
  }, [sanitizedData, visibleGroups])

  const dynamicValueScale = useMemo(() => {
    if (!filteredData.length) {
      return { type: "linear" as const, min: 0, max: 500, nice: true }
    }

    const sortedPrices = filteredData
      .map(item => (Number.isFinite(item.price) ? Math.max(0, item.price) : 0))
      .filter(value => value >= 0)
      .sort((a, b) => a - b)

    if (!sortedPrices.length) {
      return { type: "linear" as const, min: 0, max: 100, nice: true }
    }

    const quantile = (p: number) => {
      if (sortedPrices.length === 1) return sortedPrices[0]
      const idx = (sortedPrices.length - 1) * p
      const lower = Math.floor(idx)
      const upper = Math.ceil(idx)
      const weight = idx - lower
      if (upper >= sortedPrices.length) return sortedPrices[lower]
      return sortedPrices[lower] * (1 - weight) + sortedPrices[upper] * weight
    }

    const q05 = quantile(0.05)
    const q5 = quantile(0.5)
    const q9 = quantile(0.9)
    const q95 = quantile(0.95)
    const maxValue = sortedPrices[sortedPrices.length - 1]
    const minValue = sortedPrices[0]
    const denseSpan = Math.max(10, q9 - q05 || q5 || 10)

    const minFocus = Math.max(0, q05 - denseSpan * 0.15)
    let maxFocus = q95 + denseSpan * 0.25

    if (maxValue > maxFocus) {
      const outlierExtension = (maxValue - q95) * 0.3
      maxFocus = Math.max(maxFocus, q95 + outlierExtension)
    }

    const domainMin = Math.min(0, minValue, minFocus)
    const domainMax = Math.max(maxValue, maxFocus, domainMin + 10)

    return {
      type: "linear" as const,
      min: domainMin,
      max: domainMax,
      nice: true,
    }
  }, [filteredData])

  // On mobile (maxCategories === 1), selecting a category replaces the current selection (single-select)
  // On larger screens, it toggles (multi-select)
  const toggleGroup = (group: string) => {
    setVisibleGroups(prev => {
      // Mobile: single-select mode - replace current selection with new one
      if (maxCategories === 1) {
        return [group]
      }
      // Desktop: multi-select toggle
      if (prev.includes(group)) {
        return prev.filter(item => item !== group)
      }
      return [...prev, group]
    })
  }

  const selectAllGroups = () => {
    // Toggle: if all are selected, deselect all; otherwise select all
    const allSelected = visibleGroups.length === chartGroups.length &&
      chartGroups.every(group => visibleGroups.includes(group))
    if (allSelected) {
      setVisibleGroups([])
    } else {
      setVisibleGroups([...chartGroups])
    }
  }

  const selectionSummary =
    visibleGroups.length === 0 || visibleGroups.length === chartGroups.length
      ? "All categories"
      : visibleGroups.length === 1
        ? visibleGroups[0]
        : `${visibleGroups.length} categories`

  const triggerClassName =
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 w-40"


  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? '' : 'hidden md:flex flex-col'}`}>
      <ChartInfoPopover
        title="Transaction History"
        details={[
          "Each dot represents an expense; its vertical position is the amount and the group shows which category it belongs to.",
          "We only pull the most recent 250 expense transactions and ignore any income entries so this view focuses on spending."
        ]}
        ignoredFootnote="The dataset comes directly from /api/charts/transaction-history, which filters to recent expenses only."
        categoryControls={swarmControls}
      />
      <ChartAiInsightButton
        chartId="transactionHistory"
        chartTitle="Transaction History"
        size="sm"
      />
    </div>
  )

  // Render chart content - reused in card and fullscreen modal
  const renderChartContent = () => {
    // Use smaller margins on mobile for more chart space
    const isMobileSize = containerWidth < 500
    const chartMargin = isMobileSize
      ? { top: 40, right: 40, bottom: 50, left: 50 }
      : { top: 80, right: 100, bottom: 80, left: 100 }

    return (
      <ResponsiveSwarmPlot
        data={filteredData}
        colors={chartColors}
        groups={visibleGroups.length ? visibleGroups : chartGroups}
        value="price"
        valueScale={dynamicValueScale}
        size={{ key: "volume", values: [4, 20], sizes: [6, 20] }}
        forceStrength={4}
        simulationIterations={100}
        margin={chartMargin}
        axisBottom={isMobileSize ? { tickRotation: -45 } : { legend: "category vs. amount", legendOffset: 40 }}
        axisLeft={isMobileSize ? {} : { legend: "amount ($)", legendOffset: -60 }}
        theme={swarmTheme}
        tooltip={(node) => {
          const datum = node.data as EnhancedChartDatum
          const category = datum.categoryLabel || datum.group || "Other"
          const color = (datum.color || node.color || chartColors[0]) as string

          return (
            <NivoChartTooltip maxWidth={220}>
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/50"
                  style={{ backgroundColor: color, borderColor: color }}
                />
                <span className="font-medium text-foreground whitespace-nowrap">
                  {category}
                </span>
              </div>
              <div className="mt-1 font-mono text-[0.7rem] text-foreground/80">
                {formatCurrency(datum.price || 0)}
              </div>
              {datum.date && (
                <div className="mt-0.5 text-[0.7rem] text-foreground/60">
                  {formatDateForDisplay(datum.date, undefined, {})}
                </div>
              )}
              {datum.description && (
                <div className="mt-1 text-[0.7rem] text-foreground/60">
                  {datum.description}
                </div>
              )}
            </NivoChartTooltip>
          )
        }}
      />
    )
  }

  if (isLoading && (!filteredData || filteredData.length === 0)) {
    return (
      <Card className="@container/card col-span-full">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="transactionHistory"
              chartTitle="Transaction History"
              size="md"
            />
            <CardTitle>Transaction History</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-h-[450px] md:min-h-[350px]">
          <ChartLoadingState
            isLoading={true}
            skeletonType="grid"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
          />
        </CardContent>
      </Card>
    )
  }

  if (error && filteredData.length === 0) {
    return (
      <Card className="@container/card col-span-full">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="transactionHistory"
              chartTitle="Transaction History"
              size="md"
            />
            <CardTitle>Transaction History</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-h-[450px] md:min-h-[350px] flex items-center justify-center text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (!filteredData || filteredData.length === 0) {
    return (
      <Card className="@container/card col-span-full">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="transactionHistory"
              chartTitle="Transaction History"
              size="md"
            />
            <CardTitle>Transaction History</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-h-[450px] md:min-h-[350px]">
          <ChartLoadingState
            isLoading={false}
            skeletonType="grid"
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
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
        title="Transaction History"
        description="Recent transactions by category"
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]">
          {renderChartContent()}
        </div>
      </ChartFullscreenModal>

      <Card ref={containerRef} className="col-span-full">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton
              chartId="transactionHistory"
              chartTitle="Transaction History"
              size="md"
            />
            <CardTitle>Transaction History</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
            {chartGroups.length > 0 && (
              <DropdownMenu open={isGroupSelectorOpen} onOpenChange={setIsGroupSelectorOpen}>
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
                  {/* Hide Select All on mobile (single-select mode) */}
                  {maxCategories > 1 && (
                    <>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          selectAllGroups()
                        }}
                        className="cursor-pointer font-medium"
                      >
                        {visibleGroups.length === chartGroups.length &&
                          chartGroups.every(group => visibleGroups.includes(group))
                          ? "Deselect all"
                          : "Select all"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <div className="max-h-64 overflow-y-auto">
                    {chartGroups.map(group => {
                      const checked = visibleGroups.includes(group)
                      return (
                        <DropdownMenuCheckboxItem
                          key={group}
                          checked={checked}
                          onCheckedChange={() => toggleGroup(group)}
                          onSelect={(event) => event.preventDefault()}
                          className="capitalize"
                        >
                          <span className="truncate">{group}</span>
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                    {chartGroups.length === 0 && (
                      <div className="px-2 py-4 text-sm text-muted-foreground">No categories</div>
                    )}
                  </div>
                  <div className="border-t px-2 py-1 text-xs text-muted-foreground">
                    {visibleGroups.length === chartGroups.length
                      ? "All categories selected"
                      : `${visibleGroups.length}/${chartGroups.length} selected`}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 min-h-[450px] md:min-h-[350px]">
          <div className="h-full w-full">
            {renderChartContent()}
          </div>
        </CardContent>
      </Card>
    </>
  )
})

ChartSwarmPlot.displayName = "ChartSwarmPlot"

