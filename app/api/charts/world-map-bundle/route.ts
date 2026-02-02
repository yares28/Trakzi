import { NextResponse } from 'next/server'
import { getCurrentUserIdOrNull } from '@/lib/auth'
import { getWorldMapBundle } from '@/lib/charts/world-map-aggregations'
import { getCachedOrCompute, buildCacheKey, CACHE_TTL } from '@/lib/cache/upstash'
import type { WorldMapBundleResponse } from '@/lib/types/world-map'

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

        // Build cache key (no filter for world-map, it's all-time data)
        const cacheKey = buildCacheKey('world-map', userId, null, 'bundle')

        // Try cache first, otherwise compute
        const data = await getCachedOrCompute<WorldMapBundleResponse>(
            cacheKey,
            () => getWorldMapBundle(userId!),
            CACHE_TTL['world-map']
        )

        return NextResponse.json(data, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, private',
                'X-Cache-Key': cacheKey,
            },
        })
    } catch (error: unknown) {
        console.error('[World Map Bundle API] Error:', error)
        const message = error instanceof Error ? error.message : 'Failed to fetch world map bundle'
        return NextResponse.json(
            { error: message },
            { status: 500 }
        )
    }
}
