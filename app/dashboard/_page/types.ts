export type DashboardStats = {
  analytics: {
    transactionCount: number
    score: number
    needsPercent: number
    wantsPercent: number
    savingsPercent: number
    hasEnoughTransactions: boolean
    minRequired: number
    breakdown: { needs: number; wants: number; savings: number; other: number }
    otherPercent: number
    scoreHistory?: Array<{
      month: string
      score: number
      otherPercent: number
    }>
  }
  fridge: {
    transactionCount: number
    score: number
    healthyPercent: number
    unhealthyPercent: number
    hasEnoughTransactions: boolean
    minRequired: number
    breakdown: { healthy: number; unhealthy: number; neutral: number }
    itemCounts: { healthy: number; unhealthy: number; neutral: number }
  }
  savings: {
    transactionCount: number
    totalIncome: number
    totalExpenses: number
    actualSavings: number
    savingsRate: number
    score: number
    monthlyAvgSavings: number
    targetSavings: number
    gap: number
    trend?: {
      direction: "improving" | "stable" | "declining"
      change: number
      currentMonthRate: number
      previousMonthRate: number
    }
    scoreHistory?: Array<{
      month: string
      score: number
      savingsRate: number
    }>
  }
  trends: {
    transactionCount: number
    categoryCount: number
    monthCount: number
    score: number
    categoryAnalysis: Array<{
      category: string
      userPercent: number
      avgPercent: number
      status: "below" | "average" | "above"
      difference: number
    }>
  }
  comparison: {
    userCount: number
    analytics: { userRank: number; avgScore: number; percentile: number }
    fridge: { userRank: number; avgScore: number; percentile: number }
    savings: { userRank: number; avgScore: number; percentile: number }
    trends: { userRank: number; avgScore: number; percentile: number }
  }
}

export type ScoreInsight = {
  reason: string
  tips: Array<{ text: string; icon: "categorize" | "upload" | "review" | "goal" | "import" | "reduce" | "track" | "celebrate" | "warning" | "save" }>
  priority: "low" | "medium" | "high"
}
