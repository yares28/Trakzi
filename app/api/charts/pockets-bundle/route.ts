import { NextResponse } from 'next/server'
import { getCurrentUserIdOrNull } from '@/lib/auth'
import { getPocketsBundle } from '@/lib/charts/pockets-aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import type { PocketsBundleResponse } from '@/lib/types/pockets'

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

        // Build cache key (no filter for pockets, it's all-time data)
        const cacheKey = buildCacheKey('pockets', userId, null, 'bundle')

        // Try cache first, otherwise compute
        const data = await getCachedOrCompute<PocketsBundleResponse>(
            cacheKey,
            () => getPocketsBundle(userId!),
            CACHE_TTL['pockets']
        )

        return NextResponse.json(data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'X-Cache-Key': cacheKey,
            },
        })
    } catch (error: unknown) {
        console.error('[Pockets Bundle API] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch pockets bundle'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
