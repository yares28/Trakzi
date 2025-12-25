import { neonQuery } from '@/lib/neonClient'
import { getDateRange } from '@/app/api/transactions/route'

// Types for fridge aggregated data
export interface FridgeCategorySpending {
    category: string
    total: number
    count: number
    color: string | null
    broadType: string | null
}

export interface FridgeDailySpending {
    date: string
    total: number
}

export interface FridgeStoreSpending {
    storeName: string
    total: number
    count: number
}

export interface FridgeMacronutrientBreakdown {
    typeName: string
    total: number
    color: string | null
}

export interface FridgeKPIs {
    totalSpent: number
    shoppingTrips: number
    storesVisited: number
    averageReceipt: number
    itemCount: number
}

export interface FridgeSummary {
    kpis: FridgeKPIs
    categorySpending: FridgeCategorySpending[]
    dailySpending: FridgeDailySpending[]
    storeSpending: FridgeStoreSpending[]
    macronutrientBreakdown: FridgeMacronutrientBreakdown[]
}

/**
 * Get fridge KPIs with SQL aggregation
 */
export async function getFridgeKPIs(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<FridgeKPIs> {
    let query = `
        SELECT 
            COALESCE(SUM(rt.total_price), 0) AS total_spent,
            COUNT(DISTINCT rt.receipt_id)::int AS shopping_trips,
            COUNT(DISTINCT r.store_name)::int AS stores_visited,
            COUNT(*)::int AS item_count
        FROM receipt_transactions rt
        LEFT JOIN receipts r ON rt.receipt_id = r.id
        WHERE rt.user_id = $1
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND rt.receipt_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND rt.receipt_date <= $${params.length}::date`
    }

    const rows = await neonQuery<{
        total_spent: string | null
        shopping_trips: number
        stores_visited: number
        item_count: number
    }>(query, params)

    const row = rows[0] || {}
    const totalSpent = parseFloat(row.total_spent || '0') || 0
    const shoppingTrips = row.shopping_trips || 0

    return {
        totalSpent,
        shoppingTrips,
        storesVisited: row.stores_visited || 0,
        averageReceipt: shoppingTrips > 0 ? totalSpent / shoppingTrips : 0,
        itemCount: row.item_count || 0,
    }
}

/**
 * Get fridge spending by category with SQL aggregation
 */
export async function getFridgeCategorySpending(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<FridgeCategorySpending[]> {
    let query = `
        SELECT 
            COALESCE(rc.name, 'Other') AS category,
            SUM(rt.total_price) AS total,
            COUNT(*)::int AS count,
            rc.color,
            rc.broad_type
        FROM receipt_transactions rt
        LEFT JOIN receipt_categories rc ON rt.category_id = rc.id
        WHERE rt.user_id = $1
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND rt.receipt_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND rt.receipt_date <= $${params.length}::date`
    }

    query += ` GROUP BY rc.name, rc.color, rc.broad_type ORDER BY total DESC`

    const rows = await neonQuery<{
        category: string
        total: string
        count: number
        color: string | null
        broad_type: string | null
    }>(query, params)

    return rows.map(row => ({
        category: row.category,
        total: parseFloat(row.total) || 0,
        count: row.count,
        color: row.color,
        broadType: row.broad_type,
    }))
}

/**
 * Get fridge daily spending totals
 */
export async function getFridgeDailySpending(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<FridgeDailySpending[]> {
    let query = `
        SELECT 
            to_char(receipt_date, 'YYYY-MM-DD') AS date,
            SUM(total_price) AS total
        FROM receipt_transactions
        WHERE user_id = $1
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND receipt_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND receipt_date <= $${params.length}::date`
    }

    query += ` GROUP BY receipt_date ORDER BY receipt_date`

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
 * Get fridge spending by store
 */
export async function getFridgeStoreSpending(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<FridgeStoreSpending[]> {
    let query = `
        SELECT 
            COALESCE(r.store_name, 'Unknown') AS store_name,
            SUM(rt.total_price) AS total,
            COUNT(DISTINCT rt.receipt_id)::int AS count
        FROM receipt_transactions rt
        LEFT JOIN receipts r ON rt.receipt_id = r.id
        WHERE rt.user_id = $1
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND rt.receipt_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND rt.receipt_date <= $${params.length}::date`
    }

    query += ` GROUP BY r.store_name ORDER BY total DESC LIMIT 10`

    const rows = await neonQuery<{
        store_name: string
        total: string
        count: number
    }>(query, params)

    return rows.map(row => ({
        storeName: row.store_name,
        total: parseFloat(row.total) || 0,
        count: row.count,
    }))
}

/**
 * Get fridge spending by macronutrient type
 */
export async function getFridgeMacronutrientBreakdown(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<FridgeMacronutrientBreakdown[]> {
    let query = `
        SELECT 
            COALESCE(rct.name, 'Other') AS type_name,
            SUM(rt.total_price) AS total,
            rct.color
        FROM receipt_transactions rt
        LEFT JOIN receipt_category_types rct ON rt.category_type_id = rct.id
        WHERE rt.user_id = $1
    `
    const params: (string | number)[] = [userId]

    if (startDate) {
        params.push(startDate)
        query += ` AND rt.receipt_date >= $${params.length}::date`
    }
    if (endDate) {
        params.push(endDate)
        query += ` AND rt.receipt_date <= $${params.length}::date`
    }

    query += ` GROUP BY rct.name, rct.color ORDER BY total DESC`

    const rows = await neonQuery<{
        type_name: string
        total: string
        color: string | null
    }>(query, params)

    return rows.map(row => ({
        typeName: row.type_name,
        total: parseFloat(row.total) || 0,
        color: row.color,
    }))
}

/**
 * Get complete fridge bundle - single endpoint for all fridge chart data
 */
export async function getFridgeBundle(
    userId: string,
    filter: string | null
): Promise<FridgeSummary> {
    const { startDate, endDate } = getDateRange(filter)

    // Run all aggregations in parallel
    const [kpis, categorySpending, dailySpending, storeSpending, macronutrientBreakdown] =
        await Promise.all([
            getFridgeKPIs(userId, startDate ?? undefined, endDate ?? undefined),
            getFridgeCategorySpending(userId, startDate ?? undefined, endDate ?? undefined),
            getFridgeDailySpending(userId, startDate ?? undefined, endDate ?? undefined),
            getFridgeStoreSpending(userId, startDate ?? undefined, endDate ?? undefined),
            getFridgeMacronutrientBreakdown(userId, startDate ?? undefined, endDate ?? undefined),
        ])

    return {
        kpis,
        categorySpending,
        dailySpending,
        storeSpending,
        macronutrientBreakdown,
    }
}
