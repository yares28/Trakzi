import { memo } from "react"

import { SectionCards } from "@/components/section-cards"
import { useTotalTransactionCount } from "@/hooks/use-dashboard-data"
import { usePlanFeatures } from "@/hooks/use-plan-features"
import { useDemoMode } from "@/lib/demo/demo-context"

import type { StatsSummary, StatsTrends, TransactionSummary } from "../types"

type StatsCardsProps = {
  stats: StatsSummary
  trends: StatsTrends
  transactionSummary: TransactionSummary
  isLoading?: boolean
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
  isLoading = false,
}: StatsCardsProps) {
  // Fetch all-time transaction count (ignores date filter)
  const { data: totalCount } = useTotalTransactionCount()
  const planFeatures = usePlanFeatures()
  const { isDemoMode } = useDemoMode()

  // Spending Score is enabled on advanced plans or in demo mode
  const spendingScoreEnabled = (planFeatures?.advancedChartsEnabled ?? false) || isDemoMode

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
      spendingScore={stats.spendingScore}
      spendingGrade={stats.spendingGrade}
      spendingScoreTrend={stats.spendingScoreTrend}
      spendingScoreTrendData={stats.spendingScoreTrendData}
      spendingScoreEnabled={spendingScoreEnabled}
      savingsScore={stats.savingsScore}
      savingsGrade={stats.savingsGrade}
      savingsScoreTrend={stats.savingsScoreTrend}
      savingsScoreTrendData={stats.savingsScoreTrendData}
      savingsScoreEnabled={spendingScoreEnabled}
      fridgeScore={stats.fridgeScore}
      fridgeGrade={stats.fridgeGrade}
      fridgeScoreTrend={stats.fridgeScoreTrend}
      fridgeScoreTrendData={stats.fridgeScoreTrendData}
      fridgeScoreEnabled={spendingScoreEnabled}
      isLoading={isLoading}
    />
  )
})

StatsCards.displayName = "StatsCards"
