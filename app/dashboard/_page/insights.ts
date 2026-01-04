import type { DashboardStats, ScoreInsight } from "./types"

export const getAnalyticsInsight = (stats: DashboardStats | null): ScoreInsight => {
  if (!stats || !stats.analytics || stats.analytics.transactionCount === 0) {
    return {
      reason: "No spending data available",
      tips: [
        { text: "Import your bank statements to analyze your spending", icon: "upload" },
        { text: "We'll calculate your 50/30/20 budget breakdown", icon: "track" },
      ],
      priority: "high",
    }
  }

  const needsPercent = stats.analytics.needsPercent ?? 0
  const wantsPercent = stats.analytics.wantsPercent ?? 0
  const score = stats.analytics.score ?? 0
  const otherPercent = stats.analytics.otherPercent ?? 0
  // API returns savingsPercent as (100 - needs - wants), so it includes other.
  // We calculate true savings by subtracting otherPercent.
  const savingsPercent = Math.max(0, 100 - needsPercent - wantsPercent - otherPercent)

  if (score >= 80) {
    const parts = [
      `Needs: ${needsPercent}%`,
      `Wants: ${wantsPercent}%`,
      savingsPercent > 0 ? `Savings: ${savingsPercent}%` : null,
      otherPercent > 0 ? `Other: ${otherPercent}%` : null
    ].filter(Boolean)

    return {
      reason: `Great balance! ${parts.join(", ")}`,
      tips: [
        { text: "You're following the 50/30/20 rule well!", icon: "celebrate" },
        { text: "Keep maintaining this healthy spending balance", icon: "track" },
      ],
      priority: "low",
    }
  }

  const tips: ScoreInsight["tips"] = []

  if (needsPercent > 50) {
    tips.push({
      text: `Needs spending is ${needsPercent}% (target: 50%). Look for ways to reduce fixed costs`,
      icon: "warning",
    })
    tips.push({ text: "Consider refinancing, switching providers, or downsizing", icon: "reduce" })
  }

  if (wantsPercent > 30) {
    tips.push({
      text: `Wants spending is ${wantsPercent}% (target: 30%). Review discretionary expenses`,
      icon: "warning",
    })
    tips.push({ text: "Try a no-spend challenge for non-essentials this week", icon: "goal" })
  }

  if (otherPercent > 20) {
    tips.push({
      text: `${otherPercent}% of spending is uncategorized/other. Categorize transactions to improve accuracy`,
      icon: "categorize"
    })
  }

  if (tips.length === 0) {
    tips.push({ text: "You're close to the ideal 50/30/20 balance!", icon: "track" })
  }

  const parts = [
    `Needs ${needsPercent}%`,
    `Wants ${wantsPercent}%`,
    savingsPercent > 0 ? `Savings ${savingsPercent}%` : null,
    otherPercent > 0 ? `Other ${otherPercent}%` : null
  ].filter(Boolean)

  return {
    reason: `Budget breakdown: ${parts.join(", ")}`,
    tips,
    priority: score < 50 ? "high" : "medium",
  }
}

export const getSavingsInsight = (stats: DashboardStats | null): ScoreInsight => {
  if (!stats || !stats.savings || stats.savings.totalIncome === 0) {
    return {
      reason: "No income data recorded",
      tips: [
        { text: "Import transactions to calculate your savings rate", icon: "upload" },
        { text: "The target is to save 20% of your income", icon: "goal" },
      ],
      priority: "high",
    }
  }

  const savingsRate = stats.savings.savingsRate ?? 0
  const actualSavings = stats.savings.actualSavings ?? 0
  const gap = stats.savings.gap ?? 0
  const score = stats.savings.score ?? 0

  if (score >= 80) {
    return {
      reason: `Excellent! Saving ${savingsRate}% of income (${actualSavings >= 0 ? "+" : ""}$${Math.abs(actualSavings).toLocaleString()})`,
      tips: [
        { text: "You're exceeding the 20% savings target!", icon: "celebrate" },
        { text: "Consider investing surplus savings for growth", icon: "goal" },
      ],
      priority: "low",
    }
  }

  if (savingsRate < 0) {
    return {
      reason: `Spending exceeds income by $${Math.abs(actualSavings).toLocaleString()}`,
      tips: [
        { text: "Your expenses exceed your income - this is unsustainable", icon: "warning" },
        { text: "Identify your top 3 expense categories to cut", icon: "reduce" },
        { text: "Set up a strict weekly budget immediately", icon: "goal" },
      ],
      priority: "high",
    }
  }

  if (savingsRate < 10) {
    return {
      reason: `Saving ${savingsRate}% of income. Target: 20% ($${Math.abs(gap).toLocaleString()} gap)`,
      tips: [
        { text: `You need to save $${Math.abs(gap).toLocaleString()} more to hit 20%`, icon: "save" },
        { text: "Automate transfers to savings on payday", icon: "track" },
        { text: "Find 2-3 subscriptions you can cancel", icon: "reduce" },
      ],
      priority: "high",
    }
  }

  return {
    reason: `Saving ${savingsRate}% of income. Almost at the 20% target!`,
    tips: [
      { text: `Just $${Math.abs(gap).toLocaleString()} more to reach 20% savings rate`, icon: "goal" },
      { text: "You're on the right track - keep going!", icon: "track" },
    ],
    priority: "medium",
  }
}

export const getFridgeInsight = (stats: DashboardStats | null): ScoreInsight => {
  if (!stats || !stats.fridge || stats.fridge.transactionCount === 0) {
    return {
      reason: "No grocery data uploaded",
      tips: [
        { text: "Upload grocery receipts to analyze your diet", icon: "upload" },
        { text: "We'll track healthy vs unhealthy food purchases", icon: "track" },
      ],
      priority: "high",
    }
  }

  const healthyPercent = stats.fridge.healthyPercent ?? 0
  const unhealthyPercent = stats.fridge.unhealthyPercent ?? 0
  const score = stats.fridge.score ?? 0
  const neutralPercent = 100 - healthyPercent - unhealthyPercent

  if (score >= 80) {
    return {
      reason: `Balanced diet! ${healthyPercent}% healthy foods, only ${unhealthyPercent}% snacks/unhealthy`,
      tips: [
        { text: "Great job prioritizing nutritious foods!", icon: "celebrate" },
        { text: "Keep up the healthy eating habits", icon: "track" },
      ],
      priority: "low",
    }
  }

  const tips: ScoreInsight["tips"] = []

  if (unhealthyPercent > 25) {
    tips.push({
      text: `${unhealthyPercent}% of purchases are snacks/unhealthy foods`,
      icon: "warning",
    })
    tips.push({ text: "Try replacing chips with nuts or fruit", icon: "goal" })
  }

  if (healthyPercent < 40) {
    tips.push({
      text: `Only ${healthyPercent}% healthy foods. Add more fruits, vegetables, and proteins`,
      icon: "warning",
    })
  }

  if (tips.length === 0) {
    tips.push({ text: "Good balance! Keep prioritizing whole foods", icon: "track" })
  }

  return {
    reason: `Diet breakdown: ${healthyPercent}% healthy, ${unhealthyPercent}% snacks, ${neutralPercent}% neutral`,
    tips,
    priority: score < 50 ? "high" : "medium",
  }
}

export const getTrendsInsight = (stats: DashboardStats | null): ScoreInsight => {
  if (!stats || !stats.trends || stats.trends.transactionCount === 0) {
    return {
      reason: "No transaction history available",
      tips: [
        { text: "Import more transactions to analyze spending trends", icon: "upload" },
        { text: "We compare your spending to typical benchmarks", icon: "track" },
      ],
      priority: "high",
    }
  }

  const categoryAnalysis = stats.trends.categoryAnalysis ?? []
  const monthCount = stats.trends.monthCount ?? 0
  const score = stats.trends.score ?? 0
  const aboveAvg = categoryAnalysis.filter((c) => c.status === "above")
  const belowAvg = categoryAnalysis.filter((c) => c.status === "below")

  if (score >= 80) {
    return {
      reason: `Spending well below average in ${belowAvg.length} categories over ${monthCount} months`,
      tips: [
        { text: "Your spending is well-controlled across categories!", icon: "celebrate" },
        { text: "You're beating typical benchmarks", icon: "track" },
      ],
      priority: "low",
    }
  }

  const tips: ScoreInsight["tips"] = []

  if (aboveAvg.length > 0) {
    tips.push({ text: "Focus on reducing spending in above-average categories", icon: "reduce" })
  }

  if (belowAvg.length > 0) {
    tips.push({
      text: `Great job! Below average in: ${belowAvg.map((c) => c.category).join(", ")}`,
      icon: "celebrate",
    })
  }

  if (tips.length === 0) {
    tips.push({ text: "Your spending is close to typical patterns", icon: "track" })
  }

  return {
    reason: `${monthCount} months analyzed: ${aboveAvg.length} categories above average, ${belowAvg.length} below`,
    tips,
    priority: score < 50 ? "high" : "medium",
  }
}
