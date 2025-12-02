// lib/cache.ts
// Simple in-memory cache for client-side data fetching
// Works with Next.js fetch cache headers for optimal performance

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 30000; // 30 seconds default

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    this.cache.set(key, { data, timestamp: now, expiresAt });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const cache = new SimpleCache();

// Cleanup expired entries every minute
if (typeof window !== 'undefined') {
  setInterval(() => cache.cleanup(), 60000);
}

// Helper function for cached fetch
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheTTL?: number
): Promise<T> {
  const cacheKey = `fetch:${url}:${JSON.stringify(options)}`;

  // Check cache first
  const cached = cache.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch with Next.js cache support
  const response = await fetch(url, {
    ...options,
    // Next.js will respect cache headers from API routes
    cache: 'force-cache',
    next: { revalidate: cacheTTL ? cacheTTL / 1000 : 30 },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.statusText}`);
  }

  const data = await response.json() as T;

  // Store in cache
  cache.set(cacheKey, data, cacheTTL);

  return data;
}






