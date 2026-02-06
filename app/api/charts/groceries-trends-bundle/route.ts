import { NextResponse } from 'next/server'
import { getCurrentUserIdOrNull } from '@/lib/auth'
import { getGroceriesTrendsBundle, type GroceriesTrendsSummary } from '@/lib/charts/fridge-aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import { autoEnforceTransactionCap } from '@/lib/limits/auto-enforce-cap'

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
        const cacheKey = buildCacheKey('groceries-trends', userId, filter, 'bundle')

        // Try cache first, otherwise compute
        const data = await getCachedOrCompute<GroceriesTrendsSummary>(
            cacheKey,
            () => getGroceriesTrendsBundle(userId!, filter),
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
        console.error('[Groceries Trends Bundle API] Error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch groceries trends bundle' },
            { status: 500 }
        )
    }
}
