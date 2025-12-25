import { Redis } from '@upstash/redis'

// Initialize Redis client from environment variables
// Required: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv()

// Cache key prefixes
const CACHE_PREFIX = {
    analytics: 'analytics',
    fridge: 'fridge',
    home: 'home',
    trends: 'trends',
    savings: 'savings',
    categories: 'categories',
} as const

// TTL in seconds
const CACHE_TTL = {
    analytics: 5 * 60, // 5 minutes
    fridge: 5 * 60, // 5 minutes  
    categories: 30 * 60, // 30 minutes
    short: 60, // 1 minute
} as const

/**
 * Build cache key for user-specific data
 */
export function buildCacheKey(
    prefix: keyof typeof CACHE_PREFIX,
    userId: string,
    filter?: string | null,
    suffix?: string
): string {
    const parts = [`user:${userId}`, CACHE_PREFIX[prefix]]
    if (filter) parts.push(filter)
    if (suffix) parts.push(suffix)
    return parts.join(':')
}

/**
 * Get cached data
 */
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const data = await redis.get<T>(key)
        return data
    } catch (error) {
        console.error('[Cache] Get error:', error)
        return null
    }
}

/**
 * Set cache with TTL
 */
export async function setCache<T>(
    key: string,
    value: T,
    ttlSeconds: number = CACHE_TTL.analytics
): Promise<void> {
    try {
        await redis.setex(key, ttlSeconds, value)
    } catch (error) {
        console.error('[Cache] Set error:', error)
    }
}

/**
 * Get cached data or compute and cache it
 */
export async function getCachedOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.analytics
): Promise<T> {
    // Try to get from cache first
    const cached = await getCached<T>(key)
    if (cached !== null) {
        return cached
    }

    // Compute fresh data
    const data = await computeFn()

    // Cache it (fire and forget)
    setCache(key, data, ttlSeconds).catch(() => { })

    return data
}

/**
 * Invalidate all cache keys for a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
    try {
        // Scan for all keys matching user pattern
        const keys: string[] = []
        let cursor = '0'

        do {
            const result = await redis.scan(cursor, {
                match: `user:${userId}:*`,
                count: 100,
            })
            cursor = String(result[0])
            keys.push(...result[1])
        } while (cursor !== '0')

        if (keys.length > 0) {
            await redis.del(...keys)
            console.log(`[Cache] Invalidated ${keys.length} keys for user ${userId}`)
        }
    } catch (error) {
        console.error('[Cache] Invalidation error:', error)
    }
}

/**
 * Invalidate specific cache prefix for a user
 */
export async function invalidateUserCachePrefix(
    userId: string,
    prefix: keyof typeof CACHE_PREFIX
): Promise<void> {
    try {
        const keys: string[] = []
        let cursor = '0'

        do {
            const result = await redis.scan(cursor, {
                match: `user:${userId}:${CACHE_PREFIX[prefix]}:*`,
                count: 100,
            })
            cursor = String(result[0])
            keys.push(...result[1])
        } while (cursor !== '0')

        if (keys.length > 0) {
            await redis.del(...keys)
        }
    } catch (error) {
        console.error('[Cache] Prefix invalidation error:', error)
    }
}

export { CACHE_TTL }
