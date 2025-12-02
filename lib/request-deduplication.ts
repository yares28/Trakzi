// lib/request-deduplication.ts
// Request deduplication utility to prevent duplicate API calls

type PendingRequest<T> = {
  promise: Promise<T>;
  timestamp: number;
};

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly CACHE_TTL = 5000; // 5 seconds cache for deduplication

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
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Helper function for deduplicated fetch
export async function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const cacheKey = `fetch:${url}:${JSON.stringify(options || {})}`;
  
  return requestDeduplicator.deduplicate(cacheKey, async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  });
}






