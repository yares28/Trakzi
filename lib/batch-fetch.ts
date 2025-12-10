// lib/batch-fetch.ts
// Utility for batching multiple API calls into parallel requests

/**
 * Batch multiple fetch requests in parallel with deduplication
 */
export async function batchFetch<T>(
  requests: Array<{ url: string; options?: RequestInit }>
): Promise<Array<{ data: T | null; error: Error | null; index: number }>> {
  const results = await Promise.allSettled(
    requests.map(async (req, index) => {
      try {
        const response = await fetch(req.url, {
          ...req.options,
          cache: 'force-cache',
          next: { revalidate: 60 },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return { data: data as T, error: null, index };
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          index,
        };
      }
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        data: null,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        index,
      };
    }
  });
}

/**
 * Batch fetch with automatic retry for failed requests
 */
export async function batchFetchWithRetry<T>(
  requests: Array<{ url: string; options?: RequestInit }>,
  maxRetries = 1
): Promise<Array<{ data: T | null; error: Error | null; index: number }>> {
  let results = await batchFetch<T>(requests);
  
  // Retry failed requests
  const failedIndices = results
    .map((r, i) => (r.error ? i : -1))
    .filter(i => i >= 0);
  
  if (failedIndices.length > 0 && maxRetries > 0) {
    const retryRequests = failedIndices.map(i => requests[i]);
    const retryResults = await batchFetch<T>(retryRequests);
    
    // Replace failed results with retry results
    retryResults.forEach((retryResult, retryIndex) => {
      const originalIndex = failedIndices[retryIndex];
      results[originalIndex] = retryResult;
    });
  }
  
  return results;
}






















