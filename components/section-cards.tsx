"use client"

import { useMemo } from "react"
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"
import { IconLock, IconSparkles } from "@tabler/icons-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useColorScheme } from "@/components/color-scheme-provider"
import { useCurrency } from "@/components/currency-provider"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
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
  // When true, Total Transactions card only uses all-time data (no fallback to filtered)
  transactionsAllTimeOnly?: boolean
  // Fourth card: "netWorth" (default) or "savingsRate"
  fourthCard?: "netWorth" | "savingsRate"
  savingsRateTrend?: TrendDataPoint[]
  showSpendingAndSavingsRate?: boolean
  spendingRateChange?: number
  spendingRateTrend?: TrendDataPoint[]
  /** When set and showSpendingAndSavingsRate, shows spent/saved per day under rate cards */
  periodDays?: number
  /** Spending Score card (shown in analytics page) */
  spendingScore?: number
  spendingGrade?: string
  spendingScoreTrend?: "improving" | "worsening" | "stable"
  /** Monthly score history for the background wave */
  spendingScoreTrendData?: TrendDataPoint[]
  /** When false, the Spending Score card is shown blurred with a lock (feature gate) */
  spendingScoreEnabled?: boolean
  /** Savings Score card */
  savingsScore?: number
  savingsGrade?: string
  savingsScoreTrend?: "improving" | "worsening" | "stable"
  savingsScoreTrendData?: TrendDataPoint[]
  savingsScoreEnabled?: boolean
  /** Fridge Score card */
  fridgeScore?: number
  fridgeGrade?: string
  fridgeScoreTrend?: "improving" | "worsening" | "stable"
  fridgeScoreTrendData?: TrendDataPoint[]
  fridgeScoreEnabled?: boolean
}

type CardId = "income" | "expenses" | "netWorth" | "transactions" | "savingsRate" | "spendingRate"

interface CardData {
  id: CardId
  title: string
  value: number
  change: number
  description: string
  footerText: string
  footerSubtext: string
  /** Optional line under the value (e.g. "Spanning X" or "$X per day") */
  subtextUnderValue?: string
  formatOptions: { minimumFractionDigits: number; maximumFractionDigits: number }
  trendColor: string
  seed: number
  trendData: TrendDataPoint[]
  isCurrency?: boolean
  showChange?: boolean
  valueSuffix?: string
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

// Spending rate: share of income spent. Very Low = very little spent, Very High = most income spent.
function getSpendingRateLevel(rate: number): "Very Low" | "Low" | "Medium" | "High" | "Very High" {
  if (rate < 40) return "Very Low"
  if (rate < 60) return "Low"
  if (rate <= 85) return "Medium"
  if (rate <= 95) return "High"
  return "Very High"
}

// Savings rate: share of income saved. Very Low = little saved, Very High = saving a lot.
function getSavingsRateLevel(rate: number): "Very Low" | "Low" | "Medium" | "High" | "Very High" {
  if (rate < 5) return "Very Low"
  if (rate < 15) return "Low"
  if (rate <= 30) return "Medium"
  if (rate <= 50) return "High"
  return "Very High"
}

function CardComponent({ card }: { card: CardData }) {
  const { formatCurrency } = useCurrency()
  const showSpanningUnderNumber = card.footerText?.includes("Spanning")
  const description = card.title

  const badgeLabel =
    card.id === "spendingRate"
      ? getSpendingRateLevel(card.value)
      : card.id === "savingsRate"
        ? getSavingsRateLevel(card.value)
        : null

  return (
    <Card className="@container/card w-full relative group overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
      <TrendLineBackground color={card.trendColor} seed={card.seed} dataPoints={card.trendData} />
      <CardHeader className="!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1">
        <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">{description}</CardDescription>
        <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
          {card.isCurrency !== false
            ? formatCurrency(card.value, card.formatOptions)
            : card.value.toLocaleString(undefined, card.formatOptions) + (card.valueSuffix ?? "")}
        </CardTitle>
        {card.showChange !== false && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
            {badgeLabel !== null ? (
              badgeLabel
            ) : (
              <>
                {card.change >= 0 ? <IconTrendingUp className="size-2.5 mr-0.5" /> : <IconTrendingDown className="size-2.5 mr-0.5" />}
                {card.change >= 0 ? "+" : ""}
                {card.change.toFixed(1)}%
              </>
            )}
          </Badge>
        )}
        {showSpanningUnderNumber && card.footerText && (
          <p className="text-[9px] sm:text-[10px] text-muted-foreground text-balance px-2 leading-tight hidden @[180px]/card:block">
            {card.footerText}
          </p>
        )}
        {card.subtextUnderValue && (
          <p className="text-[9px] sm:text-[10px] text-muted-foreground text-balance px-2 leading-tight hidden @[180px]/card:block">
            {card.subtextUnderValue}
          </p>
        )}
      </CardHeader>
    </Card>
  )
}

// Spending Score card — mirrors CardComponent styling, gate overlay inside Card
function SpendingScoreCard({
  score,
  grade,
  trend,
  color,
  trendData = [],
  enabled = true,
}: {
  score: number
  grade: string
  trend: "improving" | "worsening" | "stable"
  color: string
  trendData?: { date: string; value: number }[]
  enabled?: boolean
}) {
  const subtextUnderValue =
    trend === "improving" ? "Trend improving"
      : trend === "worsening" ? "Trend worsening"
        : "Trend stable"

  return (
    <Card className="@container/card w-full relative group overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
      <TrendLineBackground color={color} seed={42} dataPoints={trendData} />

      {/* Card content — blurred when locked */}
      <CardHeader className={`!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1 ${!enabled ? "blur-sm opacity-40 saturate-50 pointer-events-none select-none" : ""}`}>
        <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Spending Score</CardDescription>
        <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
          {score}
        </CardTitle>
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
          {grade}
        </Badge>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-balance px-2 leading-tight hidden @[180px]/card:block">
          {subtextUnderValue}
        </p>
      </CardHeader>

      {/* Lock overlay — shown when feature is gated */}
      {!enabled && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[3px] rounded-xl w-full h-full">
          <div className="flex flex-col items-center justify-center gap-1.5 text-center w-full">
            <div className="rounded-full bg-primary/10 border border-primary/20 p-2">
              <IconLock className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="font-semibold text-[11px] text-center w-full">Spending Score</p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-3 w-fit" asChild>
              <Link href="/settings" className="flex items-center justify-center">
                <IconSparkles className="h-3 w-3" />
                <span>Upgrade</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function SavingsScoreCard({
  score,
  grade,
  trend,
  color,
  trendData = [],
  enabled = true,
}: {
  score: number
  grade: string
  trend: "improving" | "worsening" | "stable"
  color: string
  trendData?: { date: string; value: number }[]
  enabled?: boolean
}) {
  const subtextUnderValue =
    trend === "improving" ? "Trend improving"
      : trend === "worsening" ? "Trend worsening"
        : "Trend stable"

  return (
    <Card className="@container/card w-full relative group overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
      <TrendLineBackground color={color} seed={43} dataPoints={trendData} />

      <CardHeader className={`!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1 ${!enabled ? "blur-sm opacity-40 saturate-50 pointer-events-none select-none" : ""}`}>
        <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Savings Score</CardDescription>
        <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
          {score}
        </CardTitle>
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
          {grade}
        </Badge>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-balance px-2 leading-tight hidden @[180px]/card:block">
          {subtextUnderValue}
        </p>
      </CardHeader>

      {!enabled && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[3px] rounded-xl w-full h-full">
          <div className="flex flex-col items-center justify-center gap-1.5 text-center w-full">
            <div className="rounded-full bg-primary/10 border border-primary/20 p-2">
              <IconLock className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="font-semibold text-[11px] text-center w-full">Savings Score</p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-3 w-fit" asChild>
              <Link href="/settings" className="flex items-center justify-center">
                <IconSparkles className="h-3 w-3" />
                <span>Upgrade</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function FridgeScoreCard({
  score,
  grade,
  trend,
  color,
  trendData = [],
  enabled = true,
}: {
  score: number
  grade: string
  trend: "improving" | "worsening" | "stable"
  color: string
  trendData?: { date: string; value: number }[]
  enabled?: boolean
}) {
  const subtextUnderValue =
    trend === "improving" ? "Trend improving"
      : trend === "worsening" ? "Trend worsening"
        : "Trend stable"

  return (
    <Card className="@container/card w-full relative group overflow-hidden min-h-[7rem] h-full py-4 flex flex-col justify-center">
      <TrendLineBackground color={color} seed={44} dataPoints={trendData} />

      <CardHeader className={`!flex flex-col items-center justify-center p-0 h-full w-full z-10 text-center gap-1 ${!enabled ? "blur-sm opacity-40 saturate-50 pointer-events-none select-none" : ""}`}>
        <CardDescription className="text-[11px] sm:text-xs text-balance px-2 leading-tight">Fridge Score</CardDescription>
        <CardTitle className="text-xl sm:text-2xl font-bold tabular-nums break-words px-2">
          {score}
        </CardTitle>
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0 flex items-center justify-center">
          {grade}
        </Badge>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground text-balance px-2 leading-tight hidden @[180px]/card:block">
          {subtextUnderValue}
        </p>
      </CardHeader>

      {!enabled && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[3px] rounded-xl w-full h-full">
          <div className="flex flex-col items-center justify-center gap-1.5 text-center w-full">
            <div className="rounded-full bg-primary/10 border border-primary/20 p-2">
              <IconLock className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="font-semibold text-[11px] text-center w-full">Fridge Score</p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-3 w-fit" asChild>
              <Link href="/settings" className="flex items-center justify-center">
                <IconSparkles className="h-3 w-3" />
                <span>Upgrade</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
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
  transactionsAllTimeOnly = false,
  fourthCard = "netWorth",
  savingsRateTrend = [],
  showSpendingAndSavingsRate = false,
  spendingRateChange = 0,
  spendingRateTrend = [],
  periodDays = 0,
  spendingScore,
  spendingGrade,
  spendingScoreTrend = "stable",
  spendingScoreTrendData = [],
  spendingScoreEnabled = true,
  savingsScore,
  savingsGrade,
  savingsScoreTrend = "stable",
  savingsScoreTrendData = [],
  savingsScoreEnabled = true,
  fridgeScore,
  fridgeGrade,
  fridgeScoreTrend = "stable",
  fridgeScoreTrendData = [],
  fridgeScoreEnabled = true,
}: SectionCardsProps) {
  const { formatCurrency } = useCurrency()
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

  // Total Transactions: when transactionsAllTimeOnly, use only all-time data (no filter fallback)
  const displayTransactionCount =
    transactionsAllTimeOnly
      ? (totalAllTimeCount ?? safeTransactionCount)
      : (totalAllTimeCount ?? safeTransactionCount)
  const displayTransactionTimeSpan =
    transactionsAllTimeOnly
      ? (totalAllTimeTimeSpan ?? "—")
      : (totalAllTimeTimeSpan ?? transactionTimeSpan)
  const displayTransactionTrend =
    transactionsAllTimeOnly
      ? (totalAllTimeTrend ?? [])
      : (totalAllTimeTrend ?? transactionTrend)

  const { getPalette } = useColorScheme()

  // Get distinct colors from palette for each card
  const trendColors = useMemo(() => {
    const palette = getPalette()
    return [
      palette[0] || "#14b8a6", // Income
      palette[1] || "#22c55e", // Expenses
      palette[1] || "#22c55e", // Expenses
      palette[2] || "#3b82f6", // Net Worth / Savings Rate
      palette[3] || "#8b5cf6", // Transactions
      palette[2] || "#f59e0b", // Spending Rate
      palette[4] || "#6366f1", // Spending Score
      palette[5] || "#10b981", // Savings Score
      palette[6] || "#f43f5e", // Fridge Score
    ]
  }, [getPalette])

  const safeSpendingRate =
    safeTotalIncome > 0 ? (safeTotalExpenses / safeTotalIncome) * 100 : 0
  const safeSpendingRateChange = Number(spendingRateChange) || 0

  const safePeriodDays = Number(periodDays) || 0
  const spentPerDay = safePeriodDays > 0 ? safeTotalExpenses / safePeriodDays : 0
  const savedPerDay =
    safePeriodDays > 0 ? (safeTotalIncome - safeTotalExpenses) / safePeriodDays : 0

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
    savingsRate: {
      id: "savingsRate",
      title: "Savings Rate",
      value: safeSavingsRate,
      change: safeSavingsRateChange,
      description: "Savings Rate",
      footerText: `${safeSavingsRateChange >= 0 ? "Saving more" : "Saving less"
        } this period`,
      footerSubtext: "Income saved after expenses",
      subtextUnderValue:
        safePeriodDays > 0 && savedPerDay !== 0
          ? `${formatCurrency(savedPerDay, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} saved per day`
          : undefined,
      formatOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
      trendColor: trendColors[2],
      seed: 4,
      trendData: savingsRateTrend,
      isCurrency: false,
      showChange: true,
      valueSuffix: "%",
    },
    spendingRate: {
      id: "spendingRate",
      title: "Spending Rate",
      value: safeSpendingRate,
      change: safeSpendingRateChange,
      description: "Spending Rate",
      footerText: `${safeSpendingRateChange <= 0 ? "Spending less" : "Spending more"
        } this period`,
      footerSubtext: "Share of income spent",
      subtextUnderValue:
        safePeriodDays > 0 ? `${formatCurrency(spentPerDay, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent per day` : undefined,
      formatOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
      trendColor: trendColors[5],
      seed: 5,
      trendData: spendingRateTrend,
      isCurrency: false,
      showChange: true,
      valueSuffix: "%",
    },
  }), [
    safeTotalIncome,
    safeTotalExpenses,
    safeNetWorth,
    safeSavingsRate,
    safeSpendingRate,
    safeSpendingRateChange,
    safeIncomeChange,
    safeExpensesChange,
    safeNetWorthChange,
    safeSavingsRateChange,
    trendColors,
    incomeTrend,
    expensesTrend,
    netWorthTrend,
    savingsRateTrend,
    spendingRateTrend,
    displayTransactionCount,
    displayTransactionTimeSpan,
    displayTransactionTrend,
    safePeriodDays,
    spentPerDay,
    savedPerDay,
    formatCurrency,
  ])

  const cardOrder: CardId[] = showSpendingAndSavingsRate
    ? ["transactions", "income", "expenses", "spendingRate", "savingsRate"]
    : ["transactions", "income", "expenses", fourthCard]

  const hasSpendingScore = spendingScore !== undefined && spendingGrade !== undefined
  const hasSavingsScore = savingsScore !== undefined && savingsGrade !== undefined
  const hasFridgeScore = fridgeScore !== undefined && fridgeGrade !== undefined

  // Base card count
  const baseCardCount = cardOrder.length
  // Total extra cards (spending + savings scores)
  const extraCardCount = (hasSpendingScore ? 1 : 0) + (hasSavingsScore ? 1 : 0) + (hasFridgeScore ? 1 : 0)
  const totalCards = baseCardCount + extraCardCount

  // Wave color is palette-based so it looks identical to other cards
  const spendingScoreWaveColor = trendColors[6]
  const savingsScoreWaveColor = trendColors[7]
  const fridgeScoreWaveColor = trendColors[8]

  let colsClass = ""
  if (totalCards <= 4) {
    colsClass = "@5xl/main:grid-cols-2 @7xl/main:grid-cols-4"
  } else if (totalCards === 5) {
    colsClass = "@5xl/main:grid-cols-3 @7xl/main:grid-cols-5"
  } else if (totalCards === 6) {
    // 6 cards (4 basic + 2 scores, or 5 basic + 1 score)
    colsClass = "@5xl/main:grid-cols-3 @7xl/main:grid-cols-6"
  } else if (totalCards === 7) {
    // 7 cards (5 basic + 2 scores)
    colsClass = "@5xl/main:grid-cols-3 @7xl/main:grid-cols-7"
  } else {
    // 8 cards
    colsClass = "@5xl/main:grid-cols-4 @7xl/main:grid-cols-8"
  }

  return (
    <div className={`w-full *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @3xl/main:grid-cols-2 min-w-0 ${colsClass}`}>
      {cardOrder.map((cardId) => (
        <CardComponent key={cardId} card={cardData[cardId]} />
      ))}
      {hasSpendingScore && (
        <SpendingScoreCard
          score={spendingScore!}
          grade={spendingGrade!}
          trend={spendingScoreTrend}
          color={spendingScoreWaveColor}
          trendData={spendingScoreTrendData}
          enabled={spendingScoreEnabled}
        />
      )}
      {hasSavingsScore && (
        <SavingsScoreCard
          score={savingsScore!}
          grade={savingsGrade!}
          trend={savingsScoreTrend}
          color={savingsScoreWaveColor}
          trendData={savingsScoreTrendData}
          enabled={savingsScoreEnabled}
        />
      )}
      {hasFridgeScore && (
        <FridgeScoreCard
          score={fridgeScore!}
          grade={fridgeGrade!}
          trend={fridgeScoreTrend}
          color={fridgeScoreWaveColor}
          trendData={fridgeScoreTrendData}
          enabled={fridgeScoreEnabled}
        />
      )}
    </div>
  )
}

