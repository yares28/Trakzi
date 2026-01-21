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
    month: string
    category: string
    total: number
}

export interface DayOfWeekSpending {
    dayOfWeek: number
    total: number
    count: number
}

export interface DayOfWeekCategory {
    dayOfWeek: number
    category: string
    total: number
}

export interface TransactionHistoryItem {
    id: number
    date: string
    description: string
    amount: number
    category: string
    color: string | null
}

export interface NeedsWantsItem {
    classification: 'Essentials' | 'Mandatory' | 'Wants'
    total: number
    count: number
}

export interface CashFlowNode {
    id: string
    label: string
}

export interface CashFlowLink {
    source: string
    target: string
    value: number
}

export interface CashFlowData {
    nodes: CashFlowNode[]
    links: CashFlowLink[]
}

export interface MonthlyByCategory {
    month: string
    category: string
    total: number
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
    // Extended for all 17 charts
    dayOfWeekCategory: DayOfWeekCategory[]
    // transactionHistory removed - fetched separately via /api/transactions
    needsWants: NeedsWantsItem[]
    cashFlow: CashFlowData
    monthlyByCategory: MonthlyByCategory[]
}

// Category classification for needs/wants
const NEEDS_CATEGORIES: Record<string, 'Essentials' | 'Mandatory' | 'Wants'> = {
    'Groceries': 'Essentials',
    'Housing': 'Essentials',
    'Utilities': 'Essentials',
    'Transport': 'Essentials',
    'Healthcare': 'Essentials',
    'Insurance': 'Mandatory',
    'Taxes': 'Mandatory',
    'Shopping': 'Wants',
    'Entertainment': 'Wants',
    'Travel': 'Wants',
    'Dining': 'Wants',
    'Subscriptions': 'Wants',
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
            TO_CHAR(t.tx_date, 'Mon YYYY') AS month,
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

    query += ` GROUP BY TO_CHAR(t.tx_date, 'Mon YYYY'), c.name ORDER BY MIN(t.tx_date), total DESC`

    const rows = await neonQuery<{
        month: string
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
 * Get day of week by category breakdown
 */
export async function getDayOfWeekCategory(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<DayOfWeekCategory[]> {
    let query = `
        SELECT 
            EXTRACT(DOW FROM t.tx_date)::int AS "dayOfWeek",
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

    query += ` GROUP BY "dayOfWeek", c.name ORDER BY "dayOfWeek", total DESC`

    const rows = await neonQuery<{
        dayOfWeek: number
        category: string
        total: string
    }>(query, params)

    return rows.map(row => ({
        dayOfWeek: row.dayOfWeek,
        category: row.category,
        total: parseFloat(row.total) || 0,
    }))
}

/**
 * Get transaction history for swarm plot (limited for performance)
 */
export async function getTransactionHistory(
    userId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 500
): Promise<TransactionHistoryItem[]> {
    let query = `
        SELECT 
            t.id,
            to_char(t.tx_date, 'YYYY-MM-DD') AS date,
            t.description,
            ABS(t.amount) AS amount,
            COALESCE(c.name, 'Uncategorized') AS category,
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

    params.push(limit)
    query += ` ORDER BY t.tx_date DESC LIMIT $${params.length}`

    const rows = await neonQuery<{
        id: number
        date: string
        description: string
        amount: string
        category: string
        color: string | null
    }>(query, params)

    return rows.map(row => ({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: parseFloat(row.amount) || 0,
        category: row.category,
        color: row.color,
    }))
}

/**
 * Get needs vs wants breakdown
 * Uses per-category broad_type when available, falling back to static mapping.
 */
export async function getNeedsWantsBreakdown(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<NeedsWantsItem[]> {
    let query = `
        SELECT 
            COALESCE(c.name, 'Uncategorized') AS category,
            c.broad_type,
            ABS(SUM(t.amount)) AS total,
            COUNT(*)::int AS count
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

    query += ` GROUP BY c.name, c.broad_type`

    const rows = await neonQuery<{
        category: string
        broad_type: string | null
        total: string
        count: number
    }>(query, params)

    // Group by needs/wants classification
    const classified: Record<'Essentials' | 'Mandatory' | 'Wants', { total: number; count: number }> = {
        Essentials: { total: 0, count: 0 },
        Mandatory: { total: 0, count: 0 },
        Wants: { total: 0, count: 0 },
    }

    for (const row of rows) {
        let classification: 'Essentials' | 'Mandatory' | 'Wants'

        const normalizedBroad = row.broad_type?.trim()
        if (normalizedBroad === 'Essentials' || normalizedBroad === 'Mandatory' || normalizedBroad === 'Wants') {
            classification = normalizedBroad
        } else {
            // Fallback to static mapping by category name, defaulting to Wants
            const mapped = NEEDS_CATEGORIES[row.category] || 'Wants'
            classification = mapped
        }

        classified[classification].total += parseFloat(row.total) || 0
        classified[classification].count += row.count
    }

    return (Object.entries(classified) as Array<[ 'Essentials' | 'Mandatory' | 'Wants', { total: number; count: number } ]>)
        .map(([classification, data]) => ({
            classification,
            total: data.total,
            count: data.count,
        }))
}

/**
 * Get cash flow data for sankey diagram
 * Uses a 3-layer model: Income Sources → Total Cash → Expenses/Savings
 */
export async function getCashFlowData(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<CashFlowData> {
    // Get income sources
    let incomeQuery = `
        SELECT 
            COALESCE(c.name, 'Income') AS category,
            SUM(t.amount) AS total
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND t.amount > 0
    `
    const incomeParams: (string | number)[] = [userId]

    if (startDate) {
        incomeParams.push(startDate)
        incomeQuery += ` AND t.tx_date >= $${incomeParams.length}::date`
    }
    if (endDate) {
        incomeParams.push(endDate)
        incomeQuery += ` AND t.tx_date <= $${incomeParams.length}::date`
    }
    incomeQuery += ` GROUP BY c.name ORDER BY total DESC LIMIT 5`

    // Get expense categories
    let expenseQuery = `
        SELECT 
            COALESCE(c.name, 'Other') AS category,
            ABS(SUM(t.amount)) AS total
       FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND t.amount < 0
    `
    const expenseParams: (string | number)[] = [userId]

    if (startDate) {
        expenseParams.push(startDate)
        expenseQuery += ` AND t.tx_date >= $${expenseParams.length}::date`
    }
    if (endDate) {
        expenseParams.push(endDate)
        expenseQuery += ` AND t.tx_date <= $${expenseParams.length}::date`
    }
    expenseQuery += ` GROUP BY c.name ORDER BY total DESC LIMIT 8`

    const [incomeRows, expenseRows] = await Promise.all([
        neonQuery<{ category: string; total: string }>(incomeQuery, incomeParams),
        neonQuery<{ category: string; total: string }>(expenseQuery, expenseParams),
    ])

    // Build nodes and links using a 3-layer flow model
    const nodes: CashFlowNode[] = []
    const links: CashFlowLink[] = []

    // Calculate totals
    const totalIncome = incomeRows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
    const totalExpense = expenseRows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
    const savings = Math.max(0, totalIncome - totalExpense)

    // Layer 1: Income sources (left side)
    for (const row of incomeRows) {
        const incomeValue = parseFloat(row.total) || 0
        if (incomeValue > 0) {
            nodes.push({ id: `income-${row.category}`, label: row.category })

            // Connect income to "Total Cash" central node
            links.push({
                source: `income-${row.category}`,
                target: 'total-cash',
                value: Math.round(incomeValue * 100) / 100,
            })
        }
    }

    // Layer 2: Central node - Total Cash (middle)
    nodes.push({ id: 'total-cash', label: 'Total Cash' })

    // Layer 3: Expenses and Savings (right side)
    for (const row of expenseRows) {
        const expenseValue = parseFloat(row.total) || 0
        if (expenseValue > 0) {
            nodes.push({ id: `expense-${row.category}`, label: row.category })

            // Connect "Total Cash" to each expense category
            links.push({
                source: 'total-cash',
                target: `expense-${row.category}`,
                value: Math.round(expenseValue * 100) / 100,
            })
        }
    }

    // Add savings if positive
    if (savings > 0) {
        nodes.push({ id: 'savings', label: 'Savings' })
        links.push({
            source: 'total-cash',
            target: 'savings',
            value: Math.round(savings * 100) / 100,
        })
    }

    return { nodes, links }
}

/**
 * Get monthly spending by category for streamgraph
 * Aggregated at SQL level to reduce cache size (30x reduction vs daily)
 */
export async function getMonthlyByCategory(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<MonthlyByCategory[]> {
    let query = `
        SELECT 
            to_char(t.tx_date, 'YYYY-MM') AS month,
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

    query += ` GROUP BY to_char(t.tx_date, 'YYYY-MM'), c.name ORDER BY month`

    const rows = await neonQuery<{
        month: string
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
 * Note: transactionHistory removed - fetched separately via /api/transactions
 */
export async function getAnalyticsBundle(
    userId: string,
    filter: string | null
): Promise<AnalyticsSummary> {
    const { startDate, endDate } = getDateRange(filter)

    // Run all aggregations in parallel
    const [
        kpis,
        categorySpending,
        dailySpending,
        monthlyCategories,
        dayOfWeekSpending,
        dayOfWeekCategory,
        needsWants,
        cashFlow,
        monthlyByCategory,
    ] = await Promise.all([
        getKPIs(userId, startDate ?? undefined, endDate ?? undefined),
        getCategorySpending(userId, startDate ?? undefined, endDate ?? undefined),
        getDailySpending(userId, startDate ?? undefined, endDate ?? undefined),
        getMonthlyCategories(userId, startDate ?? undefined, endDate ?? undefined),
        getDayOfWeekSpending(userId, startDate ?? undefined, endDate ?? undefined),
        getDayOfWeekCategory(userId, startDate ?? undefined, endDate ?? undefined),
        getNeedsWantsBreakdown(userId, startDate ?? undefined, endDate ?? undefined),
        getCashFlowData(userId, startDate ?? undefined, endDate ?? undefined),
        getMonthlyByCategory(userId, startDate ?? undefined, endDate ?? undefined),
    ])

    return {
        kpis,
        categorySpending,
        dailySpending,
        monthlyCategories,
        dayOfWeekSpending,
        dayOfWeekCategory,
        needsWants,
        cashFlow,
        monthlyByCategory,
    }
}

