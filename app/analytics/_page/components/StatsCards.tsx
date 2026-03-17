import { SectionCards } from "@/components/section-cards"
import { useTotalTransactionCount } from "@/hooks/use-dashboard-data"
import { getPeriodDaysFromFilter } from "@/lib/date-filter"
import { useDemoMode } from "@/lib/demo/demo-context"
import { usePlanFeatures } from "@/hooks/use-plan-features"

import type { AnalyticsStats, AnalyticsStatsTrends, TransactionSummary } from "../types"

type StatsCardsProps = {
  stats: AnalyticsStats
  statsTrends: AnalyticsStatsTrends
  transactionSummary: TransactionSummary
  /** Current date filter (e.g. last30days) for per-day calculations */
  dateFilter?: string | null
  /** When true, all numbers animate from 0 (data is not yet ready) */
  isLoading?: boolean
}

export function StatsCards({ stats, statsTrends, transactionSummary, dateFilter, isLoading }: StatsCardsProps) {
  // Fetch all-time transaction count (ignores date filter)
  const { data: totalCount } = useTotalTransactionCount()
  const periodDays = dateFilter ? getPeriodDaysFromFilter(dateFilter) : 0

  const { isDemoMode } = useDemoMode()
  const planFeatures = usePlanFeatures()
  const spendingScoreEnabled = (planFeatures?.advancedChartsEnabled ?? false) || isDemoMode

  return (
    <SectionCards
      isLoading={isLoading}
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
      periodDays={periodDays > 0 ? periodDays : undefined}
      spendingScore={stats.spendingScore}
      spendingGrade={stats.spendingGrade}
      spendingScoreTrend={stats.spendingScoreTrend}
      spendingScoreTrendData={stats.spendingScoreTrendData}
      spendingScoreEnabled={spendingScoreEnabled}
    />
  )
}
