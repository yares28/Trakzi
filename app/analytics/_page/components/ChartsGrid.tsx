import React, { memo, useEffect, useState, type Dispatch, type SetStateAction } from "react"

import { LazyChart } from "@/components/lazy-chart"
import { SortableGridItem, SortableGridProvider } from "@/components/sortable-grid"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartCategoryBubble } from "@/components/chart-category-bubble"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartCirclePacking } from "@/components/chart-circle-packing"
import { ChartDayOfWeekCategory } from "@/components/chart-day-of-week-category"
import { ChartDayOfWeekSpending } from "@/components/chart-day-of-week-spending"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartLoadingState } from "@/components/chart-loading-state"
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
import { ChartAllMonthsCategorySpending } from "@/components/chart-all-months-category-spending"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"

import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"
import { safeCapture } from "@/lib/posthog-safe"

import type { AnalyticsTransaction } from "../types"
import { DEFAULT_CHART_SIZES } from "../constants"
import { getDefaultRingLimit } from "../utils/categories"
import type { useAnalyticsChartData } from "../hooks/useAnalyticsChartData"
import { SpendingActivityRings } from "./SpendingActivityRings"

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
}: ChartsGridProps) {
  const {
    activityConfig,
    activityData,
    activityTheme,
    allExpenseCategories,
    circlePackingControls,
    circlePackingData,
    categoryFlowChart,
    categoryFlowControls,
    dayOfWeekSpendingControls,
    expensesPieControls,
    expensesPieData,
    incomeExpenseChart,
    incomeExpenseControls,
    incomeExpenseTopChartData,
    incomeExpenseTopControls,
    moneyFlowMaxExpenseCategories,
    monthOfYearSpendingControls,
    needsWantsControls,
    needsWantsPieData,
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

  const [ringCategoryPopoverIndex, setRingCategoryPopoverIndex] = useState<number | null>(null)
  const [ringCategoryPopoverValue, setRingCategoryPopoverValue] = useState<string | null>(null)
  const [ringLimitPopoverValue, setRingLimitPopoverValue] = useState<string>("")

  const RingPopoverContent = memo(function RingPopoverContent({
    initialCategory,
    initialLimit,
    allCategories,
    onSave,
    onCancel,
  }: {
    initialCategory: string
    initialLimit: number
    allCategories: string[]
    onSave: (category: string, limit: string) => void
    onCancel: () => void
  }) {
    const [localCategory, setLocalCategory] = useState(initialCategory)
    const [localLimit, setLocalLimit] = useState(initialLimit.toString())

    useEffect(() => {
      setLocalCategory(initialCategory)
      setLocalLimit(initialLimit.toString())
    }, [initialCategory, initialLimit])

    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground">
          Select category for this ring
        </div>
        <select
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          value={localCategory}
          onChange={(e) => setLocalCategory(e.target.value)}
        >
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <div className="space-y-1 pt-1">
          <div className="text-xs font-medium text-muted-foreground">
            Limit for this category
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            value={localLimit}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d]/g, "")
              setLocalLimit(value)
            }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(localCategory, localLimit)}
          >
            Save
          </Button>
        </div>
      </div>
    )
  })

  const wrapperRef = React.useRef<HTMLDivElement>(null)
  
  // #region agent log
  React.useEffect(() => {
    if (wrapperRef.current) {
      const cards = wrapperRef.current.querySelectorAll('[data-slot="card"]')
      const wrapperClasses = wrapperRef.current.className
      const hasSelector = wrapperClasses.includes('*:data-[slot=card]:bg-muted')
      
      fetch('http://127.0.0.1:7242/ingest/4263eedd-8a99-4193-82ad-974d6be54ab8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'ChartsGrid.tsx:ChartsGrid',
          message: 'ChartsGrid wrapper and card count',
          data: {
            wrapperClasses,
            hasSelector,
            cardCount: cards.length,
            firstCardClasses: cards[0]?.className || 'none',
            firstCardBg: cards[0] ? window.getComputedStyle(cards[0]).backgroundColor : 'none'
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'B'
        })
      }).catch(() => {})
    }
  }, [])
  // #endregion

  return (
    <div ref={wrapperRef} className="w-full mb-4 px-4 lg:px-6 *:data-[slot=card]:bg-muted/20 dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-md dark:*:data-[slot=card]:shadow-sm">
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

          if (chartId === "transactionHistory") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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

          if (chartId === "dayOfWeekSpending") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartDayOfWeekSpending
                    data={rawTransactions}
                    dayOfWeekCategoryData={bundleData?.dayOfWeekCategory}
                    categoryControls={dayOfWeekSpendingControls}
                    isLoading={isLoadingTransactions}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                  />
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "allMonthsCategorySpending") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartAllMonthsCategorySpending
                    data={rawTransactions}
                    monthlyCategoriesData={bundleData?.monthlyCategories}
                    categoryControls={monthOfYearSpendingControls}
                    isLoading={isLoadingTransactions}
                    bundleLoading={bundleLoading}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                  />
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "incomeExpensesTracking1") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartAreaInteractive
                    chartId="incomeExpensesTracking1"
                    categoryControls={incomeExpenseTopControls}
                    isLoading={isLoadingTransactions}
                    data={incomeExpenseTopChartData}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                  />
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "incomeExpensesTracking2") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartAreaInteractive
                    chartId="incomeExpensesTracking2"
                    categoryControls={incomeExpenseControls}
                    isLoading={isLoadingTransactions}
                    data={incomeExpenseChart.data}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                  />
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "spendingCategoryRankings") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartCategoryFlow
                    categoryControls={categoryFlowControls}
                    data={categoryFlowChart.data}
                    isLoading={isLoadingTransactions}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                  />
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "netWorthAllocation") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Net Worth Allocation" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartTreeMap
                      categoryControls={treeMapControls}
                      data={treeMapData}
                      isLoading={isLoadingTransactions}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "moneyFlow") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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
              </SortableGridItem>
            )
          }

          if (chartId === "expenseBreakdown") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartExpensesPie
                    categoryControls={expensesPieControls}
                    data={expensesPieData.slices}
                    isLoading={isLoadingTransactions}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                  />
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "needsWantsBreakdown") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <LazyChart title="Financial Health Score" height={250}>
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartRadar
                      dateFilter={dateFilter}
                      emptyTitle={emptyTitle}
                      emptyDescription={emptyDescription}
                    />
                  </div>
                </LazyChart>
              </SortableGridItem>
            )
          }

          if (chartId === "spendingActivityRings") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <Card className="h-full flex flex-col">
                    <CardHeader className="relative flex flex-row items-start justify-between gap-2 flex-1 min-h-[420px] pb-6">
                      <div className="space-y-1 z-10">
                        <div className="flex items-center gap-2">
                          <GridStackCardDragHandle />
                          <ChartFavoriteButton
                            chartId="spendingActivityRings"
                            chartTitle="Spending Activity Rings"
                            size="md"
                          />
                          <CardTitle className="mb-0">Spending Activity Rings</CardTitle>
                          <ChartInfoPopover
                            title="Spending Activity Rings"
                            description="Top spending categories from your Neon transactions"
                            details={[
                              "Each ring shows how much a category has consumed relative to its budget.",
                              "Budgets come from your saved limits or a default amount for the selected date filter.",
                            ]}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 z-10">
                        {activityData.length > 0 && (
                          <div className="flex flex-col gap-1 z-10 w-[140px]">
                            <span className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground text-right">
                              Limits
                            </span>
                            <div className="flex flex-col gap-1">
                              {activityData.map((item, idx) => {
                                const category: string =
                                  (item as { category?: string }).category ??
                                  (item.label ?? "Other")
                                const storedLimit = ringLimits[category]
                                const limit =
                                  typeof storedLimit === "number" &&
                                    storedLimit > 0
                                    ? storedLimit
                                    : getDefaultRingLimit(dateFilter)
                                const percent = (item.value * 100).toFixed(1)
                                const spent =
                                  typeof (item as { spent?: number }).spent ===
                                    "number"
                                    ? (item as { spent?: number }).spent!
                                    : null
                                return (
                                  <Popover
                                    key={`${category}-${idx}`}
                                    open={ringCategoryPopoverIndex === idx}
                                    onOpenChange={(open) => {
                                      if (
                                        open &&
                                        allExpenseCategories &&
                                        allExpenseCategories.length
                                      ) {
                                        const currentCategory =
                                          (category as string) ||
                                          allExpenseCategories[0]
                                        setRingCategoryPopoverIndex(idx)
                                        setRingCategoryPopoverValue(
                                          currentCategory
                                        )
                                        const currentLimitRaw =
                                          ringLimits[currentCategory]
                                        const currentLimit =
                                          typeof currentLimitRaw === "number" &&
                                            currentLimitRaw > 0
                                            ? currentLimitRaw
                                            : getDefaultRingLimit(dateFilter)
                                        setRingLimitPopoverValue(
                                          currentLimit.toString()
                                        )
                                      } else {
                                        setRingCategoryPopoverIndex(null)
                                        setRingCategoryPopoverValue(null)
                                        setRingLimitPopoverValue("")
                                      }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1 rounded border cursor-pointer">
                                        <button
                                          type="button"
                                          className="px-1.5 py-0.5 text-[0.7rem] rounded w-full flex items-center justify-between gap-1.5 hover:bg-muted/80 bg-muted"
                                          title={
                                            limit
                                              ? `${category} – ${percent}% of limit (${item.value} of 1.0)`
                                              : `${category} – no limit set`
                                          }
                                        >
                                          <span className="max-w-[170px] whitespace-normal">
                                            {category}
                                          </span>
                                          <span className="text-[0.65rem] font-medium text-muted-foreground flex-shrink-0 text-right">
                                            {spent !== null
                                              ? `$${spent.toFixed(2)}`
                                              : `${percent}%`}
                                          </span>
                                        </button>
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56" align="end">
                                      <RingPopoverContent
                                        initialCategory={ringCategoryPopoverValue ?? (category as string)}
                                        initialLimit={
                                          ringLimitPopoverValue
                                            ? parseFloat(ringLimitPopoverValue) || limit
                                            : limit
                                        }
                                        allCategories={allExpenseCategories}
                                        onSave={async (savedCategory, savedLimit) => {
                                          if (!savedCategory) {
                                            setRingCategoryPopoverIndex(null)
                                            setRingCategoryPopoverValue(null)
                                            setRingLimitPopoverValue("")
                                            return
                                          }
                                          setRingCategories((prev) => {
                                            const base =
                                              prev && prev.length
                                                ? [...prev]
                                                : activityData.map(
                                                  (ringItem) => {
                                                    const ringCategory =
                                                      (ringItem as {
                                                        category?: string
                                                      }).category ??
                                                      ringItem.label
                                                    return ringCategory as string
                                                  }
                                                )
                                            base[ringCategoryPopoverIndex ?? idx] = savedCategory
                                            return base
                                          })
                                          if (savedLimit) {
                                            const limitValue = parseFloat(savedLimit)
                                            if (!isNaN(limitValue) && limitValue >= 0) {
                                              setRingLimits((prev) => {
                                                const updated = {
                                                  ...prev,
                                                  [savedCategory]: limitValue,
                                                }
                                                if (typeof window !== "undefined") {
                                                  localStorage.setItem(
                                                    "activityRingLimits",
                                                    JSON.stringify(updated)
                                                  )
                                                }
                                                return updated
                                              })

                                              // Save to database with current filter
                                              try {
                                                const res = await fetch("/api/budgets", {
                                                  method: "POST",
                                                  headers: {
                                                    "Content-Type": "application/json",
                                                  },
                                                  body: JSON.stringify({
                                                    categoryName: savedCategory,
                                                    budget: limitValue,
                                                    filter: dateFilter, // Include current filter
                                                  }),
                                                })

                                                if (res.ok) {
                                                  // Track budget limit set
                                                  safeCapture('budget_limit_set', {
                                                    category_name: savedCategory,
                                                    budget_amount: limitValue,
                                                    date_filter: dateFilter || 'all_time',
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
                                            }
                                          }
                                          setRingCategoryPopoverIndex(null)
                                          setRingCategoryPopoverValue(null)
                                          setRingLimitPopoverValue("")
                                        }}
                                        onCancel={() => {
                                          setRingCategoryPopoverIndex(null)
                                          setRingCategoryPopoverValue(null)
                                          setRingLimitPopoverValue("")
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Chart overlay layer */}
                      <div className="absolute inset-0 flex flex-col items-center justify-between pt-20 pb-4">
                        {activityData.length === 0 ? (
                          <ChartLoadingState
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
                                getDefaultLimit={() => getDefaultRingLimit(dateFilter)}
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
                    </CardHeader>
                  </Card>
                </div>
              </SortableGridItem>
            )
          }

          if (chartId === "spendingStreamgraph") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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
            // Transform dailySpending from bundle format to calendar format
            const calendarData = bundleData?.dailySpending?.map((d: { date: string; expense: number }) => ({
              day: d.date,
              value: Math.abs(d.expense)
            }))
            return (
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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
              <SortableGridItem key={chartId} id={chartId} w={(savedSizes[chartId]?.w ?? initialW) as 6 | 12} h={savedSizes[chartId]?.h ?? initialH} resizable minW={sizeConfig.minW} maxW={sizeConfig.maxW} minH={sizeConfig.minH} maxH={sizeConfig.maxH} onResize={handleChartResize}>
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

          return null
        })}
      </SortableGridProvider>
    </div>
  )
}
