import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getAnalyticsBundle, type AnalyticsSummary } from '@/lib/charts/aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import { autoEnforceTransactionCap } from '@/lib/limits/auto-enforce-cap'
import { neonQuery } from '@/lib/neonClient'
import { checkRateLimit, createRateLimitResponse } from '@/lib/security/rate-limiter'

export const GET = async (request: Request) => {
    try {
        const userId = await getCurrentUserId()

        // Rate limit - complex aggregation queries
        const rateLimitResult = await checkRateLimit(userId, 'bundle')
        if (rateLimitResult.limited) {
            return createRateLimitResponse(rateLimitResult.resetIn)
        }

        // Automatically enforce transaction cap on page load
        // This ensures users who exceed limits (e.g., after downgrade) are brought back within limits
        await autoEnforceTransactionCap(userId, true)

        // Get filter from query params
        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter')

        // Build cache key
        const cacheKey = buildCacheKey('analytics', userId, filter, 'bundle')

        // Try cache first, otherwise compute
        const data = await getCachedOrCompute<AnalyticsSummary>(
            cacheKey,
            () => getAnalyticsBundle(userId!, filter),
            CACHE_TTL.analytics
        )

        // Check if user has data in other time periods
        // This is used to show a helpful message when current filter has no data
        const isCurrentPeriodEmpty =
            (!data.dailySpending || data.dailySpending.length === 0) &&
            (!data.categorySpending || data.categorySpending.length === 0)

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
        console.error('[Analytics Bundle API] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch analytics bundle' },
            { status: 500 }
        )
    }
}
