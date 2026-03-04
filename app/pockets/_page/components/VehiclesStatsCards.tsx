"use client"

import { useMemo } from "react"
import { useCurrency } from "@/components/currency-provider"

import { Card, CardContent } from "@/components/ui/card"

interface VehiclesStatsCardsProps {
  vehiclesCount?: number
  topVehicleName?: string
  topVehicleValue?: number
  totalValue?: number
  monthlyCost?: number
  totalFuel?: number
  totalMaintenance?: number
  totalInsurance?: number
  totalLoanRemaining?: number
  isLoading?: boolean
}

type CardId =
  | "count"
  | "top"
  | "value"
  | "monthly"
  | "fuel"
  | "maintenance"
  | "insurance"
  | "loanRemaining"

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

export function VehiclesStatsCards({
  vehiclesCount = 0,
  topVehicleName = "—",
  topVehicleValue = 0,
  totalValue = 0,
  monthlyCost = 0,
  totalFuel = 0,
  totalMaintenance = 0,
  totalInsurance = 0,
  totalLoanRemaining = 0,
}: VehiclesStatsCardsProps) {
  const cardData = useMemo<Record<CardId, CardData>>(
    () => ({
      count: { id: "count", title: "Vehicles", value: vehiclesCount, isCurrency: false },
      top: {
        id: "top",
        title: "Top vehicle",
        value: topVehicleName,
        isCurrency: false,
        totalSpent: topVehicleValue,
      },
      value: { id: "value", title: "Total value", value: totalValue, isCurrency: true },
      monthly: { id: "monthly", title: "Monthly cost", value: monthlyCost, isCurrency: true },
      fuel: { id: "fuel", title: "Total fuel", value: totalFuel, isCurrency: true },
      maintenance: {
        id: "maintenance",
        title: "Total maintenance",
        value: totalMaintenance,
        isCurrency: true,
      },
      insurance: {
        id: "insurance",
        title: "Total insurance",
        value: totalInsurance,
        isCurrency: true,
      },
      loanRemaining: {
        id: "loanRemaining",
        title: "Loan remaining",
        value: totalLoanRemaining,
        isCurrency: true,
      },
    }),
    [
      vehiclesCount,
      topVehicleName,
      topVehicleValue,
      totalValue,
      monthlyCost,
      totalFuel,
      totalMaintenance,
      totalInsurance,
      totalLoanRemaining,
    ]
  )

  const cardOrder: CardId[] = [
    "count",
    "top",
    "value",
    "monthly",
    "fuel",
    "maintenance",
    "insurance",
    "loanRemaining",
  ]

  return (
    <div className="grid grid-cols-2 gap-4 px-4 lg:px-6 @5xl/main:grid-cols-4">
      {cardOrder.map((cardId) => (
        <StatCard key={cardId} card={cardData[cardId]} />
      ))}
    </div>
  )
}
