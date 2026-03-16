import { useMemo } from "react"

import { computeSpendingScore } from "@/lib/spending-score"
import { computeSavingsScore } from "@/lib/savings-score"
import { computeFridgeScore } from "@/lib/fridge-score"
import type {
  HomeTransaction,
  StatsSummary,
  StatsTrends,
  TransactionSummary,
} from "../types"

export function useHomeStats(transactions: HomeTransaction[]) {
  const stats = useMemo<StatsSummary>(() => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        savingsRate: 0,
        netWorth: 0,
        incomeChange: 0,
        expensesChange: 0,
        savingsRateChange: 0,
        netWorthChange: 0,
        spendingScore: 0,
        spendingGrade: "N/A",
        spendingScoreTrend: "stable" as const,
        spendingScoreTrendData: [],
        savingsScore: 0,
        savingsGrade: "N/A",
        savingsScoreTrend: "stable" as const,
        savingsScoreTrendData: [],
        fridgeScore: 0,
        fridgeGrade: "N/A",
        fridgeScoreTrend: "stable" as const,
        fridgeScoreTrendData: [],
      }
    }

    const currentIncome = transactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const currentExpenses = Math.abs(
      transactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
    )

    const currentSavingsRate =
      currentIncome > 0
        ? ((currentIncome - currentExpenses) / currentIncome) * 100
        : 0

    const netWorth = currentIncome - currentExpenses

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const threeMonthsAgo = new Date(today)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const sixMonthsAgo = new Date(threeMonthsAgo)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3)

    const formatDate = (date: Date) => date.toISOString().split("T")[0]
    const threeMonthsAgoStr = formatDate(threeMonthsAgo)
    const sixMonthsAgoStr = formatDate(sixMonthsAgo)

    const previousTransactions = transactions.filter((tx) => {
      const txDate = tx.date.split("T")[0]
      return txDate >= sixMonthsAgoStr && txDate < threeMonthsAgoStr
    })

    const previousIncome = previousTransactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const previousExpenses = Math.abs(
      previousTransactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)
    )

    const previousSavingsRate =
      previousIncome > 0
        ? ((previousIncome - previousExpenses) / previousIncome) * 100
        : 0

    const previousNetWorth = previousIncome - previousExpenses

    const incomeChange =
      previousIncome > 0
        ? ((currentIncome - previousIncome) / previousIncome) * 100
        : 0

    const expensesChange =
      previousExpenses > 0
        ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
        : 0

    const savingsRateChange =
      previousSavingsRate !== 0 ? currentSavingsRate - previousSavingsRate : 0

    const netWorthChange =
      previousNetWorth > 0 ? ((netWorth - previousNetWorth) / previousNetWorth) * 100 : 0

    const {
      score: spendingScore,
      grade: spendingGrade,
      trendDirection: spendingScoreTrend,
      scoreTrendData: spendingScoreTrendData,
    } = computeSpendingScore(transactions)

    const {
      score: savingsScore,
      grade: savingsGrade,
      trendDirection: savingsScoreTrend,
      scoreTrendData: savingsScoreTrendData,
    } = computeSavingsScore(transactions)

    // Build fridge receipts format expected by computeFridgeScore
    const receiptMap = new Map<string, any>()
    transactions.forEach((tx: any) => {
      const receiptId = String(tx.receiptId ?? tx.id)
      if (!receiptId) return

      if (!receiptMap.has(receiptId)) {
        receiptMap.set(receiptId, {
          id: receiptId,
          date: tx.receiptDate || tx.date,
          totalAmount: Number(tx.receiptTotalAmount) || 0,
          items: []
        })
      }

      const receipt = receiptMap.get(receiptId)
      if (!receipt) return

      const quantity = Number.isFinite(tx.quantity) && tx.quantity > 0 ? tx.quantity : 1
      const pricePerUnit = Number(tx.pricePerUnit) || 0
      const unitPrice = pricePerUnit > 0 ? pricePerUnit : (quantity > 0 && tx.amount > 0 ? tx.amount / quantity : tx.amount)

      receipt.items.push({
        id: String(tx.id),
        name: tx.description || "Untitled",
        category: tx.category || "Other",
        categoryId: tx.categoryId,
        price: unitPrice,
        quantity
      })

      if (!Number.isFinite(receipt.totalAmount) || receipt.totalAmount <= 0) {
        receipt.totalAmount = receipt.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
      }
    })

    const {
      score: fridgeScore,
      grade: fridgeGrade,
      trendDirection: fridgeScoreTrend,
      scoreTrendData: fridgeScoreTrendData,
    } = computeFridgeScore(Array.from(receiptMap.values()))

    return {
      totalIncome: currentIncome,
      totalExpenses: currentExpenses,
      savingsRate: currentSavingsRate,
      netWorth,
      incomeChange,
      expensesChange,
      savingsRateChange,
      netWorthChange,
      spendingScore,
      spendingGrade,
      spendingScoreTrend,
      spendingScoreTrendData,
      savingsScore,
      savingsGrade,
      savingsScoreTrend,
      savingsScoreTrendData,
      fridgeScore,
      fridgeGrade,
      fridgeScoreTrend,
      fridgeScoreTrendData,
    }
  }, [transactions])

  const statsTrends = useMemo<StatsTrends>(() => {
    if (!transactions || transactions.length === 0) {
      return {
        incomeTrend: [],
        expensesTrend: [],
        netWorthTrend: [],
      }
    }

    const dateData = new Map<
      string,
      { income: number; expenses: number; balance: number | null }
    >()

    transactions.forEach((tx) => {
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
      if (tx.balance !== null && tx.balance !== undefined) {
        dayData.balance = tx.balance
      }
    })

    const sortedDates = Array.from(dateData.keys()).sort()

    let cumulativeIncome = 0
    const incomeTrend = sortedDates.map((date) => {
      cumulativeIncome += dateData.get(date)!.income
      return { date, value: cumulativeIncome }
    })

    let cumulativeExpenses = 0
    const expensesTrend = sortedDates.map((date) => {
      cumulativeExpenses += dateData.get(date)!.expenses
      return { date, value: cumulativeExpenses }
    })

    let runningBalance = 0
    const netWorthTrend = sortedDates.map((date) => {
      const dayData = dateData.get(date)!
      if (dayData.balance !== null) {
        runningBalance = dayData.balance
      } else {
        runningBalance += dayData.income - dayData.expenses
      }
      return { date, value: runningBalance }
    })

    return {
      incomeTrend,
      expensesTrend,
      netWorthTrend,
    }
  }, [transactions])

  const transactionSummary = useMemo<TransactionSummary>(() => {
    if (!transactions || transactions.length === 0) {
      return { count: 0, timeSpan: "No data", trend: [] }
    }

    const count = transactions.length
    const dates = transactions
      .map((t) => new Date(t.date).getTime())
      .filter((t) => !isNaN(t))

    if (dates.length === 0) {
      return { count, timeSpan: "0 days", trend: [] }
    }

    const minDate = new Date(Math.min(...dates))
    const maxDate = new Date(Math.max(...dates))

    let years = maxDate.getFullYear() - minDate.getFullYear()
    let months = maxDate.getMonth() - minDate.getMonth()
    let days = maxDate.getDate() - minDate.getDate()

    if (days < 0) {
      months--
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

    const monthCounts = new Map<string, number>()
    transactions.forEach((tx) => {
      const d = new Date(tx.date)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
    })

    const trend = Array.from(monthCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }))

    return { count, timeSpan, trend }
  }, [transactions])

  return {
    stats,
    statsTrends,
    transactionSummary,
  }
}
