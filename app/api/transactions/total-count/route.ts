import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import { neonQuery } from '@/lib/neonClient'

export interface TotalTransactionCount {
    count: number
    timeSpan: string
    firstDate: string | null
    lastDate: string | null
    trend: Array<{ date: string; value: number }>
}

async function getTotalTransactionCount(userId: string): Promise<TotalTransactionCount> {
    // Trakzi counts a user's "transactions" across BOTH the bank-imported
    // `transactions` table AND the OCR-scanned `receipts` table — the cap-enforcement
    // logic (lib/limits/transactions-cap.ts) treats them as one bucket, and the
    // wallet count in lib/limits/transaction-wallet.ts queries both too. Previously
    // this route only queried `transactions`, so receipts-only users (or anyone whose
    // imports landed mostly in receipts) saw "Total Transactions 0 / Spanning No data"
    // even when they clearly had data. UNION ALL ties the source-of-truth together.
    const countResult = await neonQuery<{
        count: string
        first_date: string | null
        last_date: string | null
    }>(
        `WITH all_tx AS (
            SELECT tx_date::date AS d FROM transactions WHERE user_id = $1
            UNION ALL
            SELECT receipt_date::date AS d FROM receipts WHERE user_id = $1
        )
        SELECT
            COUNT(*)::text AS count,
            MIN(d)::text AS first_date,
            MAX(d)::text AS last_date
        FROM all_tx`,
        [userId]
    )

    const count = parseInt(countResult[0]?.count || '0', 10)
    const firstDate = countResult[0]?.first_date || null
    const lastDate = countResult[0]?.last_date || null

    // Calculate time span
    let timeSpan = "No data"
    if (firstDate && lastDate) {
        const minDate = new Date(firstDate)
        const maxDate = new Date(lastDate)

        let years = maxDate.getFullYear() - minDate.getFullYear()
        let months = maxDate.getMonth() - minDate.getMonth()
        let days = maxDate.getDate() - minDate.getDate()

        if (days < 0) {
            months--
            days += 30
        }
        if (months < 0) {
            years--
            months += 12
        }

        if (years > 0) {
            timeSpan = `${years} year${years > 1 ? "s" : ""}`
            if (months > 0) timeSpan += ` and ${months} month${months > 1 ? "s" : ""}`
        } else if (months > 0) {
            timeSpan = `${months} month${months > 1 ? "s" : ""}`
            if (days > 0) timeSpan += ` and ${days} day${days > 1 ? "s" : ""}`
        } else {
            timeSpan = `${days} day${days !== 1 ? "s" : ""}`
        }
    }

    // Monthly trend across both tables — same UNION ALL pattern as the count above.
    const trendResult = await neonQuery<{ month: string; count: string }>(
        `WITH all_tx AS (
            SELECT tx_date::date AS d FROM transactions WHERE user_id = $1
            UNION ALL
            SELECT receipt_date::date AS d FROM receipts WHERE user_id = $1
        )
        SELECT
            TO_CHAR(d, 'YYYY-MM') AS month,
            COUNT(*)::text AS count
        FROM all_tx
        GROUP BY TO_CHAR(d, 'YYYY-MM')
        ORDER BY month ASC`,
        [userId]
    )

    const trend = trendResult.map(row => ({
        date: row.month,
        value: parseInt(row.count, 10)
    }))

    return {
        count,
        timeSpan,
        firstDate,
        lastDate,
        trend
    }
}

export const GET = async () => {
    try {
        const userId = await getCurrentUserId()

        // Build cache key - no filter needed since this is always all-time
        const cacheKey = buildCacheKey('analytics', userId, null, 'total-count')

        // Try cache first, otherwise compute
        const data = await getCachedOrCompute<TotalTransactionCount>(
            cacheKey,
            () => getTotalTransactionCount(userId!),
            CACHE_TTL.analytics
        )

        return NextResponse.json(data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                'X-Cache-Key': cacheKey,
            },
        })
    } catch (error: unknown) {
        console.error('[Total Count API] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch total count'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
