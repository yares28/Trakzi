import { NextResponse } from 'next/server'
import { getCurrentUserId, getCurrentUserIdOrNull } from '@/lib/auth'
import { getTestChartsBundle, type TestChartsSummary } from '@/lib/charts/aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import { autoEnforceTransactionCap } from '@/lib/limits/auto-enforce-cap'
import { neonQuery } from '@/lib/neonClient'

export const GET = async (request: Request) => {
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

        // Automatically enforce transaction cap on page load
        await autoEnforceTransactionCap(userId, true)

        // Get filter from query params
        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter')

        // Build cache key
        const cacheKey = buildCacheKey('test-charts', userId, filter, 'bundle')

        // Try cache first, otherwise compute
        const data = await getCachedOrCompute<TestChartsSummary>(
            cacheKey,
            () => getTestChartsBundle(userId!, filter),
            CACHE_TTL.analytics // Use same TTL as analytics (5 minutes)
        )

        // Check if user has data in other time periods
        const isCurrentPeriodEmpty =
            (!data.transactions || data.transactions.length === 0) &&
            (!data.receiptTransactions || data.receiptTransactions.length === 0)

        let hasDataInOtherPeriods = false
        if (isCurrentPeriodEmpty) {
            // Check if user has ANY transactions (regardless of filter)
            const totalCount = await neonQuery<{ count: string }>(
                'SELECT COUNT(*)::text as count FROM transactions WHERE user_id = $1 LIMIT 1',
                [userId]
            )
            hasDataInOtherPeriods = parseInt(totalCount[0]?.count || '0', 10) > 0
        }

        return NextResponse.json({ ...data, hasDataInOtherPeriods }, {
            headers: {
                'Content-Type': 'application/json',
                // IMPORTANT: Do not let Vercel edge cache this response.
                // We already cache in Redis (Upstash) and invalidate on mutations.
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'X-Cache-Key': cacheKey,
            },
        })
    } catch (error: any) {
        console.error('[Test Charts Bundle API] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch test charts bundle' },
            { status: 500 }
        )
    }
}
