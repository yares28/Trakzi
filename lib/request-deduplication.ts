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
      return (await response.json()) as T;
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










