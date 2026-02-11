import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import { neonQuery } from '@/lib/neonClient'
import { normalizeTransactions } from '@/lib/utils'
import { ensureReceiptCategories } from '@/lib/receipts/receipt-categories-db'

export interface DataLibraryBundle {
    transactions: Array<{
        id: number
        date: string
        description: string
        amount: number
        balance: number | null
        category: string
        receiptTransactionId?: number
        isReceipt?: boolean
    }>
    stats: {
        totalIncome: number
        totalExpenses: number
        savingsRate: number
        netWorth: number
        incomeChange: number
        expensesChange: number
        savingsRateChange: number
        netWorthChange: number
    }
    statements: Array<{
        id: string
        name: string
        type: string
        date: string
        reviewer: string
        statementId: number | null
        fileId: string | null
        receiptId: string | null
    }>
    categories: Array<{
        id: number
        name: string
        color: string | null
        createdAt: string
        transactionCount: number
        totalSpend: number
        totalAmount: number
    }>
    userFiles: Array<{
        id: string
        fileName: string
        mimeType: string
        source: string
        uploadedAt: string
    }>
    receiptCategoryTypes: Array<{
        id: number
        name: string
        color: string | null
        createdAt: string
        categoryCount: number
        transactionCount: number
        totalSpend: number
    }>
    receiptCategories: Array<{
        id: number
        name: string
        color: string | null
        typeId: number
        typeName: string
        typeColor: string | null
        createdAt: string
        transactionCount: number
        totalSpend: number
    }>
    receiptTransactionsCount: number
    userCategoriesCount: number
}

async function getDataLibraryBundle(userId: string): Promise<DataLibraryBundle> {
    // Fetch all data in parallel
    const [
        transactionsRaw,
        statsData,
        statementsRaw,
        receiptsRaw,
        categoriesRaw,
        filesRaw,
        receiptTypesRaw,
        receiptCategoriesRawStep,
        receiptTransactionsRaw,
        userCategoriesRaw
    ] = await Promise.all([
        // Transactions - replicate logic from /api/transactions
        neonQuery<{
            id: number
            tx_date: Date | string
            description: string
            amount: number
            balance: number | null
            category_id: number | null
            raw_csv_row: string | null
            category_name: string | null
        }>(`
            SELECT 
                t.id, 
                t.tx_date, 
                t.description, 
                t.amount, 
                t.balance, 
                t.category_id, 
                t.raw_csv_row,
                c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
            ORDER BY t.tx_date DESC, t.id DESC
        `, [userId]),

        // Stats - replicate logic from /api/stats
        neonQuery<{
            total_income: number | string
            total_expenses: number | string
        }>(`
            SELECT 
                COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_expenses
            FROM transactions 
            WHERE user_id = $1
        `, [userId]),

        // Statements - replicate logic from /api/statements
        neonQuery<{
            id: number
            name: string | null
            status: string | null
            row_count: number | null
            imported_count: number | null
            date: Date | string
            type: string
        }>(`
            SELECT DISTINCT
                s.id,
                s.file_name as name,
                s.status,
                s.row_count,
                s.imported_count,
                s.created_at as date,
                'Income/Expenses' as type
            FROM statements s
            INNER JOIN transactions t ON t.statement_id = s.id AND t.user_id = s.user_id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `, [userId]),

        // Receipts - also part of statements
        neonQuery<{
            id: string
            name: string | null
            date: Date | string
            type: string
        }>(`
            SELECT 
                r.id,
                r.store_name as name,
                r.created_at as date,
                'Receipts' as type
            FROM receipts r
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
        `, [userId]),

        // Categories - replicate logic from /api/categories, extended with broad_type
        neonQuery<{
            id: number
            name: string
            color: string | null
            created_at: string
            transaction_count: string | number
            total_spend: string | number
            total_amount: string | number
            broad_type: string | null
        }>(`
            SELECT 
                c.id,
                c.name,
                c.color,
                c.created_at,
                COUNT(t.id) AS transaction_count,
                COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS total_spend,
                COALESCE(SUM(t.amount), 0) AS total_amount,
                c.broad_type
            FROM categories c
            LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = $1
            WHERE c.user_id = $1
            GROUP BY c.id
            ORDER BY COALESCE(SUM(t.amount), 0) ASC
        `, [userId]),

        // Files - replicate logic from /api/files
        neonQuery<{
            id: string
            file_name: string
            mime_type: string
            source: string | null
            created_at: string
        }>(`
            SELECT 
                id,
                file_name,
                mime_type,
                source,
                created_at
            FROM user_files
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [userId]).catch(() => [] as any[]), // Return empty array if table doesn't exist

        // Receipt Category Types - replicate logic from /api/receipt-categories/types
        neonQuery<{
            id: number
            name: string
            color: string | null
            created_at: string | Date
            category_count: string | number
            transaction_count: string | number
            total_spend: string | number
        }>(`
            SELECT
                rct.id,
                rct.name,
                rct.color,
                rct.created_at,
                COUNT(DISTINCT rc.id) as category_count,
                COUNT(DISTINCT rt.id) as transaction_count,
                COALESCE(-SUM(rt.total_price), 0) as total_spend
            FROM receipt_category_types rct
            LEFT JOIN receipt_categories rc ON rc.type_id = rct.id AND rc.user_id = $1
            LEFT JOIN receipt_transactions rt ON rt.category_type_id = rct.id AND rt.user_id = $1
            WHERE rct.user_id = $1
            GROUP BY rct.id, rct.name, rct.color, rct.created_at
            ORDER BY rct.name ASC
        `, [userId]),

        // Ensure receipt categories exist before querying
        ensureReceiptCategories(userId),

        // Count receipt transactions
        neonQuery<{ count: string | number }>(`
            SELECT COUNT(*) as count
            FROM receipt_transactions
            WHERE user_id = $1
        `, [userId]),

        // Count user-created categories (not defaults)
        neonQuery<{ count: string | number }>(`
            SELECT COUNT(*) as count
            FROM (
                SELECT id FROM categories
                WHERE user_id = $1 AND (is_default IS NULL OR is_default = false)
                UNION ALL
                SELECT id FROM receipt_categories
                WHERE user_id = $1 AND (is_default IS NULL OR is_default = false)
            ) AS user_cats
        `, [userId]),
    ])

    // Now fetch receipt categories (after ensuring they exist)
    const receiptCategoriesRaw = await neonQuery<{
        id: number
        name: string
        color: string | null
        type_id: number
        broad_type: string | null
        type_name: string
        type_color: string | null
        created_at: string | Date
        transaction_count: string | number
        total_spend: string | number
    }>(`
        SELECT
            rc.id,
            rc.name,
            rc.color,
            rc.type_id,
            rc.broad_type,
            rct.name as type_name,
            rct.color as type_color,
            rc.created_at,
            COUNT(rt.id) as transaction_count,
            COALESCE(-SUM(rt.total_price), 0) as total_spend
        FROM receipt_categories rc
        INNER JOIN receipt_category_types rct ON rc.type_id = rct.id
        LEFT JOIN receipt_transactions rt
            ON rt.category_id = rc.id
            AND rt.user_id = $1
        WHERE rc.user_id = $1
        GROUP BY
            rc.id,
            rc.name,
            rc.color,
            rc.type_id,
            rct.name,
            rct.color,
            rc.created_at
        ORDER BY rct.name ASC, rc.name ASC
    `, [userId])

    // Helper functions
    const toNumber = (value: any): number => {
        if (value === null || value === undefined) return 0
        const num = typeof value === 'string' ? parseFloat(value) : Number(value)
        return isNaN(num) ? 0 : num
    }

    const formatDate = (tx_date: Date | string): string => {
        let dateStr: string
        if (typeof tx_date === 'string') {
            dateStr = tx_date.split('T')[0].split(' ')[0]
        } else if (tx_date instanceof Date) {
            const year = tx_date.getUTCFullYear()
            const month = String(tx_date.getUTCMonth() + 1).padStart(2, '0')
            const day = String(tx_date.getUTCDate()).padStart(2, '0')
            dateStr = `${year}-${month}-${day}`
        } else {
            const dateValue = tx_date as any
            if (typeof dateValue === 'string') {
                dateStr = dateValue.split('T')[0].split(' ')[0]
            } else {
                const date = new Date(dateValue)
                const year = date.getUTCFullYear()
                const month = String(date.getUTCMonth() + 1).padStart(2, '0')
                const day = String(date.getUTCDate()).padStart(2, '0')
                dateStr = `${year}-${month}-${day}`
            }
        }
        return dateStr
    }

    // Transform transactions
    const transactions = transactionsRaw.map(tx => {
        let category: string = "Other"

        if (tx.category_name) {
            category = tx.category_name
        } else if (tx.raw_csv_row) {
            try {
                const parsed = JSON.parse(tx.raw_csv_row)
                if (parsed.category) {
                    category = parsed.category
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        return {
            id: tx.id,
            date: formatDate(tx.tx_date),
            description: tx.description,
            amount: Number(tx.amount),
            balance: tx.balance ? Number(tx.balance) : null,
            category: category
        }
    })

    // Transform stats
    const currentResult = statsData[0] || { total_income: 0, total_expenses: 0 }
    const currentIncome = toNumber(currentResult.total_income)
    const currentExpenses = toNumber(currentResult.total_expenses)
    const netWorth = currentIncome - currentExpenses
    const currentSavingsRate = currentIncome > 0
        ? ((currentIncome - currentExpenses) / currentIncome) * 100
        : 0

    const stats = {
        totalIncome: currentIncome,
        totalExpenses: currentExpenses,
        savingsRate: currentSavingsRate,
        netWorth: netWorth,
        incomeChange: 0,
        expensesChange: 0,
        savingsRateChange: 0,
        netWorthChange: 0
    }

    // Transform statements
    const statementReports = statementsRaw.map((stmt) => ({
        id: String(stmt.id),
        name: stmt.name || `Statement ${stmt.id}`,
        type: stmt.type || "Income/Expenses",
        date: typeof stmt.date === 'string' ? stmt.date : stmt.date.toISOString(),
        reviewer: "System",
        statementId: stmt.id,
        fileId: null,
        receiptId: null,
    }))

    // Transform receipts
    const receiptReports = receiptsRaw.map((receipt) => ({
        id: `receipt-${receipt.id}`,
        name: receipt.name || `Receipt ${receipt.id}`,
        type: "Receipts",
        date: typeof receipt.date === 'string' ? receipt.date : receipt.date.toISOString(),
        reviewer: "System",
        statementId: null,
        fileId: null,
        receiptId: receipt.id,
    }))

    // Combine and sort statements by date
    const statements = [...statementReports, ...receiptReports].sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return dateB - dateA
    })

    // Transform categories
    const categories = categoriesRaw
        .map((category) => {
            const totalAmount = typeof category.total_amount === "string"
                ? parseFloat(category.total_amount)
                : Number(category.total_amount ?? 0)

            return {
                id: category.id,
                name: category.name,
                color: category.color,
                createdAt: typeof category.created_at === "string"
                    ? category.created_at
                    : new Date(category.created_at).toISOString(),
                transactionCount: typeof category.transaction_count === "string"
                    ? parseInt(category.transaction_count)
                    : Number(category.transaction_count ?? 0),
                totalSpend: typeof category.total_spend === "string"
                    ? parseFloat(category.total_spend)
                    : Number(category.total_spend ?? 0),
                totalAmount: totalAmount,
                broadType: category.broad_type ?? null,
            }
        })
        .sort((a, b) => {
            if (a.transactionCount > 0 && b.transactionCount === 0) return -1
            if (a.transactionCount === 0 && b.transactionCount > 0) return 1
            return a.totalAmount - b.totalAmount
        })

    // Transform files
    const userFiles = filesRaw.map((file) => ({
        id: file.id,
        fileName: file.file_name,
        mimeType: file.mime_type,
        source: file.source || 'Upload',
        uploadedAt: typeof file.created_at === "string"
            ? file.created_at
            : new Date(file.created_at).toISOString(),
    }))

    // Transform receipt category types
    const receiptCategoryTypes = receiptTypesRaw.map((type) => ({
        id: type.id,
        name: type.name,
        color: type.color,
        createdAt: typeof type.created_at === 'string'
            ? type.created_at
            : new Date(type.created_at).toISOString(),
        categoryCount: toNumber(type.category_count),
        transactionCount: toNumber(type.transaction_count),
        totalSpend: toNumber(type.total_spend),
    }))

    // Transform receipt categories
    const receiptCategories = receiptCategoriesRaw.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        typeId: cat.type_id,
        typeName: cat.type_name,
        typeColor: cat.type_color,
        createdAt: typeof cat.created_at === 'string'
            ? cat.created_at
            : new Date(cat.created_at).toISOString(),
        transactionCount: toNumber(cat.transaction_count),
        totalSpend: toNumber(cat.total_spend),
    }))

    return {
        transactions,
        stats,
        statements,
        categories,
        userFiles,
        receiptCategoryTypes,
        receiptCategories,
        receiptTransactionsCount: toNumber(receiptTransactionsRaw[0]?.count || 0),
        userCategoriesCount: toNumber(userCategoriesRaw[0]?.count || 0)
    }
}

export const GET = async (request: Request) => {
    try {
        const userId = await getCurrentUserId()

        // Build cache key
        const cacheKey = buildCacheKey('data-library', userId, null, 'bundle')

        // Try cache first, otherwise compute
        const data = await getCachedOrCompute<DataLibraryBundle>(
            cacheKey,
            () => getDataLibraryBundle(userId!),
            CACHE_TTL.analytics // 5 minutes
        )

        return NextResponse.json(data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'X-Cache-Key': cacheKey,
            },
        })
    } catch (error: any) {
        console.error('[Data Library Bundle API] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch data library bundle' },
            { status: 500 }
        )
    }
}
