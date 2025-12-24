// lib/request-deduplication.ts
// Request deduplication utility to prevent duplicate API calls

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

type CachedResponse<T> = {
  data: T;
  timestamp: number;
};

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private responseCache = new Map<string, CachedResponse<any>>();
  private readonly CACHE_TTL = 5000; // 5 seconds cache for deduplication
  private readonly RESPONSE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for in-memory responses

  getCachedResponse<T>(key: string): T | undefined {
    const cached = this.responseCache.get(key);
    if (!cached) {
      return undefined;
    }
    const age = Date.now() - cached.timestamp;
    if (age > this.RESPONSE_CACHE_TTL) {
      this.responseCache.delete(key);
      return undefined;
    }
    return cached.data as T;
  }

  setCachedResponse<T>(key: string, data: T) {
    this.responseCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    // Check if there's a pending request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      // Check if it's still fresh (within cache TTL)
      const age = Date.now() - pending.timestamp;
      if (age < this.CACHE_TTL) {
        return pending.promise;
      }
      // Request is stale, remove it
      this.pendingRequests.delete(key);
    }

    // Create new request
    const promise = fetcher().finally(() => {
      // Remove from pending after completion (with a small delay to allow concurrent requests)
      setTimeout(() => {
        this.pendingRequests.delete(key);
      }, 100);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  clear() {
    this.pendingRequests.clear();
    this.responseCache.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Utility to clear all cached responses (useful after data mutations like file uploads)
export function clearResponseCache() {
  requestDeduplicator.clear();
}

function buildCacheKey(url: string, options?: RequestInit) {
  return `fetch:${url}:${JSON.stringify(options || {})}`;
}

export function getCachedResponse<T>(
  url: string,
  options?: RequestInit,
): T | undefined {
  const cacheKey = buildCacheKey(url, options);
  return requestDeduplicator.getCachedResponse<T>(cacheKey);
}

// Helper function for deduplicated fetch
export async function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const cacheKey = buildCacheKey(url, options);
  const cached = requestDeduplicator.getCachedResponse<T>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  return requestDeduplicator.deduplicate(cacheKey, async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.statusText}`);
    }

    // Detect Clerk / auth HTML redirects or other non-JSON responses to avoid
    // "Unexpected token '<', '<!DOCTYPE' is not valid JSON" console errors.
    const contentType = response.headers.get("content-type") || "";

    // If this looks like an HTML redirect (e.g. to /sign-in), surface a clear error
    if (
      contentType.includes("text/html") ||
      response.redirected ||
      response.url.includes("/sign-in")
    ) {
      const snippet = (await response.text()).slice(0, 200);
      throw new Error(
        `Expected JSON from ${url}, but received HTML instead (likely an auth redirect). ` +
        `First bytes: ${snippet}`,
      );
    }

    // Fallback: parse JSON safely, with a more descriptive error if parsing fails
    try {
      const data = (await response.json()) as T;
      requestDeduplicator.setCachedResponse(cacheKey, data);
      return data;
    } catch (err: any) {
      const text = await response
        .clone()
        .text()
        .catch(() => "");
      throw new Error(
        `Failed to parse JSON response from ${url}: ${err?.message || String(
          err,
        )}. ` + `First bytes: ${text.slice(0, 200)}`,
      );
    }
  });
}









