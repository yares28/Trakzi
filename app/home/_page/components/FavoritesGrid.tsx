import { memo, useCallback, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { IconCircleCheck } from "@tabler/icons-react"
import { ChevronDownIcon } from "lucide-react"
import { SortableGridItem, SortableGridProvider } from "@/components/sortable-grid"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartTreeMap } from "@/components/chart-treemap"
import { ChartNeedsWantsPie } from "@/components/chart-needs-wants-pie"
import { ChartPolarBar } from "@/components/chart-polar-bar"
import { ChartCategoryBubble } from "@/components/chart-category-bubble"
import { ChartRadar } from "@/components/chart-radar"
import { ChartDayOfWeekCategory } from "@/components/chart-day-of-week-category"
import { ChartDayOfWeekSpending } from "@/components/chart-day-of-week-spending"
import { ChartAllMonthsCategorySpending } from "@/components/chart-all-months-category-spending"
import { ChartSingleMonthCategorySpending } from "@/components/chart-single-month-category-spending"
import { ChartSwarmPlot } from "@/components/chart-swarm-plot"
import { ChartSpendingStreamgraph } from "@/components/chart-spending-streamgraph"
import { ChartSankey } from "@/components/chart-sankey"
import { ChartTransactionCalendar } from "@/components/chart-transaction-calendar"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { useCurrency } from "@/components/currency-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { useDemoMode } from "@/lib/demo/demo-context"
import { getSuggestedDemoRingLimit } from "../utils/categories"
import { CollapsedChartCard } from "@/components/collapsed-chart-card"

import { DEFAULT_FAVORITE_SIZES } from "../constants"
import type { FavoriteChartSize } from "../types"
import { normalizeCategoryName } from "../utils/categories"
import type { HomeChartData } from "../hooks/useHomeChartData"
import { SpendingActivityRings } from "./SpendingActivityRings"

const FAVORITE_CHART_TITLES: Record<string, string> = {
  incomeExpensesTracking1: "Income & Expenses",
  incomeExpensesTracking2: "Income & Expenses (Alt)",
  spendingCategoryRankings: "Category Flow",
  moneyFlow: "Spending Funnel",
  cashFlowSankey: "Cash Flow Sankey",
  expenseBreakdown: "Expense Breakdown",
  netWorthAllocation: "Net Worth Allocation",
  needsWantsBreakdown: "Needs vs Wants",
  categoryBubbleMap: "Category Bubble Map",
  householdSpendMix: "Household Spend Mix",
  spendingStreamgraph: "Spending Streamgraph",
  transactionHistory: "Transaction History",
  dailyTransactionActivity: "Transaction Calendar",
  dayOfWeekSpending: "Day of Week Spending",
  allMonthsCategorySpending: "All Months Category Spending",
  singleMonthCategorySpending: "Single Month Category Spending",
  dayOfWeekCategory: "Day of Week Category",
  spendingActivityRings: "Spending Activity Rings",
  financialHealthScore: "Financial Health Score",
}

type FavoritesGridProps = {
  favorites: Set<string>
  favoritesOrder: string[]
  savedFavoriteSizes: Record<string, FavoriteChartSize>
  onOrderChange: (order: string[]) => void
  onResize: (chartId: string, w: number, h: number) => void
  chartData: HomeChartData
  dateFilter: string | null
  isLoading?: boolean
}

const RingLimitsPopoverContent = memo(function RingLimitsPopoverContent({
  selectedCategories,
  categoryOptions,
  values,
  onCategoryChange,
  onLimitChange,
  onSave,
  onCancel,
}: {
  selectedCategories: string[]
  categoryOptions: string[]
  values: Record<string, string>
  onCategoryChange: (idx: number, category: string) => void
  onLimitChange: (category: string, value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const { symbol } = useCurrency()

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground">
        Choose ring categories and limits
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {selectedCategories.map((category, idx) => (
          <div
            key={`${category}-${idx}`}
            className="grid grid-cols-[1fr_auto] items-center gap-2"
          >
            <select
              className="h-8 min-w-0 rounded-md border bg-background px-2 text-xs text-foreground"
              value={category}
              onChange={(event) => onCategoryChange(idx, event.target.value)}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {symbol}
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="h-8 w-24 rounded-md border bg-background pl-5 pr-2 text-right text-sm text-foreground"
                value={values[category] ?? ""}
                onChange={(event) => onLimitChange(category, event.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      {selectedCategories.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No categories available yet.
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          Save
        </Button>
      </div>
    </div>
  )
})
RingLimitsPopoverContent.displayName = "RingLimitsPopoverContent"

function renderFavoriteChart(
  chartId: string,
  chartData: HomeChartData,
  dateFilter: string | null,
): ReactNode {
  const {
    chartTransactions,
    incomeExpenseControls,
    categoryFlowControls,
    spendingFunnelControls,
    expensesPieControls,
    treeMapControls,
    streamgraphControls,
    sankeyControls,
    incomeExpensesChartData,
    categoryFlowChartData,
    spendingFunnelChartData,
    expensesPieChartData,
    polarBarChartData,
    spendingStreamData,
    sankeyData,
    treeMapChartData,
  } = chartData

  switch (chartId) {
    case "incomeExpensesTracking1":
    case "incomeExpensesTracking2":
      return (
        <ChartAreaInteractive
          chartId={chartId}
          categoryControls={incomeExpenseControls}
          data={incomeExpensesChartData}
        />
      )
    case "spendingCategoryRankings":
      return (
        <ChartCategoryFlow
          categoryControls={categoryFlowControls}
          data={categoryFlowChartData}
        />
      )
    case "moneyFlow":
      return (
        <ChartSpendingFunnel
          categoryControls={spendingFunnelControls}
          data={spendingFunnelChartData}
        />
      )
    case "cashFlowSankey":
      return (
        <ChartSankey
          data={sankeyData.graph}
          categoryControls={sankeyControls}
        />
      )
    case "expenseBreakdown":
      return (
        <ChartExpensesPie
          categoryControls={expensesPieControls}
          data={expensesPieChartData}
        />
      )
    case "netWorthAllocation":
      return (
        <ChartTreeMap
          categoryControls={treeMapControls}
          data={treeMapChartData}
        />
      )
    case "needsWantsBreakdown":
      return (
        <ChartNeedsWantsPie
          data={expensesPieChartData}
          categoryControls={expensesPieControls}
        />
      )
    case "categoryBubbleMap":
      return <ChartCategoryBubble data={chartTransactions} />
    case "householdSpendMix":
      return (
        <ChartPolarBar
          data={polarBarChartData.data}
          keys={polarBarChartData.keys}
          categoryControls={expensesPieControls}
        />
      )
    case "spendingStreamgraph":
      return (
        <ChartSpendingStreamgraph
          data={spendingStreamData.data}
          keys={spendingStreamData.keys}
          categoryControls={streamgraphControls}
        />
      )
    case "transactionHistory":
      return (
        <ChartSwarmPlot
          data={chartTransactions
            .map((tx, idx) => ({
              id: `tx-${tx.id || idx}`,
              group: normalizeCategoryName(tx.category),
              price: Math.abs(tx.amount),
              volume: Math.min(Math.max(Math.abs(tx.amount) / 50, 4), 20),
              category: normalizeCategoryName(tx.category),
            }))
            .filter((item) => item.price > 0)}
        />
      )
    case "dailyTransactionActivity":
      return <ChartTransactionCalendar dateFilter={dateFilter} />
    case "dayOfWeekSpending":
      return (
        <ChartDayOfWeekSpending
          data={chartTransactions}
          categoryControls={expensesPieControls}
        />
      )
    case "allMonthsCategorySpending":
      return (
        <ChartAllMonthsCategorySpending
          data={chartTransactions}
          categoryControls={expensesPieControls}
        />
      )
    case "singleMonthCategorySpending":
      return <ChartSingleMonthCategorySpending dateFilter={dateFilter} />
    case "dayOfWeekCategory":
      return <ChartDayOfWeekCategory dateFilter={dateFilter} />
    default:
      return null
  }
}

/**
 * FavoritesGrid - Memoized grid of favorite charts
 *
 * This component is wrapped in React.memo to prevent re-renders when the sidebar
 * toggles. Without memoization, React's reconciliation would cause all charts
 * to re-render during the CSS animation, causing frame drops.
 */
export const FavoritesGrid = memo(function FavoritesGrid({
  favorites,
  favoritesOrder,
  savedFavoriteSizes,
  onOrderChange,
  onResize,
  chartData,
  dateFilter,
  isLoading = false,
}: FavoritesGridProps) {
  const router = useRouter()
  const { isDemoMode } = useDemoMode()
  const limitsTriggerClassName =
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 w-40"
  const [isRingLimitsPopoverOpen, setIsRingLimitsPopoverOpen] = useState(false)
  const [ringCategoryDrafts, setRingCategoryDrafts] = useState<string[]>([])
  const [ringLimitDrafts, setRingLimitDrafts] = useState<Record<string, string>>({})

  const {
    chartTransactions,
    incomeExpenseControls,
    categoryFlowControls,
    spendingFunnelControls,
    expensesPieControls,
    treeMapControls,
    streamgraphControls,
    sankeyControls,
    incomeExpensesChartData,
    categoryFlowChartData,
    spendingFunnelChartData,
    expensesPieChartData,
    polarBarChartData,
    spendingStreamData,
    sankeyData,
    treeMapChartData,
    activityData,
    activityConfig,
    activityTheme,
    ringLimits,
    setRingLimits,
    ringCategories,
    setRingCategories,
    allExpenseCategories,
    getDefaultRingLimit,
  } = chartData

  const displayedRingCategories = Array.from(
    new Set(
      activityData.map((item) => {
        const category =
          (item as { category?: string }).category ??
          (item.label ?? "Other")
        return category
      })
    )
  )

  const availableRingCategories = Array.from(
    new Set([...allExpenseCategories, ...displayedRingCategories, ...ringCategories])
  )

  const getSuggestedDemoLimit = useCallback((category: string) => {
    if (!isDemoMode) return null

    const matchingRing = activityData.find((item) => {
      const itemCategory =
        (item as { category?: string }).category ??
        (item.label ?? "Other")
      return itemCategory === category
    })

    const spent = typeof (matchingRing as { spent?: number } | undefined)?.spent === "number"
      ? (matchingRing as { spent?: number }).spent ?? 0
      : 0

    if (spent <= 0) return null

    return getSuggestedDemoRingLimit(spent)
  }, [activityData, isDemoMode])

  const getResolvedLimit = useCallback((category: string) => {
    const storedLimit = ringLimits[category]
    return typeof storedLimit === "number" && storedLimit > 0
      ? storedLimit
      : (getSuggestedDemoLimit(category) ?? getDefaultRingLimit(dateFilter, isDemoMode))
  }, [dateFilter, getDefaultRingLimit, getSuggestedDemoLimit, isDemoMode, ringLimits])

  const buildRingEditDrafts = useCallback(() => {
    const desiredCount = ringCategories.length > 0
      ? ringCategories.length
      : Math.min(5, Math.max(displayedRingCategories.length, availableRingCategories.length))

    if (desiredCount <= 0) {
      setRingCategoryDrafts([])
      setRingLimitDrafts({})
      return
    }

    const seed = ringCategories.length > 0
      ? [...ringCategories]
      : displayedRingCategories.length > 0
        ? [...displayedRingCategories]
        : availableRingCategories.slice(0, desiredCount)

    while (seed.length < desiredCount) {
      const nextOption = availableRingCategories.find((category) => !seed.includes(category))
      if (!nextOption) break
      seed.push(nextOption)
    }

    const nextCategories = seed.slice(0, desiredCount)
    setRingCategoryDrafts(nextCategories)

    const next: Record<string, string> = {}
    nextCategories.forEach((category) => {
      next[category] = Math.round(getResolvedLimit(category)).toString()
    })
    setRingLimitDrafts(next)
  }, [availableRingCategories, displayedRingCategories, getResolvedLimit, ringCategories])

  const handleRingLimitsPopoverChange = useCallback((open: boolean) => {
    setIsRingLimitsPopoverOpen(open)
    if (open) {
      buildRingEditDrafts()
      return
    }
    setRingCategoryDrafts([])
    setRingLimitDrafts({})
  }, [buildRingEditDrafts])

  const handleRingCategoryDraftChange = useCallback((idx: number, category: string) => {
    setRingCategoryDrafts((prev) => {
      const next = [...prev]
      next[idx] = category
      return next
    })

    setRingLimitDrafts((prev) => {
      if (prev[category] !== undefined) return prev
      return {
        ...prev,
        [category]: Math.round(getResolvedLimit(category)).toString(),
      }
    })
  }, [getResolvedLimit])

  const handleRingLimitDraftChange = useCallback((category: string, value: string) => {
    setRingLimitDrafts((prev) => ({
      ...prev,
      [category]: value.replace(/[^\d]/g, ""),
    }))
  }, [])

  const handleRingLimitsSave = useCallback(async () => {
    const nextRingCategories = ringCategoryDrafts
      .map((category) => category.trim())
      .filter(Boolean)

    setRingCategories(nextRingCategories)

    const limitUpdateMap = new Map<string, number>()
    nextRingCategories.forEach((category) => {
      const rawValue = ringLimitDrafts[category]
      if (!rawValue) return
      const parsed = parseFloat(rawValue)
      if (isNaN(parsed) || parsed < 0) return
      limitUpdateMap.set(category, parsed)
    })

    const updates = Array.from(limitUpdateMap.entries()).map(([category, limitValue]) => ({
      category,
      limitValue,
    }))

    if (updates.length === 0) {
      setIsRingLimitsPopoverOpen(false)
      setRingCategoryDrafts([])
      setRingLimitDrafts({})
      return
    }

    setRingLimits((prev) => {
      const next = { ...prev }
      updates.forEach(({ category, limitValue }) => {
        next[category] = limitValue
      })
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "activityRingLimits",
          JSON.stringify(next)
        )
      }
      return next
    })

    await Promise.all(
      updates.map(async ({ category, limitValue }) => {
        try {
          const res = await fetch("/api/budgets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              categoryName: category,
              budget: limitValue,
              filter: dateFilter,
            }),
          })

          if (!res.ok) {
            console.error(
              "[Home] Failed to save ring limit:",
              await res.text()
            )
          }
        } catch (error) {
          console.error(
            "[Home] Error saving ring limit:",
            error
          )
        }
      })
    )

    setIsRingLimitsPopoverOpen(false)
    setRingCategoryDrafts([])
    setRingLimitDrafts({})
  }, [dateFilter, ringCategoryDrafts, ringLimitDrafts, setRingCategories, setRingLimits])

  if (favorites.size === 0) {
    return (
      <div className="px-4 lg:px-6 mb-6 min-w-0">
        <Card className="border-dashed border-2 bg-muted/30">
          <CardHeader className="text-center py-10">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
              <IconCircleCheck className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Customize Your Dashboard</CardTitle>
            <CardDescription className="max-w-lg mx-auto mt-2 text-base">
              You have not favorited any charts yet. Visit Analytics or Trends pages
              and click the star icon on any chart to pin it here for quick access.
            </CardDescription>
            <div className="flex justify-center gap-4 mt-6">
              <Button variant="outline" onClick={() => router.push("/analytics")}>
                Go to Analytics
              </Button>
              <Button variant="outline" onClick={() => router.push("/trends")}>
                Go to Trends
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="px-4 lg:px-6 min-w-0">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Favorite Charts</h2>
          <Badge variant="secondary">{favorites.size}</Badge>
        </div>
      </div>
      <SortableGridProvider
        chartOrder={favoritesOrder}
        onOrderChange={onOrderChange}
        className="w-full px-4 lg:px-6 min-w-0"
      >
        {favoritesOrder.length > 0 &&
          favoritesOrder.map((chartId) => {
            const sizeConfig = getChartCardSize(chartId as ChartId)
            const savedSize = savedFavoriteSizes[chartId]
            const defaultSize =
              DEFAULT_FAVORITE_SIZES[chartId] || { w: 12, h: 6, x: 0, y: 0 }
            const initialW = savedSize?.w ?? defaultSize.w
            const initialH = savedSize?.h ?? defaultSize.h

            const hasNoData = !isLoading && chartTransactions.length === 0

            if (hasNoData) {
              return (
                <SortableGridItem key={chartId} id={chartId} w={6} h={1}>
                  <CollapsedChartCard
                    chartId={chartId}
                    chartTitle={FAVORITE_CHART_TITLES[chartId] || chartId}
                  />
                </SortableGridItem>
              )
            }

            return (
              <SortableGridItem
                key={chartId}
                id={chartId}
                w={(savedFavoriteSizes[chartId]?.w ?? initialW) as any}
                h={savedFavoriteSizes[chartId]?.h ?? initialH}
                mobileH={sizeConfig.mobileH}
                resizable
                minW={sizeConfig.minW}
                maxW={sizeConfig.maxW}
                minH={sizeConfig.minH}
                maxH={sizeConfig.maxH}
                onResize={onResize}
              >
                {chartId === "financialHealthScore" ? (
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartRadar
                      dateFilter={dateFilter}
                      rawTransactions={chartTransactions}
                    />
                  </div>
                ) : chartId === "spendingActivityRings" ? (
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <Card className="relative h-full flex flex-col">
                      <ChartInfoPopover
                        title="Spending Activity Rings"
                        description="Top spending categories from your Neon transactions"
                        details={[
                          "Each ring shows how much a category has consumed relative to its budget.",
                          "Budgets come from your saved limits or a default amount for the selected date filter.",
                        ]}
                        className="absolute top-3 right-3 z-30"
                      />
                      <CardHeader className="flex flex-row items-start justify-between gap-2 flex-1 min-h-[280px] md:min-h-[420px] pb-6">
                        <div className="space-y-1 z-10">
                          <div className="flex items-center gap-2">
                            <ChartFavoriteButton
                              chartId="spendingActivityRings"
                              chartTitle="Spending Activity Rings"
                              size="md"
                            />
                            <CardTitle className="mb-0">
                              Spending Activity Rings
                            </CardTitle>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 self-start z-10">
                          {activityData.length > 0 && (
                            <Popover
                              open={isRingLimitsPopoverOpen}
                              onOpenChange={handleRingLimitsPopoverChange}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={limitsTriggerClassName}
                                >
                                  <span className="truncate">Limits</span>
                                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72" align="end">
                                <RingLimitsPopoverContent
                                  selectedCategories={ringCategoryDrafts}
                                  categoryOptions={availableRingCategories}
                                  values={ringLimitDrafts}
                                  onCategoryChange={handleRingCategoryDraftChange}
                                  onLimitChange={handleRingLimitDraftChange}
                                  onSave={handleRingLimitsSave}
                                  onCancel={() => handleRingLimitsPopoverChange(false)}
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-between pt-20 pb-4">
                          {activityData.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              No expense categories available yet.
                            </span>
                          ) : (
                            <>
                              <div className="flex items-center justify-center w-full flex-1 min-h-0">
                                <SpendingActivityRings
                                  key={`rings-${dateFilter}-${ringCategories?.join(",") || ""}`}
                                  data={activityData}
                                  config={activityConfig}
                                  theme={activityTheme}
                                  ringLimits={ringLimits}
                                  getDefaultLimit={() => getDefaultRingLimit(dateFilter, isDemoMode)}
                                />
                              </div>
                              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                                {activityData.map((item) => {
                                  const category =
                                    (item as { category?: string }).category ??
                                    item.label
                                  return (
                                    <div key={category} className="flex items-center gap-1.5">
                                      <span
                                        className="h-2 w-2 rounded-full"
                                        style={{
                                          backgroundColor:
                                            (item as { color?: string }).color || "#a1a1aa",
                                        }}
                                      />
                                      <span className="font-medium">{category}</span>
                                      <span className="text-[0.7rem]">
                                        {(item.value * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </div>
                ) : (
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    {renderFavoriteChart(chartId, chartData, dateFilter)}
                  </div>
                )}
              </SortableGridItem>
            )
          })}
      </SortableGridProvider>
    </div>
  )
})

FavoritesGrid.displayName = "FavoritesGrid"
