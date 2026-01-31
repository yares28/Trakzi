import { LazyChart } from "@/components/lazy-chart"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { ChartCategoryFlow } from "@/components/chart-category-flow"
import { ChartSpendingFunnel } from "@/components/chart-spending-funnel"
import { ChartExpensesPie } from "@/components/chart-expenses-pie"
import { ChartTreeMap } from "@/components/chart-treemap"
import { ChartNeedsWantsPie } from "@/components/chart-needs-wants-pie"
import { ChartPolarBar } from "@/components/chart-polar-bar"
import { ChartCategoryBubble } from "@/components/chart-category-bubble"
import { ChartDayOfWeekCategory } from "@/components/chart-day-of-week-category"
import { ChartDayOfWeekSpending } from "@/components/chart-day-of-week-spending"
import { ChartAllMonthsCategorySpending } from "@/components/chart-all-months-category-spending"
import { ChartSingleMonthCategorySpending } from "@/components/chart-single-month-category-spending"
import { ChartSwarmPlot } from "@/components/chart-swarm-plot"
import { ChartSpendingStreamgraph } from "@/components/chart-spending-streamgraph"
import { ChartSankey } from "@/components/chart-sankey"
import { ChartTransactionCalendar } from "@/components/chart-transaction-calendar"

import type { HomeChartData } from "../hooks/useHomeChartData"
import { normalizeCategoryName } from "../utils/categories"

type ChartsGridProps = {
  chartData: HomeChartData
  dateFilter: string | null
}

export function ChartsGrid({ chartData, dateFilter }: ChartsGridProps) {
  const {
    chartTransactions,
    incomeExpenseControls,
    categoryFlowControls,
    spendingFunnelControls,
    expensesPieControls,
    treeMapControls,
    streamgraphControls,
    incomeExpensesChartData,
    categoryFlowChartData,
    spendingFunnelChartData,
    expensesPieChartData,
    polarBarChartData,
    spendingStreamData,
    treeMapChartData,
  } = chartData

  return (
    <>
      <div className="px-4 lg:px-6">
        <LazyChart title="Income & Expenses" height={250} rootMargin="0px">
          <ChartAreaInteractive
            categoryControls={incomeExpenseControls}
            data={incomeExpensesChartData}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Category Flow" height={250} rootMargin="0px">
          <ChartCategoryFlow
            categoryControls={categoryFlowControls}
            data={categoryFlowChartData}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Spending Funnel" height={250} rootMargin="0px">
          <ChartSpendingFunnel
            categoryControls={spendingFunnelControls}
            data={spendingFunnelChartData}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Cash Flow Sankey" height={250} rootMargin="0px">
          <ChartSankey />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Expense Breakdown" height={250} rootMargin="0px">
          <ChartExpensesPie
            categoryControls={expensesPieControls}
            data={expensesPieChartData}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Net Worth Allocation" height={250}>
          <ChartTreeMap
            categoryControls={treeMapControls}
            data={treeMapChartData}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Needs vs Wants" height={250}>
          <ChartNeedsWantsPie
            data={expensesPieChartData}
            categoryControls={expensesPieControls}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Category Bubble Map" height={250}>
          <ChartCategoryBubble data={chartTransactions} />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Household Spend Mix" height={250}>
          <ChartPolarBar data={polarBarChartData} categoryControls={expensesPieControls} />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Spending Streamgraph" height={250}>
          <ChartSpendingStreamgraph
            data={spendingStreamData.data}
            keys={spendingStreamData.keys}
            categoryControls={streamgraphControls}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Transaction History" height={250}>
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
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Transaction Calendar" height={250}>
          <ChartTransactionCalendar />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Day of Week Spending" height={250}>
          <ChartDayOfWeekSpending
            data={chartTransactions}
            categoryControls={expensesPieControls}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="All Months Category Spending" height={250}>
          <ChartAllMonthsCategorySpending
            data={chartTransactions}
            categoryControls={expensesPieControls}
          />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Single Month Category Spending" height={250}>
          <ChartSingleMonthCategorySpending dateFilter={dateFilter} />
        </LazyChart>
      </div>
      <div className="px-4 lg:px-6">
        <LazyChart title="Day of Week Category" height={250}>
          <ChartDayOfWeekCategory dateFilter={dateFilter} />
        </LazyChart>
      </div>
    </>
  )
}
