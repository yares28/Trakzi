// lib/security/rate-limiter.ts
// Redis-backed rate limiter using @upstash/ratelimit
// Shared across all serverless instances via Upstash Redis

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Check if Redis environment variables are configured
const REDIS_CONFIGURED = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// Rate limit configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
    // AI endpoints - expensive (Gemini API calls), limit strictly
    ai: { requests: 10, window: "1 m" as const },

    // File uploads - moderately expensive
    upload: { requests: 20, window: "1 m" as const },

    // Standard API calls - more lenient
    standard: { requests: 100, window: "1 m" as const },

    // Expensive mutations (import, bulk operations)
    mutation: { requests: 15, window: "1 m" as const },

    // Chart bundle endpoints - complex aggregation queries
    bundle: { requests: 60, window: "1 m" as const },

    // Webhook endpoints - IP-based, before signature verification
    webhook: { requests: 100, window: "1 m" as const },

    // Auth-related - strict to prevent brute force
    auth: { requests: 10, window: "15 m" as const },
} as const

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS

// Create rate limiters for each type using sliding window algorithm
const limiters: Record<string, Ratelimit> = {}

function getLimiter(type: RateLimitType): Ratelimit | null {
    if (!REDIS_CONFIGURED) return null

    if (!limiters[type]) {
        const config = RATE_LIMIT_CONFIGS[type]
        limiters[type] = new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(config.requests, config.window),
            analytics: true,
            prefix: `ratelimit:${type}`,
        })
    }
    return limiters[type]
}

/**
 * Check rate limit for a request
 * @param identifier - User ID or IP address
 * @param type - Type of rate limit to apply
 * @returns Rate limit status
 */
export async function checkRateLimit(
    identifier: string,
    type: RateLimitType = 'standard'
): Promise<{ limited: boolean; remaining: number; resetIn: number }> {
    const limiter = getLimiter(type)

    // If Redis not configured, allow all requests (development fallback)
    if (!limiter) {
        return { limited: false, remaining: 999, resetIn: 0 }
    }

    const result = await limiter.limit(identifier)

    return {
        limited: !result.success,
        remaining: result.remaining,
        resetIn: result.reset ? result.reset - Date.now() : 0,
    }
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
    result: { remaining: number; resetIn: number }
): Record<string, string> {
    return {
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
    }
}

/**
 * Rate limit response for 429 status
 */
export function createRateLimitResponse(resetIn: number): Response {
    return new Response(
        JSON.stringify({
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(resetIn / 1000),
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil(resetIn / 1000)),
            },
        }
    )
}
