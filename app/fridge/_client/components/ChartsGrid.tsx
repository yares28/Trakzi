import { SortableGridItem, SortableGridProvider, type GridWidth } from "@/components/sortable-grid"
import { LazyChart } from "@/components/lazy-chart"
import { ChartAreaInteractiveFridge } from "@/components/fridge/chart-area-interactive-fridge"
import { ChartCategoryFlowFridge } from "@/components/fridge/chart-category-flow-fridge"
import { ChartExpenseBreakdownFridge } from "@/components/fridge/chart-expense-breakdown-fridge"
import { ChartMacronutrientBreakdownFridge } from "@/components/fridge/chart-macronutrient-breakdown-fridge"
import { ChartSnackPercentageFridge } from "@/components/fridge/chart-snack-percentage-fridge"
import { ChartDailyActivityFridge } from "@/components/fridge/chart-daily-activity-fridge"

import { ChartDayOfWeekCategoryFridge } from "@/components/fridge/chart-day-of-week-category-fridge"
import { ChartSingleMonthCategoryFridge } from "@/components/fridge/chart-single-month-category-fridge"
import { ChartAllMonthsCategoryFridge } from "@/components/fridge/chart-all-months-category-fridge"
import { ChartDayOfWeekSpendingCategoryFridge } from "@/components/fridge/chart-day-of-week-spending-category-fridge"
import { ChartTimeOfDayShoppingFridge } from "@/components/fridge/chart-time-of-day-shopping-fridge"
import { ChartGroceryVsRestaurantFridge } from "@/components/fridge/chart-grocery-vs-restaurant-fridge"
import { ChartTransactionHistoryFridge } from "@/components/fridge/chart-transaction-history-fridge"
import { ChartPurchaseSizeComparisonFridge } from "@/components/fridge/chart-purchase-size-comparison-fridge"
import { ChartShoppingHeatmapHoursDaysFridge } from "@/components/fridge/chart-shopping-heatmap-hours-days-fridge"
import { ChartShoppingHeatmapDaysMonthsFridge } from "@/components/fridge/chart-shopping-heatmap-days-months-fridge"
import { ChartTreeMapFridge } from "@/components/fridge/chart-treemap-fridge"
import { PageEmptyState, FRIDGE_EMPTY_STATE } from "@/components/page-empty-state"
import { CollapsedChartCard } from "@/components/collapsed-chart-card"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"

import type { ReceiptTransactionRow, FridgeChartId } from "../types"
import type { FridgeChartData } from "../hooks/useFridgeChartData"
import { DEFAULT_CHART_SIZES, FRIDGE_CHART_TO_ANALYTICS_CHART } from "../constants"

type ChartsGridProps = {
  chartOrder: FridgeChartId[]
  onOrderChange: (order: FridgeChartId[]) => void
  savedChartSizes: Record<FridgeChartId, { w: number; h: number; x?: number; y?: number }>
  onResize: (chartId: FridgeChartId, w: number, h: number) => void
  chartData: FridgeChartData
  receiptTransactions: ReceiptTransactionRow[]
  dateFilter: string | null
  isLoading: boolean
  isError?: boolean
}

export function ChartsGrid({
  chartOrder,
  onOrderChange,
  savedChartSizes,
  onResize,
  chartData,
  receiptTransactions,
  dateFilter,
  isLoading,
  isError = false,
}: ChartsGridProps) {
  const handleOrderChange = (newOrder: string[]) => {
    onOrderChange(newOrder as FridgeChartId[])
  }

  const handleResize = (id: string, w: GridWidth, h: number) => {
    onResize(id as FridgeChartId, w, h)
  }

  // Map of chart IDs to their display titles for LazyChart
  const chartTitles: Record<FridgeChartId, string> = {
    grocerySpendTrend: "Grocery Spend Trend",
    groceryCategoryRankings: "Category Rankings",
    groceryExpenseBreakdown: "Expense Breakdown",
    groceryMacronutrientBreakdown: "Macronutrient Breakdown",
    grocerySnackPercentage: "Spending Breakdown",
    groceryDailyActivity: "Daily Activity",

    groceryDayOfWeekCategory: "Day of Week by Category",
    grocerySingleMonthCategory: "Single Month Category",
    groceryAllMonthsCategory: "All Months Category",
    groceryDayOfWeekSpending: "Day of Week Spending",
    groceryTimeOfDay: "Time of Day",
    groceryVsRestaurant: "Grocery vs Restaurant",
    groceryTransactionHistory: "Transaction History",
    groceryPurchaseSizeComparison: "Purchase Size Comparison",
    groceryShoppingHeatmapHoursDays: "Shopping Heatmap (Hours/Days)",
    groceryShoppingHeatmapDaysMonths: "Shopping Heatmap (Days/Months)",
    groceryNetWorthAllocation: "Grocery Allocation",
  }

  const { chartDataStatusMap, pageHasAnyData } = chartData

  // ── Page-level empty state flags ────────────────────────────────────
  const showPageEmptyState = !isLoading && !pageHasAnyData && !isError
  const showErrorState = !isLoading && isError

  const renderChart = (chartId: FridgeChartId) => {
    switch (chartId) {
      case "grocerySpendTrend":
        return <ChartAreaInteractiveFridge data={chartData.spendTrendData} />
      case "groceryCategoryRankings":
        return (
          <ChartCategoryFlowFridge
            receiptTransactions={receiptTransactions}
            monthlyCategoriesData={chartData.monthlyCategoriesData}
            isLoading={isLoading}
            dateFilter={dateFilter}
          />
        )
      case "groceryExpenseBreakdown":
        return (
          <ChartExpenseBreakdownFridge
            data={chartData.expenseBreakdownData}
            categorySpendingData={chartData.categorySpendingData}
            isLoading={isLoading}
          />
        )
      case "groceryMacronutrientBreakdown":
        return (
          <ChartMacronutrientBreakdownFridge
            receiptTransactions={receiptTransactions}
            macronutrientBreakdown={chartData.macronutrientBreakdown}
            isLoading={isLoading}
          />
        )
      case "grocerySnackPercentage":
        return (
          <ChartSnackPercentageFridge
            receiptTransactions={receiptTransactions}
            categorySpendingData={chartData.categorySpendingData}
            isLoading={isLoading}
          />
        )
      case "groceryDailyActivity":
        return (
          <ChartDailyActivityFridge
            receiptTransactions={receiptTransactions}
            dailySpendingData={chartData.dailySpendingData}
            dateFilter={dateFilter}
            isLoading={isLoading}
          />
        )
      case "groceryDayOfWeekCategory":
        return (
          <ChartDayOfWeekCategoryFridge
            receiptTransactions={receiptTransactions}
            dayOfWeekCategoryData={chartData.dayOfWeekCategoryData}
            isLoading={isLoading}
          />
        )
      case "grocerySingleMonthCategory":
        return (
          <ChartSingleMonthCategoryFridge
            receiptTransactions={receiptTransactions}
            monthlyCategoriesData={chartData.monthlyCategoriesData}
            isLoading={isLoading}
          />
        )
      case "groceryAllMonthsCategory":
        return (
          <ChartAllMonthsCategoryFridge
            receiptTransactions={receiptTransactions}
            monthlyCategoriesData={chartData.monthlyCategoriesData}
            isLoading={isLoading}
          />
        )
      case "groceryDayOfWeekSpending":
        return (
          <ChartDayOfWeekSpendingCategoryFridge
            receiptTransactions={receiptTransactions}
            isLoading={isLoading}
          />
        )
      case "groceryTimeOfDay":
        return (
          <ChartTimeOfDayShoppingFridge
            receiptTransactions={receiptTransactions}
            hourlyActivityData={chartData.hourlyActivityData}
            isLoading={isLoading}
          />
        )
      case "groceryVsRestaurant":
        return <ChartGroceryVsRestaurantFridge dateFilter={dateFilter} />
      case "groceryTransactionHistory":
        return (
          <ChartTransactionHistoryFridge
            receiptTransactions={receiptTransactions}
            isLoading={isLoading}
          />
        )
      case "groceryPurchaseSizeComparison":
        return (
          <ChartPurchaseSizeComparisonFridge
            receiptTransactions={receiptTransactions}
            isLoading={isLoading}
          />
        )
      case "groceryShoppingHeatmapHoursDays":
        return (
          <ChartShoppingHeatmapHoursDaysFridge
            receiptTransactions={receiptTransactions}
            hourDayHeatmapData={chartData.hourDayHeatmapData}
            isLoading={isLoading}
          />
        )
      case "groceryShoppingHeatmapDaysMonths":
        return (
          <ChartShoppingHeatmapDaysMonthsFridge
            receiptTransactions={receiptTransactions}
            dayMonthHeatmapData={chartData.dayMonthHeatmapData}
            isLoading={isLoading}
          />
        )
      case "groceryNetWorthAllocation":
        return (
          <ChartTreeMapFridge
            receiptTransactions={receiptTransactions}
            categorySpendingData={chartData.categorySpendingData}
            isLoading={isLoading}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="w-full mb-4">
      {showPageEmptyState && (
        <div className="px-4 lg:px-6">
          <PageEmptyState
            icon={FRIDGE_EMPTY_STATE.icon}
            title={FRIDGE_EMPTY_STATE.title}
            description={FRIDGE_EMPTY_STATE.description}
          />
        </div>
      )}

      {showErrorState && (
        <div className="px-4 lg:px-6">
          <PageEmptyState
            title="Unable to load charts"
            description="Something went wrong fetching your grocery data. Please refresh the page."
          />
        </div>
      )}

      <SortableGridProvider
        chartOrder={chartOrder}
        onOrderChange={handleOrderChange}
        className="px-4 lg:px-6"
      >
        {chartOrder.map((chartId, index) => {
          const defaultSize = DEFAULT_CHART_SIZES[chartId]
          const sizeConfig = getChartCardSize(FRIDGE_CHART_TO_ANALYTICS_CHART[chartId] as ChartId)
          // Above-fold: first 5 charts load immediately (rootMargin="0px") for snappier LCP
          const rootMargin = index < 5 ? "0px" : "200px"

          // ── Per-chart empty state logic ──────────────────────────────────
          const analyticsChartId = FRIDGE_CHART_TO_ANALYTICS_CHART[chartId] as ChartId
          const chartStatus = chartDataStatusMap[chartId]

          if (!isLoading && chartStatus === "empty") {
            return (
              <SortableGridItem key={chartId} id={chartId} w={6} h={1}>
                <CollapsedChartCard
                  chartId={analyticsChartId}
                  chartTitle={chartTitles[chartId]}
                />
              </SortableGridItem>
            )
          }

          return (
            <SortableGridItem
              key={chartId}
              id={chartId}
              w={(savedChartSizes[chartId]?.w ?? defaultSize.w) as GridWidth}
              h={savedChartSizes[chartId]?.h ?? defaultSize.h}
              mobileH={sizeConfig.mobileH}
              resizable
              minW={sizeConfig.minW}
              maxW={sizeConfig.maxW}
              minH={sizeConfig.minH}
              maxH={sizeConfig.maxH}
              onResize={handleResize}
            >
              <LazyChart title={chartTitles[chartId]} height={250} rootMargin={rootMargin}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  {renderChart(chartId)}
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        })}
      </SortableGridProvider>
    </div>
  )
}
