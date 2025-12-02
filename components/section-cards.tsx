"use client"

import { useMemo } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface SectionCardsProps {
  totalIncome?: number
  totalExpenses?: number
  savingsRate?: number
  netWorth?: number
  incomeChange?: number
  expensesChange?: number
  savingsRateChange?: number
  netWorthChange?: number
}

type CardId = "income" | "expenses" | "netWorth"

interface CardData {
  id: CardId
  title: string
  value: number
  change: number
  description: string
  footerText: string
  footerSubtext: string
  formatOptions: { minimumFractionDigits: number; maximumFractionDigits: number }
}

function CardComponent({ card }: { card: CardData }) {
  return (
    <Card className="@container/card relative group">
      <CardHeader>
        <CardDescription>{card.title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          ${card.value.toLocaleString(undefined, card.formatOptions)}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            {card.change >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
            {card.change >= 0 ? "+" : ""}
            {card.change.toFixed(1)}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {card.footerText}
          {card.change >= 0 ? (
            <IconTrendingUp className="size-4" />
          ) : (
            <IconTrendingDown className="size-4" />
          )}
        </div>
        <div className="text-muted-foreground">{card.footerSubtext}</div>
      </CardFooter>
    </Card>
  )
}

export function SectionCards({
  totalIncome = 0,
  totalExpenses = 0,
  savingsRate = 0,
  netWorth = 0,
  incomeChange = 0,
  expensesChange = 0,
  savingsRateChange = 0,
  netWorthChange = 0,
}: SectionCardsProps) {
  // Ensure all values are numbers (handle case where API returns strings)
  const safeTotalIncome = Number(totalIncome) || 0
  const safeTotalExpenses = Number(totalExpenses) || 0
  const safeSavingsRate = Number(savingsRate) || 0
  const safeNetWorth = Number(netWorth) || 0
  const safeIncomeChange = Number(incomeChange) || 0
  const safeExpensesChange = Number(expensesChange) || 0
  const safeSavingsRateChange = Number(savingsRateChange) || 0
  const safeNetWorthChange = Number(netWorthChange) || 0

  const cardData = useMemo<Record<CardId, CardData>>(() => ({
    income: {
      id: "income",
      title: "Total Income",
      value: safeTotalIncome,
      change: safeIncomeChange,
      description: "Total Income",
      footerText: `${
        safeIncomeChange >= 0 ? "Income growing" : "Income decreased"
      } this month`,
      footerSubtext: "Compared to last month",
      formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    },
    expenses: {
      id: "expenses",
      title: "Total Expenses",
      value: safeTotalExpenses,
      change: safeExpensesChange,
      description: "Total Expenses",
      footerText: `${
        safeExpensesChange <= 0
          ? "Reduced spending"
          : "Spending increased"
      } this period`,
      footerSubtext:
        safeExpensesChange <= 0
          ? "Great progress on budgeting"
          : "Review your expenses",
      formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    },
    netWorth: {
      id: "netWorth",
      title: "Net Worth",
      value: safeNetWorth,
      change: safeNetWorthChange,
      description: "Net Worth",
      footerText: `${
        safeNetWorthChange >= 0 ? "Wealth growing" : "Wealth decreased"
      }`,
      footerSubtext: "Compared to last month",
      formatOptions: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
    },
  }), [
    safeTotalIncome,
    safeTotalExpenses,
    safeNetWorth,
    safeIncomeChange,
    safeExpensesChange,
    safeNetWorthChange,
  ])

  const cardOrder: CardId[] = ["income", "expenses", "netWorth"]

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      {cardOrder.map((cardId) => (
        <CardComponent key={cardId} card={cardData[cardId]} />
      ))}
    </div>
  )
}
