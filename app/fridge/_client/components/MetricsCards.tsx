import { SectionCardsFridge } from "@/components/fridge/section-cards-fridge"

import type { FridgeMetricTrends, FridgeMetrics } from "../hooks/useFridgeMetrics"

type MetricsCardsProps = {
  metrics: FridgeMetrics
  metricsTrends: FridgeMetricTrends
}

export function MetricsCards({ metrics, metricsTrends }: MetricsCardsProps) {
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
    />
  )
}
