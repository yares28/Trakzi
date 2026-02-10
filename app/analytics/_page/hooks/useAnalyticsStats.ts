import { useMemo } from "react"

import type { AnalyticsTransaction, AnalyticsStats, AnalyticsStatsTrends, TransactionSummary } from "../types"

export function useAnalyticsStats(rawTransactions: AnalyticsTransaction[]) {
  // Calculate stats directly from transactions data (like dashboard)
  const stats: AnalyticsStats = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        savingsRate: 0,
        spendingRate: 0,
        netWorth: 0,
        incomeChange: 0,
        expensesChange: 0,
        savingsRateChange: 0,
        spendingRateChange: 0,
        netWorthChange: 0,
      }
    }

    const currentIncome = rawTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const currentExpenses = Math.abs(
      rawTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0),
    )

    const currentSavingsRate =
      currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0
    const currentSpendingRate =
      currentIncome > 0 ? (currentExpenses / currentIncome) * 100 : 0

    const sortedByDate = [...rawTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    const netWorth =
      sortedByDate.length > 0 && sortedByDate[0].balance !== null ? sortedByDate[0].balance : 0

    // Derive the "current" date window from the latest transaction date so that
    // server and client renders stay deterministic and avoid hydration mismatch.
    const latestTxDate = sortedByDate.length > 0 ? new Date(sortedByDate[0].date) : new Date()
    const today = new Date(latestTxDate.getFullYear(), latestTxDate.getMonth(), latestTxDate.getDate())
    const threeMonthsAgo = new Date(today)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date(threeMonthsAgo)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3)

    const formatDate = (date: Date) => date.toISOString().split("T")[0]
    const threeMonthsAgoStr = formatDate(threeMonthsAgo)
    const sixMonthsAgoStr = formatDate(sixMonthsAgo)

    const previousTransactions = rawTransactions.filter(tx => {
      const txDate = tx.date.split("T")[0]
      return txDate >= sixMonthsAgoStr && txDate < threeMonthsAgoStr
    })

    const previousIncome = previousTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const previousExpenses = Math.abs(
      previousTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0),
    )

    const previousSavingsRate =
      previousIncome > 0 ? ((previousIncome - previousExpenses) / previousIncome) * 100 : 0
    const previousSpendingRate =
      previousIncome > 0 ? (previousExpenses / previousIncome) * 100 : 0

    const previousSorted = previousTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    const previousNetWorth =
      previousSorted.length > 0 && previousSorted[0].balance !== null
        ? previousSorted[0].balance
        : 0

    const incomeChange =
      previousIncome > 0
        ? ((currentIncome - previousIncome) / previousIncome) * 100
        : currentIncome > 0
          ? 100
          : 0

    const expensesChange =
      previousExpenses > 0
        ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
        : currentExpenses > 0
          ? 100
          : 0

    const savingsRateChange =
      previousSavingsRate !== 0
        ? currentSavingsRate - previousSavingsRate
        : currentSavingsRate > 0
          ? 100
          : 0

    const spendingRateChange =
      previousSpendingRate !== 0
        ? currentSpendingRate - previousSpendingRate
        : currentSpendingRate > 0
          ? 100
          : 0

    const netWorthChange =
      previousNetWorth > 0
        ? ((netWorth - previousNetWorth) / previousNetWorth) * 100
        : netWorth > 0
          ? 100
          : 0

    return {
      totalIncome: currentIncome,
      totalExpenses: currentExpenses,
      savingsRate: currentSavingsRate,
      spendingRate: currentSpendingRate,
      netWorth: netWorth,
      incomeChange,
      expensesChange,
      savingsRateChange,
      spendingRateChange,
      netWorthChange,
    }
  }, [rawTransactions])

  // Calculate trend data for stat cards (daily cumulative values)
  const statsTrends: AnalyticsStatsTrends = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return {
        incomeTrend: [],
        expensesTrend: [],
        netWorthTrend: [],
        savingsRateTrend: [],
        spendingRateTrend: [],
      }
    }

    // Group transactions by date
    const dateData = new Map<string, { income: number; expenses: number; balance: number | null }>()

    rawTransactions.forEach((tx) => {
      const date = tx.date.split("T")[0]
      if (!dateData.has(date)) {
        dateData.set(date, { income: 0, expenses: 0, balance: null })
      }
      const dayData = dateData.get(date)!
      if (tx.amount > 0) {
        dayData.income += tx.amount
      } else {
        dayData.expenses += Math.abs(tx.amount)
      }
      // Keep the last balance for the day
      if (tx.balance !== null && tx.balance !== undefined) {
        dayData.balance = tx.balance
      }
    })

    // Sort dates
    const sortedDates = Array.from(dateData.keys()).sort()

    // Cumulative income trend
    let cumulativeIncome = 0
    const incomeTrend = sortedDates.map(date => {
      cumulativeIncome += dateData.get(date)!.income
      return { date, value: cumulativeIncome }
    })

    // Cumulative expenses trend
    let cumulativeExpenses = 0
    const expensesTrend = sortedDates.map(date => {
      cumulativeExpenses += dateData.get(date)!.expenses
      return { date, value: cumulativeExpenses }
    })

    // Net worth trend (use balance if available, otherwise cumulative income - expenses)
    let runningBalance = 0
    const netWorthTrend = sortedDates.map(date => {
      const dayData = dateData.get(date)!
      if (dayData.balance !== null) {
        runningBalance = dayData.balance
      } else {
        runningBalance += dayData.income - dayData.expenses
      }
      return { date, value: runningBalance }
    })

    // Savings rate trend (daily: (cumulative income - cumulative expenses) / cumulative income * 100)
    let cumIncome = 0
    let cumExpenses = 0
    const savingsRateTrend = sortedDates.map(date => {
      const dayData = dateData.get(date)!
      cumIncome += dayData.income
      cumExpenses += dayData.expenses
      const rate = cumIncome > 0 ? ((cumIncome - cumExpenses) / cumIncome) * 100 : 0
      return { date, value: rate }
    })

    // Spending rate trend (daily: cumulative expenses / cumulative income * 100)
    cumIncome = 0
    cumExpenses = 0
    const spendingRateTrend = sortedDates.map(date => {
      const dayData = dateData.get(date)!
      cumIncome += dayData.income
      cumExpenses += dayData.expenses
      const rate = cumIncome > 0 ? (cumExpenses / cumIncome) * 100 : 0
      return { date, value: rate }
    })

    return {
      incomeTrend,
      expensesTrend,
      netWorthTrend,
      savingsRateTrend,
      spendingRateTrend,
    }
  }, [rawTransactions])

  const transactionSummary: TransactionSummary = useMemo(() => {
    if (!rawTransactions || rawTransactions.length === 0) {
      return { count: 0, timeSpan: "0 days", trend: [] }
    }

    const count = rawTransactions.length

    // Calculate time span between earliest and latest transaction
    const dates = rawTransactions
      .map((tx) => new Date(tx.date))
      .filter((d) => !isNaN(d.getTime()))

    if (dates.length === 0) {
      return { count, timeSpan: "0 days", trend: [] }
    }

    const timestamps = dates.map((date) => date.getTime())
    const minDate = new Date(Math.min(...timestamps))
    const maxDate = new Date(Math.max(...timestamps))

    let years = maxDate.getFullYear() - minDate.getFullYear()
    let months = maxDate.getMonth() - minDate.getMonth()
    let days = maxDate.getDate() - minDate.getDate()

    if (days < 0) {
      months--
      // Approximation for days in previous month
      days += 30
    }
    if (months < 0) {
      years--
      months += 12
    }

    let timeSpan = ""
    if (years > 0) {
      timeSpan = `${years} year${years > 1 ? "s" : ""}`
      if (months > 0) timeSpan += ` and ${months} month${months > 1 ? "s" : ""}`
    } else if (months > 0) {
      timeSpan = `${months} month${months > 1 ? "s" : ""}`
      if (days > 0) timeSpan += ` and ${days} day${days > 1 ? "s" : ""}`
    } else {
      timeSpan = `${days} day${days !== 1 ? "s" : ""}`
    }

    // 3. Trend Data (Import Rate / Frequency)
    const monthCounts = new Map<string, number>()
    rawTransactions.forEach((tx) => {
      const d = new Date(tx.date)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
    })

    const trend = Array.from(monthCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }))

    return { count, timeSpan, trend }
  }, [rawTransactions])

  return {
    stats,
    statsTrends,
    transactionSummary,
  }
}
