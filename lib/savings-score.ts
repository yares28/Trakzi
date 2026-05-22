/**
 * Shared savings score computation.
 * Similar to spending score, but tailored for savings:
 * - Savings rate relative to income
 * - Consistency of saving
 * - Progress towards emergency fund or goals (approximated)
 * - Recent trend
 */

type Transaction = { date: string; amount: number; category?: string | null }
type TrendPoint = { date: string; value: number }

function computeScoreForTransactions(txs: Transaction[]): number {
    if (!txs || txs.length === 0) return 0

    let score = 50

    // Factor 1: Savings Rate (savings vs income)
    const income = txs.filter(tx => tx.amount > 0).reduce((a, b) => a + b.amount, 0)
    const expenses = Math.abs(txs.filter(tx => tx.amount < 0 && tx.category !== "Savings").reduce((a, b) => a + b.amount, 0))
    // we also count explicit "Savings" category transfers as savings. If we just have net cashflow:
    const savingsAmount = txs.filter(tx => tx.category === "Savings").reduce((a, b) => Math.abs(a + b.amount), 0)

    // Total saved is true net positive cashflow OR dedicated transfers to savings.
    const effectiveSaved = Math.max(income - expenses, savingsAmount)
    const savingsRate = income > 0 ? effectiveSaved / income : 0

    if (savingsRate > 0.2) score += 20
    else if (savingsRate > 0.1) score += 10
    else if (savingsRate > 0.05) score += 5
    else if (savingsRate < 0) score -= 15

    // Factor 2: Savings consistency
    const monthlyTotals = new Map<string, number>()
    txs.filter(tx => tx.category === "Savings" || tx.amount > 0).forEach(tx => {
        const month = tx.date.slice(0, 7)
        // very simplified: just track if we had net positive or savings transfers each month
        if (tx.category === "Savings") {
            monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + Math.abs(tx.amount))
        }
    })

    const monthsWithSavings = Array.from(monthlyTotals.values()).filter(v => v > 0).length
    const allMonths = new Set(txs.map(t => t.date.slice(0, 7))).size
    const consistencyRatio = allMonths > 0 ? monthsWithSavings / allMonths : 0

    if (consistencyRatio > 0.8) score += 10
    else if (consistencyRatio > 0.5) score += 5
    else if (consistencyRatio < 0.2) score -= 10

    // Factor 3: Recent trend (last 30 days vs prior 30 days)
    const sortedDates = txs.map(t => t.date.split("T")[0]).sort()
    if (sortedDates.length > 0) {
        const latestDate = new Date(sortedDates[sortedDates.length - 1])
        const thirtyDaysAgo = new Date(latestDate)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const sixtyDaysAgo = new Date(latestDate)
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

        const recentSavings = txs.filter(t => new Date(t.date) >= thirtyDaysAgo && t.category === "Savings")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        const priorSavings = txs.filter(t => new Date(t.date) >= sixtyDaysAgo && new Date(t.date) < thirtyDaysAgo && t.category === "Savings")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        const trendRatio = priorSavings > 0 ? (recentSavings - priorSavings) / priorSavings : (recentSavings > 0 ? 1 : 0)

        if (trendRatio > 0.2) score += 10
        else if (trendRatio < -0.2) score -= 10
    }

    // Factor 4: Buffer (if we have large sudden outflows)
    const largeOutflows = txs.filter(tx => tx.amount < 0 && Math.abs(tx.amount) > (income / 4)).length
    if (largeOutflows === 0) score += 10
    else if (largeOutflows > 2) score -= 10

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

export function computeSavingsScore(txs: Transaction[]): {
    score: number
    grade: string
    trendDirection: "improving" | "worsening" | "stable"
    scoreTrendData: TrendPoint[]
} {
    if (!txs || txs.length === 0) {
        return { score: 0, grade: "N/A", trendDirection: "stable", scoreTrendData: [] }
    }

    const score = computeScoreForTransactions(txs)
    const grade = gradeFromScore(score)

    // Trend direction
    let trendDirection: "improving" | "worsening" | "stable" = "stable"
    const sortedDates = txs.map(t => t.date.split("T")[0]).sort()

    if (sortedDates.length > 0) {
        const latestDate = new Date(sortedDates[sortedDates.length - 1])
        const thirtyDaysAgo = new Date(latestDate)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const sixtyDaysAgo = new Date(latestDate)
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

        const recentSavings = txs.filter(t => new Date(t.date) >= thirtyDaysAgo && t.category === "Savings")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        const priorSavings = txs.filter(t => new Date(t.date) >= sixtyDaysAgo && new Date(t.date) < thirtyDaysAgo && t.category === "Savings")
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

        const trendRatio = priorSavings > 0 ? (recentSavings - priorSavings) / priorSavings : (recentSavings > 0 ? 1 : 0)
        trendDirection = trendRatio > 0.1 ? "improving" : trendRatio < -0.1 ? "worsening" : "stable"
    }

    // Monthly score history
    const monthKeys = new Map<string, Transaction[]>()
    txs.forEach(tx => {
        const d = new Date(tx.date)
        if (isNaN(d.getTime())) return
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
        if (!monthKeys.has(key)) monthKeys.set(key, [])
        monthKeys.get(key)!.push(tx)
    })

    const sortedMonths = Array.from(monthKeys.keys()).sort()
    const scoreTrendData: TrendPoint[] = sortedMonths.map(monthKey => {
        const cutoff = monthKey.slice(0, 7) // "YYYY-MM"
        const accumulated = txs.filter(tx => tx.date.slice(0, 7) <= cutoff)
        const s = computeScoreForTransactions(accumulated)
        return { date: monthKey, value: s }
    })

    return { score, grade, trendDirection, scoreTrendData }
}
