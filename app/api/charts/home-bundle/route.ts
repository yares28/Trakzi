import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getHomeBundle, type HomeSummary } from '@/lib/charts/home-trends-savings-aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import { autoEnforceTransactionCap } from '@/lib/limits/auto-enforce-cap'
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
        const cacheKey = buildCacheKey('home', userId, filter, 'bundle')

        // Try cache first, otherwise compute
        const data = await getCachedOrCompute<HomeSummary>(
            cacheKey,
            () => getHomeBundle(userId!, filter),
            CACHE_TTL.analytics
        )

        return NextResponse.json(data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                'X-Cache-Key': cacheKey,
            },
        })
    } catch (error: any) {
        console.error('[Home Bundle API] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch home bundle' },
            { status: 500 }
        )
    }
}
