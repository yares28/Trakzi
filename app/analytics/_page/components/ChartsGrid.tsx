import { memo, useCallback, useState, type Dispatch, type SetStateAction } from "react"

import { LazyChart } from "@/components/lazy-chart"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  FALLBACK_DATE_FILTER,
  normalizeDateFilterValue,
} from "@/lib/date-filter"
import { getDailyTransactionActivityDisplayMode } from "@/components/chart-transaction-calendar"
import { SortableGridItem, SortableGridProvider } from "@/components/sortable-grid"
import dynamic from "next/dynamic"
import { ChartCategoryBubble } from "@/components/chart-category-bubble"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartCirclePacking } from "@/components/chart-circle-packing"
import { ChevronDownIcon } from "lucide-react"
import { ChartDayOfWeekCategory } from "@/components/chart-day-of-week-category"
import { ChartCategorySpendingByPeriod } from "@/components/chart-category-spending-by-period"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { useCurrency } from "@/components/currency-provider"
import { ChartNeedsWantsPie } from "@/components/chart-needs-wants-pie"
import { ChartPolarBar } from "@/components/chart-polar-bar"
import { ChartRadar } from "@/components/chart-radar"
import { ChartSankey } from "@/components/chart-sankey"
import { ChartSingleMonthCategorySpending } from "@/components/chart-single-month-category-spending"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { ChartSpendingStreamgraph } from "@/components/chart-spending-streamgraph"
import { ChartSwarmPlot } from "@/components/chart-swarm-plot"
import { ChartTransactionCalendar } from "@/components/chart-transaction-calendar"
import { ChartTreeMap } from "@/components/chart-treemap"
import { ChartIncomeExpenseRatio } from "@/components/chart-income-expense-ratio"
import { ChartWeekendVsWeekday } from "@/components/chart-weekend-vs-weekday"
import { ChartMonthlyBudgetPace } from "@/components/chart-monthly-budget-pace"
import { ChartBudgetBurndown } from "@/components/chart-budget-burndown"
import { ChartPurchaseSizeBreakdown } from "@/components/chart-purchase-size-breakdown"
import { ChartRecurringVsOneTime } from "@/components/chart-recurring-vs-onetime"
import { ChartSeasonalSpending } from "@/components/test-charts/chart-seasonal-spending"
import { ChartTransactionCountTrend } from "@/components/test-charts/chart-transaction-count-trend"
import { ChartMoMGrowth } from "@/components/test-charts/chart-mom-growth"
import { ChartTopMerchantsRace } from "@/components/test-charts/chart-top-merchants-race"
import { ChartPaydayImpact } from "@/components/test-charts/chart-payday-impact"
import { ChartIncomeSources } from "@/components/test-charts/chart-income-sources"
import { ChartYearOverYear } from "@/components/test-charts/chart-year-over-year"
import { ChartDailyAverageByMonth } from "@/components/test-charts/chart-daily-average-by-month"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { PageEmptyState, ANALYTICS_EMPTY_STATE, ANALYTICS_EMPTY_PERIOD_STATE } from "@/components/page-empty-state"
import { CollapsedChartCard } from "@/components/collapsed-chart-card"
import {
  ChartCardFloatingMeta,
} from "@/components/chart-card-overlay-controls"


import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { typedCapture } from "@/types/posthog-events"

import type { AnalyticsTransaction } from "../types"
import { DEFAULT_CHART_SIZES } from "../constants"
import { getDefaultRingLimit, getSuggestedDemoRingLimit } from "../utils/categories"
import type { useAnalyticsChartData } from "../hooks/useAnalyticsChartData"
import { SpendingActivityRings } from "./SpendingActivityRings"

const ChartAreaInteractive = dynamic(
  () => import("@/components/chart-area-interactive").then((m) => ({ default: m.ChartAreaInteractive })),
  { ssr: false, loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted" /> }
)

type AnalyticsChartData = ReturnType<typeof useAnalyticsChartData>

type ChartsGridProps = {
  analyticsChartOrder: string[]
  handleChartOrderChange: (newOrder: string[]) => void
  savedSizes: Record<string, { w: number; h: number }>
  handleChartResize: (chartId: string, w: number, h: number) => void
  bundleData: any
  bundleLoading: boolean
  rawTransactions: AnalyticsTransaction[]
  isLoadingTransactions: boolean
  dateFilter: string | null
  ringLimits: Record<string, number>
  setRingLimits: Dispatch<SetStateAction<Record<string, number>>>
  chartData: AnalyticsChartData
  isError?: boolean
  isDemoMode?: boolean
}

/** Human-readable titles for each chart — used by collapsed cards */
const CHART_TITLES: Record<string, string> = {
  transactionHistory: "Transaction History",
  categorySpendingByPeriod: "Category Spending by Period",
  incomeExpensesTracking1: "Income & Expenses Cumulative",
  incomeExpensesTracking2: "Income & Expenses",
  spendingCategoryRankings: "Spending Category Rankings",
  netWorthAllocation: "Net Worth Allocation",
  moneyFlow: "Money Flow",
  expenseBreakdown: "Expense Breakdown",
  needsWantsBreakdown: "Needs vs Wants",
  categoryBubbleMap: "Category Bubble Map",
  householdSpendMix: "Household Spend Mix",
  financialHealthScore: "Financial Health Score",
  spendingActivityRings: "Spending Activity Rings",
  spendingStreamgraph: "Spending Streamgraph",
  singleMonthCategorySpending: "Single Month Category",
  dayOfWeekCategory: "Day of Week Category",
  dailyTransactionActivity: "Daily Transaction Activity",
  cashFlowSankey: "Cash Flow Sankey",
  incomeExpenseRatio: "Income to Expense Ratio",
  weekendVsWeekday: "Weekend vs Weekday",
  monthlyBudgetPace: "Monthly Budget Pace",
  budgetBurndown: "Budget Burndown",
  purchaseSizeBreakdown: "Purchase Size Breakdown",
  recurringVsOneTime: "Recurring vs One-Time",
  seasonalSpending: "Seasonal Spending",
  hourlySpending: "Hourly Spending Pattern",
  transactionCountTrend: "Transaction Count Trend",
  momGrowth: "Month-over-Month Growth",
  topMerchantsRace: "Top 5 Merchants",
  paydayImpact: "Payday Impact",
  incomeSources: "Income Sources",
  yearOverYear: "Spending comparison",
  dailyAverageByMonth: "Daily Average by Month",
}

export function ChartsGrid({
  analyticsChartOrder,
  handleChartOrderChange,
  savedSizes,
  handleChartResize,
  bundleData,
  bundleLoading,
  rawTransactions,
  isLoadingTransactions,
  dateFilter,
  ringLimits,
  setRingLimits,
  chartData,
  isError = false,
  isDemoMode = false,
}: ChartsGridProps) {
  const { symbol } = useCurrency()

  const {
    activityConfig,
    activityData,
    activityTheme,
    allExpenseCategories,
    circlePackingControls,
    circlePackingData,
    categoryFlowChart,
    categoryFlowControls,
    chartDataStatusMap,
    categorySpendingByPeriodControls,
    expensesPieControls,
    expensesPieData,
    incomeExpenseChart,
    incomeExpenseControls,
    incomeExpenseCumulativeData,
    weeklyNetDiffData,
    incomeExpenseTopChartData,
    incomeExpenseTopControls,
    moneyFlowMaxExpenseCategories,
    needsWantsControls,
    needsWantsPieData,
    pageHasAnyData,
    polarBarControls,
    polarBarData,
    sankeyControls,
    sankeyData,
    spendingFunnelChart,
    spendingFunnelControls,
    spendingStreamData,
    streamgraphControls,
    swarmPlotData,
    treeMapControls,
    treeMapData,
    ringCategories,
    setRingCategories,
  } = chartData

  // Smart empty state messages - show helpful message when no data for current period
  const hasDataInOtherPeriods = bundleData?.hasDataInOtherPeriods ?? false
  const emptyTitle = hasDataInOtherPeriods
    ? "No data for this period"
    : "No data yet"
  const emptyDescription = hasDataInOtherPeriods
    ? "Try selecting a different time period to see your data"
    : "Import your bank statements or receipts to see insights here"

  const isMobile = useIsMobile()
  const effectiveDateFilter = normalizeDateFilterValue(dateFilter, FALLBACK_DATE_FILTER)
  const dailyActivityDisplayMode = getDailyTransactionActivityDisplayMode(
    effectiveDateFilter,
    isMobile,
  )
  const dailyActivityPreferredH = dailyActivityDisplayMode === "dual" ? 10 : 7
  const dailyActivityPreferredMobileH = dailyActivityDisplayMode === "dual" ? 10 : 7

  const limitsTriggerClassName =
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 w-40"

  const [isRingLimitsPopoverOpen, setIsRingLimitsPopoverOpen] = useState(false)
  const [ringCategoryDrafts, setRingCategoryDrafts] = useState<string[]>([])
  const [ringLimitDrafts, setRingLimitDrafts] = useState<Record<string, string>>({})

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
  }, [dateFilter, getSuggestedDemoLimit, isDemoMode, ringLimits])

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

          if (res.ok) {
            typedCapture("budget_limit_set", {
              category_name: category,
              budget_amount: limitValue,
              date_filter: dateFilter || "all_time",
            })
          } else {
            console.error(
              "[Analytics] Failed to save ring limit:",
              await res.text()
            )
          }
        } catch (error) {
          console.error("[Analytics] Error saving ring limit:", error)
        }
      })
    )

    setIsRingLimitsPopoverOpen(false)
    setRingCategoryDrafts([])
    setRingLimitDrafts({})
  }, [dateFilter, ringCategoryDrafts, ringLimitDrafts, setRingCategories, setRingLimits])

  const RingLimitsPopoverContent = memo(function RingLimitsPopoverContent() {
    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground">
          Choose ring categories and limits
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {ringCategoryDrafts.map((category, idx) => (
            <div
              key={`${category}-${idx}`}
              className="grid grid-cols-[1fr_auto] items-center gap-2"
            >
              <select
                className="h-8 min-w-0 rounded-md border bg-background px-2 text-xs text-foreground"
                value={category}
                onChange={(event) => handleRingCategoryDraftChange(idx, event.target.value)}
              >
                {availableRingCategories.map((option) => (
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
                  value={ringLimitDrafts[category] ?? ""}
                  onChange={(event) =>
                    handleRingLimitDraftChange(category, event.target.value)
                  }
                />
              </div>
            </div>
          ))}
        </div>
        {ringCategoryDrafts.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No categories available yet.
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRingLimitsPopoverChange(false)}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleRingLimitsSave}>
            Save
          </Button>
        </div>
      </div>
    )
  })

  // ── Page-level empty state ──────────────────────────────────────────
  const isStillLoading = bundleLoading || isLoadingTransactions
  const showPageEmptyState = !isStillLoading && !pageHasAnyData && !isError
  const showErrorState = !isStillLoading && isError

  const emptyConfig = hasDataInOtherPeriods
    ? ANALYTICS_EMPTY_PERIOD_STATE
    : ANALYTICS_EMPTY_STATE

  return (
    <div className="w-full mb-4 px-4 lg:px-6 min-w-0">
      {showPageEmptyState && (
        <PageEmptyState
          icon={emptyConfig.icon}
          title={emptyConfig.title}
          description={emptyConfig.description}
        />
      )}

      {showErrorState && (
        <PageEmptyState
          title="Unable to load charts"
          description="Something went wrong fetching your data. Please refresh the page."
        />
      )}
      <SortableGridProvider
        chartOrder={analyticsChartOrder}
        onOrderChange={handleChartOrderChange}
      >
        {analyticsChartOrder.map((chartId, index) => {
          // Determine default size and position for a chart
          const getDefaultSize = (id: string) => {
            return DEFAULT_CHART_SIZES[id] || { w: 12, h: 6, x: 0, y: 0 }  // Fallback to large if not found
          }
          const defaultSize = getDefaultSize(chartId)
          // Get min/max size constraints from config
          const sizeConfig = getChartCardSize(chartId as ChartId)
          // Use defaultSize for initial render to avoid hydration mismatch
          // Saved sizes will be applied by GridStack after mount via load() method
          const initialW = defaultSize.w
          const initialH = defaultSize.h

          // ── Per-chart empty state logic ──────────────────────────────────
          const chartStatus = chartDataStatusMap[chartId]

          if (!isStillLoading && chartStatus === "empty") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={6} h={1}>
                <CollapsedChartCard
                  chartId={chartId}
                  chartTitle={CHART_TITLES[chartId] || chartId}
                />
              </SortableGridItem>
            )
          }

          if (chartId === "transactionHistory") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Transaction History" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartSwarmPlot
                      data={swarmPlotData}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "categorySpendingByPeriod") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Category Spending by Period" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartCategorySpendingByPeriod
                      data={rawTransactions}
                      dayOfWeekCategoryData={bundleData?.dayOfWeekCategory}
                      monthlyCategoriesData={bundleData?.monthlyCategories}
                      categoryControls={categorySpendingByPeriodControls}
                      isLoading={isLoadingTransactions}
                      bundleLoading={bundleLoading}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "incomeExpensesTracking1") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Income & Expenses Tracking" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartAreaInteractive
                      chartId="incomeExpensesTracking1"
                      title="Income & Expenses Cumulative"
                      categoryControls={incomeExpenseTopControls}
                      isLoading={isLoadingTransactions}
                      data={incomeExpenseTopChartData}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "incomeExpensesTracking2") {
            // This chart uses bundleData.dailySpending as primary source (fast, Redis-cached)
            // Only fall back to raw transactions if bundle has no dailySpending
            const chartIsLoading = bundleData?.dailySpending && bundleData.dailySpending.length > 0
              ? bundleLoading
              : isLoadingTransactions
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Income & Expenses Tracking" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartAreaInteractive
                      chartId="incomeExpensesTracking2"
                      title="Income & Expenses"
                      categoryControls={incomeExpenseControls}
                      isLoading={chartIsLoading}
                      data={incomeExpenseChart.data}
                      cumulativeData={incomeExpenseCumulativeData}
                      netData={weeklyNetDiffData}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }



          if (chartId === "spendingCategoryRankings") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Spending Category Rankings" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartCategoryFlow
                      categoryControls={categoryFlowControls}
                      data={categoryFlowChart.data}
                      isLoading={isLoadingTransactions}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "netWorthAllocation") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartTreeMap
                    categoryControls={treeMapControls}
                    data={treeMapData}
                    isLoading={bundleLoading}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                  />
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "moneyFlow") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Money Flow" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartSpendingFunnel
                      categoryControls={spendingFunnelControls}
                      data={spendingFunnelChart.data}
                      maxExpenseCategories={moneyFlowMaxExpenseCategories}
                      isLoading={isLoadingTransactions}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "expenseBreakdown") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Expense Breakdown" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartExpensesPie
                      categoryControls={expensesPieControls}
                      data={expensesPieData.slices}
                      isLoading={isLoadingTransactions}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "needsWantsBreakdown") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartNeedsWantsPie
                    categoryControls={needsWantsControls}
                    data={needsWantsPieData.slices}
                    isLoading={bundleLoading}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                  />
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "categoryBubbleMap") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Category Bubble Map" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartCategoryBubble
                      data={rawTransactions}
                      isLoading={isLoadingTransactions}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "householdSpendMix") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Household Spend Mix" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartPolarBar
                      categoryControls={polarBarControls}
                      data={polarBarData.data}
                      keys={polarBarData.keys}
                      isLoading={isLoadingTransactions}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "financialHealthScore") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Financial Health Score" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartRadar
                      dateFilter={dateFilter}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                      rawTransactions={rawTransactions}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "spendingActivityRings") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="relative flex flex-row items-start justify-between gap-2 flex-1 min-h-[280px] md:min-h-[420px] pb-6">
                      <div className="space-y-1 z-10">
                        <div className="flex items-center gap-2">
                          <GridStackCardDragHandle />
                          <ChartFavoriteButton
                            chartId="spendingActivityRings"
                            chartTitle="Spending Activity Rings"
                            size="md"
                          />
                          <CardTitle className="mb-0">Spending Activity Rings</CardTitle>
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
                              <RingLimitsPopoverContent />
                            </PopoverContent>
                            </Popover>
                        )}
                      </div>
                      {/* Chart overlay layer */}
                      <div className="absolute inset-0 flex flex-col items-center justify-between pt-20 pb-4">
                        {activityData.length === 0 ? (
                          <ChartLoadingState
                            skeletonType="pie"
                            emptyTitle={emptyTitle || "No spending categories yet"}
                            emptyDescription={emptyDescription || "Import your bank statements to see activity rings"}
                          />
                        ) : (
                          <>
                            <div className="flex items-center justify-center w-full flex-1 min-h-0">
                              <SpendingActivityRings
                                key={`rings-${dateFilter}-${ringCategories?.join(',') || ''}`}
                                data={activityData}
                                config={activityConfig}
                                theme={activityTheme as "light" | "dark"}
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
                                  <div
                                    key={category}
                                    className="flex items-center gap-1.5"
                                  >
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{
                                        backgroundColor:
                                          (item as { color?: string }).color ||
                                          "#a1a1aa",
                                      }}
                                    />
                                    <span className="font-medium">
                                      {category}
                                    </span>
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
                      <ChartCardFloatingMeta
                        insight={(
                          <ChartAiInsightButton
                            chartId="spendingActivityRings"
                            chartTitle="Spending Activity Rings"
                            chartDescription="Concentric category rings showing spend against configured limits."
                            chartData={{
                              totalCategories: activityData.length,
                              rings: activityData.map((item) => {
                                const category =
                                  (item as { category?: string }).category ??
                                  item.label ??
                                  "Other"
                                const spent =
                                  typeof (item as { spent?: number }).spent === "number"
                                    ? (item as { spent?: number }).spent!
                                    : 0
                                const limit = ringLimits[category] ?? getDefaultRingLimit(dateFilter, isDemoMode)
                                return {
                                  category,
                                  spent,
                                  limit,
                                  utilizationPercent: Number((item.value * 100).toFixed(1)),
                                }
                              }),
                            }}
                            size="sm"
                          />
                        )}
                        info={(
                          <ChartInfoPopover
                            title="Spending Activity Rings"
                            description="Top spending categories from your Neon transactions"
                            details={[
                              "Each ring shows how much a category has consumed relative to its budget.",
                              "Budgets come from your saved limits or a default amount for the selected date filter.",
                            ]}
                          />
                        )}
                      />
                    </CardHeader>
                  </Card>
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "spendingStreamgraph") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Spending Streamgraph" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartSpendingStreamgraph
                      categoryControls={streamgraphControls}
                      data={spendingStreamData.data}
                      keys={spendingStreamData.keys}
                      isLoading={isLoadingTransactions}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "singleMonthCategorySpending") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Single Month Category Spending" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartSingleMonthCategorySpending
                      dateFilter={dateFilter}
                      monthlyCategoriesData={bundleData?.monthlyCategories}
                      bundleLoading={bundleLoading}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "dayOfWeekCategory") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Day of Week Category" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartDayOfWeekCategory
                      dateFilter={dateFilter}
                      bundleData={bundleData?.dayOfWeekCategory}
                      bundleLoading={bundleLoading}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }



          if (chartId === "dailyTransactionActivity") {
            // Transform dailySpending from bundle format to calendar format.
            // Only pass data when it has entries — empty array is truthy in JS and would
            // prevent the component from falling back to its own standalone fetch.
            const calendarData = bundleData?.dailySpending?.length
              ? bundleData.dailySpending.map((d: { date: string; expense: number }) => ({
                  day: d.date,
                  value: Math.abs(d.expense)
                }))
              : undefined
            // Use saved height when set so resize sticks; preferred height as initial. Allow minH 5 so user can resize down to single-chart size.
            const dailyActivityH = savedSizes[chartId]?.h ?? dailyActivityPreferredH
            const dailyActivityMobileH = savedSizes[chartId]?.h ?? dailyActivityPreferredMobileH
            const dailyActivityMinH = Math.min(8, sizeConfig.minH)
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={dailyActivityH} mobileH={dailyActivityMobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={dailyActivityMinH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Daily Transaction Activity" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartTransactionCalendar
                      data={calendarData}
                      dateFilter={dateFilter}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "cashFlowSankey") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Cash Flow Sankey" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartSankey
                      data={sankeyData.graph}
                      categoryControls={sankeyControls}
                      isLoading={bundleLoading}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "incomeExpenseRatio") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Income to Expense Ratio" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartIncomeExpenseRatio
                      data={rawTransactions}
                      isLoading={isLoadingTransactions}
                      emptyTitle="No income/expense data yet"
                      emptyDescription="Import your bank statements to see your income to expense ratio."
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "weekendVsWeekday") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Weekend vs Weekday" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartWeekendVsWeekday
                      data={rawTransactions}
                      isLoading={isLoadingTransactions}
                      emptyTitle="No spending data yet"
                      emptyDescription="Import your bank statements to compare weekday vs weekend spending."
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "monthlyBudgetPace") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Monthly Budget Pace" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartMonthlyBudgetPace
                      data={rawTransactions}
                      dateFilter={dateFilter}
                      isLoading={isLoadingTransactions}
                      emptyTitle="No budget data yet"
                      emptyDescription="Import your bank statements to track your monthly spending pace."
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "budgetBurndown") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Budget Burndown" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartBudgetBurndown
                      data={rawTransactions}
                      dateFilter={dateFilter}
                      isLoading={isLoadingTransactions}
                      emptyTitle="No budget data yet"
                      emptyDescription="Import your bank statements to track your budget burndown."
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "purchaseSizeBreakdown") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Purchase Size Breakdown" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartPurchaseSizeBreakdown
                      data={rawTransactions}
                      isLoading={isLoadingTransactions}
                      emptyTitle="No purchase data yet"
                      emptyDescription="Import your bank statements to see your purchase size breakdown."
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "recurringVsOneTime") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Recurring vs One-Time" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartRecurringVsOneTime
                      data={rawTransactions}
                      isLoading={isLoadingTransactions}
                      emptyTitle="No transaction data yet"
                      emptyDescription="Import your bank statements to see recurring vs one-time spending."
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "seasonalSpending") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Seasonal Spending" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartSeasonalSpending data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "transactionCountTrend") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Transaction Count Trend" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartTransactionCountTrend data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "momGrowth") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Month-over-Month Growth" height={320}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartMoMGrowth data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "topMerchantsRace") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Top 5 Merchants" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartTopMerchantsRace data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "paydayImpact") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Payday Impact" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartPaydayImpact data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "incomeSources") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Income Sources" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartIncomeSources data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }


          if (chartId === "yearOverYear") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Year Over Year" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartYearOverYear data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "dailyAverageByMonth") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} mobileH={sizeConfig.mobileH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Daily Average by Month" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartDailyAverageByMonth data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          return null
        })}
      </SortableGridProvider>
    </div>
  )
}
