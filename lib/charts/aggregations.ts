import { neonQuery } from '@/lib/neonClient'
import { getDateRange } from '@/app/api/transactions/route'

// Types for aggregated chart data
export interface CategorySpending {
    category: string
    total: number
    count: number
    color: string | null
}

export interface DailySpending {
    date: string
    total: number
    income: number
    expense: number
}

export interface MonthlyCategory {
    month: number
    category: string
    total: number
}

export interface DayOfWeekSpending {
    dayOfWeek: number
    total: number
    count: number
}

export interface AnalyticsSummary {
    kpis: {
        totalIncome: number
        totalExpense: number
        netSavings: number
        transactionCount: number
        avgTransaction: number
    }
    categorySpending: CategorySpending[]
    dailySpending: DailySpending[]
    monthlyCategories: MonthlyCategory[]
    dayOfWeekSpending: DayOfWeekSpending[]
}

/**
 * Get spending by category with optimized SQL aggregation
 */
export async function getCategorySpending(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<CategorySpending[]> {
    let query = `
        SELECT 
            COALESCE(c.name, 'Uncategorized') AS category,
            ABS(SUM(t.amount)) AS total,
            COUNT(*)::int AS count,
            c.color
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

    query += ` GROUP BY c.name, c.color ORDER BY total DESC`

    const rows = await neonQuery<{
        category: string
        total: string
        count: number
        color: string | null
    }>(query, params)

    return rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total) || 0,
        count: row.count,
        color: row.color,
    }))
}

/**
 * Get daily spending totals with income/expense split
 */
export async function getDailySpending(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<DailySpending[]> {
    let query = `
        SELECT 
            to_char(tx_date, 'YYYY-MM-DD') AS date,
            SUM(amount) AS total,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
            ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) AS expense
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
        income: string
        expense: string
    }>(query, params)

    return rows.map(row => ({
        date: row.date,
        total: parseFloat(row.total) || 0,
        income: parseFloat(row.income) || 0,
        expense: parseFloat(row.expense) || 0,
    }))
}

/**
 * Get monthly category breakdown
 */
export async function getMonthlyCategories(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<MonthlyCategory[]> {
    let query = `
        SELECT 
            EXTRACT(MONTH FROM t.tx_date)::int AS month,
            COALESCE(c.name, 'Uncategorized') AS category,
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

    query += ` GROUP BY month, c.name ORDER BY month, total DESC`

    const rows = await neonQuery<{
        month: number
        category: string
        total: string
    }>(query, params)

    return rows.map(row => ({
        month: row.month,
        category: row.category,
        total: parseFloat(row.total) || 0,
    }))
}

/**
 * Get spending by day of week
 */
export async function getDayOfWeekSpending(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<DayOfWeekSpending[]> {
    let query = `
        SELECT 
            EXTRACT(DOW FROM tx_date)::int AS "dayOfWeek",
            ABS(SUM(amount)) AS total,
            COUNT(*)::int AS count
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

    query += ` GROUP BY "dayOfWeek" ORDER BY "dayOfWeek"`

    const rows = await neonQuery<{
        dayOfWeek: number
        total: string
        count: number
    }>(query, params)

    return rows.map(row => ({
        dayOfWeek: row.dayOfWeek,
        total: parseFloat(row.total) || 0,
        count: row.count,
    }))
}

/**
 * Get KPI summary
 */
export async function getKPIs(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<AnalyticsSummary['kpis']> {
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
 * Get complete analytics bundle - single endpoint for all chart data
 */
export async function getAnalyticsBundle(
    userId: string,
    filter: string | null
): Promise<AnalyticsSummary> {
    const { startDate, endDate } = getDateRange(filter)

    // Run all aggregations in parallel
    const [kpis, categorySpending, dailySpending, monthlyCategories, dayOfWeekSpending] =
        await Promise.all([
            getKPIs(userId, startDate ?? undefined, endDate ?? undefined),
            getCategorySpending(userId, startDate ?? undefined, endDate ?? undefined),
            getDailySpending(userId, startDate ?? undefined, endDate ?? undefined),
            getMonthlyCategories(userId, startDate ?? undefined, endDate ?? undefined),
            getDayOfWeekSpending(userId, startDate ?? undefined, endDate ?? undefined),
        ])

    return {
        kpis,
        categorySpending,
        dailySpending,
        monthlyCategories,
        dayOfWeekSpending,
    }
}
