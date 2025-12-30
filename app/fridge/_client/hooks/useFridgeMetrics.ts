import { useMemo } from "react"

import type { FridgeBundleData } from "@/hooks/use-dashboard-data"

import type { ReceiptTransactionRow } from "../types"
import { parseIsoDateUtc } from "../utils/dates"

type TrendPoint = { date: string; value: number }

export type FridgeMetrics = {
  totalSpent: number
  shoppingTrips: number
  storesVisited: number
  averageReceipt: number
  tripsFrequency: number
}

export type FridgeMetricTrends = {
  totalSpentTrend: TrendPoint[]
  shoppingTripsTrend: TrendPoint[]
  storesVisitedTrend: TrendPoint[]
  averageReceiptTrend: TrendPoint[]
  tripsFrequencyTrend: TrendPoint[]
}

type UseFridgeMetricsParams = {
  bundleData?: FridgeBundleData
  receiptTransactions: ReceiptTransactionRow[]
}

type ReceiptSummary = {
  id: string
  date: string
  storeName: string
  totalAmount: number
}

function buildReceipts(transactions: ReceiptTransactionRow[]): ReceiptSummary[] {
  const receiptMap = new Map<string, ReceiptSummary>()

  transactions.forEach((tx) => {
    const receiptId = String(tx.receiptId ?? tx.id)
    if (!receiptId) return

    if (!receiptMap.has(receiptId)) {
      receiptMap.set(receiptId, {
        id: receiptId,
        date: tx.receiptDate,
        storeName: tx.storeName ?? "Unknown",
        totalAmount: Number(tx.receiptTotalAmount) || 0,
      })
    }
  })

  return Array.from(receiptMap.values()).filter((receipt) => receipt.date)
}

export function useFridgeMetrics({ bundleData, receiptTransactions }: UseFridgeMetricsParams) {
  const receipts = useMemo(() => buildReceipts(receiptTransactions), [receiptTransactions])

  const metrics = useMemo<FridgeMetrics>(() => {
    const totalSpent = Number(bundleData?.kpis?.totalSpent ?? 0) || receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0)
    const shoppingTrips = receipts.length
    const storesVisited = new Set(receipts.map((receipt) => receipt.storeName)).size
    const averageReceipt = shoppingTrips > 0 ? totalSpent / shoppingTrips : 0

    const sortedDates = receipts
      .map((receipt) => receipt.date)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))

    let tripsFrequency = 0
    if (sortedDates.length >= 2) {
      let totalDays = 0
      for (let i = 1; i < sortedDates.length; i += 1) {
        const prev = parseIsoDateUtc(sortedDates[i - 1]).getTime()
        const next = parseIsoDateUtc(sortedDates[i]).getTime()
        const diffDays = Math.max(0, (next - prev) / (1000 * 60 * 60 * 24))
        totalDays += diffDays
      }
      tripsFrequency = totalDays / (sortedDates.length - 1)
    }

    return {
      totalSpent: Number(totalSpent.toFixed(2)),
      shoppingTrips,
      storesVisited,
      averageReceipt: Number(averageReceipt.toFixed(2)),
      tripsFrequency: Number(tripsFrequency.toFixed(1)),
    }
  }, [bundleData?.kpis?.totalSpent, receipts])

  const metricsTrends = useMemo<FridgeMetricTrends>(() => {
    if (receipts.length === 0) {
      return {
        totalSpentTrend: [],
        shoppingTripsTrend: [],
        storesVisitedTrend: [],
        averageReceiptTrend: [],
        tripsFrequencyTrend: [],
      }
    }

    const dailyMap = new Map<
      string,
      { totalSpent: number; trips: number; stores: Set<string>; totals: number[] }
    >()

    receipts.forEach((receipt) => {
      if (!dailyMap.has(receipt.date)) {
        dailyMap.set(receipt.date, { totalSpent: 0, trips: 0, stores: new Set(), totals: [] })
      }
      const day = dailyMap.get(receipt.date)
      if (!day) return
      day.totalSpent += receipt.totalAmount
      day.trips += 1
      day.stores.add(receipt.storeName)
      day.totals.push(receipt.totalAmount)
    })

    const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => a.localeCompare(b))

    const totalSpentTrend = sortedDates.map((date) => ({
      date,
      value: Number(dailyMap.get(date)?.totalSpent.toFixed(2) ?? 0),
    }))

    const shoppingTripsTrend = sortedDates.map((date) => ({
      date,
      value: dailyMap.get(date)?.trips ?? 0,
    }))

    const storesVisitedTrend = sortedDates.map((date) => ({
      date,
      value: dailyMap.get(date)?.stores.size ?? 0,
    }))

    const averageReceiptTrend = sortedDates.map((date) => {
      const day = dailyMap.get(date)
      if (!day || day.trips === 0) return { date, value: 0 }
      return { date, value: Number((day.totalSpent / day.trips).toFixed(2)) }
    })

    const tripsFrequencyTrend = sortedDates.map((date, index) => {
      if (index === 0) return { date, value: 0 }
      const prevDate = sortedDates[index - 1]
      const prev = parseIsoDateUtc(prevDate).getTime()
      const next = parseIsoDateUtc(date).getTime()
      const diffDays = Math.max(0, (next - prev) / (1000 * 60 * 60 * 24))
      return { date, value: Number(diffDays.toFixed(1)) }
    })

    return {
      totalSpentTrend,
      shoppingTripsTrend,
      storesVisitedTrend,
      averageReceiptTrend,
      tripsFrequencyTrend,
    }
  }, [receipts])

  return { metrics, metricsTrends }
}
