"use client"

import { useMemo } from "react"
import { useCurrency } from "@/components/currency-provider"

import { Card, CardContent } from "@/components/ui/card"

interface WorldMapStatsCardsProps {
  countriesCount?: number
  topCountrySpend?: number
  topCountryName?: string
  totalSpendAbroad?: number
  domesticSpend?: number
  isLoading?: boolean
}

type CardId = "countries" | "topCountry" | "abroad" | "domestic"

interface CardData {
  id: CardId
  title: string
  value: number | string
  isCurrency?: boolean
  /** Total spent/value for "top" card (shown below name) */
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

export function WorldMapStatsCards({
  countriesCount = 0,
  topCountrySpend = 0,
  topCountryName = "—",
  totalSpendAbroad = 0,
  domesticSpend = 0,
}: WorldMapStatsCardsProps) {
  const cardData = useMemo<Record<CardId, CardData>>(
    () => ({
      countries: {
        id: "countries",
        title: "Countries",
        value: countriesCount,
        isCurrency: false,
      },
      topCountry: {
        id: "topCountry",
        title: "Top country",
        value: topCountryName,
        isCurrency: false,
        totalSpent: topCountrySpend,
      },
      abroad: {
        id: "abroad",
        title: "Spend abroad",
        value: totalSpendAbroad,
        isCurrency: true,
      },
      domestic: {
        id: "domestic",
        title: "Domestic",
        value: domesticSpend,
        isCurrency: true,
      },
    }),
    [countriesCount, topCountryName, topCountrySpend, totalSpendAbroad, domesticSpend]
  )

  const cardOrder: CardId[] = ["countries", "topCountry", "abroad", "domestic"]

  return (
    <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @5xl/main:grid-cols-4">
      {cardOrder.map((cardId) => (
        <StatCard key={cardId} card={cardData[cardId]} />
      ))}
    </div>
  )
}
