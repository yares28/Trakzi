import { NextResponse } from 'next/server'
import { getCurrentUserIdOrNull } from '@/lib/auth'
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
    // Get total count and date range in a single query
    const countResult = await neonQuery<{
        count: string
        first_date: string | null
        last_date: string | null
    }>(
        `SELECT 
            COUNT(*)::text as count,
            MIN(tx_date)::text as first_date,
            MAX(tx_date)::text as last_date
        FROM transactions 
        WHERE user_id = $1`,
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

    // Get monthly trend (transaction count per month) - all time
    const trendResult = await neonQuery<{ month: string; count: string }>(
        `SELECT 
            TO_CHAR(tx_date, 'YYYY-MM') as month,
            COUNT(*)::text as count
        FROM transactions 
        WHERE user_id = $1
        GROUP BY TO_CHAR(tx_date, 'YYYY-MM')
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
        let userId: string | null = await getCurrentUserIdOrNull()

        if (!userId) {
            // SECURITY: Only use demo user in development
            if (process.env.NODE_ENV === 'development' && process.env.DEMO_USER_ID) {
                userId = process.env.DEMO_USER_ID
            } else {
                return NextResponse.json(
                    { error: 'Unauthorized - Please sign in' },
                    { status: 401 }
                )
            }
        }

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
