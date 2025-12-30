import { SectionCards } from "@/components/section-cards"

import type { StatsSummary, StatsTrends, TransactionSummary } from "../types"

type StatsCardsProps = {
  stats: StatsSummary
  trends: StatsTrends
  transactionSummary: TransactionSummary
}

export function StatsCards({
  stats,
  trends,
  transactionSummary,
}: StatsCardsProps) {
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
    />
  )
}
