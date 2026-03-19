import { useMemo } from "react"
import { SectionCardsFridge } from "@/components/fridge/section-cards-fridge"
import { computeFridgeScore } from "@/lib/fridge-score"

import type { FridgeMetricTrends, FridgeMetrics } from "../hooks/useFridgeMetrics"
import type { ReceiptTransactionRow } from "../types"
import { parseIsoDateUtc } from "../utils/dates"

type MetricsCardsProps = {
  metrics: FridgeMetrics
  metricsTrends: FridgeMetricTrends
  receiptTransactions: ReceiptTransactionRow[]
  isLoading?: boolean
}

type ReceiptItem = {
  id: string
  name: string
  category: string
  categoryId?: number | null
  price: number
  quantity: number
}

type Receipt = {
  id: string
  date: string
  totalAmount: number
  items: ReceiptItem[]
}

export function MetricsCards({ metrics, metricsTrends, receiptTransactions, isLoading = false }: MetricsCardsProps) {
  const { score: fridgeScore, grade: fridgeGrade, trendDirection: fridgeScoreTrend, scoreTrendData: fridgeScoreTrendData } = useMemo(() => {
    // Build receipts exactly like useFridgeData does
    const receiptMap = new Map<string, Receipt>()
    receiptTransactions.forEach(tx => {
      const receiptId = String(tx.receiptId ?? tx.id)
      if (!receiptId) return

      if (!receiptMap.has(receiptId)) {
        receiptMap.set(receiptId, {
          id: receiptId,
          date: tx.receiptDate,
          totalAmount: Number(tx.receiptTotalAmount) || 0,
          items: []
        })
      }

      const receipt = receiptMap.get(receiptId)
      if (!receipt) return

      const quantity = Number.isFinite(tx.quantity) && tx.quantity > 0 ? tx.quantity : 1
      const pricePerUnit = Number(tx.pricePerUnit)
      const unitPrice = pricePerUnit > 0 ? pricePerUnit : (quantity > 0 && tx.totalPrice > 0 ? tx.totalPrice / quantity : tx.totalPrice)

      receipt.items.push({
        id: String(tx.id),
        name: tx.description || "Untitled",
        category: tx.categoryName || "Other",
        categoryId: tx.categoryId,
        price: unitPrice,
        quantity
      })

      if (!Number.isFinite(receipt.totalAmount) || receipt.totalAmount <= 0) {
        receipt.totalAmount = receipt.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      }
    })

    return computeFridgeScore(Array.from(receiptMap.values()))
  }, [receiptTransactions])

  return (
    <SectionCardsFridge
      totalSpent={metrics.totalSpent}
      shoppingTrips={metrics.shoppingTrips}
      storesVisited={metrics.storesVisited}
      averageReceipt={metrics.averageReceipt}
      tripsFrequency={metrics.tripsFrequency}
      totalSpentTrend={metricsTrends.totalSpentTrend}
      shoppingTripsTrend={metricsTrends.shoppingTripsTrend}
      storesVisitedTrend={metricsTrends.storesVisitedTrend}
      averageReceiptTrend={metricsTrends.averageReceiptTrend}
      tripsFrequencyTrend={metricsTrends.tripsFrequencyTrend}
      fridgeScore={fridgeScore}
      fridgeGrade={fridgeGrade}
      fridgeScoreTrend={fridgeScoreTrend}
      fridgeScoreTrendData={fridgeScoreTrendData}
      fridgeScoreEnabled={true}
      isLoading={isLoading}
    />
  )
}
