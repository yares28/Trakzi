import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth'
import { getPocketsBundle } from '@/lib/charts/pockets-aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import type { PocketsBundleResponse } from '@/lib/types/pockets'

export const GET = async () => {
    try {
        const userId = await getCurrentUserId()

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
