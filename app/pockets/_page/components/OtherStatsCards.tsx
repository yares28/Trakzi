"use client"

import { useMemo } from "react"
import { useCurrency } from "@/components/currency-provider"

import { Card, CardContent } from "@/components/ui/card"

interface OtherStatsCardsProps {
  itemsCount?: number
  topItemName?: string
  topItemValue?: number
  totalValue?: number
  avgValue?: number
  isLoading?: boolean
}

type CardId = "count" | "top" | "value" | "avg"

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
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{card.title}</p>
        <p className="mt-0.5 text-base font-medium tabular-nums text-foreground sm:text-lg md:text-xl truncate">
          {displayValue}
        </p>
        {card.totalSpent != null && card.totalSpent > 0 && (
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground truncate">
            {formatCurrency(card.totalSpent, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function OtherStatsCards({
  itemsCount = 0,
  topItemName = "—",
  topItemValue = 0,
  totalValue = 0,
  avgValue = 0,
}: OtherStatsCardsProps) {
  const cardData = useMemo<Record<CardId, CardData>>(
    () => ({
      count: { id: "count", title: "Items", value: itemsCount, isCurrency: false },
      top: {
        id: "top",
        title: "Top item",
        value: topItemName,
        isCurrency: false,
        totalSpent: topItemValue,
      },
      value: { id: "value", title: "Total value", value: totalValue, isCurrency: true },
      avg: { id: "avg", title: "Avg value", value: avgValue, isCurrency: true },
    }),
    [itemsCount, topItemName, topItemValue, totalValue, avgValue]
  )

  const cardOrder: CardId[] = ["count", "top", "value", "avg"]

  return (
    <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @5xl/main:grid-cols-4">
      {cardOrder.map((cardId) => (
        <StatCard key={cardId} card={cardData[cardId]} />
      ))}
    </div>
  )
}
