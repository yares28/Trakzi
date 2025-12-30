import { SectionCards } from "@/components/section-cards"

import type { AnalyticsStats, AnalyticsStatsTrends, TransactionSummary } from "../types"

type StatsCardsProps = {
  stats: AnalyticsStats
  statsTrends: AnalyticsStatsTrends
  transactionSummary: TransactionSummary
}

export function StatsCards({ stats, statsTrends, transactionSummary }: StatsCardsProps) {
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
      transactionCount={transactionSummary.count}
      transactionTimeSpan={transactionSummary.timeSpan}
      transactionTrend={transactionSummary.trend}
    />
  )
}
