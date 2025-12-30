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
        <ChartAreaInteractive
          categoryControls={incomeExpenseControls}
          data={incomeExpensesChartData}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartCategoryFlow
          categoryControls={categoryFlowControls}
          data={categoryFlowChartData}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartSpendingFunnel
          categoryControls={spendingFunnelControls}
          data={spendingFunnelChartData}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartSankey />
      </div>
      <div className="px-4 lg:px-6">
        <ChartExpensesPie
          categoryControls={expensesPieControls}
          data={expensesPieChartData}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartTreeMap
          categoryControls={treeMapControls}
          data={treeMapChartData}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartNeedsWantsPie
          data={expensesPieChartData}
          categoryControls={expensesPieControls}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartCategoryBubble data={chartTransactions} />
      </div>
      <div className="px-4 lg:px-6">
        <ChartPolarBar data={polarBarChartData} categoryControls={expensesPieControls} />
      </div>
      <div className="px-4 lg:px-6">
        <ChartSpendingStreamgraph
          data={spendingStreamData.data}
          keys={spendingStreamData.keys}
          categoryControls={streamgraphControls}
        />
      </div>
      <div className="px-4 lg:px-6">
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
      </div>
      <div className="px-4 lg:px-6">
        <ChartTransactionCalendar />
      </div>
      <div className="px-4 lg:px-6">
        <ChartDayOfWeekSpending
          data={chartTransactions}
          categoryControls={expensesPieControls}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartAllMonthsCategorySpending
          data={chartTransactions}
          categoryControls={expensesPieControls}
        />
      </div>
      <div className="px-4 lg:px-6">
        <ChartSingleMonthCategorySpending dateFilter={dateFilter} />
      </div>
      <div className="px-4 lg:px-6">
        <ChartDayOfWeekCategory dateFilter={dateFilter} />
      </div>
    </>
  )
}
