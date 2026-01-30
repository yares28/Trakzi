import { memo } from "react"

import { SectionCards } from "@/components/section-cards"
import { useTotalTransactionCount } from "@/hooks/use-dashboard-data"

import type { StatsSummary, StatsTrends, TransactionSummary } from "../types"

type StatsCardsProps = {
  stats: StatsSummary
  trends: StatsTrends
  transactionSummary: TransactionSummary
}

/**
 * StatsCards - Memoized stats summary cards
 *
 * Wrapped in memo to prevent re-renders during sidebar toggle.
 */
export const StatsCards = memo(function StatsCards({
  stats,
  trends,
  transactionSummary,
}: StatsCardsProps) {
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
      incomeTrend={trends.incomeTrend}
      expensesTrend={trends.expensesTrend}
      netWorthTrend={trends.netWorthTrend}
      transactionCount={transactionSummary.count}
      transactionTimeSpan={transactionSummary.timeSpan}
      transactionTrend={transactionSummary.trend}
      // All-time totals (ignores date filter for Total Transactions card)
      totalAllTimeCount={totalCount?.count}
      totalAllTimeTimeSpan={totalCount?.timeSpan}
      totalAllTimeTrend={totalCount?.trend}
    />
  )
})

StatsCards.displayName = "StatsCards"
