import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getFridgeBundle, type FridgeSummary } from '@/lib/charts/fridge-aggregations'
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

        // Get filter from query params
        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter')

        // Build cache key
        const cacheKey = buildCacheKey('fridge', userId, filter, 'bundle')

        // Fire cap enforcement in the background — the result is never used to gate
        // the response so there is no reason to await it at all.
        void autoEnforceTransactionCap(userId, true)

        const data = await getCachedOrCompute<FridgeSummary>(
            cacheKey,
            () => getFridgeBundle(userId!, filter),
            CACHE_TTL.fridge
        )

        return NextResponse.json(data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                'X-Cache-Key': cacheKey,
            },
        })
    } catch (error: any) {
        console.error('[Fridge Bundle API] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch fridge bundle' },
            { status: 500 }
        )
    }
}
