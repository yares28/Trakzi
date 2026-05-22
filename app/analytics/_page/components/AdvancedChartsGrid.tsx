"use client"

import { memo } from "react"
import dynamic from "next/dynamic"

import { LazyChart } from "@/components/lazy-chart"
import { SortableGridItem, SortableGridProvider } from "@/components/sortable-grid"
import { getChartCardSize, type ChartId } from "@/lib/chart-card-sizes.config"

import { ChartDayOfWeekCategory } from "@/components/chart-day-of-week-category"
import { ChartTransactionCalendar } from "@/components/chart-transaction-calendar"
import { ChartWeekendVsWeekday } from "@/components/chart-weekend-vs-weekday"
import { ChartRecurringVsOneTime } from "@/components/chart-recurring-vs-onetime"
import { ChartSeasonalSpending } from "@/components/test-charts/chart-seasonal-spending"
import { ChartHourlySpending } from "@/components/test-charts/chart-hourly-spending"
import { ChartMoMGrowth } from "@/components/test-charts/chart-mom-growth"
import { ChartPaydayImpact } from "@/components/test-charts/chart-payday-impact"
import { ChartDailyAverageByMonth } from "@/components/test-charts/chart-daily-average-by-month"
import { ChartDailySpendAllowance } from "@/components/chart-daily-spend-allowance"

import { DEFAULT_ADVANCED_CHART_SIZES } from "../constants"
import type { AnalyticsTransaction } from "../types"

const ChartSpendingPyramid = dynamic(
  () => import("@/components/chart-spending-pyramid").then((m) => ({ default: m.ChartSpendingPyramid })),
  { ssr: false, loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted" /> }
)

type AdvancedChartsGridProps = {
  chartOrder: string[]
  onChartOrderChange: (newOrder: string[]) => void
  savedSizes: Record<string, { w: number; h: number }>
  onChartResize: (chartId: string, w: number, h: number) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundleData: any
  bundleLoading: boolean
  rawTransactions: AnalyticsTransaction[]
  isLoadingTransactions: boolean
  dateFilter: string | null
}

const EMPTY_TITLE = "No data yet"
const EMPTY_DESCRIPTION = "Import your bank statements to populate this chart."

export const AdvancedChartsGrid = memo(function AdvancedChartsGrid({
  chartOrder,
  onChartOrderChange,
  savedSizes,
  onChartResize,
  bundleData,
  bundleLoading,
  rawTransactions,
  isLoadingTransactions,
  dateFilter,
}: AdvancedChartsGridProps) {
  return (
    <SortableGridProvider chartOrder={chartOrder} onOrderChange={onChartOrderChange}>
      {chartOrder.map((chartId) => {
        const defaultSize = DEFAULT_ADVANCED_CHART_SIZES[chartId] || { w: 6, h: 8 }
        const sizeConfig = getChartCardSize(chartId as ChartId)
        const initialW = (savedSizes[chartId]?.w ?? defaultSize.w) as 6 | 12
        const initialH = savedSizes[chartId]?.h ?? defaultSize.h

        const itemProps = {
          id: chartId,
          w: initialW,
          h: initialH,
          mobileH: sizeConfig.mobileH,
          resizable: true,
          minW: sizeConfig.minW,
          maxW: sizeConfig.maxW,
          minH: sizeConfig.minH,
          maxH: sizeConfig.maxH,
          onResize: onChartResize,
        } as const

        if (chartId === "spendingPyramid") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
              <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                <ChartSpendingPyramid
                  data={bundleData?.spendingPyramid}
                  isLoading={bundleLoading}
                  emptyTitle="No data yet"
                  emptyDescription="Import your bank statements to compare your spending with the average user"
                />
              </div>
            </SortableGridItem>
          )
        }

        if (chartId === "dailyAverageByMonth") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
              <LazyChart title="Daily Average by Month" height={250}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartDailyAverageByMonth data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESCRIPTION} />
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        }

        if (chartId === "momGrowth") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
              <LazyChart title="Month-over-Month Growth" height={320}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartMoMGrowth data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESCRIPTION} />
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        }

        if (chartId === "paydayImpact") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
              <LazyChart title="Payday Impact" height={250}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartPaydayImpact data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESCRIPTION} />
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        }

        if (chartId === "recurringVsOneTime") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
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

        if (chartId === "dayOfWeekCategory") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
              <LazyChart title="Day of Week Category" height={250}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartDayOfWeekCategory
                    dateFilter={dateFilter}
                    bundleData={bundleData?.dayOfWeekCategory}
                    bundleLoading={bundleLoading}
                    emptyTitle={EMPTY_TITLE}
                    emptyDescription={EMPTY_DESCRIPTION}
                  />
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        }

        if (chartId === "dailyTransactionActivity") {
          const calendarData = bundleData?.dailySpending?.length
            ? bundleData.dailySpending.map((d: { date: string; expense: number }) => ({
                day: d.date,
                value: Math.abs(d.expense),
              }))
            : undefined
          return (
            <SortableGridItem key={chartId} {...itemProps} minH={Math.min(8, sizeConfig.minH)}>
              <LazyChart title="Daily Transaction Activity" height={250}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartTransactionCalendar
                    data={calendarData}
                    dateFilter={dateFilter}
                    emptyTitle={EMPTY_TITLE}
                    emptyDescription={EMPTY_DESCRIPTION}
                  />
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        }

        if (chartId === "seasonalSpending") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
              <LazyChart title="Seasonal Spending" height={250}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartSeasonalSpending data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESCRIPTION} />
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        }

        if (chartId === "weekendVsWeekday") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
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

        if (chartId === "dailySpendAllowance") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
              <LazyChart title="Daily Spend Allowance" height={250}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartDailySpendAllowance
                    chartId="dailySpendAllowance"
                    rawTransactions={rawTransactions}
                    isLoading={isLoadingTransactions}
                    emptyTitle={EMPTY_TITLE}
                    emptyDescription={EMPTY_DESCRIPTION}
                  />
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        }

        if (chartId === "hourlySpending") {
          return (
            <SortableGridItem key={chartId} {...itemProps}>
              <LazyChart title="Hourly Spending Pattern" height={250}>
                <div className="grid-stack-item-content h-full w-full overflow-visible flex flex-col">
                  <ChartHourlySpending data={rawTransactions} isLoading={isLoadingTransactions} emptyTitle={EMPTY_TITLE} emptyDescription={EMPTY_DESCRIPTION} />
                </div>
              </LazyChart>
            </SortableGridItem>
          )
        }

        return null
      })}
    </SortableGridProvider>
  )
})

AdvancedChartsGrid.displayName = "AdvancedChartsGrid"
