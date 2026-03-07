"use client"

import { memo, useMemo, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import { ChartInfoPopover } from "@/components/chart-info-popover"
import { ChartFavoriteButton } from "@/components/chart-favorite-button"
import { GridStackCardDragHandle } from "@/components/gridstack-card-drag-handle"
import { ChartAiInsightButton } from "@/components/chart-ai-insight-button"
import { ChartExpandButton } from "@/components/chart-expand-button"
import { ChartFullscreenModal } from "@/components/chart-fullscreen-modal"
import { useColorScheme } from "@/components/color-scheme-provider"
import { ChartLoadingState } from "@/components/chart-loading-state"
import { getChartTextColor } from "@/lib/chart-colors"
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react"

interface ChartSpendingScoreProps {
  data: Array<{
    date: string
    amount: number
    category?: string
  }>
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export const ChartSpendingScore = memo(function ChartSpendingScore({
  data,
  isLoading = false,
  emptyTitle,
  emptyDescription,
}: ChartSpendingScoreProps) {
  const { resolvedTheme } = useTheme()
  const { getShuffledPalette } = useColorScheme()
  const [mounted, setMounted] = useState(false)
  const [animatedScore, setAnimatedScore] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const palette = useMemo(() => getShuffledPalette(), [getShuffledPalette])

  useEffect(() => {
    setMounted(true)
  }, [])

  const scoreData = useMemo(() => {
    if (!data || data.length === 0) return { score: 0, factors: [], grade: "N/A", trend: "stable" as const }

    let score = 50

    // Factor 1: Weekend vs Weekday ratio
    let weekendSpend = 0
    let weekdaySpend = 0
    data.filter((tx) => tx.amount < 0).forEach((tx) => {
      const day = new Date(tx.date).getDay()
      if (day === 0 || day === 6) weekendSpend += Math.abs(tx.amount)
      else weekdaySpend += Math.abs(tx.amount)
    })
    const weekendRatio = weekendSpend / Math.max(weekdaySpend, 1)
    if (weekendRatio < 0.3) score += 15
    else if (weekendRatio < 0.5) score += 10
    else if (weekendRatio > 1) score -= 10

    // Factor 2: Category diversity
    const categoryTotals = new Map<string, number>()
    data.filter((tx) => tx.amount < 0).forEach((tx) => {
      const cat = tx.category || "Other"
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(tx.amount))
    })
    const totalSpend = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0)
    const topCategoryPct = Math.max(...Array.from(categoryTotals.values())) / Math.max(totalSpend, 1)
    if (topCategoryPct < 0.3) score += 15
    else if (topCategoryPct < 0.5) score += 5
    else score -= 5

    // Factor 3: Spending consistency
    const dailyTotals = new Map<string, number>()
    data.filter((tx) => tx.amount < 0).forEach((tx) => {
      const date = tx.date.split("T")[0]
      dailyTotals.set(date, (dailyTotals.get(date) || 0) + Math.abs(tx.amount))
    })
    const dailyAmounts = Array.from(dailyTotals.values())
    const avgDaily = dailyAmounts.reduce((a, b) => a + b, 0) / Math.max(dailyAmounts.length, 1)
    const variance = dailyAmounts.reduce((sum, val) => sum + Math.pow(val - avgDaily, 2), 0) / Math.max(dailyAmounts.length, 1)
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / Math.max(avgDaily, 1)
    if (cv < 0.5) score += 10
    else if (cv > 1.5) score -= 10

    // Factor 4: Recent trend
    const sortedDates = Array.from(dailyTotals.keys()).sort()
    const recentDays = sortedDates.slice(-7)
    const olderDays = sortedDates.slice(-14, -7)
    const recentAvg = recentDays.reduce((sum, d) => sum + (dailyTotals.get(d) || 0), 0) / Math.max(recentDays.length, 1)
    const olderAvg = olderDays.reduce((sum, d) => sum + (dailyTotals.get(d) || 0), 0) / Math.max(olderDays.length, 1)
    const trend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0
    if (trend < -0.2) score += 10
    else if (trend > 0.2) score -= 10

    const trendDirection = trend < -0.1 ? "improving" : trend > 0.1 ? "worsening" : "stable"

    score = Math.max(0, Math.min(100, Math.round(score)))

    let grade = "F"
    if (score >= 90) grade = "A+"
    else if (score >= 80) grade = "A"
    else if (score >= 70) grade = "B"
    else if (score >= 60) grade = "C"
    else if (score >= 50) grade = "D"

    return {
      score,
      grade,
      trend: trendDirection as "improving" | "worsening" | "stable",
      factors: [
        { name: "Weekend Ratio", impact: weekendRatio < 0.5 ? ("positive" as const) : ("negative" as const) },
        { name: "Diversity", impact: topCategoryPct < 0.5 ? ("positive" as const) : ("negative" as const) },
        { name: "Consistency", impact: cv < 1 ? ("positive" as const) : ("negative" as const) },
        { name: "Trend", impact: trend < 0 ? ("positive" as const) : trend > 0 ? ("negative" as const) : ("neutral" as const) },
      ],
    }
  }, [data])

  useEffect(() => {
    if (!mounted) return
    const target = scoreData.score
    const duration = 1500
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(target * easeOut))
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [mounted, scoreData.score])

  const isDark = resolvedTheme === "dark"
  const textColor = getChartTextColor(isDark)

  const chartTitle = "Spending Score"
  const chartDescription = "An AI-calculated score based on your spending patterns, diversity, and trends."

  const getScoreColor = () => {
    if (scoreData.score >= 80) return palette[1] || "#10b981"
    if (scoreData.score >= 60) return palette[2] || "#3b82f6"
    if (scoreData.score >= 40) return "#f59e0b"
    return "#ef4444"
  }

  const renderInfoTrigger = (forFullscreen = false) => (
    <div className={`flex items-center gap-2 ${forFullscreen ? "" : "hidden md:flex flex-col"}`}>
      <ChartInfoPopover
        title={chartTitle}
        description={chartDescription}
        details={[
          "Weekend/weekday balance",
          "Category diversification",
          "Spending consistency",
          "Recent trend direction",
        ]}
      />
      <ChartAiInsightButton
        chartId="spendingScore"
        chartTitle={chartTitle}
        chartDescription={chartDescription}
        chartData={scoreData}
        size="sm"
      />
    </div>
  )

  const TrendIcon = scoreData.trend === "improving" ? IconTrendingDown : scoreData.trend === "worsening" ? IconTrendingUp : IconMinus

  const size = 160
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const renderGauge = () => (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3">
      {/* Score ring */}
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isDark ? "#1f2937" : "#f3f4f6"}
            strokeWidth={strokeWidth}
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getScoreColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - animatedScore / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.3s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums" style={{ color: getScoreColor() }}>
            {animatedScore}
          </span>
          <span className="text-lg font-bold text-foreground">{scoreData.grade}</span>
        </div>
      </div>

      {/* Trend pill */}
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
          color: scoreData.trend === "improving" ? "#10b981" : scoreData.trend === "worsening" ? "#ef4444" : textColor,
        }}
      >
        <TrendIcon size={14} />
        <span className="capitalize">{scoreData.trend}</span>
      </div>

      {/* Factor chips */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {scoreData.factors.map((factor) => (
          <div
            key={factor.name}
            className="px-2 py-0.5 rounded-md text-[11px] font-medium"
            style={{
              backgroundColor:
                factor.impact === "positive"
                  ? isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)"
                  : factor.impact === "negative"
                    ? isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)"
                    : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              color:
                factor.impact === "positive"
                  ? "#10b981"
                  : factor.impact === "negative"
                    ? "#ef4444"
                    : textColor,
            }}
          >
            {factor.name}
          </div>
        ))}
      </div>
    </div>
  )

  if (!mounted || isLoading || (!data || data.length === 0)) {
    return (
      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="spendingScore" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">
            <ChartLoadingState
              isLoading={isLoading || !mounted}
              skeletonType="pie"
              emptyTitle={emptyTitle || "No spending data yet"}
              emptyDescription={emptyDescription || "Import your bank statements to see your spending score."}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ChartFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        title={chartTitle}
        description={chartDescription}
        headerActions={renderInfoTrigger(true)}
      >
        <div className="h-full w-full min-h-[400px]">{renderGauge()}</div>
      </ChartFullscreenModal>

      <Card className="@container/card h-full relative">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GridStackCardDragHandle />
            <ChartExpandButton onClick={() => setIsFullscreen(true)} />
            <ChartFavoriteButton chartId="spendingScore" chartTitle={chartTitle} size="md" />
            <CardTitle>{chartTitle}</CardTitle>
          </div>
          <CardAction className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {renderInfoTrigger()}
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 flex flex-col flex-1 min-h-0">
          <div className="h-full w-full min-h-[250px]">{renderGauge()}</div>
        </CardContent>
      </Card>
    </>
  )
})

ChartSpendingScore.displayName = "ChartSpendingScore"
