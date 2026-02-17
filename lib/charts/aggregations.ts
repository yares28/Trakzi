import { neonQuery } from '@/lib/neonClient'
import { getDateRange } from '@/app/api/transactions/route'
import { getCachedOrCompute } from '@/lib/cache/upstash'

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
    classification: 'Essentials' | 'Mandatory' | 'Wants' | 'Other'
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

export interface SpendingPyramidItem {
    category: string
    userTotal: number
    userPercent: number
    avgTotal: number
    avgPercent: number
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
    spendingPyramid: SpendingPyramidItem[]
}

// Category classification for needs/wants
const NEEDS_CATEGORIES: Record<string, 'Essentials' | 'Mandatory' | 'Wants' | 'Other'> = {
    'Groceries': 'Essentials',
    'Housing': 'Essentials',
    'Utilities': 'Essentials',
    'Transport': 'Essentials',
    'Medical/Healthcare': 'Essentials',
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

    // Group by needs/wants classification (including Other)
    const classified: Record<'Essentials' | 'Mandatory' | 'Wants' | 'Other', { total: number; count: number }> = {
        Essentials: { total: 0, count: 0 },
        Mandatory: { total: 0, count: 0 },
        Wants: { total: 0, count: 0 },
        Other: { total: 0, count: 0 },
    }

    for (const row of rows) {
        let classification: 'Essentials' | 'Mandatory' | 'Wants' | 'Other'

        const normalizedBroad = row.broad_type?.trim()
        if (
            normalizedBroad === 'Essentials' ||
            normalizedBroad === 'Mandatory' ||
            normalizedBroad === 'Wants' ||
            normalizedBroad === 'Other'
        ) {
            classification = normalizedBroad
        } else {
            // Fallback to static mapping by category name, defaulting to Wants
            const mapped = NEEDS_CATEGORIES[row.category] || 'Wants'
            classification = mapped
        }

        classified[classification].total += parseFloat(row.total) || 0
        classified[classification].count += row.count
    }

    return (Object.entries(classified) as Array<[ 'Essentials' | 'Mandatory' | 'Wants' | 'Other', { total: number; count: number } ]>)
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
 * Get platform-wide average spending by category (globally cached, shared across all users).
 * Uses HAVING COUNT(*) >= 2 so at least 2 users must share a category for a meaningful average.
 */
async function getPlatformCategoryAverages(
    startDate?: string,
    endDate?: string
): Promise<Map<string, number>> {
    const cacheKey = `platform:v2:category-avg:${startDate ?? 'all'}:${endDate ?? 'all'}`

    const result = await getCachedOrCompute<Array<{ category: string; avg_total: string }>>(
        cacheKey,
        async () => {
            let avgQuery = `
                SELECT
                    category_name AS category,
                    AVG(user_total) AS avg_total
                FROM (
                    SELECT
                        t.user_id,
                        COALESCE(c.name, 'Uncategorized') AS category_name,
                        ABS(SUM(t.amount)) AS user_total
                    FROM transactions t
                    LEFT JOIN categories c ON t.category_id = c.id
                    WHERE t.amount < 0
            `
            const avgParams: (string | number)[] = []

            if (startDate) {
                avgParams.push(startDate)
                avgQuery += ` AND t.tx_date >= $${avgParams.length}::date`
            }
            if (endDate) {
                avgParams.push(endDate)
                avgQuery += ` AND t.tx_date <= $${avgParams.length}::date`
            }

            avgQuery += `
                    GROUP BY t.user_id, c.name
                ) user_totals
                GROUP BY category_name
                HAVING COUNT(*) >= 2
                ORDER BY avg_total DESC
            `

            return neonQuery<{ category: string; avg_total: string }>(avgQuery, avgParams)
        },
        60 * 60 // 1 hour TTL — platform averages change slowly
    )

    const avgMap = new Map<string, number>()
    result.forEach(r => {
        avgMap.set(r.category, parseFloat(r.avg_total) || 0)
    })
    return avgMap
}

/**
 * Get spending pyramid data comparing current user vs platform average.
 * Returns top 10 categories with both user and average spending percentages.
 */
export async function getSpendingPyramid(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<SpendingPyramidItem[]> {
    // Query 1: Current user spending by category
    let userQuery = `
        SELECT
            COALESCE(c.name, 'Uncategorized') AS category,
            ABS(SUM(t.amount)) AS total
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1 AND t.amount < 0
    `
    const userParams: (string | number)[] = [userId]

    if (startDate) {
        userParams.push(startDate)
        userQuery += ` AND t.tx_date >= $${userParams.length}::date`
    }
    if (endDate) {
        userParams.push(endDate)
        userQuery += ` AND t.tx_date <= $${userParams.length}::date`
    }

    userQuery += ` GROUP BY c.name ORDER BY total DESC`

    // Query 2: Platform average (globally cached, k-anonymous)
    const [userRows, avgMap] = await Promise.all([
        neonQuery<{ category: string; total: string }>(userQuery, userParams),
        getPlatformCategoryAverages(startDate, endDate),
    ])

    // Calculate totals for percentage computation
    const userGrandTotal = userRows.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
    const avgGrandTotal = Array.from(avgMap.values()).reduce((sum, v) => sum + v, 0)

    // Combine: use the union of categories from both user and average
    const allCategories = new Set<string>()
    userRows.forEach(r => allCategories.add(r.category))
    avgMap.forEach((_, cat) => allCategories.add(cat))

    const userMap = new Map<string, number>()
    userRows.forEach(r => {
        userMap.set(r.category, parseFloat(r.total) || 0)
    })

    const result: SpendingPyramidItem[] = Array.from(allCategories).map(category => {
        const userTotal = userMap.get(category) || 0
        const avgTotal = avgMap.get(category) || 0
        return {
            category,
            userTotal,
            userPercent: userGrandTotal > 0 ? (userTotal / userGrandTotal) * 100 : 0,
            avgTotal,
            avgPercent: avgGrandTotal > 0 ? (avgTotal / avgGrandTotal) * 100 : 0,
        }
    })

    // Sort by user's spending (most spent first), with stable secondary sort
    result.sort((a, b) => {
        const diff = b.userTotal - a.userTotal
        return diff !== 0 ? diff : a.category.localeCompare(b.category)
    })

    // Return top 20 categories — client dynamically slices based on chart height
    return result.slice(0, 20)
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
        spendingPyramid,
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
        getSpendingPyramid(userId, startDate ?? undefined, endDate ?? undefined),
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
        spendingPyramid,
    }
}

// Test Charts Bundle Types
export interface TestChartsTransaction {
    id: number
    date: string
    description: string
    amount: number
    balance: number | null
    category: string
}

export interface TestChartsReceiptTransaction {
    id: number
    receiptId: string
    storeName: string | null
    receiptDate: string
    receiptTime: string | null
    receiptTotalAmount: number
    receiptStatus: string
    description: string
    quantity: number
    pricePerUnit: number
    totalPrice: number
    categoryId: number | null
    categoryTypeId: number | null
    categoryName: string | null
    categoryColor: string | null
    categoryTypeName: string | null
    categoryTypeColor: string | null
}

export interface TestChartsSummary {
    transactions: TestChartsTransaction[]
    receiptTransactions: TestChartsReceiptTransaction[]
}

/**
 * Get complete test charts bundle - single endpoint for all test chart data
 * Returns both transactions and receipt transactions for test charts playground
 */
export async function getTestChartsBundle(
    userId: string,
    filter: string | null
): Promise<TestChartsSummary> {
    const { startDate, endDate } = getDateRange(filter)

    // Fetch transactions
    let transactionsQuery = `
        SELECT 
            t.id, 
            t.tx_date, 
            t.description, 
            t.amount, 
            t.balance, 
            t.category_id,
            c.name as category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
    `
    const txParams: any[] = [userId]

    if (startDate && endDate) {
        transactionsQuery += ` AND t.tx_date >= $${txParams.length + 1} AND t.tx_date <= $${txParams.length + 2}`
        txParams.push(startDate, endDate)
    }

    transactionsQuery += ` ORDER BY t.tx_date DESC, t.id DESC LIMIT 10000`

    // Fetch receipt transactions
    let receiptsQuery = `
        SELECT 
            rt.id,
            rt.description,
            rt.quantity,
            rt.price_per_unit,
            rt.total_price,
            rt.category_id,
            rt.category_type_id,
            rt.receipt_date,
            rt.receipt_time,
            r.store_name,
            r.id as receipt_id,
            r.total_amount as receipt_total_amount,
            r.status as receipt_status,
            rc.name as category_name,
            rc.color as category_color,
            rct.name as category_type_name,
            rct.color as category_type_color
        FROM receipt_transactions rt
        INNER JOIN receipts r ON rt.receipt_id = r.id
        LEFT JOIN receipt_categories rc ON rt.category_id = rc.id
        LEFT JOIN receipt_category_types rct ON rt.category_type_id = rct.id
        WHERE rt.user_id = $1
    `
    const rxParams: any[] = [userId]

    if (startDate && endDate) {
        receiptsQuery += ` AND rt.receipt_date >= $${rxParams.length + 1} AND rt.receipt_date <= $${rxParams.length + 2}`
        rxParams.push(startDate, endDate)
    }

    receiptsQuery += ` ORDER BY rt.receipt_date DESC, rt.receipt_time DESC, rt.id DESC LIMIT 10000`

    // Run both queries in parallel
    const [txRows, rxRows] = await Promise.all([
        neonQuery<{
            id: number
            tx_date: Date | string
            description: string
            amount: number
            balance: number | null
            category_id: number | null
            category_name: string | null
        }>(transactionsQuery, txParams),
        neonQuery<{
            id: number
            description: string
            quantity: string | number
            price_per_unit: string | number
            total_price: string | number
            category_id: number | null
            category_type_id: number | null
            receipt_date: string | Date
            receipt_time: string | null
            store_name: string | null
            receipt_id: string
            receipt_total_amount: string | number
            receipt_status: string
            category_name: string | null
            category_color: string | null
            category_type_name: string | null
            category_type_color: string | null
        }>(receiptsQuery, rxParams)
    ])

    // Helper to convert date to ISO string
    const toIsoDate = (value: string | Date): string => {
        if (typeof value === 'string') return value.split('T')[0]
        const year = value.getUTCFullYear()
        const month = String(value.getUTCMonth() + 1).padStart(2, '0')
        const day = String(value.getUTCDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    // Helper to convert to number
    const toNumber = (value: unknown): number => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
            const normalized = value.replace(',', '.')
            const parsed = Number(normalized)
            return Number.isFinite(parsed) ? parsed : 0
        }
        return 0
    }

    // Format transactions
    const transactions: TestChartsTransaction[] = txRows.map(tx => ({
        id: tx.id,
        date: toIsoDate(tx.tx_date),
        description: tx.description,
        amount: toNumber(tx.amount),
        balance: tx.balance ? toNumber(tx.balance) : null,
        category: tx.category_name || 'Other'
    }))

    // Format receipt transactions
    const receiptTransactions: TestChartsReceiptTransaction[] = rxRows.map(row => ({
        id: row.id,
        receiptId: row.receipt_id,
        storeName: row.store_name,
        receiptDate: toIsoDate(row.receipt_date),
        receiptTime: row.receipt_time,
        receiptTotalAmount: toNumber(row.receipt_total_amount),
        receiptStatus: row.receipt_status,
        description: row.description,
        quantity: toNumber(row.quantity),
        pricePerUnit: toNumber(row.price_per_unit),
        totalPrice: toNumber(row.total_price),
        categoryId: row.category_id,
        categoryTypeId: row.category_type_id,
        categoryName: row.category_name,
        categoryColor: row.category_color,
        categoryTypeName: row.category_type_name,
        categoryTypeColor: row.category_type_color
    }))

    return {
        transactions,
        receiptTransactions
    }
}

