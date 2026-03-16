/**
 * Shared fridge hygiene score computation.
 * Similar to spending score, but tailored for fridge use:
 * - Fresh vs Processed ratio
 * - Category diversity
 * - Average item price (value)
 * - Recent trend
 */

type ReceiptItem = {
    id: string
    name: string
    category: string
    categoryId?: number | null
    price: number
    quantity: number
}

type Receipt = {
    id: string
    date: string
    totalAmount: number
    items: ReceiptItem[]
}

type TrendPoint = { date: string; value: number }

// We use an approximation based on categories for "fresh vs processed"
const FRESH_CATEGORIES = ["produce", "dairy", "meat", "seafood", "bakery", "fruit", "vegetable"]

function computeScoreForReceipts(receipts: Receipt[]): number {
    if (!receipts || receipts.length === 0) return 0

    let score = 50

    // Factor 1: Fresh vs Processed/Other items ratio (approximation based on category terms)
    let freshItems = 0
    let totalItems = 0
    receipts.forEach(receipt => {
        receipt.items.forEach(item => {
            totalItems += item.quantity
            const cat = item.category?.toLowerCase() || ""
            if (FRESH_CATEGORIES.some(f => cat.includes(f))) {
                freshItems += item.quantity
            }
        })
    })

    const freshRatio = totalItems > 0 ? freshItems / totalItems : 0
    if (freshRatio > 0.6) score += 15
    else if (freshRatio > 0.4) score += 10
    else if (freshRatio < 0.2) score -= 10

    // Factor 2: Category diversity
    const categoryTotals = new Map<string, number>()
    receipts.forEach(receipt => {
        receipt.items.forEach(item => {
            const cat = item.category || "Other"
            categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + (item.price * item.quantity))
        })
    })
    const totalSpend = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0)
    const topCategoryPct =
        categoryTotals.size > 0
            ? Math.max(...Array.from(categoryTotals.values())) / Math.max(totalSpend, 1)
            : 0
    if (topCategoryPct < 0.3) score += 15
    else if (topCategoryPct < 0.5) score += 5
    else score -= 5

    // Factor 3: Shopping consistency (Avoiding massive single hauls vs regular trips)
    const tripAmounts = receipts.map(r => r.totalAmount)
    const avgTrip = tripAmounts.reduce((a, b) => a + b, 0) / Math.max(tripAmounts.length, 1)
    const variance =
        tripAmounts.reduce((sum, val) => sum + Math.pow(val - avgTrip, 2), 0) /
        Math.max(tripAmounts.length, 1)
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / Math.max(avgTrip, 1)

    // Lower CV means more consistent trip sizes
    if (cv < 0.5) score += 10
    else if (cv > 1.5) score -= 10

    // Factor 4: Recent trend (average receipt size)
    const sortedDates = [...receipts].sort((a, b) => a.date.localeCompare(b.date))

    if (sortedDates.length >= 4) {
        const half = Math.floor(sortedDates.length / 2)
        const olderHalf = sortedDates.slice(0, half)
        const recentHalf = sortedDates.slice(half)

        const olderAvg = olderHalf.reduce((sum, r) => sum + r.totalAmount, 0) / olderHalf.length
        const recentAvg = recentHalf.reduce((sum, r) => sum + r.totalAmount, 0) / recentHalf.length

        const trendRatio = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0
        // Decreasing average receipt implies better discipline (usually)
        if (trendRatio < -0.1) score += 10
        else if (trendRatio > 0.2) score -= 10
    }

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

export function computeFridgeScore(receipts: Receipt[]): {
    score: number
    grade: string
    trendDirection: "improving" | "worsening" | "stable"
    scoreTrendData: TrendPoint[]
} {
    if (!receipts || receipts.length === 0) {
        return { score: 0, grade: "N/A", trendDirection: "stable", scoreTrendData: [] }
    }

    const score = computeScoreForReceipts(receipts)
    const grade = gradeFromScore(score)

    // Trend direction
    const sortedDates = [...receipts].sort((a, b) => a.date.localeCompare(b.date))
    let trendDirection: "improving" | "worsening" | "stable" = "stable"

    if (sortedDates.length >= 4) {
        const half = Math.floor(sortedDates.length / 2)
        const olderHalf = sortedDates.slice(0, half)
        const recentHalf = sortedDates.slice(half)

        const olderAvg = olderHalf.reduce((sum, r) => sum + r.totalAmount, 0) / olderHalf.length
        const recentAvg = recentHalf.reduce((sum, r) => sum + r.totalAmount, 0) / recentHalf.length
        const trendRatio = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0
        trendDirection = trendRatio < -0.1 ? "improving" : trendRatio > 0.1 ? "worsening" : "stable"
    }

    // Monthly score history
    const monthKeys = new Map<string, Receipt[]>()
    receipts.forEach(r => {
        const key = r.date.slice(0, 7) + "-01" // YYYY-MM-01
        if (!monthKeys.has(key)) monthKeys.set(key, [])
        monthKeys.get(key)!.push(r)
    })

    const sortedMonths = Array.from(monthKeys.keys()).sort()
    const scoreTrendData: TrendPoint[] = sortedMonths.map(monthKey => {
        const cutoff = monthKey.slice(0, 7) // "YYYY-MM"
        const accumulated = receipts.filter(r => r.date.slice(0, 7) <= cutoff)
        const s = computeScoreForReceipts(accumulated)
        return { date: monthKey, value: s }
    })

    return { score, grade, trendDirection, scoreTrendData }
}
