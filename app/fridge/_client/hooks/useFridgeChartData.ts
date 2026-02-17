import { useMemo } from "react"

import type { FridgeBundleData } from "@/hooks/use-dashboard-data"
import { getReceiptCategoryByName } from "@/lib/receipt-categories"

import type { ReceiptTransactionRow } from "../types"
import { normalizeCategoryName } from "../utils/categories"

type ExpenseBreakdownDatum = {
  id: string
  label: string
  value: number
}

type CategorySpendingDatum = {
  category: string
  total: number
  color: string | null
  broadType?: string | null
}

type UseFridgeChartDataParams = {
  bundleData?: FridgeBundleData
  receiptTransactions: ReceiptTransactionRow[]
}

export function useFridgeChartData({ bundleData, receiptTransactions }: UseFridgeChartDataParams) {
  const categorySpendingData = useMemo<CategorySpendingDatum[]>(() => {
    if (bundleData?.categorySpending && bundleData.categorySpending.length > 0) {
      return bundleData.categorySpending.map((item) => ({
        category: normalizeCategoryName(item.category),
        total: Number(item.total.toFixed(2)),
        color: item.color ?? null,
        broadType: item.broadType ?? null,
      }))
    }

    const totals = new Map<string, { total: number; color: string | null }>()

    receiptTransactions.forEach((item) => {
      const category = normalizeCategoryName(item.categoryName)
      const total = Number(item.totalPrice) || 0
      if (total <= 0) return

      const existing = totals.get(category)
      if (existing) {
        existing.total += total
        return
      }

      const fallbackColor = item.categoryColor ?? getReceiptCategoryByName(category)?.color ?? null
      totals.set(category, { total, color: fallbackColor })
    })

    return Array.from(totals.entries()).map(([category, info]) => ({
      category,
      total: Number(info.total.toFixed(2)),
      color: info.color,
    }))
  }, [bundleData?.categorySpending, receiptTransactions])

  const expenseBreakdownData = useMemo<ExpenseBreakdownDatum[]>(() => {
    return categorySpendingData
      .slice()
      .sort((a, b) => b.total - a.total)
      .map((item) => ({
        id: item.category,
        label: item.category,
        value: Number(item.total.toFixed(2)),
      }))
  }, [categorySpendingData])

  const spendTrendData = useMemo(() => {
    if (bundleData?.dailySpending && bundleData.dailySpending.length > 0) {
      return bundleData.dailySpending
        .map((item) => ({ date: item.date, spend: Number(item.total.toFixed(2)) }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    const totals = new Map<string, number>()
    receiptTransactions.forEach((item) => {
      if (!item.receiptDate) return
      totals.set(item.receiptDate, (totals.get(item.receiptDate) || 0) + (Number(item.totalPrice) || 0))
    })

    return Array.from(totals.entries())
      .map(([date, spend]) => ({ date, spend: Number(spend.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [bundleData?.dailySpending, receiptTransactions])

  const dailySpendingData = useMemo(() => {
    if (!bundleData?.dailySpending) return undefined
    return bundleData.dailySpending.map((item) => ({
      date: item.date,
      total: item.total,
      count: 0,
    }))
  }, [bundleData?.dailySpending])

  // ── Chart data status map ────────────────────────────────────────────
  const chartDataStatusMap = useMemo(() => {
    const hasArr = (arr: unknown[] | undefined | null) => Array.isArray(arr) && arr.length > 0
    const hasTx = hasArr(receiptTransactions)

    return {
      grocerySpendTrend: hasArr(spendTrendData) ? "has-data" : "empty",
      groceryCategoryRankings: hasTx ? "has-data" : "empty",
      groceryExpenseBreakdown: hasArr(expenseBreakdownData) ? "has-data" : "empty",
      groceryMacronutrientBreakdown: hasArr(bundleData?.macronutrientBreakdown as unknown[] | undefined) ? "has-data" : "empty",
      grocerySnackPercentage: hasArr(categorySpendingData) ? "has-data" : "empty",
      groceryDailyActivity: hasArr(dailySpendingData) || hasTx ? "has-data" : "empty",
      groceryDayOfWeekCategory: hasArr(bundleData?.dayOfWeekCategory as unknown[] | undefined) || hasTx ? "has-data" : "empty",
      grocerySingleMonthCategory: hasArr(bundleData?.monthlyCategories as unknown[] | undefined) || hasTx ? "has-data" : "empty",
      groceryAllMonthsCategory: hasArr(bundleData?.monthlyCategories as unknown[] | undefined) || hasTx ? "has-data" : "empty",
      groceryDayOfWeekSpending: hasTx ? "has-data" : "empty",
      groceryTimeOfDay: hasArr(bundleData?.hourlyActivity as unknown[] | undefined) || hasTx ? "has-data" : "empty",
      groceryVsRestaurant: hasTx ? "has-data" : "empty",
      groceryTransactionHistory: hasTx ? "has-data" : "empty",
      groceryPurchaseSizeComparison: hasTx ? "has-data" : "empty",
      groceryShoppingHeatmapHoursDays: hasArr(bundleData?.hourDayHeatmap as unknown[] | undefined) || hasTx ? "has-data" : "empty",
      groceryShoppingHeatmapDaysMonths: hasArr(bundleData?.dayMonthHeatmap as unknown[] | undefined) || hasTx ? "has-data" : "empty",
      groceryNetWorthAllocation: hasArr(categorySpendingData) || hasTx ? "has-data" : "empty",
    } as Record<string, "has-data" | "empty">
  }, [
    spendTrendData,
    receiptTransactions,
    expenseBreakdownData,
    categorySpendingData,
    dailySpendingData,
    bundleData?.macronutrientBreakdown,
    bundleData?.dayOfWeekCategory,
    bundleData?.monthlyCategories,
    bundleData?.hourlyActivity,
    bundleData?.hourDayHeatmap,
    bundleData?.dayMonthHeatmap,
  ])

  const pageHasAnyData = useMemo(
    () => Object.values(chartDataStatusMap).some((s) => s === "has-data"),
    [chartDataStatusMap],
  )

  return {
    categorySpendingData,
    chartDataStatusMap,
    expenseBreakdownData,
    spendTrendData,
    dailySpendingData,
    macronutrientBreakdown: bundleData?.macronutrientBreakdown,
    monthlyCategoriesData: bundleData?.monthlyCategories,
    dayOfWeekCategoryData: bundleData?.dayOfWeekCategory,
    hourlyActivityData: bundleData?.hourlyActivity,
    hourDayHeatmapData: bundleData?.hourDayHeatmap,
    dayMonthHeatmapData: bundleData?.dayMonthHeatmap,
    pageHasAnyData,
  }
}

export type FridgeChartData = ReturnType<typeof useFridgeChartData>
