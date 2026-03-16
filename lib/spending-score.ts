/**
 * Shared spending score computation.
 * Same 4-factor algorithm used in the ChartSpendingScore chart component.
 */

type Transaction = { date: string; amount: number; category?: string | null }
type TrendPoint = { date: string; value: number }

function computeScoreForTransactions(txs: Transaction[]): number {
    if (!txs || txs.length === 0) return 0

    let score = 50

    // Factor 1: Weekend vs Weekday ratio
    let weekendSpend = 0
    let weekdaySpend = 0
    txs.filter(tx => tx.amount < 0).forEach(tx => {
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
    txs.filter(tx => tx.amount < 0).forEach(tx => {
        const cat = tx.category || "Other"
        categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Math.abs(tx.amount))
    })
    const totalSpend = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0)
    const topCategoryPct =
        categoryTotals.size > 0
            ? Math.max(...Array.from(categoryTotals.values())) / Math.max(totalSpend, 1)
            : 0
    if (topCategoryPct < 0.3) score += 15
    else if (topCategoryPct < 0.5) score += 5
    else score -= 5

    // Factor 3: Spending consistency
    const dailyTotals = new Map<string, number>()
    txs.filter(tx => tx.amount < 0).forEach(tx => {
        const date = tx.date.split("T")[0]
        dailyTotals.set(date, (dailyTotals.get(date) || 0) + Math.abs(tx.amount))
    })
    const dailyAmounts = Array.from(dailyTotals.values())
    const avgDaily = dailyAmounts.reduce((a, b) => a + b, 0) / Math.max(dailyAmounts.length, 1)
    const variance =
        dailyAmounts.reduce((sum, val) => sum + Math.pow(val - avgDaily, 2), 0) /
        Math.max(dailyAmounts.length, 1)
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / Math.max(avgDaily, 1)
    if (cv < 0.5) score += 10
    else if (cv > 1.5) score -= 10

    // Factor 4: Recent trend
    const sortedDates = Array.from(dailyTotals.keys()).sort()
    const recentDays = sortedDates.slice(-7)
    const olderDays = sortedDates.slice(-14, -7)
    const recentAvg =
        recentDays.reduce((sum, d) => sum + (dailyTotals.get(d) || 0), 0) /
        Math.max(recentDays.length, 1)
    const olderAvg =
        olderDays.reduce((sum, d) => sum + (dailyTotals.get(d) || 0), 0) /
        Math.max(olderDays.length, 1)
    const trendRatio = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0
    if (trendRatio < -0.2) score += 10
    else if (trendRatio > 0.2) score -= 10

    return Math.max(0, Math.min(100, Math.round(score)))
}

export function gradeFromScore(score: number): string {
    if (score >= 97) return "S"
    if (score >= 90) return "A+"
    if (score >= 83) return "A"
    if (score >= 75) return "A-"
    if (score >= 68) return "B+"
    if (score >= 60) return "B"
    if (score >= 52) return "B-"
    if (score >= 44) return "C"
    if (score >= 36) return "D"
    return "F"
}

export function computeSpendingScore(txs: Transaction[]): {
    score: number
    grade: string
    trendDirection: "improving" | "worsening" | "stable"
    /** Monthly score history for use as a trend sparkline */
    scoreTrendData: TrendPoint[]
} {
    if (!txs || txs.length === 0) {
        return { score: 0, grade: "N/A", trendDirection: "stable", scoreTrendData: [] }
    }

    const score = computeScoreForTransactions(txs)
    const grade = gradeFromScore(score)

    // Trend direction: compare last 7 days avg spend to prior 7 days
    const dailyTotals = new Map<string, number>()
    txs.filter(tx => tx.amount < 0).forEach(tx => {
        const date = tx.date.split("T")[0]
        dailyTotals.set(date, (dailyTotals.get(date) || 0) + Math.abs(tx.amount))
    })
    const sortedDates = Array.from(dailyTotals.keys()).sort()
    const recentDays = sortedDates.slice(-7)
    const olderDays = sortedDates.slice(-14, -7)
    const recentAvg =
        recentDays.reduce((sum, d) => sum + (dailyTotals.get(d) || 0), 0) / Math.max(recentDays.length, 1)
    const olderAvg =
        olderDays.reduce((sum, d) => sum + (dailyTotals.get(d) || 0), 0) / Math.max(olderDays.length, 1)
    const trendRatio = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0
    const trendDirection: "improving" | "worsening" | "stable" =
        trendRatio < -0.1 ? "improving" : trendRatio > 0.1 ? "worsening" : "stable"

    // Build monthly score history: group transactions by month-year, compute score per month
    const monthKeys = new Map<string, Transaction[]>()
    txs.forEach(tx => {
        const d = new Date(tx.date)
        if (isNaN(d.getTime())) return
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
        if (!monthKeys.has(key)) monthKeys.set(key, [])
        monthKeys.get(key)!.push(tx)
    })

    // Sort months and compute a running score (accumulate months up to each point so
    // the line reflects progress over time, not just single-month volatility)
    const sortedMonths = Array.from(monthKeys.keys()).sort()
    const scoreTrendData: TrendPoint[] = sortedMonths.map(monthKey => {
        // Use all transactions up to and including this month
        const cutoff = monthKey.slice(0, 7) // "YYYY-MM"
        const accumulated = txs.filter(tx => tx.date.slice(0, 7) <= cutoff)
        const s = computeScoreForTransactions(accumulated)
        return { date: monthKey, value: s }
    })

    return { score, grade, trendDirection, scoreTrendData }
}
