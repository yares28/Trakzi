import { Redis } from '@upstash/redis'

// Check if Redis environment variables are configured
const REDIS_CONFIGURED = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// Initialize Redis client from environment variables
// Required: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
const redis = REDIS_CONFIGURED ? Redis.fromEnv() : null

// Log Redis configuration status on first import
if (!REDIS_CONFIGURED) {
    console.warn('[Cache] Upstash Redis not configured - caching disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.')
}

// Cache key prefixes
const CACHE_PREFIX = {
    analytics: 'analytics',
    fridge: 'fridge',
    home: 'home',
    trends: 'trends',
    savings: 'savings',
    categories: 'categories',
    'data-library': 'data-library',
    'test-charts': 'test-charts',
    'pockets': 'pockets',
    'groceries-trends': 'groceries-trends',
    'friends': 'friends',
    'room': 'room',
    'financial-health': 'financial-health',
    'accounts': 'accounts',
} as const

// TTL in seconds
const CACHE_TTL = {
    analytics: 30 * 60, // 30 minutes — data only changes on import; invalidated on mutation
    fridge: 30 * 60,    // 30 minutes — same reasoning as analytics
    'pockets': 5 * 60,
    categories: 30 * 60,
    short: 60,
    friends: 2 * 60,
    room: 2 * 60,
    'financial-health': 5 * 60,
    'accounts': 5 * 60,
} as const

// How long the distributed compute lock is held before expiring (safety net for crashed instances)
const LOCK_TTL_SECONDS = 45

// Stale copies are kept at this multiplier of the main TTL so waiters can return
// immediately instead of blocking on a cold-cache compute.
const STALE_TTL_MULTIPLIER = 10

/**
 * Build cache key for user-specific data.
 *
 * The `accountFilter` segment is canonicalized (dedup + sorted) so that
 * `[a,b]` and `[b,a]` collide on the same key — avoids permutation explosion
 * when the user reorders selections in the multi-select.
 */
export function buildCacheKey(
    prefix: keyof typeof CACHE_PREFIX,
    userId: string,
    filter?: string | null,
    suffix?: string,
    accountFilter?: string[] | null
): string {
    const parts = [`user:${userId}`, CACHE_PREFIX[prefix]]
    if (filter) parts.push(filter)
    if (accountFilter && accountFilter.length > 0) {
        const sorted = Array.from(new Set(accountFilter)).sort()
        parts.push(`acc=${sorted.join(',')}`)
    }
    if (suffix) parts.push(suffix)
    return parts.join(':')
}

/**
 * Get cached data
 */
export async function getCached<T>(key: string): Promise<T | null> {
    if (!redis) return null

    try {
        const data = await redis.get<T>(key)
        if (data !== null) {
            console.log(`[Cache] HIT: ${key}`)
        } else {
            console.log(`[Cache] MISS (key not found): ${key}`)
        }
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
    if (!redis) return

    try {
        // Check for undefined/null value
        if (value === undefined || value === null) {
            console.warn(`[Cache] SET skipped (value is ${value}): ${key}`)
            return
        }

        // Log data size being cached
        const jsonSize = JSON.stringify(value).length
        console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s, size: ${jsonSize} bytes)`)

        await redis.setex(key, ttlSeconds, value)
    } catch (error) {
        console.error('[Cache] Set error:', error)
    }
}

// In-process singleflight map: deduplicates concurrent misses within the same serverless instance.
// The distributed Redis lock (below) handles deduplication across different instances.
const inflight = new Map<string, Promise<unknown>>()

/**
 * Get cached data or compute and cache it.
 *
 * Two-layer stampede protection:
 *  1. Process-local `inflight` map — deduplicates concurrent requests in the same instance.
 *  2. Redis NX lock — deduplicates across multiple serverless instances.
 *
 * Lock waiters first try a stale copy (key prefixed with `stale:`). If no stale data exists
 * (first-ever load) they poll briefly for the fresh result. After max retries they fall through
 * and compute themselves as a last-resort safety net (e.g. if the lock holder crashed).
 */
export async function getCachedOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.analytics
): Promise<T> {
    if (!redis) {
        return computeFn()
    }

    // 1. Fast path: fresh cache hit
    const cached = await getCached<T>(key)
    if (cached !== null) return cached

    // 2. Process-local dedup — same instance, multiple concurrent requests
    if (inflight.has(key)) return inflight.get(key) as Promise<T>

    // 3. Distributed dedup — race across serverless instances
    const lockKey  = `lock:${key}`
    const staleKey = `stale:${key}`

    const lockAcquired = !!(await redis.set(lockKey, '1', { nx: true, ex: LOCK_TTL_SECONDS }))

    if (!lockAcquired) {
        // Another instance holds the lock. Return stale data immediately if available —
        // stale is vastly better than a 20-second wait or a 500 error.
        const stale = await redis.get<T>(staleKey)
        if (stale !== null) return stale

        // No stale data yet (true cold start for this key). Poll until fresh data lands.
        for (let i = 0; i < 8; i++) {
            await new Promise<void>(r => setTimeout(r, 200 + i * 150))
            const fresh = await getCached<T>(key)
            if (fresh !== null) return fresh
        }
        // Lock holder is taking too long (crash/extreme slowness). Fall through and compute.
    }

    // 4. We hold the lock (or fell through as a safety net). Run computeFn() once.
    const promise = computeFn()
        .then(async (data) => {
            await setCache(key, data, ttlSeconds)
            // Stale copy lives 10× longer so future lock-waiters can return immediately
            // instead of polling during the next cold-cache window.
            await setCache(staleKey, data, ttlSeconds * STALE_TTL_MULTIPLIER)
            if (lockAcquired) await redis!.del(lockKey).catch(() => {})
            inflight.delete(key)
            return data as T
        })
        .catch(async (err) => {
            if (lockAcquired) await redis!.del(lockKey).catch(() => {})
            inflight.delete(key)
            throw err
        })

    inflight.set(key, promise)
    return promise
}

/**
 * Invalidate all cache keys for a user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
    if (!redis) return

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
    console.log(`[Cache] invalidateUserCachePrefix called for user ${userId}, prefix: ${prefix}`)

    if (!redis) {
        console.warn('[Cache] Redis not configured - cache invalidation skipped')
        return
    }

    try {
        const keys: string[] = []
        let cursor = '0'
        const pattern = `user:${userId}:${CACHE_PREFIX[prefix]}:*`
        console.log(`[Cache] Scanning for keys matching pattern: ${pattern}`)

        do {
            const result = await redis.scan(cursor, {
                match: pattern,
                count: 100,
            })
            cursor = String(result[0])
            keys.push(...result[1])
            console.log(`[Cache] Scan iteration - cursor: ${cursor}, found: ${result[1].length} keys`)
        } while (cursor !== '0')

        console.log(`[Cache] Total keys found: ${keys.length}`, keys)

        if (keys.length > 0) {
            await redis.del(...keys)
            console.log(`[Cache] Invalidated ${keys.length} ${prefix} keys for user ${userId}`)
        } else {
            console.warn(`[Cache] No keys found matching pattern: ${pattern}`)
        }
    } catch (error) {
        console.error('[Cache] Prefix invalidation error:', error)
    }
}

/**
 * Invalidate all cache keys for a specific room.
 * Room bundles are keyed by roomId (not userId) since room data is shared.
 */
export async function invalidateRoomCache(roomId: string): Promise<void> {
    if (!redis) return

    try {
        const keys: string[] = []
        let cursor = '0'
        const pattern = `user:${roomId}:room:*`

        do {
            const result = await redis.scan(cursor, {
                match: pattern,
                count: 100,
            })
            cursor = String(result[0])
            keys.push(...result[1])
        } while (cursor !== '0')

        if (keys.length > 0) {
            await redis.del(...keys)
        }
    } catch {
        // Cache invalidation is best-effort
    }
}

/**
 * Directly delete one or more exact cache keys (no SCAN).
 * More reliable than invalidateUserCachePrefix for known key patterns.
 */
export async function invalidateExactKeys(...keys: string[]): Promise<void> {
    if (!redis || keys.length === 0) return

    try {
        await redis.del(...keys)
        console.log(`[Cache] Direct DEL: ${keys.join(', ')}`)
    } catch (error) {
        console.error('[Cache] Direct DEL error:', error)
    }
}

export { CACHE_TTL }
