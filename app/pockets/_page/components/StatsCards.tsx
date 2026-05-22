"use client"

import { useMemo } from "react"
import { useCurrency } from "@/components/currency-provider"

import { Card, CardContent } from "@/components/ui/card"

interface WorldMapStatsCardsProps {
  countriesCount?: number
  topCountrySpend?: number
  topCountryName?: string
  totalSpendAbroad?: number
  avgPerCountry?: number
  avgDailySpend?: number
  isLoading?: boolean
}

type CardId = "countries" | "topCountry" | "abroad" | "avgPerCountry" | "dailyRate"

interface CardData {
  id: CardId
  title: string
  value: number | string
  isCurrency?: boolean
  /** Sub-value shown below main value */
  totalSpent?: number
}

function StatCard({ card }: { card: CardData }) {
  const { formatCurrency } = useCurrency()

  const displayValue =
    card.isCurrency && typeof card.value === "number"
      ? card.value > 0
        ? formatCurrency(card.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        : "—"
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
  avgPerCountry = 0,
  avgDailySpend = 0,
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
      avgPerCountry: {
        id: "avgPerCountry",
        title: "Avg / country",
        value: avgPerCountry,
        isCurrency: true,
      },
      dailyRate: {
        id: "dailyRate",
        title: "Daily rate",
        value: avgDailySpend,
        isCurrency: true,
      },
    }),
    [countriesCount, topCountryName, topCountrySpend, totalSpendAbroad, avgPerCountry, avgDailySpend]
  )

  const cardOrder: CardId[] = ["countries", "topCountry", "abroad", "avgPerCountry", "dailyRate"]

  return (
    <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-3 @5xl/main:grid-cols-5">
      {cardOrder.map((cardId) => (
        <StatCard key={cardId} card={cardData[cardId]} />
      ))}
    </div>
  )
}
