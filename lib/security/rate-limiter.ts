// lib/security/rate-limiter.ts
// In-memory rate limiter for API endpoints
// For production at scale, consider using Redis (e.g., @upstash/ratelimit)

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimiterConfig {
    windowMs: number;     // Time window in milliseconds
    maxRequests: number;  // Max requests per window
}

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
    // AI endpoints - expensive, limit strictly
    ai: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute

    // File uploads - moderately expensive
    upload: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 per minute

    // Standard API calls - more lenient
    standard: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute

    // Auth-related - strict to prevent brute force
    auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 per 15 minutes
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

class InMemoryRateLimiter {
    private store: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor() {
        // Clean up expired entries every minute
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
        }
    }

    /**
     * Check if request should be rate limited
     * @returns { limited: boolean, remaining: number, resetIn: number }
     */
    check(
        identifier: string,
        config: RateLimiterConfig
    ): { limited: boolean; remaining: number; resetIn: number } {
        const now = Date.now();
        const key = identifier;
        const entry = this.store.get(key);

        // First request or window expired
        if (!entry || now >= entry.resetTime) {
            this.store.set(key, {
                count: 1,
                resetTime: now + config.windowMs,
            });
            return {
                limited: false,
                remaining: config.maxRequests - 1,
                resetIn: config.windowMs,
            };
        }

        // Within window
        if (entry.count >= config.maxRequests) {
            return {
                limited: true,
                remaining: 0,
                resetIn: entry.resetTime - now,
            };
        }

        // Increment counter
        entry.count++;
        this.store.set(key, entry);

        return {
            limited: false,
            remaining: config.maxRequests - entry.count,
            resetIn: entry.resetTime - now,
        };
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now >= entry.resetTime) {
                this.store.delete(key);
            }
        }
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.store.clear();
    }
}

// Singleton instance
const rateLimiter = new InMemoryRateLimiter();

/**
 * Check rate limit for a request
 * @param userId - User identifier (use IP for unauthenticated requests)
 * @param type - Type of rate limit to apply
 * @returns Rate limit status
 */
export function checkRateLimit(
    userId: string,
    type: RateLimitType = 'standard'
): { limited: boolean; remaining: number; resetIn: number } {
    const config = RATE_LIMIT_CONFIGS[type];
    return rateLimiter.check(userId, config);
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
    };
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
    );
}
