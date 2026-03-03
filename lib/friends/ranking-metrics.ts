// lib/friends/ranking-metrics.ts
// Computes privacy-safe ranking metrics for the friends leaderboard.
// All values are percentages (0-100) or scores — never raw dollar amounts.
//
// Entry requirements (to avoid gaming with a single transaction):
//   Analytics/Savings: >= 20 categorized transactions AND >= 500 total spend volume in the current month
//   Fridge Score:      >= 2 receipts AND >= 50 total spend volume on receipts in the current month

import { neonQuery } from '@/lib/neonClient'
import { getCachedOrCompute, buildCacheKey } from '@/lib/cache/upstash'
import { canViewMetrics } from '@/lib/friends/sharing'

const RANKING_METRICS_TTL = 5 * 60 // 5 minutes

export interface UserRankingMetrics {
    savingsRate: number        // (income - expense) / income as % (0-100)
    financialHealth: number    // 50/30/20 rule adherence score (0-100)
    consistencyScore: number   // inverse coefficient of variation (0-100)
    fridgeScore: number        // healthy vs unhealthy food purchase ratio (0-100)
    wantsPercent: number       // % of spending on "wants" — lower is better
    overallScore: number       // weighted composite (0-100)
    isPrivate: boolean         // true if the viewer can't see real metrics
    isRanked: boolean          // false if entry requirements not met
}

const PRIVATE_METRICS: UserRankingMetrics = {
    savingsRate: 0,
    financialHealth: 0,
    consistencyScore: 0,
    fridgeScore: 0,
    wantsPercent: 0,
    overallScore: 0,
    isPrivate: true,
    isRanked: false,
}

const UNRANKED_METRICS: Omit<UserRankingMetrics, 'isPrivate'> = {
    savingsRate: 0,
    financialHealth: 0,
    consistencyScore: 0,
    fridgeScore: 0,
    wantsPercent: 0,
    overallScore: 0,
    isRanked: false,
}

/**
 * Compute metrics for a single user. Results are cached.
 * @param monthStart ISO date string for the first day of the competition month (e.g. '2026-03-01').
 *                   Defaults to the first day of the current calendar month.
 */
export async function computeUserMetrics(
    userId: string,
    monthStart?: string
): Promise<Omit<UserRankingMetrics, 'isPrivate'>> {
    // Resolve the month start — default to current month's first day
    const effectiveMonthStart = monthStart ?? (() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    })()

    const monthKey = effectiveMonthStart.substring(0, 7) // 'YYYY-MM'
    const cacheKey = buildCacheKey('friends', userId, null, `ranking-metrics-${monthKey}`)

    return getCachedOrCompute(cacheKey, async () => {
        // Run all metric queries in parallel
        const [entryCheck, financials, monthlySpending, fridgeData] = await Promise.all([
            checkEntryRequirements(userId, effectiveMonthStart),
            getFinancials(userId, effectiveMonthStart),
            getMonthlySpending(userId),
            getFridgeScore(userId, effectiveMonthStart),
        ])

        // If entry requirements not met, return unranked state
        if (!entryCheck.meetsTransactionRequirement) {
            return { ...UNRANKED_METRICS }
        }

        const savingsRate = financials.totalIncome > 0
            ? Math.round(((financials.totalIncome - financials.totalExpense) / financials.totalIncome) * 100)
            : 0

        const financialHealth = computeFinancialHealth(financials)
        const consistencyScore = computeConsistency(monthlySpending)

        // wantsPercent: lower is better for ranking purposes
        const wantsPercent = financials.totalExpense > 0
            ? Math.round((financials.wants / financials.totalExpense) * 100)
            : 0

        // fridgeScore: 0 if entry requirement not met
        const fridgeScore = entryCheck.meetsFridgeRequirement ? fridgeData.score : 0

        // Overall: savingsRate 30%, health 30%, consistency 20%, fridge 20%
        // wantsPercent is its own ranking category, not part of overall
        const overallScore = Math.round(
            clamp(savingsRate, 0, 100) * 0.30 +
            financialHealth * 0.30 +
            consistencyScore * 0.20 +
            (entryCheck.meetsFridgeRequirement ? fridgeScore * 0.20 : financialHealth * 0.20)
        )

        return {
            savingsRate: clamp(savingsRate, 0, 100),
            financialHealth,
            consistencyScore,
            fridgeScore: entryCheck.meetsFridgeRequirement ? fridgeScore : 0,
            wantsPercent: clamp(wantsPercent, 0, 100),
            overallScore: clamp(overallScore, 0, 100),
            isRanked: true,
        }
    }, RANKING_METRICS_TTL)
}

/**
 * Compute rankings for all of a user's friends.
 * Respects privacy: friends who haven't opted in get `isPrivate: true`.
 */
export async function computeFriendRankings(
    viewerId: string,
    friendUserIds: string[]
): Promise<Map<string, UserRankingMetrics>> {
    const results = new Map<string, UserRankingMetrics>()

    if (friendUserIds.length === 0) return results

    // Check visibility + compute metrics in parallel per friend
    const tasks = friendUserIds.map(async (friendId) => {
        const allowed = await canViewMetrics(viewerId, friendId)
        if (!allowed) {
            results.set(friendId, PRIVATE_METRICS)
            return
        }
        const metrics = await computeUserMetrics(friendId)
        results.set(friendId, { ...metrics, isPrivate: false })
    })

    await Promise.all(tasks)
    return results
}

// ─── Internal query helpers ─────────────────────────────────────────────────

/**
 * Check if user meets minimum thresholds to appear on the leaderboard.
 * Prevents gaming with a single perfectly-categorized transaction.
 *
 * Transaction requirement: >= 20 categorized transactions AND >= 500 volume this month
 * Fridge requirement:      >= 2 receipts AND >= 50 volume in receipt transactions this month
 */
async function checkEntryRequirements(userId: string, monthStart: string): Promise<{
    meetsTransactionRequirement: boolean
    meetsFridgeRequirement: boolean
}> {
    const MIN_TX_COUNT = 20
    const MIN_TX_VOLUME = 500
    const MIN_RECEIPT_COUNT = 2
    const MIN_RECEIPT_VOLUME = 50

    const [txRows, fridgeRows] = await Promise.all([
        neonQuery<{ tx_count: string; tx_volume: string }>(
            `SELECT
                COUNT(*) FILTER (WHERE category_id IS NOT NULL)::text AS tx_count,
                COALESCE(SUM(ABS(amount)) FILTER (WHERE amount < 0), 0)::text AS tx_volume
             FROM transactions
             WHERE user_id = $1
               AND tx_date >= $2::date
               AND tx_date < ($2::date + INTERVAL '1 month')`,
            [userId, monthStart]
        ),
        neonQuery<{ receipt_count: string; receipt_volume: string }>(
            `SELECT
                COUNT(DISTINCT r.id)::text AS receipt_count,
                COALESCE(SUM(rt.total_price), 0)::text AS receipt_volume
             FROM receipts r
             JOIN receipt_transactions rt ON rt.receipt_id = r.id
             WHERE r.user_id = $1
               AND r.created_at >= $2::date
               AND r.created_at < ($2::date + INTERVAL '1 month')`,
            [userId, monthStart]
        ),
    ])

    const txCount = parseInt(txRows[0]?.tx_count ?? '0', 10)
    const txVolume = parseFloat(txRows[0]?.tx_volume ?? '0')
    const receiptCount = parseInt(fridgeRows[0]?.receipt_count ?? '0', 10)
    const receiptVolume = parseFloat(fridgeRows[0]?.receipt_volume ?? '0')

    return {
        meetsTransactionRequirement: txCount >= MIN_TX_COUNT && txVolume >= MIN_TX_VOLUME,
        meetsFridgeRequirement: receiptCount >= MIN_RECEIPT_COUNT && receiptVolume >= MIN_RECEIPT_VOLUME,
    }
}

interface Financials {
    totalIncome: number
    totalExpense: number
    essentials: number
    mandatory: number
    wants: number
}

async function getFinancials(userId: string, monthStart: string): Promise<Financials> {
    // Scoped to the competition month
    const rows = await neonQuery<{
        total_income: string
        total_expense: string
        essentials: string
        mandatory: string
        wants: string
    }>(
        `SELECT
            COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS total_income,
            ABS(COALESCE(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END), 0)) AS total_expense,
            ABS(COALESCE(SUM(CASE WHEN t.amount < 0 AND c.broad_type IN ('Essentials') THEN t.amount ELSE 0 END), 0)) AS essentials,
            ABS(COALESCE(SUM(CASE WHEN t.amount < 0 AND c.broad_type IN ('Mandatory') THEN t.amount ELSE 0 END), 0)) AS mandatory,
            ABS(COALESCE(SUM(CASE WHEN t.amount < 0 AND c.broad_type IN ('Wants') THEN t.amount ELSE 0 END), 0)) AS wants
         FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1
           AND t.tx_date >= $2::date
           AND t.tx_date < ($2::date + INTERVAL '1 month')`,
        [userId, monthStart]
    )

    const r = rows[0]
    return {
        totalIncome: parseFloat(r?.total_income ?? '0'),
        totalExpense: parseFloat(r?.total_expense ?? '0'),
        essentials: parseFloat(r?.essentials ?? '0'),
        mandatory: parseFloat(r?.mandatory ?? '0'),
        wants: parseFloat(r?.wants ?? '0'),
    }
}

/**
 * 50/30/20 rule scoring:
 * Ideal: Essentials+Mandatory ≤ 50%, Wants ≤ 30%, Savings ≥ 20%
 * Each bucket deduction is capped at ~33 points.
 */
function computeFinancialHealth(f: Financials): number {
    if (f.totalIncome === 0) return 50 // neutral if no income data

    const needsPercent = ((f.essentials + f.mandatory) / f.totalIncome) * 100
    const wantsPercent = (f.wants / f.totalIncome) * 100
    const savingsPercent = ((f.totalIncome - f.totalExpense) / f.totalIncome) * 100

    let score = 100

    // Needs penalty: each % over 50 costs 1.5 points
    if (needsPercent > 50) score -= Math.min(33, (needsPercent - 50) * 1.5)

    // Wants penalty: each % over 30 costs 2 points
    if (wantsPercent > 30) score -= Math.min(33, (wantsPercent - 30) * 2)

    // Savings penalty: each % under 20 costs 2 points
    if (savingsPercent < 20) score -= Math.min(34, (20 - savingsPercent) * 2)

    return clamp(Math.round(score), 0, 100)
}

async function getMonthlySpending(userId: string): Promise<number[]> {
    // Last 6 months of total spending per month (for consistency tracking)
    const rows = await neonQuery<{ month_total: string }>(
        `SELECT ABS(COALESCE(SUM(amount), 0)) AS month_total
         FROM transactions
         WHERE user_id = $1 AND amount < 0
           AND tx_date >= date_trunc('month', CURRENT_DATE - INTERVAL '5 months')
         GROUP BY date_trunc('month', tx_date)
         ORDER BY date_trunc('month', tx_date)`,
        [userId]
    )

    return rows.map(r => parseFloat(r.month_total))
}

/**
 * Spending consistency: inverse coefficient of variation.
 * Low variation = high consistency = high score.
 */
function computeConsistency(monthlyTotals: number[]): number {
    if (monthlyTotals.length < 2) return 50 // neutral

    const mean = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length
    if (mean === 0) return 50

    const variance = monthlyTotals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / monthlyTotals.length
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / mean // coefficient of variation (0 = perfectly consistent)

    // Map CV to score: CV=0 → 100, CV≥1 → 0
    return clamp(Math.round(100 * (1 - cv)), 0, 100)
}

/**
 * Fridge score: based on healthy vs unhealthy food purchase ratio from scanned receipts.
 * Healthy categories reward, unhealthy penalise.
 */
async function getFridgeScore(userId: string, monthStart: string): Promise<{ score: number }> {
    const HEALTHY_CATEGORIES = [
        'fruits', 'vegetables', 'herbs & fresh aromatics',
        'meat & poultry', 'fish & seafood', 'eggs', 'legumes', 'deli / cold cuts',
        'dairy (milk/yogurt)', 'cheese',
        'pasta, rice & grains', 'nuts & seeds',
        'frozen vegetables & fruit', 'prepared salads', 'fresh ready-to-eat',
        'water', 'coffee & tea', 'juice',
    ]
    const UNHEALTHY_CATEGORIES = [
        'salty snacks', 'cookies & biscuits', 'chocolate & candy',
        'ice cream & desserts', 'pastries', 'soft drinks', 'energy & sports drinks',
        'beer', 'wine', 'spirits', 'frozen meals', 'ready meals', 'sandwiches / takeaway',
    ]

    const rows = await neonQuery<{
        category_name: string
        total_spent: string
    }>(
        `SELECT
            COALESCE(rc.name, 'Other') AS category_name,
            COALESCE(SUM(rt.total_price), 0)::text AS total_spent
         FROM receipt_transactions rt
         JOIN receipts r ON rt.receipt_id = r.id
         LEFT JOIN receipt_categories rc ON rt.category_id = rc.id
         WHERE r.user_id = $1
           AND r.created_at >= $2::date
           AND r.created_at < ($2::date + INTERVAL '1 month')
         GROUP BY rc.name`,
        [userId, monthStart]
    )

    let healthyTotal = 0
    let unhealthyTotal = 0
    let total = 0

    for (const row of rows) {
        const spent = parseFloat(row.total_spent)
        const name = row.category_name.toLowerCase()
        total += spent

        if (HEALTHY_CATEGORIES.some(c => name.includes(c))) {
            healthyTotal += spent
        } else if (UNHEALTHY_CATEGORIES.some(c => name.includes(c))) {
            unhealthyTotal += spent
        }
    }

    if (total === 0) return { score: 50 }

    const healthyPercent = (healthyTotal / total) * 100
    const unhealthyPercent = (unhealthyTotal / total) * 100

    // Mirror of dashboard-stats logic
    let score = 50

    if (healthyPercent >= 70) score += 35
    else if (healthyPercent >= 60) score += 30 + (healthyPercent - 60) * 0.5
    else if (healthyPercent >= 40) score += 20 + (healthyPercent - 40) * 0.5
    else if (healthyPercent >= 20) score += 10 + (healthyPercent - 20) * 0.5
    else score += healthyPercent * 0.5

    if (unhealthyPercent <= 10) score += 20 - unhealthyPercent * 0.5
    else if (unhealthyPercent <= 20) score -= (unhealthyPercent - 10)
    else if (unhealthyPercent <= 30) score -= 10 + (unhealthyPercent - 20)
    else score -= Math.min(35, 20 + (unhealthyPercent - 30) * 1.5)

    return { score: clamp(Math.round(score), 0, 100) }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}
