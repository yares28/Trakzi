"use client"

import { useMemo } from "react"
import { useCurrency } from "@/components/currency-provider"

import { Card, CardContent } from "@/components/ui/card"

interface PropertyStatsCardsProps {
  propertiesCount?: number
  topPropertyName?: string
  topPropertyValue?: number
  totalValue?: number
  totalEquity?: number
  isLoading?: boolean
}

type CardId = "count" | "top" | "value" | "equity"

interface CardData {
  id: CardId
  title: string
  value: number | string
  isCurrency?: boolean
  totalSpent?: number
}

function StatCard({ card }: { card: CardData }) {
  const { formatCurrency } = useCurrency()

  const displayValue =
    card.isCurrency && typeof card.value === "number"
      ? formatCurrency(card.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : String(card.value)

  return (
    <Card className="overflow-hidden border-border/60 bg-card/50">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.title}</p>
        <p className="mt-1 text-xl font-medium tabular-nums text-foreground md:text-2xl">
          {displayValue}
        </p>
        {card.totalSpent != null && card.totalSpent > 0 && (
          <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
            {formatCurrency(card.totalSpent, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function PropertyStatsCards({
  propertiesCount = 0,
  topPropertyName = "—",
  topPropertyValue = 0,
  totalValue = 0,
  totalEquity = 0,
}: PropertyStatsCardsProps) {
  const cardData = useMemo<Record<CardId, CardData>>(
    () => ({
      count: { id: "count", title: "Properties", value: propertiesCount, isCurrency: false },
      top: {
        id: "top",
        title: "Top property",
        value: topPropertyName,
        isCurrency: false,
        totalSpent: topPropertyValue,
      },
      value: { id: "value", title: "Total value", value: totalValue, isCurrency: true },
      equity: { id: "equity", title: "Equity", value: totalEquity, isCurrency: true },
    }),
    [propertiesCount, topPropertyName, topPropertyValue, totalValue, totalEquity]
  )

  const cardOrder: CardId[] = ["count", "top", "value", "equity"]

  return (
    <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:px-6 @xl/main:grid-cols-4">
      {cardOrder.map((cardId) => (
        <StatCard key={cardId} card={cardData[cardId]} />
      ))}
    </div>
  )
}
