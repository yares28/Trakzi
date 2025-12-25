import { NextResponse } from 'next/server'
import { getCurrentUserIdOrNull } from '@/lib/auth'
import { getFridgeBundle, type FridgeSummary } from '@/lib/charts/fridge-aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'

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

        // Get filter from query params
        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter')

        // Build cache key
        const cacheKey = buildCacheKey('fridge', userId, filter, 'bundle')

        // Try cache first, otherwise compute
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
