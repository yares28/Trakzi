"use client"

import { useMemo } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Trend data point type
type TrendDataPoint = { date: string; value: number }

interface SectionCardsProps {
  totalIncome?: number
  totalExpenses?: number
  savingsRate?: number
  netWorth?: number
  incomeChange?: number
  expensesChange?: number
  savingsRateChange?: number
  netWorthChange?: number
  // Trend data arrays for each metric
  incomeTrend?: TrendDataPoint[]
  expensesTrend?: TrendDataPoint[]
  netWorthTrend?: TrendDataPoint[]
  // Props for Transaction Summary (these are filtered by date)
  transactionCount?: number
  transactionTimeSpan?: string
  transactionTrend?: TrendDataPoint[]
  // Total transactions across ALL time (ignores date filter)
  totalAllTimeCount?: number
  totalAllTimeTimeSpan?: string
  totalAllTimeTrend?: TrendDataPoint[]
}

type CardId = "income" | "expenses" | "netWorth" | "transactions"

interface CardData {
  id: CardId
  title: string
  value: number
  change: number
  description: string
  footerText: string
  footerSubtext: string
  formatOptions: { minimumFractionDigits: number; maximumFractionDigits: number }
  trendColor: string
  seed: number
  trendData: TrendDataPoint[]
  isCurrency?: boolean
  showChange?: boolean
}

// Blurred trend line background component with real data support
export function TrendLineBackground({
  color,
  seed = 0,
  dataPoints = []
}: {
  color: string;
  seed?: number;
  dataPoints?: TrendDataPoint[];
}) {
  const pathData = useMemo(() => {
    // If we don't have enough data points, don't render anything
    if (!dataPoints || dataPoints.length < 2) {
      return null
    }

    const values = dataPoints.map(p => p.value)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1 // Avoid division by zero

    // Normalize values to Y coordinates (40-85 range, inverted because SVG Y is top-down)
    // Lower part of the card (leaving space at top for content)
    const normalizedPoints = values.map((val, i) => {
      const x = (i / (values.length - 1)) * 100
      // Map value to 40-85 range (40 = top of wave area, 85 = bottom)
      const normalizedY = 85 - ((val - minVal) / range) * 45
      return { x, y: normalizedY }
    })

    // Create smooth curve through points using quadratic curves
    let d = `M 0 100 L 0 ${normalizedPoints[0].y}`

    for (let i = 0; i < normalizedPoints.length - 1; i++) {
      const curr = normalizedPoints[i]
      const next = normalizedPoints[i + 1]
      const midX = (curr.x + next.x) / 2
      d += ` Q ${midX} ${curr.y} ${next.x} ${next.y}`
    }

    d += ` L 100 100 Z`
    return d
  }, [dataPoints])

  // Don't render anything if no valid path data
  if (!pathData) {
    return null
  }

  const gradientId = `trend-gradient-main-${seed}`

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ filter: 'blur(8px)' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="30%" stopColor={color} stopOpacity="0.08" />
          <stop offset="70%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d={pathData}
        fill={`url(#${gradientId})`}
      />
    </svg>
  )
}

function CardComponent({ card }: { card: CardData }) {
  const { formatCurrency } = useCurrency()
  return (
    <Card className="@container/card relative group overflow-hidden">
      <TrendLineBackground color={card.trendColor} seed={card.seed} dataPoints={card.trendData} />
      <CardHeader>
        <CardDescription>{card.title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {card.isCurrency !== false
            ? formatCurrency(card.value, card.formatOptions)
            : card.value.toLocaleString()}
        </CardTitle>
        {card.showChange !== false && (
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
  incomeTrend = [],
  expensesTrend = [],
  netWorthTrend = [],
  transactionCount = 0,
  transactionTimeSpan = "",
  transactionTrend = [],
  // All-time totals (preferred for transactions card)
  totalAllTimeCount,
  totalAllTimeTimeSpan,
  totalAllTimeTrend,
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
  const safeTransactionCount = Number(transactionCount) || 0

  // Use all-time data when available, otherwise fall back to filtered data
  const displayTransactionCount = totalAllTimeCount ?? safeTransactionCount
  const displayTransactionTimeSpan = totalAllTimeTimeSpan ?? transactionTimeSpan
  const displayTransactionTrend = totalAllTimeTrend ?? transactionTrend

  const { getPalette } = useColorScheme()

  // Get distinct colors from palette for each card
  const trendColors = useMemo(() => {
    const palette = getPalette().filter(c => c !== "#c3c3c3")
    return [
      palette[0] || "#14b8a6", // Income
      palette[1] || "#22c55e", // Expenses
      palette[1] || "#22c55e", // Expenses
      palette[2] || "#3b82f6", // Net Worth
      palette[3] || "#8b5cf6", // Transactions
    ]
  }, [getPalette])

  const cardData = useMemo<Record<CardId, CardData>>(() => ({
    transactions: {
      id: "transactions",
      title: "Total Transactions",
      value: displayTransactionCount,
      change: 0, // No change metric for now, or calculate if needed
      description: "Total Transactions",
      footerText: `Spanning ${displayTransactionTimeSpan}`,
      footerSubtext: "From first to last transaction",
      formatOptions: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
      trendColor: trendColors[3],
      seed: 99,
      trendData: displayTransactionTrend,
      isCurrency: false,
      showChange: false,
    },
    income: {
      id: "income",
      title: "Total Income",
      value: safeTotalIncome,
      change: safeIncomeChange,
      description: "Total Income",
      footerText: `${safeIncomeChange >= 0 ? "Income growing" : "Income decreased"
        } this month`,
      footerSubtext: "Compared to last month",
      formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      trendColor: trendColors[0],
      seed: 1,
      trendData: incomeTrend,
    },
    expenses: {
      id: "expenses",
      title: "Total Expenses",
      value: safeTotalExpenses,
      change: safeExpensesChange,
      description: "Total Expenses",
      footerText: `${safeExpensesChange <= 0
        ? "Reduced spending"
        : "Spending increased"
        } this period`,
      footerSubtext:
        safeExpensesChange <= 0
          ? "Great progress on budgeting"
          : "Review your expenses",
      formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      trendColor: trendColors[1],
      seed: 2,
      trendData: expensesTrend,
    },
    netWorth: {
      id: "netWorth",
      title: "Net Worth",
      value: safeNetWorth,
      change: safeNetWorthChange,
      description: "Net Worth",
      footerText: `${safeNetWorthChange >= 0 ? "Wealth growing" : "Wealth decreased"
        }`,
      footerSubtext: "Compared to last month",
      formatOptions: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
      trendColor: trendColors[2],
      seed: 3,
      trendData: netWorthTrend,
    },
  }), [
    safeTotalIncome,
    safeTotalExpenses,
    safeNetWorth,
    safeIncomeChange,
    safeExpensesChange,
    safeNetWorthChange,
    trendColors,
    incomeTrend,
    expensesTrend,
    netWorthTrend,
    displayTransactionCount,
    displayTransactionTimeSpan,
    displayTransactionTrend,
  ])

  // Put transactions first as requested ("top card" originally requested, now "with others") -> maybe first is best?
  // Or logically: Transactions, Income, Expenses, Net Worth ?
  // Or Income, Expenses, Net Worth, Transactions?
  // User asked for "top card" previously. I'll put it first to honor "prominence" while grouping.
  const cardOrder: CardId[] = ["transactions", "income", "expenses", "netWorth"]

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cardOrder.map((cardId) => (
        <CardComponent key={cardId} card={cardData[cardId]} />
      ))}
    </div>
  )
}
