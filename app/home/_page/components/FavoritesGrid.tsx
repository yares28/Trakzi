import { memo, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { IconCircleCheck } from "@tabler/icons-react"
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

import { DEFAULT_FAVORITE_SIZES } from "../constants"
import type { FavoriteChartSize } from "../types"
import { normalizeCategoryName } from "../utils/categories"
import type { HomeChartData } from "../hooks/useHomeChartData"
import { SpendingActivityRings } from "./SpendingActivityRings"

type FavoritesGridProps = {
  favorites: Set<string>
  favoritesOrder: string[]
  savedFavoriteSizes: Record<string, FavoriteChartSize>
  onOrderChange: (order: string[]) => void
  onResize: (chartId: string, w: number, h: number) => void
  chartData: HomeChartData
  dateFilter: string | null
}

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
        onChange={(event) => setLocalCategory(event.target.value)}
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
          onChange={(event) => {
            const value = event.target.value.replace(/[^\d]/g, "")
            setLocalLimit(value)
          }}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(localCategory, localLimit)}>
          Save
        </Button>
      </div>
    </div>
  )
})

export function FavoritesGrid({
  favorites,
  favoritesOrder,
  savedFavoriteSizes,
  onOrderChange,
  onResize,
  chartData,
  dateFilter,
}: FavoritesGridProps) {
  const router = useRouter()
  const [ringCategoryPopoverIndex, setRingCategoryPopoverIndex] = useState<
    number | null
  >(null)
  const [ringCategoryPopoverValue, setRingCategoryPopoverValue] = useState<
    string | null
  >(null)
  const [ringLimitPopoverValue, setRingLimitPopoverValue] = useState("")

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

  if (favorites.size === 0) {
    return (
      <div className="px-4 lg:px-6 mb-6">
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
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Favorite Charts</h2>
          <Badge variant="secondary">{favorites.size}</Badge>
        </div>
      </div>
      <SortableGridProvider
        chartOrder={favoritesOrder}
        onOrderChange={onOrderChange}
        className="w-full px-4 lg:px-6"
      >
        {favoritesOrder.length > 0 &&
          favoritesOrder.map((chartId) => {
            const sizeConfig = getChartCardSize(chartId as ChartId)
            const savedSize = savedFavoriteSizes[chartId]
            const defaultSize =
              DEFAULT_FAVORITE_SIZES[chartId] || { w: 12, h: 6, x: 0, y: 0 }
            const initialW = savedSize?.w ?? defaultSize.w
            const initialH = savedSize?.h ?? defaultSize.h

            return (
              <SortableGridItem
                key={chartId}
                id={chartId}
                w={(savedFavoriteSizes[chartId]?.w ?? initialW) as any}
                h={savedFavoriteSizes[chartId]?.h ?? initialH}
                resizable
                minW={sizeConfig.minW}
                maxW={sizeConfig.maxW}
                minH={sizeConfig.minH}
                maxH={sizeConfig.maxH}
                onResize={onResize}
              >
                {chartId === "financialHealthScore" ? (
                  <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                    <ChartRadar />
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
                      <CardHeader className="flex flex-row items-start justify-between gap-2 flex-1 min-h-[420px] pb-6">
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
                                            category || allExpenseCategories[0]
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
                                                ? `${category} - ${percent}% of limit (${item.value} of 1.0)`
                                                : `${category} - no limit set`
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
                                          initialCategory={
                                            ringCategoryPopoverValue ?? category
                                          }
                                          initialLimit={
                                            ringLimitPopoverValue
                                              ? parseFloat(ringLimitPopoverValue) ||
                                                limit
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
                                                  : activityData.map((ringItem) => {
                                                      const ringCategory =
                                                        (ringItem as {
                                                          category?: string
                                                        }).category ??
                                                        ringItem.label
                                                      return ringCategory as string
                                                    })
                                              base[
                                                ringCategoryPopoverIndex ?? idx
                                              ] = savedCategory
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

                                                try {
                                                  const res = await fetch("/api/budgets", {
                                                    method: "POST",
                                                    headers: {
                                                      "Content-Type": "application/json",
                                                    },
                                                    body: JSON.stringify({
                                                      categoryName: savedCategory,
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
                                  getDefaultLimit={() => getDefaultRingLimit(dateFilter)}
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
                    {(() => {
                      if (
                        chartId === "incomeExpensesTracking1" ||
                        chartId === "incomeExpensesTracking2"
                      ) {
                        return (
                          <ChartAreaInteractive
                            chartId={chartId}
                            categoryControls={incomeExpenseControls}
                            data={incomeExpensesChartData}
                          />
                        )
                      }
                      if (chartId === "spendingCategoryRankings") {
                        return (
                          <ChartCategoryFlow
                            categoryControls={categoryFlowControls}
                            data={categoryFlowChartData}
                          />
                        )
                      }
                      if (chartId === "moneyFlow") {
                        return (
                          <ChartSpendingFunnel
                            categoryControls={spendingFunnelControls}
                            data={spendingFunnelChartData}
                          />
                        )
                      }
                      if (chartId === "cashFlowSankey") {
                        return (
                          <ChartSankey
                            data={sankeyData.graph}
                            categoryControls={sankeyControls}
                          />
                        )
                      }
                      if (chartId === "expenseBreakdown") {
                        return (
                          <ChartExpensesPie
                            categoryControls={expensesPieControls}
                            data={expensesPieChartData}
                          />
                        )
                      }
                      if (chartId === "netWorthAllocation") {
                        return (
                          <ChartTreeMap
                            categoryControls={treeMapControls}
                            data={treeMapChartData}
                          />
                        )
                      }
                      if (chartId === "needsWantsBreakdown") {
                        return (
                          <ChartNeedsWantsPie
                            data={expensesPieChartData}
                            categoryControls={expensesPieControls}
                          />
                        )
                      }
                      if (chartId === "categoryBubbleMap") {
                        return <ChartCategoryBubble data={chartTransactions} />
                      }
                      if (chartId === "householdSpendMix") {
                        return (
                          <ChartPolarBar
                            data={polarBarChartData}
                            categoryControls={expensesPieControls}
                          />
                        )
                      }
                      if (chartId === "spendingStreamgraph") {
                        return (
                          <ChartSpendingStreamgraph
                            data={spendingStreamData.data}
                            keys={spendingStreamData.keys}
                            categoryControls={streamgraphControls}
                          />
                        )
                      }
                      if (chartId === "transactionHistory") {
                        return (
                          <ChartSwarmPlot
                            data={chartTransactions
                              .map((tx, idx) => ({
                                id: `tx-${tx.id || idx}`,
                                group: normalizeCategoryName(tx.category),
                                price: Math.abs(tx.amount),
                                volume: Math.min(
                                  Math.max(Math.abs(tx.amount) / 50, 4),
                                  20
                                ),
                                category: normalizeCategoryName(tx.category),
                              }))
                              .filter((item) => item.price > 0)}
                          />
                        )
                      }
                      if (chartId === "dailyTransactionActivity") {
                        return <ChartTransactionCalendar />
                      }
                      if (chartId === "dayOfWeekSpending") {
                        return (
                          <ChartDayOfWeekSpending
                            data={chartTransactions}
                            categoryControls={expensesPieControls}
                          />
                        )
                      }
                      if (chartId === "allMonthsCategorySpending") {
                        return (
                          <ChartAllMonthsCategorySpending
                            data={chartTransactions}
                            categoryControls={expensesPieControls}
                          />
                        )
                      }
                      if (chartId === "singleMonthCategorySpending") {
                        return <ChartSingleMonthCategorySpending dateFilter={dateFilter} />
                      }
                      if (chartId === "dayOfWeekCategory") {
                        return <ChartDayOfWeekCategory dateFilter={dateFilter} />
                      }
                      return null
                    })()}
                  </div>
                )}
              </SortableGridItem>
            )
          })}
      </SortableGridProvider>
    </div>
  )
}
