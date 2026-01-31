import { SectionCards } from "@/components/section-cards"
import { useTotalTransactionCount } from "@/hooks/use-dashboard-data"

import type { AnalyticsStats, AnalyticsStatsTrends, TransactionSummary } from "../types"

type StatsCardsProps = {
  stats: AnalyticsStats
  statsTrends: AnalyticsStatsTrends
  transactionSummary: TransactionSummary
}

export function StatsCards({ stats, statsTrends, transactionSummary }: StatsCardsProps) {
  // Fetch all-time transaction count (ignores date filter)
  const { data: totalCount } = useTotalTransactionCount()

  return (
    <SectionCards
      totalIncome={stats.totalIncome}
      totalExpenses={stats.totalExpenses}
      savingsRate={stats.savingsRate}
      netWorth={stats.netWorth}
      incomeChange={stats.incomeChange}
      expensesChange={stats.expensesChange}
      savingsRateChange={stats.savingsRateChange}
      netWorthChange={stats.netWorthChange}
      incomeTrend={statsTrends.incomeTrend}
      expensesTrend={statsTrends.expensesTrend}
      netWorthTrend={statsTrends.netWorthTrend}
      savingsRateTrend={statsTrends.savingsRateTrend}
      transactionCount={transactionSummary.count}
      transactionTimeSpan={transactionSummary.timeSpan}
      transactionTrend={transactionSummary.trend}
      totalAllTimeCount={totalCount?.count}
      totalAllTimeTimeSpan={totalCount?.timeSpan}
      totalAllTimeTrend={totalCount?.trend}
      transactionsAllTimeOnly
      showSpendingAndSavingsRate
      spendingRateChange={stats.spendingRateChange}
      spendingRateTrend={statsTrends.spendingRateTrend}
    />
  )
}
