// lib/chat/anomaly-chips.ts
// Derives dynamic suggestion chips from dashboard stats anomalies

export interface AnomalyChip {
  label: string
  prompt: string
  type: "warning" | "info" | "success"
}

interface AnomalyStats {
  savings?: {
    savingsRate?: number
    trend?: {
      direction?: string
      change?: number
      currentMonthRate?: number
      previousMonthRate?: number
    }
    gap?: number
  }
  trends?: {
    categoryAnalysis?: Array<{
      category: string
      status: "below" | "average" | "above"
      difference: number
      userPercent: number
      avgPercent: number
    }>
  }
  analytics?: {
    wantsPercent?: number
    needsPercent?: number
    otherPercent?: number
  }
  fridge?: {
    unhealthyPercent?: number
    healthyPercent?: number
    hasEnoughTransactions?: boolean
  }
}

export function getAnomalyChips(stats: AnomalyStats): AnomalyChip[] {
  const chips: AnomalyChip[] = []

  // 1. Spending trend decline
  const trend = stats.savings?.trend
  if (
    trend?.direction === "declining" &&
    typeof trend.change === "number" &&
    trend.change <= -5
  ) {
    const pct = Math.abs(trend.change)
    chips.push({
      label: `Savings dropped ${pct}% this month — find out why`,
      prompt: `My savings rate dropped by ${pct} percentage points this month compared to last month. Can you analyze what might be causing this and suggest ways to fix it?`,
      type: "warning",
    })
  }

  // 2. Above-benchmark categories
  const categoryAnalysis = stats.trends?.categoryAnalysis ?? []
  for (const cat of categoryAnalysis.slice(0, 3)) {
    if (cat.status === "above" && cat.difference >= 5) {
      chips.push({
        label: `${capitalizeFirst(cat.category)} is ${cat.difference}% above average — optimize?`,
        prompt: `My ${cat.category} spending is ${cat.userPercent}% of my budget, which is ${cat.difference}% above the typical ${cat.avgPercent}%. How can I reduce it?`,
        type: "warning",
      })
      if (chips.length >= 4) break
    }
  }

  // 3. Low savings rate
  const savingsRate = stats.savings?.savingsRate ?? 0
  if (savingsRate < 10 && savingsRate >= 0) {
    chips.push({
      label: `Savings rate is only ${savingsRate}% — target is 20%`,
      prompt: `My current savings rate is only ${savingsRate}% but the recommended target is 20%. What are the most effective steps I can take to reach the 20% goal?`,
      type: "warning",
    })
  }

  // 4. Positive trend — improving savings
  if (
    trend?.direction === "improving" &&
    typeof trend.change === "number" &&
    trend.change >= 5
  ) {
    const pct = trend.change
    chips.push({
      label: `Savings up ${pct}% this month — keep the streak?`,
      prompt: `My savings rate improved by ${pct} percentage points this month. What strategies helped and how can I maintain this momentum?`,
      type: "success",
    })
  }

  // 5. High wants spending
  const wantsPercent = stats.analytics?.wantsPercent ?? 0
  if (wantsPercent > 40) {
    chips.push({
      label: `${wantsPercent}% on wants — above the 30% limit`,
      prompt: `I'm spending ${wantsPercent}% of my budget on wants, which is above the recommended 30%. Which "wants" categories should I cut back on first?`,
      type: "warning",
    })
  }

  // 6. Fridge unhealthy eating spike
  const unhealthyPct = stats.fridge?.unhealthyPercent ?? 0
  if (stats.fridge?.hasEnoughTransactions && unhealthyPct > 30) {
    chips.push({
      label: `${unhealthyPct}% of food budget on unhealthy items`,
      prompt: `${unhealthyPct}% of my grocery spending is on unhealthy/processed items. How can I eat healthier without spending more?`,
      type: "info",
    })
  }

  return chips.slice(0, 3) // Max 3 anomaly chips
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
