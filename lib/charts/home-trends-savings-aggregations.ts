import { neonQuery } from '@/lib/neonClient'
import { getDateRange } from '@/app/api/transactions/route'

// Types
export interface HomeKPIs {
    totalIncome: number
    totalExpense: number
    netSavings: number
    transactionCount: number
    avgTransaction: number
}

export interface TopCategory {
    category: string
    total: number
    count: number
    color: string | null
    percentage: number
}

export interface ActivityRingData {
    category: string
    spent: number
    percentage: number
    color: string | null
}

export interface DailyTrend {
    date: string
    total: number
}

export interface HomeSummary {
    kpis: HomeKPIs
    topCategories: TopCategory[]
    activityRings: ActivityRingData[]
    dailySpending: DailyTrend[]
    recentTransactions: number
}

// Trends types
export interface CategoryTrendPoint {
    date: string
    value: number
}

export interface TrendsSummary {
    categoryTrends: Record<string, CategoryTrendPoint[]>
    categories: string[]
}

// Savings types
export interface SavingsKPIs {
    totalSaved: number
    savingsRate: number
    transactionCount: number
    avgSavingsPerTransaction: number
}

export interface SavingsChartPoint {
    date: string
    amount: number
    cumulative: number
}

export interface SavingsSummary {
    kpis: SavingsKPIs
    chartData: SavingsChartPoint[]
}

/**
 * Get Home page KPIs
 */
export async function getHomeKPIs(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<HomeKPIs> {
    let query = `
        SELECT 
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_income,
            ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) AS total_expense,
            SUM(amount) AS net_savings,
            COUNT(*)::int AS transaction_count,
            AVG(ABS(amount)) AS avg_transaction
        FROM transactions
        WHERE user_id = $1
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND tx_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND tx_date <= $${params.length}::date`
    }

    const rows = await neonQuery<{
        total_income: string | null
        total_expense: string | null
        net_savings: string | null
        transaction_count: number
        avg_transaction: string | null
    }>(query, params)

    const row = rows[0] || {}
    return {
        totalIncome: parseFloat(row.total_income || '0') || 0,
        totalExpense: parseFloat(row.total_expense || '0') || 0,
        netSavings: parseFloat(row.net_savings || '0') || 0,
        transactionCount: row.transaction_count || 0,
        avgTransaction: parseFloat(row.avg_transaction || '0') || 0,
    }
}

/**
 * Get top spending categories for Home page
 */
export async function getTopCategories(
    userId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 10
): Promise<TopCategory[]> {
    let query = `
        WITH totals AS (
            SELECT ABS(SUM(amount)) AS grand_total
            FROM transactions
            WHERE user_id = $1 AND amount < 0
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND tx_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND tx_date <= $${params.length}::date`
    }

    query += `
        )
        SELECT 
            COALESCE(c.name, 'Uncategorized') AS category,
            ABS(SUM(t.amount)) AS total,
            COUNT(*)::int AS count,
            c.color,
            ROUND((ABS(SUM(t.amount)) / NULLIF((SELECT grand_total FROM totals), 0) * 100)::numeric, 1) AS percentage
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND t.amount < 0
    `

    if (startDate) {
        query += ` AND t.tx_date >= $2::date`
    }
    if (endDate) {
        query += ` AND t.tx_date <= $${params.length}::date`
    }

    query += ` GROUP BY c.name, c.color ORDER BY total DESC LIMIT ${limit}`

    const rows = await neonQuery<{
        category: string
        total: string
        count: number
        color: string | null
        percentage: string | null
    }>(query, params)

    return rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total) || 0,
        count: row.count,
        color: row.color,
        percentage: parseFloat(row.percentage || '0') || 0,
    }))
}

/**
 * Get daily spending trend for Home page
 */
export async function getHomeDailySpending(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<DailyTrend[]> {
    let query = `
        SELECT 
            to_char(tx_date, 'YYYY-MM-DD') AS date,
            ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) AS total
        FROM transactions
        WHERE user_id = $1
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND tx_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND tx_date <= $${params.length}::date`
    }

    query += ` GROUP BY tx_date ORDER BY tx_date`

    const rows = await neonQuery<{
        date: string
        total: string
    }>(query, params)

    return rows.map(row => ({
        date: row.date,
        total: parseFloat(row.total) || 0,
    }))
}

/**
 * Get complete Home bundle
 */
export async function getHomeBundle(
    userId: string,
    filter: string | null
): Promise<HomeSummary> {
    const { startDate, endDate } = getDateRange(filter)

    const [kpis, topCategories, dailySpending] = await Promise.all([
        getHomeKPIs(userId, startDate ?? undefined, endDate ?? undefined),
        getTopCategories(userId, startDate ?? undefined, endDate ?? undefined, 10),
        getHomeDailySpending(userId, startDate ?? undefined, endDate ?? undefined),
    ])

    // Compute activity rings from top categories
    const activityRings: ActivityRingData[] = topCategories.slice(0, 5).map(cat => ({
        category: cat.category,
        spent: cat.total,
        percentage: cat.percentage,
        color: cat.color,
    }))

    return {
        kpis,
        topCategories,
        activityRings,
        dailySpending,
        recentTransactions: kpis.transactionCount,
    }
}

/**
 * Get category trends for Trends page
 */
export async function getCategoryTrends(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<TrendsSummary> {
    let query = `
        SELECT 
            COALESCE(c.name, 'Other') AS category,
            to_char(t.tx_date, 'YYYY-MM-DD') AS date,
            ABS(SUM(t.amount)) AS total
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND t.amount < 0
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND t.tx_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND t.tx_date <= $${params.length}::date`
    }

    query += ` GROUP BY c.name, t.tx_date ORDER BY c.name, t.tx_date`

    const rows = await neonQuery<{
        category: string
        date: string
        total: string
    }>(query, params)

    // Group by category
    const categoryTrends: Record<string, CategoryTrendPoint[]> = {}
    const categoriesSet = new Set<string>()

    for (const row of rows) {
        const category = row.category
        categoriesSet.add(category)

        if (!categoryTrends[category]) {
            categoryTrends[category] = []
        }
        categoryTrends[category].push({
            date: row.date,
            value: parseFloat(row.total) || 0,
        })
    }

    return {
        categoryTrends,
        categories: Array.from(categoriesSet).sort(),
    }
}

/**
 * Get Trends bundle
 */
export async function getTrendsBundle(
    userId: string,
    filter: string | null
): Promise<TrendsSummary> {
    const { startDate, endDate } = getDateRange(filter)
    return getCategoryTrends(userId, startDate ?? undefined, endDate ?? undefined)
}

/**
 * Get Savings KPIs
 */
export async function getSavingsKPIs(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<SavingsKPIs> {
    // Savings are positive amounts in savings category
    let query = `
        SELECT 
            SUM(t.amount) AS total_saved,
            COUNT(*)::int AS transaction_count,
            AVG(t.amount) AS avg_savings
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND LOWER(c.name) = 'savings'
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND t.tx_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND t.tx_date <= $${params.length}::date`
    }

    const rows = await neonQuery<{
        total_saved: string | null
        transaction_count: number
        avg_savings: string | null
    }>(query, params)

    const row = rows[0] || {}
    const totalSaved = parseFloat(row.total_saved || '0') || 0
    const transactionCount = row.transaction_count || 0

    // Get total income to calculate savings rate
    let incomeQuery = `
        SELECT SUM(amount) AS total_income
        FROM transactions
        WHERE user_id = $1 AND amount > 0
    `
    const incomeParams: (string | number)[] = [userId]

    if (startDate) {
        incomeParams.push(startDate)
        incomeQuery += ` AND tx_date >= $${incomeParams.length}::date`
    }
    if (endDate) {
        incomeParams.push(endDate)
        incomeQuery += ` AND tx_date <= $${incomeParams.length}::date`
    }

    const incomeRows = await neonQuery<{ total_income: string | null }>(incomeQuery, incomeParams)
    const totalIncome = parseFloat(incomeRows[0]?.total_income || '0') || 0
    const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0

    return {
        totalSaved,
        savingsRate,
        transactionCount,
        avgSavingsPerTransaction: transactionCount > 0 ? totalSaved / transactionCount : 0,
    }
}

/**
 * Get Savings chart data
 */
export async function getSavingsChartData(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<SavingsChartPoint[]> {
    let query = `
        SELECT 
            to_char(t.tx_date, 'YYYY-MM-DD') AS date,
            SUM(t.amount) AS amount
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND LOWER(c.name) = 'savings'
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND t.tx_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND t.tx_date <= $${params.length}::date`
    }

    query += ` GROUP BY t.tx_date ORDER BY t.tx_date`

    const rows = await neonQuery<{
        date: string
        amount: string
    }>(query, params)

    // Calculate cumulative
    let cumulative = 0
    return rows.map(row => {
        const amount = parseFloat(row.amount) || 0
        cumulative += amount
        return {
            date: row.date,
            amount,
            cumulative,
        }
    })
}

/**
 * Get Savings bundle
 */
export async function getSavingsBundle(
    userId: string,
    filter: string | null
): Promise<SavingsSummary> {
    const { startDate, endDate } = getDateRange(filter)

    const [kpis, chartData] = await Promise.all([
        getSavingsKPIs(userId, startDate ?? undefined, endDate ?? undefined),
        getSavingsChartData(userId, startDate ?? undefined, endDate ?? undefined),
    ])

    return {
        kpis,
        chartData,
    }
}
