"use client"

import { useMemo } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"
import { TrendLineBackground } from "@/components/section-cards"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
  change?: number
  footerText: string
  footerSubtext: string
  trendColor: string
  seed: number
  isCurrency?: boolean
  showChange?: boolean
}

function CardComponent({ card }: { card: CardData }) {
  const { formatCurrency } = useCurrency()

  return (
    <Card className="@container/card relative group overflow-hidden">
      <TrendLineBackground color={card.trendColor} seed={card.seed} dataPoints={[]} />
      <CardHeader>
        <CardDescription>{card.title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {card.isCurrency && typeof card.value === "number"
            ? formatCurrency(card.value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : card.value}
        </CardTitle>
        {card.showChange && card.change !== undefined && (
          <CardAction>
            <Badge variant="outline">
              {card.change >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {card.change >= 0 ? "+" : ""}
              {card.change.toFixed(1)}%
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {card.footerText}
        </div>
        <div className="text-muted-foreground">{card.footerSubtext}</div>
      </CardFooter>
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
  const { getPalette } = useColorScheme()
  const { formatCurrency } = useCurrency()

  const trendColors = useMemo(() => {
    const palette = getPalette()
    return [
      palette[0] || "#14b8a6",
      palette[1] || "#22c55e",
      palette[2] || "#3b82f6",
      palette[3] || "#8b5cf6",
    ]
  }, [getPalette])

  const cardData = useMemo<Record<CardId, CardData>>(() => ({
    countries: {
      id: "countries",
      title: "Countries",
      value: countriesCount,
      footerText: "Unique countries tracked",
      footerSubtext: "Based on transaction locations",
      trendColor: trendColors[0],
      seed: 1,
      isCurrency: false,
      showChange: false,
    },
    topCountry: {
      id: "topCountry",
      title: "Top Country",
      value: topCountryName,
      footerText: topCountrySpend > 0
        ? `${formatCurrency(topCountrySpend, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} spent`
        : "No data yet",
      footerSubtext: "Highest spending location",
      trendColor: trendColors[1],
      seed: 2,
      isCurrency: false,
      showChange: false,
    },
    abroad: {
      id: "abroad",
      title: "Spend Abroad",
      value: totalSpendAbroad,
      footerText: "International transactions",
      footerSubtext: "All foreign spending combined",
      trendColor: trendColors[2],
      seed: 3,
      isCurrency: true,
      showChange: false,
    },
    domestic: {
      id: "domestic",
      title: "Domestic Spend",
      value: domesticSpend,
      footerText: "Local transactions",
      footerSubtext: "Spending in home country",
      trendColor: trendColors[3],
      seed: 4,
      isCurrency: true,
      showChange: false,
    },
  }), [countriesCount, topCountrySpend, topCountryName, totalSpendAbroad, domesticSpend, trendColors, formatCurrency])

  const cardOrder: CardId[] = ["countries", "topCountry", "abroad", "domestic"]

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cardOrder.map((cardId) => (
        <CardComponent key={cardId} card={cardData[cardId]} />
      ))}
    </div>
  )
}
